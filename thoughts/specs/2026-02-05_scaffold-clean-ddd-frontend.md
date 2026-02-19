# PRD: Scaffold Clean Architecture + DDD Lite for Frontend

**Date**: 2026-02-05
**Status**: draft

---

## Executive Summary

Create a scaffold for frontend React projects (Vite) that implements Clean Architecture with DDD Lite. The scaffold includes folder structure, base types, error system with Result type, React Query with query keys factory, Zustand for UI state, and abstraction for REST/GraphQL.

---

## Problem Statement

### Current State

The current scaffold (`/scaffold`) defines a folder structure but:
- Entities are anemic (data only)
- No Value Objects
- No typed error system
- No real data layer abstraction
- Missing query keys factory
- Mixes Clean Architecture and DDD concepts without rigor

### Pain Points

1. **Entities without validation** - Zod schemas define types but don't validate at runtime consistently
2. **No Value Objects** - Primitives everywhere (string for email, string for id)
3. **Errors with throw** - No Result type, difficult to trace errors
4. **Manual query keys** - Each hook defines its keys, no consistency
5. **Data layer coupling** - If you change from REST to GraphQL, you rewrite everything

---

## Goals & Non-Goals

### Goals

1. **Rigorous Clean Architecture** - Strict Dependency Rule, well-defined layers
2. **Pragmatic DDD Lite** - Entities with validation, Value Objects for common types, no over-engineering
3. **Result type** - Explicit error handling without exceptions
4. **Query Keys Factory** - Consistent pattern for React Query
5. **Abstract data layer** - Change REST<->GraphQL without touching domain
6. **Testable** - Vitest + Testing Library setup included
7. **Empty structure** - Only folders and base types, no example code

### Non-Goals

- **No Aggregates** - Unnecessary complexity for frontend
- **No Domain Events** - Backend handles events
- **No CQRS** - Overkill for most cases
- **No Next.js** - Only React (Vite) for now
- **No specific GraphQL client** - Only abstraction

---

## Technical Specification

### Folder Structure

```
src/
├── _kernel/                          # Architectural core (NOT a module)
│   ├── types/
│   │   ├── result.ts                 # Result<T, E> type
│   │   ├── branded.ts                # Branded types for IDs
│   │   └── common.ts                 # Nullable, Optional, etc.
│   ├── errors/
│   │   ├── domain-error.ts           # DomainError base class
│   │   ├── validation-error.ts
│   │   ├── not-found-error.ts
│   │   └── index.ts
│   ├── value-objects/
│   │   ├── value-object.base.ts      # Abstract base class
│   │   ├── email.vo.ts               # Email value object
│   │   ├── uuid.vo.ts                # UUID value object
│   │   └── index.ts
│   ├── entity/
│   │   └── entity.base.ts            # Base class for entities
│   └── index.ts                      # Public re-exports
│
├── _infrastructure/                  # Global infrastructure
│   ├── http/
│   │   ├── http-client.ts            # Generic HTTP client
│   │   ├── http-client.fetch.ts      # Fetch implementation
│   │   └── types.ts
│   ├── graphql/
│   │   ├── graphql-client.ts         # Generic GraphQL client
│   │   └── types.ts
│   ├── storage/
│   │   └── local-storage.ts
│   └── config/
│       └── env.ts                    # Zod-validated env
│
├── _shared/                          # Shared utilities
│   ├── utils/
│   │   ├── cn.ts                     # className merge
│   │   └── format.ts
│   └── schemas/
│       └── pagination.schema.ts
│
├── modules/                          # Bounded Contexts
│   └── [feature]/
│       ├── index.ts                  # Public API (barrel)
│       │
│       ├── domain/
│       │   ├── [entity].entity.ts    # Entity with Zod + behavior
│       │   ├── [entity].schema.ts    # Zod schema (if separated)
│       │   └── errors/
│       │       └── [feature].errors.ts
│       │
│       ├── application/
│       │   ├── ports/
│       │   │   └── [entity].repository.ts    # Interface
│       │   ├── use-cases/
│       │   │   └── [action]-[entity].use-case.ts
│       │   └── dto/
│       │       └── [entity].dto.ts
│       │
│       ├── infrastructure/
│       │   ├── http/
│       │   │   └── [entity].repository.http.ts
│       │   └── graphql/
│       │       └── [entity].repository.graphql.ts
│       │
│       ├── presentation/
│       │   ├── hooks/
│       │   │   ├── use-[entity].ts
│       │   │   └── queries/
│       │   │       └── [entity].queries.ts   # Query keys factory
│       │   ├── components/
│       │   │   └── [Component]/
│       │   │       ├── index.tsx
│       │   │       └── [Component].types.ts
│       │   └── pages/
│       │       └── [Page].page.tsx
│       │
│       └── composition/
│           └── [feature].factory.ts  # DI / Wiring
│
├── presentation/                     # Global presentation
│   ├── components/
│   │   ├── ui/                       # UI primitives (Button, Input)
│   │   └── shared/                   # ErrorBoundary, Loader
│   ├── hooks/
│   │   └── use-toast.ts
│   ├── layouts/
│   │   └── RootLayout.tsx
│   ├── providers/
│   │   ├── QueryProvider.tsx
│   │   ├── ThemeProvider.tsx
│   │   └── AppProviders.tsx
│   └── router/
│       ├── routes.tsx
│       └── guards/
│           └── AuthGuard.tsx
│
├── state/                            # Zustand (UI state only)
│   ├── stores/
│   │   └── ui.store.ts               # Theme, sidebar, etc.
│   └── hooks/
│       └── use-ui.ts
│
├── test/
│   ├── setup.ts
│   ├── mocks/
│   │   └── handlers.ts               # MSW handlers
│   └── utils/
│       └── render.tsx                # Custom render with providers
│
├── main.tsx
└── vite-env.d.ts
```

