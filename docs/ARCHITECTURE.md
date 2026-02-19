# Project Architecture

This document defines the project-specific folder structure and architecture patterns for AI agents.

---

## Overview

This project follows **Clean Architecture** combined with **Domain-Driven Design (DDD)** principles.

The core principle: **Dependencies point inward only.**

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation                          │
│  (UI components, controllers, API routes)               │
├─────────────────────────────────────────────────────────┤
│                    Application                           │
│  (Use cases, DTOs, orchestration)                       │
├─────────────────────────────────────────────────────────┤
│                      Domain                              │
│  (Entities, Value Objects, Repository interfaces)       │
├─────────────────────────────────────────────────────────┤
│                   Infrastructure                         │
│  (DB implementations, external services, adapters)      │
└─────────────────────────────────────────────────────────┘
```

---

## Layer Responsibilities

### Domain Layer

The core of the application. Contains business logic that is **independent** of frameworks, databases, and UI.

**Contains:**
- Entities (identity-based objects)
- Value Objects (immutable, equality by value)
- Domain Services (cross-entity logic)
- Repository Interfaces (contracts, not implementations)
- Domain Events

**Rules:**
- No imports from other layers
- No framework dependencies
- No database code

```typescript
// ✅ domain/entities/User.ts
export interface User {
  id: string
  email: string
  name: string
  createdAt: Date
}

// ✅ domain/repositories/UserRepository.ts
export interface UserRepository {
  findById(id: string): Promise<User | null>
  save(user: User): Promise<void>
  delete(id: string): Promise<void>
}
```

### Application Layer

Orchestrates the flow of data and coordinates domain objects.

**Contains:**
- Use Cases (single responsibility operations)
- DTOs (Data Transfer Objects)
- Application Services

**Rules:**
- Can import from Domain only
- No direct database access
- No UI concerns

```typescript
// ✅ application/use-cases/CreateUserUseCase.ts
import { UserRepository } from '../../domain/repositories/UserRepository'
import { User } from '../../domain/entities/User'

export class CreateUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(input: CreateUserInput): Promise<User> {
    const user = { ...input, id: generateId(), createdAt: new Date() }
    await this.userRepository.save(user)
    return user
  }
}
```

### Infrastructure Layer

Implements interfaces defined in Domain. Handles external concerns.

**Contains:**
- Repository Implementations
- Database clients (Prisma, etc.)
- External API adapters
- File system access
- Email/notification services

**Rules:**
- Implements Domain interfaces
- Can import from Domain and Application
- Contains all "dirty" code

```typescript
// ✅ infrastructure/repositories/PrismaUserRepository.ts
import { PrismaClient } from '@prisma/client'
import { UserRepository } from '../../domain/repositories/UserRepository'
import { User } from '../../domain/entities/User'

export class PrismaUserRepository implements UserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } })
  }

  async save(user: User): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: user.id },
      create: user,
      update: user,
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } })
  }
}
```

### Presentation Layer

User-facing layer. Handles input/output.

**Contains:**
- UI Components (React, etc.)
- API Routes / Controllers
- CLI commands
- View Models

**Rules:**
- Can import from Application and Domain
- Never access Infrastructure directly
- Use hooks or use cases for data

```typescript
// ✅ presentation/components/UserProfile.tsx
import { useUser } from '../hooks/useUser'

export function UserProfile({ id }: { id: string }) {
  const { data: user, isLoading } = useUser(id)

  if (isLoading) return <Loading />
  return <div>{user?.name}</div>
}

// ✅ presentation/hooks/useUser.ts
import { useQuery } from '@tanstack/react-query'
import { getUserUseCase } from '../../application/use-cases/GetUserUseCase'

