# Implementation Plan: Fix checksums vacíos al instalar file-based addons

**Date**: 2026-03-06
**Status**: Draft

---

## Overview

`generateAddonFiles` actualmente no retorna los hashes de los archivos que escribe.
`addFileBasedAddon` guarda `checksums: {}` en `devtronic.json`, dejando ciego al
sistema de detección de modificaciones. `detectModifiedAddonFiles` nunca detecta
nada y el usuario pierde customizaciones sin advertencia al hacer `addon remove`.

---

## Requirements

- [ ] `generateAddonFiles` retorna los checksums de los archivos que escribe
- [ ] `addFileBasedAddon` persiste esos checksums en `devtronic.json`
- [ ] `version` en config deja de ser `'1.0.0'` hardcodeado — usa `addonManifest.version`
- [ ] `detectModifiedAddonFiles` detecta correctamente archivos customizados post-install
- [ ] Tests: `generateAddonFiles` retorna checksums correctos
- [ ] Tests: `addon remove` advierte cuando hay archivos modificados

---

## Approach Analysis

### Option A: Extender `GenerateResult` con `checksums`

`GenerateResult` gana un campo `checksums?: Record<string, string>`. El generator
hashea cada archivo en el momento de escribirlo (el contenido ya está en memoria
en `fileMap`) y lo incluye en el resultado.

```typescript
export interface GenerateResult {
  written: number;
  skipped: number;
  conflicts: string[];
  updated?: number;
  checksums?: Record<string, string>; // relPath → hash para archivos escritos
}
```

**Pros**:
- El contenido ya está en `fileMap` — cero lecturas extra de disco
- Additive: campo opcional, no rompe consumidores existentes
- El generator es el único que sabe qué escribió → single source of truth
- Simple: ~5 líneas de cambio en `generateAddonFiles`

**Cons**:
- Solo hashea archivos *escritos*, no los *skipped* (pre-existentes). Aceptable
  para el caso de uso: si el archivo ya existía antes de instalar, no es
  "nuestro" para rastrear.

### Option B: Releer archivos en `addFileBasedAddon` tras install

Después de `generateAddonFiles`, iterar `fileMap` manualmente y leer los archivos
del disco para hashearlos.

**Pros**: No cambia `GenerateResult`.
**Cons**: Lee del disco archivos que acabamos de escribir (doble I/O). Requiere
que `addFileBasedAddon` reconstruya el `fileMap` por su cuenta o que `buildFileMap`
se haga pública. Más complejidad por menos ganancia.

### Option C: `buildFileMap` pública, usada en `addFileBasedAddon`

Exportar `buildFileMap`, llamarla desde `addFileBasedAddon` para tener el contenido
en memoria y hashear sin releer disco.

**Pros**: Sin doble I/O, sin cambiar `GenerateResult`.
**Cons**: Expone un detalle de implementación interno. `addFileBasedAddon` debe
saber reconstruir el mismo path lógico que usa el generator — acoplamiento frágil.

### Recommendation

**Option A** — extender `GenerateResult` con `checksums`. Mínimo cambio, máxima
claridad, cero I/O extra. El campo es opcional así que es backward-compatible.

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `packages/cli/src/generators/addonFiles.ts` | Modify | Añadir `checksums` a `GenerateResult` + poblarlos en `generateAddonFiles` |
| `packages/cli/src/commands/addon.ts` | Modify | Usar `result.checksums` + `addonManifest.version` al escribir config |
| `packages/cli/src/generators/__tests__/addon-file-generator.test.ts` | Modify | Test que `generateAddonFiles` retorna checksums correctos |
| `packages/cli/src/commands/__tests__/addon-v2.test.ts` | Modify | Test que `devtronic.json` tiene checksums post-install y que `remove` advierte |

---

## Implementation Phases

### Phase 1: Core fix — generator retorna checksums

#### Task 1.1: Extender `GenerateResult` y poblar checksums en `generateAddonFiles`

**File**: `packages/cli/src/generators/addonFiles.ts`

