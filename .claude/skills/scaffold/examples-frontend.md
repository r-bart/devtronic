# Scaffold - Frontend Examples (Clean Architecture)

Example files for the generic frontend (Clean Architecture + DDD Modular) scaffold.

---

## src/modules/users/domain/schemas/user.schema.ts

```typescript
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(2).max(100),
  createdAt: z.coerce.date(),
});

export type User = z.infer<typeof UserSchema>;
```

## src/modules/users/application/ports/user.repository.ts

```typescript
import type { User } from '../../domain/schemas/user.schema';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
}
```

## src/modules/users/application/use-cases/get-user-by-id.use-case.ts

```typescript
import type { UserRepository } from '../ports/user.repository';
import type { User } from '../../domain/schemas/user.schema';

export class GetUserByIdUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }
}
```

## src/modules/users/presentation/hooks/use-user.ts

```typescript
import { useQuery } from '@tanstack/react-query';
import { getUserByIdUseCase } from '../../composition/users.factory';
import { userKeys } from '../query-keys';

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => getUserByIdUseCase.execute(id),
    enabled: !!id,
  });
}
```

## src/modules/users/presentation/query-keys.ts

```typescript
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
};
```

## src/modules/users/infrastructure/http/user.repository.http.ts

```typescript
import type { User } from '../../domain/schemas/user.schema';
import type { UserRepository } from '../../application/ports/user.repository';

export class UserHttpRepository implements UserRepository {
  private readonly baseUrl = '/api/users';

  async findById(id: string): Promise<User | null> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) return null;
    return response.json();
  }

  async findByEmail(email: string): Promise<User | null> {
    const response = await fetch(`${this.baseUrl}?email=${encodeURIComponent(email)}`);
    if (!response.ok) return null;
    const users = await response.json();
    return users[0] ?? null;
  }

  async save(user: User): Promise<User> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    return response.json();
  }
}
```

## src/modules/users/composition/users.factory.ts

```typescript
import { UserHttpRepository } from '../infrastructure/http/user.repository.http';
import { GetUserByIdUseCase } from '../application/use-cases/get-user-by-id.use-case';

// Repository instance (could be swapped for testing)
const userRepository = new UserHttpRepository();

// Use cases
export const getUserByIdUseCase = new GetUserByIdUseCase(userRepository);
```

## src/modules/users/index.ts

```typescript
// Public API for users module
export type { User } from './domain/schemas/user.schema';
export { UserSchema } from './domain/schemas/user.schema';
export { useUser } from './presentation/hooks/use-user';
export { getUserByIdUseCase } from './composition/users.factory';
```

## src/shared/domain/errors/index.ts

```typescript
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
}
```

## src/shared/types/index.ts

```typescript
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };
```

## src/config/env.ts (Vite)

```typescript
import { z } from 'zod';

const envSchema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_APP_NAME: z.string().default('My App'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const env = envSchema.parse(import.meta.env);
```

## src/config/env.ts (Next.js)

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().default('My App'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NODE_ENV: process.env.NODE_ENV,
});
```
