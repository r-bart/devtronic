import type { ProjectConfig } from '../types.js';

/**
 * Generates architecture rules content based on confirmed project configuration.
 * Returns content for different IDE formats.
 */

export interface GeneratedRules {
  /** For Claude Code (.claude/rules/architecture.md) */
  claudeCode: string;
  /** For Cursor (.cursor/rules/architecture.mdc) */
  cursor: string;
  /** For Google Antigravity (.agent/rules/architecture.md) */
  antigravity: string;
  /** For GitHub Copilot (.github/copilot-instructions.md) - appended section */
  copilot: string;
}

export function generateArchitectureRules(config: ProjectConfig): GeneratedRules | null {
  if (config.architecture === 'none') {
    return null;
  }

  const content = generateRulesContent(config);

  return {
    claudeCode: generateClaudeCodeFormat(content),
    cursor: generateCursorFormat(content),
    antigravity: generateAntigravityFormat(content),
    copilot: content, // Copilot uses plain markdown
  };
}

function generateRulesContent(config: ProjectConfig): string {
  const sections: string[] = [];

  // Architecture Section
  sections.push(generateArchitectureSection(config));

  // Layers Section (if applicable)
  if (config.layers.length > 0) {
    sections.push(generateLayersSection(config));
  }

  // State Management Section (if applicable)
  if (config.stateManagement.length > 0 || config.dataFetching.length > 0) {
    sections.push(generateStateSection(config));
  }

  // Data Access Section (if applicable)
  if (config.orm.length > 0) {
    sections.push(generateDataAccessSection(config));
  }

  // Quality Section
  sections.push(generateQualitySection(config));

  return sections.join('\n\n---\n\n');
}

function generateArchitectureSection(config: ProjectConfig): string {
  switch (config.architecture) {
    case 'clean':
      return `# Architecture: Clean Architecture

## Layer Rule

\`\`\`
Presentation → Application → Domain ← Infrastructure
\`\`\`

**Dependencies point INWARD only.** Inner layers know nothing about outer layers.

## Dependency Rules

- **Domain** layer has NO external dependencies
- **Application** can only import from Domain
- **Infrastructure** implements interfaces defined in Domain
- **Presentation/UI** orchestrates via Application layer

## Common Violations to Avoid

\`\`\`typescript
// ❌ Domain importing infrastructure
import { prisma } from '../infrastructure/db'

// ❌ UI accessing database directly
const user = await db.user.findUnique(...)

// ✅ UI calls use case, use case uses repository interface
const user = await getUserUseCase.execute(id)
\`\`\``;

    case 'layered':
      return `# Architecture: Layered

## Layer Rule

\`\`\`
Routes/Controllers → Services → Repositories → Database
\`\`\`

**Each layer only calls the one below it.** No skipping layers.

## Responsibilities

- **Routes/Controllers**: Handle HTTP, validate input, delegate to services
- **Services**: Business logic, orchestrate repositories, enforce rules
- **Repositories**: Data access, queries, database operations
- **Middleware**: Cross-cutting concerns (auth, logging, error handling)

## Rules

- Controllers should be thin — validate input, call service, return response
- Services contain ALL business logic — never in controllers or repositories
- Repositories are the only layer that touches the database
- Services should NOT know about HTTP (no req/res objects)

## Common Violations to Avoid

\`\`\`typescript
// ❌ Business logic in controller
app.post('/users', async (req, res) => {
  if (await db.user.findByEmail(req.body.email)) throw new Error('exists');
  const hashed = await hash(req.body.password);
  await db.user.create({ email: req.body.email, password: hashed });
});

// ✅ Controller delegates to service
app.post('/users', async (req, res) => {
  const user = await userService.create(req.body);
  res.json(user);
});
\`\`\``;

    case 'mvc':
      return `# Architecture: MVC

## Layer Rule

\`\`\`
View → Controller → Model
\`\`\`

## Responsibilities

- **Model**: Data structures, business logic, database access
- **View**: UI rendering, user interaction
- **Controller**: Handle requests, coordinate Model and View

## Rules

- Views should NOT contain business logic
- Controllers should be thin - delegate to Models
- Models should not know about Views`;

    case 'feature-based':
      return `# Architecture: Feature-Based

## Structure

Each feature is self-contained with its own:
- Components
- Hooks
- API calls
- Types
- Utils

## Rules

- Features should be independent - avoid cross-feature imports
- Shared code goes in \`shared/\` or \`common/\`
- Each feature can have its own local state`;

    case 'flat':
    default:
      return `# Architecture

Document your architecture patterns and rules here.

## General Guidelines

- Keep related code together
- Avoid circular dependencies
- Separate concerns appropriately`;
  }
}

