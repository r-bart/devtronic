/**
 * The generator and the marketplace template must ship the same hooks.
 *
 * A local-plugin install gets `generateHooks()`; everyone else gets
 * `templates/marketplace/hooks.json` through the plugin repo. The two are
 * maintained by hand, so a change applied to one and not the other means the
 * hook you retired still fires for most users — which is exactly how the `Stop`
 * gate outlived its removal.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateHooks } from '../hooks.js';

const TEMPLATE = join(process.cwd(), 'templates/marketplace/hooks.json');

describe('generator ↔ marketplace template parity', () => {
  it('registers the same hook events', () => {
    const generated = JSON.parse(generateHooks());
    const template = JSON.parse(readFileSync(TEMPLATE, 'utf-8'));

    expect(Object.keys(template.hooks).sort()).toEqual(Object.keys(generated.hooks).sort());
  });

  it('registers no Stop hook on either side', () => {
    const generated = JSON.parse(generateHooks());
    const template = JSON.parse(readFileSync(TEMPLATE, 'utf-8'));

    expect(generated.hooks.Stop).toBeUndefined();
    expect(template.hooks.Stop).toBeUndefined();
  });

  it('never points a hook at a script the plugin no longer ships', () => {
    const template = readFileSync(TEMPLATE, 'utf-8');

    expect(template).not.toContain('stop-guard.sh');
    expect(generateHooks()).not.toContain('stop-guard.sh');
  });

  it('pins the same model on the prompt hooks', () => {
    const generated = JSON.parse(generateHooks());
    const template = JSON.parse(readFileSync(TEMPLATE, 'utf-8'));

    for (const event of ['SessionStart', 'SubagentStop']) {
      const genModels = generated.hooks[event][0].hooks.map((h: { model?: string }) => h.model);
      const tplModels = template.hooks[event][0].hooks.map((h: { model?: string }) => h.model);
      expect(tplModels).toEqual(genModels);
    }
  });
});
