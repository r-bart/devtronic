# Test Patterns Reference

Reference test skeletons for common architecture patterns. The `/generate-tests` skill adapts these to whatever framework and conventions it detects in the project.

---

## Domain Use Case Test

Tests a use case that returns `Result<T, Error>` with a mocked repository.

```typescript
/**
 * @generated-from thoughts/specs/YYYY-MM-DD_feature.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SomeUseCase } from '../SomeUseCase.js';
import type { SomeRepository } from '../SomeRepository.js';

describe('SomeUseCase', () => {
  let useCase: SomeUseCase;
  let mockRepo: SomeRepository;

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    } as unknown as SomeRepository;
    useCase = new SomeUseCase(mockRepo);
  });

  describe('US-1: Create entity', () => {
    it('AC-1: should return ok with created entity for valid input', async () => {
      // Spec: US-1/AC-1
      const input = { name: 'Valid Name', email: 'user@example.com' };
      vi.mocked(mockRepo.save).mockResolvedValue({ id: '123', ...input });

      const result = await useCase.execute(input);

      expect(result.ok).toBe(true);
      expect(result.value).toMatchObject({ name: 'Valid Name' });
    });

    it('AC-2: should return err for missing required fields', async () => {
      // Spec: US-1/AC-2
      const input = { name: '', email: '' };

      const result = await useCase.execute(input);

      expect(result.ok).toBe(false);
      expect(result.error.message).toContain('required');
    });
  });

  describe('Edge Cases', () => {
    it('EC-1: should return err when repository throws', async () => {
      // Spec: EC-1
      vi.mocked(mockRepo.save).mockRejectedValue(new Error('DB connection lost'));

      const result = await useCase.execute({ name: 'Test', email: 'a@b.com' });

      expect(result.ok).toBe(false);
    });
  });
});
```

---

## API Route Test

Tests HTTP endpoints (Hono/Express/Fastify).

```typescript
/**
 * @generated-from thoughts/specs/YYYY-MM-DD_feature.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Adapt to framework: Hono testClient, supertest for Express, light-my-request for Fastify
import { testClient } from 'hono/testing';
import { app } from '../app.js';

const client = testClient(app);

describe('POST /api/entities', () => {
  it('AC-1: should return 201 with created entity', async () => {
    // Spec: US-1/AC-1
    const res = await client.entities.$post({
      json: { name: 'New Entity', description: 'A test entity' },
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.name).toBe('New Entity');
  });

  it('AC-2: should return 400 for invalid input', async () => {
    // Spec: US-1/AC-2
    const res = await client.entities.$post({
      json: { name: '' },
    });

    expect(res.status).toBe(400);
  });

  it('EC-1: should return 404 for non-existent entity', async () => {
    // Spec: EC-1
    const res = await client.entities[':id'].$get({
      param: { id: 'non-existent-id' },
    });

    expect(res.status).toBe(404);
  });
});

describe('GET /api/entities', () => {
  it('FR-1: should return paginated list', async () => {
    // Spec: FR-1
    const res = await client.entities.$get({
      query: { page: '1', limit: '10' },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toBeDefined();
  });
});
```

---

## MCP Tool Test

Tests an MCP server tool that calls a REST API via `apiClient`.

```typescript
/**
 * @generated-from thoughts/specs/YYYY-MM-DD_feature.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMcpTools } from '../tools.js';

describe('MCP: create-entity tool', () => {
  let server: McpServer;

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '0.0.0' });
    createMcpTools(server);
  });

  it('AC-1: should return entity data on success', async () => {
    // Spec: US-1/AC-1
    // Mock the API response
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ id: '123', name: 'Test' }), { status: 201 })
    );

    const result = await server.callTool('create-entity', {
      name: 'Test',
      description: 'A test entity',
    });

    expect(result.content[0].type).toBe('text');
    expect(JSON.parse(result.content[0].text)).toMatchObject({ id: '123' });
  });

  it('EC-1: should return error for API failure', async () => {
    // Spec: EC-1
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 })
    );

    const result = await server.callTool('create-entity', { name: '' });

    expect(result.isError).toBe(true);
  });
});
```