function generateLayersSection(config: ProjectConfig): string {
  if (config.layers.length === 0) return '';

  const layerDescriptions: Record<string, string> = {
    domain: 'Entities, Value Objects, Repository Interfaces',
    application: 'Use Cases, DTOs, Application Services',
    infrastructure: 'Repository Implementations, External Services, Database',
    presentation: 'UI Components, Pages, Controllers',
    routes: 'HTTP Routes and Request Handlers',
    controllers: 'Request Handlers, Input Validation',
    services: 'Business Logic, Orchestration',
    repositories: 'Data Access, Database Queries',
    middleware: 'Auth, Logging, Error Handling',
    ui: 'User Interface Components',
    api: 'API Routes and Handlers',
    core: 'Core Business Logic',
    shared: 'Shared Utilities and Types',
    features: 'Feature Modules',
    modules: 'Application Modules',
  };

  const layerRows = config.layers
    .map((layer) => `| ${layer} | ${layerDescriptions[layer] || 'Custom layer'} |`)
    .join('\n');

  return `## Project Layers

| Layer | Contains |
|-------|----------|
${layerRows}

Respect layer boundaries. Import only from allowed layers.`;
}

function generateStateSection(config: ProjectConfig): string {
  const parts: string[] = ['## State Management'];

  if (config.stateManagement.length > 0) {
    parts.push(`\n**Client State**: ${config.stateManagement.join(', ')}`);

    // Add specific guidance based on libraries
    if (config.stateManagement.includes('Zustand')) {
      parts.push('- Create stores in dedicated files');
      parts.push('- Keep stores focused and small');
      parts.push('- Use selectors to prevent unnecessary re-renders');
    }
    if (config.stateManagement.includes('Redux Toolkit')) {
      parts.push('- Use createSlice for reducers');
      parts.push('- Use RTK Query for data fetching when possible');
      parts.push('- Keep selectors in slice files');
    }
    if (config.stateManagement.includes('XState')) {
      parts.push('- Model complex flows as state machines');
      parts.push('- Keep machines in separate files');
    }
  }

  if (config.dataFetching.length > 0) {
    parts.push(`\n**Server State**: ${config.dataFetching.join(', ')}`);

    if (config.dataFetching.includes('React Query')) {
      parts.push('- Use query keys consistently');
      parts.push('- Invalidate queries after mutations');
      parts.push('- Configure stale time appropriately');
    }
    if (config.dataFetching.includes('SWR')) {
      parts.push('- Use SWR for data that changes frequently');
      parts.push('- Configure revalidation strategies');
    }
    if (config.dataFetching.includes('tRPC')) {
      parts.push('- Keep procedures organized by domain');
      parts.push('- Use input validation with Zod');
    }
  }

  return parts.join('\n');
}

function generateDataAccessSection(config: ProjectConfig): string {
  if (config.orm.length === 0) return '';

  const parts: string[] = ['## Data Access'];

  if (config.orm.includes('Prisma')) {
    parts.push(`
**ORM**: Prisma

- Prisma client only in infrastructure layer
- Use repository pattern to abstract database access
- Keep queries in repository implementations
- Use transactions for multi-step operations`);
  }

  if (config.orm.includes('Drizzle')) {
    parts.push(`
**ORM**: Drizzle

- Keep schema definitions in dedicated files
- Use repository pattern for data access
- Leverage type-safe queries`);
  }

  if (config.orm.includes('TypeORM')) {
    parts.push(`
**ORM**: TypeORM

- Use repository pattern
- Keep entities in domain layer
- Repositories in infrastructure layer`);
  }

  if (config.orm.includes('Mongoose')) {
    parts.push(`
**ODM**: Mongoose

- Keep models in infrastructure layer
- Use lean() for read-only queries
- Validate with schema validators`);
  }

  return parts.join('\n');
}

function generateQualitySection(config: ProjectConfig): string {
  return `## Quality Checks

Run after every change:

\`\`\`bash
${config.qualityCommand}
\`\`\`

### Rules

- All code must pass type checking
- All code must pass linting
- Tests must pass before committing
- No \`any\` types without explicit reason`;
}

// Format generators for different IDEs

function generateClaudeCodeFormat(content: string): string {
  return `---
alwaysApply: true
---

${content}
`;
}

function generateCursorFormat(content: string): string {
  return `---
description: Architecture rules and patterns for this project
alwaysApply: true
---

${content}
`;
}

function generateAntigravityFormat(content: string): string {
  // Antigravity uses plain markdown in .agent/rules/
  return content;
}