export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => getUserUseCase.execute(id),
  })
}
```

---

## Folder Structure Options

### Option A: Per-Feature (Recommended)

Each feature is self-contained with all layers.

```
src/
├── features/
│   ├── users/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── User.ts
│   │   │   └── repositories/
│   │   │       └── UserRepository.ts
│   │   ├── application/
│   │   │   └── use-cases/
│   │   │       ├── CreateUserUseCase.ts
│   │   │       └── GetUserUseCase.ts
│   │   ├── infrastructure/
│   │   │   └── repositories/
│   │   │       └── PrismaUserRepository.ts
│   │   └── presentation/
│   │       ├── components/
│   │       │   └── UserProfile.tsx
│   │       └── hooks/
│   │           └── useUser.ts
│   │
│   └── orders/
│       ├── domain/
│       ├── application/
│       ├── infrastructure/
│       └── presentation/
│
└── shared/
    ├── domain/
    │   └── value-objects/
    │       └── Email.ts
    └── infrastructure/
        └── database/
            └── prisma.ts
```

**Benefits:**
- Features are independent
- Easy to understand scope
- Natural module boundaries

### Option B: Per-Layer

Traditional Clean Architecture layout.

```
src/
├── domain/
│   ├── users/
│   │   ├── entities/
│   │   └── repositories/
│   └── orders/
│       ├── entities/
│       └── repositories/
│
├── application/
│   ├── users/
│   │   └── use-cases/
│   └── orders/
│       └── use-cases/
│
├── infrastructure/
│   ├── users/
│   │   └── repositories/
│   └── orders/
│       └── repositories/
│
└── presentation/
    ├── users/
    │   ├── components/
    │   └── hooks/
    └── orders/
        ├── components/
        └── hooks/
```

**Benefits:**
- Clear layer separation
- Easier to enforce import rules
- Familiar to Clean Architecture practitioners

---

## Import Rules

Use this table to verify imports are correct:

| From → To | Domain | Application | Infrastructure | Presentation |
|-----------|--------|-------------|----------------|--------------|
| **Domain** | ✅ | ❌ | ❌ | ❌ |
| **Application** | ✅ | ✅ | ❌ | ❌ |
| **Infrastructure** | ✅ | ✅ | ✅ | ❌ |
| **Presentation** | ✅ | ✅ | ❌ | ✅ |

---

## Common Violations

### ❌ Domain importing Infrastructure

```typescript
// domain/entities/User.ts
import { prisma } from '../../infrastructure/database' // WRONG!
```

**Fix:** Domain defines interfaces; Infrastructure implements them.

### ❌ Presentation accessing Database

```typescript
// presentation/components/UserList.tsx
const users = await prisma.user.findMany() // WRONG!
```

**Fix:** Use a hook that calls a use case.

### ❌ Business Logic in Controller

```typescript
// presentation/api/users/route.ts
export async function POST(req) {
  // Validation, business rules, DB access all here - WRONG!
}
```

**Fix:** Move to a use case; controller just calls it.

### ❌ Infrastructure Types in Domain

```typescript
// domain/services/UserService.ts
import { User as PrismaUser } from '@prisma/client' // WRONG!
```

**Fix:** Define domain types; map at infrastructure boundary.

---

## Dependency Injection

Connect implementations to interfaces at composition root:

```typescript
// src/composition-root.ts
import { PrismaClient } from '@prisma/client'
import { PrismaUserRepository } from './infrastructure/repositories/PrismaUserRepository'
import { CreateUserUseCase } from './application/use-cases/CreateUserUseCase'

const prisma = new PrismaClient()
const userRepository = new PrismaUserRepository(prisma)

export const createUserUseCase = new CreateUserUseCase(userRepository)
```

---

## Testing Strategy

| Layer | Test Type | Dependencies |
|-------|-----------|--------------|
| Domain | Unit | None (pure functions) |
| Application | Unit | Mock repositories |
| Infrastructure | Integration | Real database (test container) |
| Presentation | Component | Mock use cases |

---

## Quick Checklist

Before completing any task, verify:

- [ ] No imports from outer layers to inner layers
- [ ] Business logic is in Domain or Application layer
- [ ] Infrastructure concerns are isolated
- [ ] Interfaces defined in Domain, implemented in Infrastructure
- [ ] UI components call hooks/use cases, not repositories