---

### Base Types (_kernel)

#### Result Type

```typescript
// _kernel/types/result.ts

export type Result<T, E = Error> = Success<T> | Failure<E>;

interface Success<T> {
  readonly success: true;
  readonly value: T;
}

interface Failure<E> {
  readonly success: false;
  readonly error: E;
}

export const ok = <T>(value: T): Success<T> => ({
  success: true,
  value,
});

export const err = <E>(error: E): Failure<E> => ({
  success: false,
  error,
});

// Helpers
export const isOk = <T, E>(result: Result<T, E>): result is Success<T> =>
  result.success;

export const isErr = <T, E>(result: Result<T, E>): result is Failure<E> =>
  !result.success;

export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (isOk(result)) return result.value;
  throw result.error;
};

export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T =>
  isOk(result) ? result.value : defaultValue;

export const map = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> =>
  isOk(result) ? ok(fn(result.value)) : result;

export const flatMap = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> =>
  isOk(result) ? fn(result.value) : result;
```

#### Domain Errors

```typescript
// _kernel/errors/domain-error.ts

export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// _kernel/errors/validation-error.ts
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';

  constructor(
    message: string,
    readonly field?: string,
    readonly details?: Record<string, unknown>
  ) {
    super(message);
  }
}

// _kernel/errors/not-found-error.ts
export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';

  constructor(entity: string, identifier: string) {
    super(`${entity} with identifier "${identifier}" not found`);
  }
}
```

#### Value Object Base

```typescript
// _kernel/value-objects/value-object.base.ts

export abstract class ValueObject<T> {
  protected abstract validate(value: T): Result<T, ValidationError>;

  protected constructor(private readonly _value: T) {
    Object.freeze(this);
  }

  get value(): T {
    return this._value;
  }

  equals(other: ValueObject<T>): boolean {
    return JSON.stringify(this._value) === JSON.stringify(other._value);
  }

  toString(): string {
    return String(this._value);
  }
}

// _kernel/value-objects/email.vo.ts
import { z } from 'zod';

const emailSchema = z.string().email();

export class Email extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  protected validate(value: string): Result<string, ValidationError> {
    const result = emailSchema.safeParse(value);
    if (!result.success) {
      return err(new ValidationError('Invalid email format', 'email'));
    }
    return ok(result.data);
  }

  static create(value: string): Result<Email, ValidationError> {
    const email = new Email(value);
    const validation = email.validate(value);
    if (!validation.success) return validation;
    return ok(email);
  }
}
```

#### Entity Base

```typescript
// _kernel/entity/entity.base.ts

import { z } from 'zod';

export abstract class Entity<TProps, TSchema extends z.ZodType<TProps>> {
  protected abstract readonly schema: TSchema;

  protected constructor(protected readonly props: TProps) {
    Object.freeze(props);
  }

  protected static validate<T>(
    schema: z.ZodType<T>,
    data: unknown
  ): Result<T, ValidationError> {
    const result = schema.safeParse(data);
    if (!result.success) {
      const firstError = result.error.errors[0];
      return err(
        new ValidationError(
          firstError.message,
          firstError.path.join('.'),
          { zodError: result.error }
        )
      );
    }
    return ok(result.data);
  }

  equals(other: Entity<TProps, TSchema>): boolean {
    return this.props === other.props;
  }
}
```