**Cambio 1** — interfaz:
```typescript
export interface GenerateResult {
  written: number;
  skipped: number;
  conflicts: string[];
  updated?: number;
  checksums?: Record<string, string>; // relPath → sha256[:16] para archivos escritos
}
```

**Cambio 2** — inicialización del resultado:
```typescript
// Antes:
const result: GenerateResult = { written: 0, skipped: 0, conflicts: [] };

// Después:
const result: GenerateResult = { written: 0, skipped: 0, conflicts: [], checksums: {} };
```

**Cambio 3** — dentro del loop, al escribir un archivo:
```typescript
// Antes:
ensureDir(dirname(destPath));
writeFileSync(destPath, content);
result.written++;

// Después:
ensureDir(dirname(destPath));
writeFileSync(destPath, content);
result.written++;
result.checksums![relPath] = checksum(content);  // content ya está en memoria
```

La función `checksum` ya existe en el mismo archivo (`createHash('sha256')...`).

**Nota**: Solo se hashean archivos *escritos* (el branch `skipped` no toca `checksums`).
Esto es correcto: si el archivo ya existía antes de instalar, no es responsabilidad
de este addon rastrearlo.

---

### Phase 2: Usar checksums en el comando `addon add`

#### Task 2.1: `addFileBasedAddon` usa `result.checksums` y `addonManifest.version`

**File**: `packages/cli/src/commands/addon.ts`

Actualmente (líneas 321-325):
```typescript
writeAddonToConfig(targetDir, addonName, {
  version: '1.0.0',
  files: fileList,
  checksums: {},
});
```

Cambiar a:
```typescript
writeAddonToConfig(targetDir, addonName, {
  version: addonManifest.version,          // usa versión real del manifest
  files: fileList,
  checksums: result.checksums ?? {},       // hashes reales de archivos escritos
});
```

`addonManifest` ya está disponible en esa función (lo usamos para construir `fileList`).
`result` es el valor de retorno de `generateAddonFiles` llamado justo arriba.

---

### Phase 3: Tests

#### Task 3.1: Test que `generateAddonFiles` retorna checksums

**File**: `packages/cli/src/generators/__tests__/addon-file-generator.test.ts`

Añadir en la suite "Agent file generation — single agent":

```typescript
it('FR-3: should return checksums for written files', () => {
  const projectDir = join(tempDir, 'project');
  mkdirSync(projectDir);
  const result = generateAddonFiles(projectDir, addonSourceDir, ['claude']);
  expect(result.checksums).toBeDefined();
  expect(Object.keys(result.checksums!).length).toBeGreaterThan(0);
  // Each checksum should be a 16-char hex string
  for (const hash of Object.values(result.checksums!)) {
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  }
  // Skill files should be tracked
  expect(result.checksums!['skills/design-init/SKILL.md']).toBeDefined();
});

it('FR-3: should not return checksums for skipped files', () => {
  const projectDir = join(tempDir, 'project');
  mkdirSync(projectDir);
  generateAddonFiles(projectDir, addonSourceDir, ['claude']); // first run
  const result2 = generateAddonFiles(projectDir, addonSourceDir, ['claude']); // second run — all skipped
  expect(result2.skipped).toBeGreaterThan(0);
  expect(Object.keys(result2.checksums ?? {}).length).toBe(0);
});
```

#### Task 3.2: Integration test — `addon add` persiste checksums, `addon remove` advierte

**File**: `packages/cli/src/commands/__tests__/addon-v2.test.ts`

Añadir en la suite "addon add command":