---

## Frontend Component Test

Tests a React component with React Testing Library.

```typescript
/**
 * @generated-from thoughts/specs/YYYY-MM-DD_feature.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EntityForm } from '../EntityForm.module.js';

describe('EntityForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isLoading: false,
  };

  it('AC-1: should render all required fields', () => {
    // Spec: US-1/AC-1
    render(<EntityForm {...defaultProps} />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('AC-2: should show validation errors for empty required fields', async () => {
    // Spec: US-1/AC-2
    render(<EntityForm {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('AC-3: should call onSubmit with form data for valid input', async () => {
    // Spec: US-1/AC-3
    render(<EntityForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Desc' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        name: 'Test',
        description: 'Desc',
      });
    });
  });

  it('EC-1: should disable submit button when loading', () => {
    // Spec: EC-1
    render(<EntityForm {...defaultProps} isLoading={true} />);

    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
  });
});
```

---

## Value Object Test

Tests creation, validation, and equality of a domain value object.

```typescript
/**
 * @generated-from thoughts/specs/YYYY-MM-DD_feature.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 */
import { describe, it, expect } from 'vitest';
import { EmailAddress } from '../EmailAddress.js';

describe('EmailAddress Value Object', () => {
  describe('Creation', () => {
    it('FR-1: should create from valid email string', () => {
      // Spec: FR-1
      const result = EmailAddress.create('user@example.com');

      expect(result.ok).toBe(true);
      expect(result.value.toString()).toBe('user@example.com');
    });

    it('FR-2: should normalize to lowercase', () => {
      // Spec: FR-2
      const result = EmailAddress.create('User@EXAMPLE.COM');

      expect(result.ok).toBe(true);
      expect(result.value.toString()).toBe('user@example.com');
    });
  });

  describe('Validation', () => {
    it('EC-1: should reject empty string', () => {
      // Spec: EC-1
      const result = EmailAddress.create('');

      expect(result.ok).toBe(false);
      expect(result.error.message).toContain('empty');
    });

    it('EC-2: should reject string without @ symbol', () => {
      // Spec: EC-2
      const result = EmailAddress.create('not-an-email');

      expect(result.ok).toBe(false);
    });

    it('EC-3: should reject string exceeding max length', () => {
      // Spec: EC-3
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = EmailAddress.create(longEmail);

      expect(result.ok).toBe(false);
    });
  });

  describe('Equality', () => {
    it('FR-3: should be equal when same email', () => {
      // Spec: FR-3
      const a = EmailAddress.create('user@example.com').value;
      const b = EmailAddress.create('user@example.com').value;

      expect(a.equals(b)).toBe(true);
    });

    it('FR-4: should be equal when same email different case', () => {
      // Spec: FR-4
      const a = EmailAddress.create('user@example.com').value;
      const b = EmailAddress.create('USER@example.com').value;

      expect(a.equals(b)).toBe(true);
    });
  });
});
```

---

## Adaptation Guidelines

When generating tests, adapt these patterns to the detected project:

| Aspect | Detect From | Adapt By |
|--------|-------------|----------|
| Framework | `package.json` deps | Use matching imports (`vitest`, `jest`, etc.) |
| Assertion style | Existing test files | Match `expect().toBe()` vs `assert.*` |
| Async style | Existing test files | Match `async/await` vs `.then()` vs callbacks |
| Mock strategy | Existing test files | Match `vi.mock` vs `jest.mock` vs manual |
| File naming | Existing test files | Match `*.test.ts` vs `*.spec.ts` |
| File location | Directory structure | Match co-located vs `__tests__/` vs `tests/` |
| Import style | `tsconfig.json` | Match `.js` extensions, path aliases |
| Result type | Domain code | Match `Result<T,E>` vs `Either` vs plain |
| HTTP testing | Existing API tests | Match `testClient` vs `supertest` vs `inject` |