---

### Query Keys Factory

```typescript
// modules/[feature]/presentation/hooks/queries/[entity].queries.ts

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserFilters) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
} as const;

// Inferred type for type-safety
export type UserQueryKey = ReturnType<typeof userKeys[keyof typeof userKeys]>;

// Reusable generic factory
// _kernel/query/create-query-keys.ts
export function createQueryKeys<T extends string>(entity: T) {
  return {
    all: [entity] as const,
    lists: () => [entity, 'list'] as const,
    list: <F>(filters: F) => [entity, 'list', filters] as const,
    details: () => [entity, 'detail'] as const,
    detail: (id: string) => [entity, 'detail', id] as const,
  } as const;
}

// Usage:
export const userKeys = createQueryKeys('users');
export const voteKeys = createQueryKeys('votes');
```

---

### Repository Pattern with Abstraction

```typescript
// modules/user/application/ports/user.repository.ts
import type { Result } from '@kernel/types/result';
import type { User } from '../../domain/user.entity';
import type { NotFoundError } from '@kernel/errors';

export interface UserRepository {
  findById(id: string): Promise<Result<User, NotFoundError>>;
  findByEmail(email: string): Promise<Result<User, NotFoundError>>;
  save(user: User): Promise<Result<User, DomainError>>;
  delete(id: string): Promise<Result<void, NotFoundError>>;
}

// modules/user/infrastructure/http/user.repository.http.ts
import type { UserRepository } from '../../application/ports/user.repository';
import type { HttpClient } from '@infrastructure/http/http-client';
import { User } from '../../domain/user.entity';
import { ok, err } from '@kernel/types/result';
import { NotFoundError } from '@kernel/errors';

export class UserHttpRepository implements UserRepository {
  constructor(private readonly http: HttpClient) {}

  async findById(id: string): Promise<Result<User, NotFoundError>> {
    const response = await this.http.get<UserDto>(`/users/${id}`);

    if (!response.success) {
      if (response.status === 404) {
        return err(new NotFoundError('User', id));
      }
      return err(response.error);
    }

    return User.create(response.data);
  }

  // ... other methods
}

// modules/user/composition/user.factory.ts
import { httpClient } from '@infrastructure/http/http-client.fetch';
import { UserHttpRepository } from '../infrastructure/http/user.repository.http';
import { GetUserByIdUseCase } from '../application/use-cases/get-user-by-id.use-case';

// Singleton repository
const userRepository = new UserHttpRepository(httpClient);

// Use cases
export const getUserByIdUseCase = new GetUserByIdUseCase(userRepository);

// For testing: export factory function
export const createUserRepository = (http: HttpClient): UserRepository =>
  new UserHttpRepository(http);
```

---

### Path Aliases (tsconfig.json)

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@kernel/*": ["src/_kernel/*"],
      "@infrastructure/*": ["src/_infrastructure/*"],
      "@shared/*": ["src/_shared/*"],
      "@modules/*": ["src/modules/*"],
      "@presentation/*": ["src/presentation/*"],
      "@state/*": ["src/state/*"],
      "@test/*": ["src/test/*"]
    }
  }
}
```

---

### Testing Setup

```typescript
// test/setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// test/utils/render.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender, RenderOptions } from '@testing-library/react';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function AllProviders({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export function render(ui: React.ReactElement, options?: RenderOptions) {
  return rtlRender(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
```

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Dependency Rule violations | 0 | ESLint rule or manual analysis |
| Type coverage | 100% | TypeScript strict mode |
| Test setup functional | Yes | Vitest + RTL running |
| Build without errors | Yes | `npm run build` passes |

---

## Open Questions

- [ ] Include ESLint rule to validate imports between layers?
- [ ] Include example of REST -> GraphQL migration to validate abstraction?
- [ ] Document naming conventions in generated CLAUDE.md?

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Over-engineering for simple projects | Med | Document when NOT to use DDD |
| Value Objects learning curve | Low | Include good examples in docs |
| Result type verbose vs throw | Low | Helpers like `unwrapOr` |

---

## Implementation Plan

1. **Phase 1**: Create base `_kernel/` structure with types and classes
2. **Phase 2**: Create `_infrastructure/` with http/graphql clients
3. **Phase 3**: Create empty `modules/` structure with .gitkeep
4. **Phase 4**: Testing setup (Vitest + RTL)
5. **Phase 5**: Integrate with existing `/scaffold` skill
6. **Phase 6**: Document in scaffold itself how to use each part