```typescript
it('should persist file checksums in devtronic.json after install', async () => {
  await addonCommand('add', 'design-best-practices', { path: tempDir });
  const config = JSON.parse(readFileSync(join(tempDir, 'devtronic.json'), 'utf-8'));
  const installed = config.addons.installed['design-best-practices'];
  expect(installed.checksums).toBeDefined();
  expect(Object.keys(installed.checksums).length).toBeGreaterThan(0);
  // Spot-check a known file
  expect(installed.checksums['skills/design-init/SKILL.md']).toMatch(/^[0-9a-f]{16}$/);
});

it('should use manifest version (not hardcoded 1.0.0) in config', async () => {
  await addonCommand('add', 'design-best-practices', { path: tempDir });
  const config = JSON.parse(readFileSync(join(tempDir, 'devtronic.json'), 'utf-8'));
  const installed = config.addons.installed['design-best-practices'];
  // Version should match what's in the manifest.json
  const manifest = JSON.parse(
    readFileSync(join(import.meta.dirname, '../../addons/design-best-practices/manifest.json'), 'utf-8')
  );
  expect(installed.version).toBe(manifest.version);
});
```

Añadir en la suite "addon remove command":

```typescript
it('US-3/AC-2 (with checksums): should warn about modified files when checksums are populated', async () => {
  // Install — now with real checksums
  await addonCommand('add', 'design-best-practices', { path: tempDir });

  // Verify checksums were stored
  const configAfterInstall = JSON.parse(readFileSync(join(tempDir, 'devtronic.json'), 'utf-8'));
  expect(Object.keys(configAfterInstall.addons.installed['design-best-practices'].checksums).length).toBeGreaterThan(0);

  // Modify an installed file
  const skillPath = join(tempDir, '.claude', 'skills', 'design-init', 'SKILL.md');
  writeFileSync(skillPath, '# My custom version');

  // Remove should warn
  vi.mocked(clack.confirm).mockResolvedValueOnce(true);
  await addonCommand('remove', 'design-best-practices', { path: tempDir });
  expect(clack.log.warn).toHaveBeenCalledWith(expect.stringContaining('customized'));
});
```

---

## Task Dependencies

```yaml
phases:
  - phase: 1
    name: Core fix in generator
    tasks: [1.1]
    depends_on: []

  - phase: 2
    name: Wire up in addon command
    tasks: [2.1]
    depends_on: [1]   # needs result.checksums from phase 1

  - phase: 3
    name: Tests
    tasks: [3.1, 3.2]
    depends_on: [1, 2]
    parallel: true
```

---

## Risk Analysis

### Edge Cases

- **Addon con múltiples agents (claude + cursor)**: `generateAddonFiles` itera
  sobre todos los agents. El mismo `relPath` puede escribirse en `.claude/` y `.cursor/`.
  El hash del contenido es el mismo (mismo source). `checksums[relPath]` se
  sobreescribirá por el segundo agent — pero como el contenido es idéntico, el
  hash es el mismo. No hay pérdida de información.

- **Archivos NOTICE.md**: Se escribe fuera del loop normal. No entra en `checksums`
  (no es un archivo del addon rastreable). Correcto — no se rastrea en la config
  actualmente tampoco.

- **Install parcial (primer agent escribe, segundo falla)**: Si el loop de agents
  falla a mitad, `result.checksums` solo tendrá los archivos del primer agent.
  Los del segundo agent (no escritos) no estarán. Esto es correcto — el checksum
  solo debe existir para archivos que efectivamente se escribieron.

### Breaking Changes

Ninguno. `checksums` en `GenerateResult` es `?: Record<string, string>` — additive.
Todos los tests existentes que desestructuran `result` sin tocar `checksums` siguen
pasando sin cambios.

---

## Done Criteria

- [ ] `pnpm run typecheck` — 0 errores
- [ ] `pnpm run lint` — 0 warnings
- [ ] `pnpm test` — todos pasan (incluyendo tests nuevos)
- [ ] `generateAddonFiles` retorna `checksums` con al menos 1 entrada tras escribir archivos
- [ ] `devtronic.json` post-install tiene `checksums` con hashes de 16 chars hex
- [ ] `addon remove` con un archivo modificado muestra warning (el test de integración valida esto end-to-end)
- [ ] `version` en `devtronic.json` coincide con `manifest.json`, no hardcodeado

---

## Verification

```bash
pnpm run typecheck && pnpm run lint && pnpm test
```
