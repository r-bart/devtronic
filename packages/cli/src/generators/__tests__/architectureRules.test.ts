import { describe, it, expect } from 'vitest';
import { generateArchitectureRules } from '../architectureRules.js';
import type { ProjectConfig } from '../../types.js';

function createConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return {
    architecture: 'clean',
    layers: ['domain', 'application', 'infrastructure', 'presentation'],
    stateManagement: [],
    dataFetching: [],
    orm: [],
    testing: [],
    ui: [],
    validation: [],
    framework: 'nextjs',
    qualityCommand: 'npm run typecheck && npm run lint && npm test',
    ...overrides,
  };
}

describe('generateArchitectureRules', () => {
  describe('architecture patterns', () => {
    it('generates clean architecture rules', () => {
      const config = createConfig({ architecture: 'clean' });
      const rules = generateArchitectureRules(config);

      expect(rules!.claudeCode).toContain('Clean Architecture');
      expect(rules!.claudeCode).toContain('Dependencies point INWARD only');
      expect(rules!.claudeCode).toContain('Domain');
    });

    it('generates MVC rules', () => {
      const config = createConfig({
        architecture: 'mvc',
        layers: ['models', 'views', 'controllers'],
      });
      const rules = generateArchitectureRules(config);

      expect(rules!.claudeCode).toContain('MVC');
      expect(rules!.claudeCode).toContain('Model');
      expect(rules!.claudeCode).toContain('View');
      expect(rules!.claudeCode).toContain('Controller');
    });

    it('generates feature-based rules', () => {
      const config = createConfig({
        architecture: 'feature-based',
        layers: ['features'],
      });
      const rules = generateArchitectureRules(config);

      expect(rules!.claudeCode).toContain('Feature-Based');
      expect(rules!.claudeCode).toContain('self-contained');
    });

    it('generates flat architecture rules', () => {
      const config = createConfig({
        architecture: 'flat',
        layers: [],
      });
      const rules = generateArchitectureRules(config);

      expect(rules!.claudeCode).toContain('Architecture');
      expect(rules!.claudeCode).toContain('circular dependencies');
    });

    it('returns null for none architecture', () => {
      const config = createConfig({
        architecture: 'none',
        layers: [],
      });
      const rules = generateArchitectureRules(config);

      expect(rules).toBeNull();
    });
  });

  describe('state management', () => {
    it('includes Zustand guidance when configured', () => {
      const config = createConfig({ stateManagement: ['Zustand'] });
      const rules = generateArchitectureRules(config);

      expect(rules!.claudeCode).toContain('Zustand');
      expect(rules!.claudeCode).toContain('stores');
    });

    it('includes Redux Toolkit guidance when configured', () => {
      const config = createConfig({ stateManagement: ['Redux Toolkit'] });
      const rules = generateArchitectureRules(config);

      expect(rules!.claudeCode).toContain('Redux Toolkit');
      expect(rules!.claudeCode).toContain('createSlice');
    });

    it('includes XState guidance when configured', () => {
      const config = createConfig({ stateManagement: ['XState'] });
      const rules = generateArchitectureRules(config);

      expect(rules!.claudeCode).toContain('XState');
      expect(rules!.claudeCode).toContain('state machines');
    });

    it('omits state section when no state management', () => {
      const config = createConfig({ stateManagement: [], dataFetching: [] });
      const rules = generateArchitectureRules(config);

      expect(rules!.claudeCode).not.toContain('State Management');
    });
  });

  describe('data fetching', () => {
    it('includes React Query guidance', () => {
      const config = createConfig({ dataFetching: ['React Query'] });
      const rules = generateArchitectureRules(config);

      expect(rules!.claudeCode).toContain('React Query');
      expect(rules!.claudeCode).toContain('query keys');
    });

    it('includes SWR guidance', () => {
      const config = createConfig({ dataFetching: ['SWR'] });
      const rules = generateArchitectureRules(config);

      expect(rules!.claudeCode).toContain('SWR');
      expect(rules!.claudeCode).toContain('revalidation');
    });

    it('includes tRPC guidance', () => {
      const config = createConfig({ dataFetching: ['tRPC'] });
      const rules = generateArchitectureRules(config);

      expect(rules!.claudeCode).toContain('tRPC');
      expect(rules!.claudeCode).toContain('Zod');
    });
  });

  describe('ORM rules', () => {
    it('includes Prisma rules when configured', () => {
      const config = createConfig({ orm: ['Prisma'] });
      const rules = generateArchitectureRules(config);

      expect(rules!.claudeCode).toContain('Prisma');
      expect(rules!.claudeCode).toContain('repository pattern');
    });

    it('includes Drizzle rules when configured', () => {
      const config = createConfig({ orm: ['Drizzle'] });
      const rules = generateArchitectureRules(config);

      expect(rules!.claudeCode).toContain('Drizzle');
      expect(rules!.claudeCode).toContain('schema definitions');
    });

    it('includes Mongoose rules when configured', () => {
      const config = createConfig({ orm: ['Mongoose'] });
      const rules = generateArchitectureRules(config);

      expect(rules!.claudeCode).toContain('Mongoose');
      expect(rules!.claudeCode).toContain('lean()');
    });

    it('omits data access section when no ORM', () => {
      const config = createConfig({ orm: [] });
      const rules = generateArchitectureRules(config);

      expect(rules!.claudeCode).not.toContain('Data Access');
    });
  });

  describe('quality section', () => {
    it('includes configured quality command', () => {
      const config = createConfig({
        qualityCommand: 'pnpm typecheck && pnpm lint && pnpm test',
      });
      const rules = generateArchitectureRules(config);

      expect(rules!.claudeCode).toContain('pnpm typecheck && pnpm lint && pnpm test');
    });

    it('includes standard quality rules', () => {
      const config = createConfig();
      const rules = generateArchitectureRules(config);

      expect(rules!.claudeCode).toContain('type checking');
      expect(rules!.claudeCode).toContain('linting');
    });
  });

  describe('layers section', () => {
    it('lists configured layers', () => {
      const config = createConfig({
        layers: ['domain', 'application', 'infrastructure'],
      });
      const rules = generateArchitectureRules(config);

      expect(rules!.claudeCode).toContain('domain');
      expect(rules!.claudeCode).toContain('application');
      expect(rules!.claudeCode).toContain('infrastructure');
    });

    it('omits layers section when no layers', () => {
      const config = createConfig({ layers: [] });
      const rules = generateArchitectureRules(config);

      expect(rules!.claudeCode).not.toContain('Project Layers');
    });
  });

  describe('output formats', () => {
    it('Claude Code format is plain markdown (no frontmatter)', () => {
      const config = createConfig();
      const rules = generateArchitectureRules(config);

      expect(rules!.claudeCode).not.toMatch(/^---/);
      expect(rules!.claudeCode).toContain('Clean Architecture');
    });

    it('Cursor format includes MDC frontmatter', () => {
      const config = createConfig();
      const rules = generateArchitectureRules(config);

      expect(rules!.cursor).toMatch(/^---\ndescription:/);
      expect(rules!.cursor).toContain('alwaysApply: true');
    });

    it('Copilot format is plain markdown (no frontmatter)', () => {
      const config = createConfig();
      const rules = generateArchitectureRules(config);

      expect(rules!.copilot).not.toMatch(/^---/);
      expect(rules!.copilot).toContain('Clean Architecture');
    });

    it('Antigravity format is plain markdown', () => {
      const config = createConfig();
      const rules = generateArchitectureRules(config);

      expect(rules!.antigravity).not.toMatch(/^---/);
      expect(rules!.antigravity).toContain('Clean Architecture');
    });

    it('OpenCode format is plain markdown (no frontmatter)', () => {
      const config = createConfig();
      const rules = generateArchitectureRules(config);

      expect(rules!.opencode).not.toMatch(/^---/);
      expect(rules!.opencode).toContain('Clean Architecture');
    });

    it('all formats contain the same core content', () => {
      const config = createConfig();
      const rules = generateArchitectureRules(config);

      const coreContent = 'Clean Architecture';
      expect(rules!.claudeCode).toContain(coreContent);
      expect(rules!.cursor).toContain(coreContent);
      expect(rules!.copilot).toContain(coreContent);
      expect(rules!.antigravity).toContain(coreContent);
      expect(rules!.opencode).toContain(coreContent);
    });
  });

  describe('edge cases', () => {
    it('includes TypeORM rules when configured', () => {
      const config = createConfig({ orm: ['TypeORM'] });
      const rules = generateArchitectureRules(config);

      expect(rules!.claudeCode).toContain('TypeORM');
      expect(rules!.claudeCode).toContain('repository pattern');
      expect(rules!.claudeCode).toContain('entities in domain layer');
    });

    it('handles custom layer names gracefully', () => {
      const config = createConfig({ layers: ['custom-layer'] });
      const rules = generateArchitectureRules(config);

      expect(rules!.claudeCode).toContain('custom-layer');
      expect(rules!.claudeCode).toContain('Custom layer');
    });
  });
});
