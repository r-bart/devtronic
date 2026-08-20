---
alwaysApply: true
---

# Architecture Rules

Enforce Clean Architecture and DDD principles in the codebase.

## Layer Structure

<!-- CUSTOMIZE: Link to your project's specific architecture documentation -->

**IMPORTANT**: See `docs/ARCHITECTURE.md` for project-specific folder structure and layer definitions.

This rule enforces the general principles. The project documentation defines the specific implementation.

---

## Clean Architecture Principles

### 1. Dependency Rule

Dependencies MUST point inward only:

```
Presentation → Application → Domain ← Infrastructure
                    ↑            ↑
                    └────────────┘
```

**Violations to catch:**

```typescript
// ❌ WRONG: Domain importing from infrastructure
// domain/entities/User.ts
import { prisma } from '../../infrastructure/database'

// ❌ WRONG: Domain importing from presentation
// domain/services/UserService.ts
import { useUserStore } from '../../presentation/stores'

// ✅ CORRECT: Domain has no external dependencies
// domain/entities/User.ts
export interface User {
  id: string
  email: string
  name: string
}
```

### 2. Interface Segregation

Define interfaces in domain, implement in infrastructure:

```typescript
// ✅ domain/repositories/UserRepository.ts (interface)
export interface UserRepository {
  findById(id: string): Promise<User | null>
  save(user: User): Promise<void>
}

// ✅ infrastructure/repositories/PrismaUserRepository.ts (implementation)
import { UserRepository } from '../../domain/repositories/UserRepository'

export class PrismaUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    // Implementation using Prisma
  }
  async save(user: User): Promise<void> {
    // Implementation using Prisma
  }
}
```

### 3. Use Cases in Application Layer

Business operations go in application layer use cases:

```typescript
// ✅ application/use-cases/CreateUserUseCase.ts
export class CreateUserUseCase {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService
  ) {}

  async execute(input: CreateUserInput): Promise<User> {
    // Validate
    // Create entity
    // Save via repository
    // Send welcome email
    // Return result
  }
}
```

---

## DDD Principles

### 1. Entities Have Identity

Entities are identified by their ID, not their attributes:

```typescript
// ✅ domain/entities/User.ts
export class User {
  constructor(
    public readonly id: UserId,
    public email: Email,
    public name: string
  ) {}

  equals(other: User): boolean {
    return this.id.equals(other.id)
  }
}
```

### 2. Value Objects Are Immutable

Value objects have no identity and are compared by value:

```typescript
// ✅ domain/value-objects/Email.ts
export class Email {
  private constructor(private readonly value: string) {}

  static create(email: string): Email {
    if (!this.isValid(email)) {
      throw new InvalidEmailError(email)
    }
    return new Email(email)
  }

  equals(other: Email): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
```

### 3. Domain Services for Cross-Entity Logic

When logic doesn't belong to a single entity:

```typescript
// ✅ domain/services/TransferService.ts
export class TransferService {
  transfer(from: Account, to: Account, amount: Money): void {
    from.withdraw(amount)
    to.deposit(amount)
  }
}
```

---

## Folder Organization

### Per-Feature Structure (Recommended)

<!-- CUSTOMIZE: Choose the structure that fits your project -->

```
src/
├── features/
│   ├── users/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   └── orders/
│       ├── domain/
│       ├── application/
│       ├── infrastructure/
│       └── presentation/
└── shared/
    ├── domain/
    └── infrastructure/
```

### Per-Layer Structure (Alternative)

```
src/
├── domain/
│   ├── users/
│   └── orders/
├── application/
│   ├── users/
│   └── orders/
├── infrastructure/
│   ├── users/
│   └── orders/
└── presentation/
    ├── users/
    └── orders/
```

---

## Common Violations

### ❌ Database Access in UI

```typescript
// WRONG: Direct database call in component
function UserProfile({ id }) {
  const user = await prisma.user.findUnique({ where: { id } })
  return <div>{user.name}</div>
}
```

**Fix**: Use a repository through a use case or hook.

### ❌ Business Logic in Controller

```typescript
// WRONG: Validation and business rules in API route
export async function POST(req) {
  const { email, password } = await req.json()
  if (!email.includes('@')) throw new Error('Invalid email')
  const hashedPassword = await hash(password)
  await db.user.create({ data: { email, password: hashedPassword } })
}
```

**Fix**: Move to a use case that calls domain services.

### ❌ Infrastructure Types in Domain

```typescript
// WRONG: Prisma types in domain
import { User as PrismaUser } from '@prisma/client'

export function validateUser(user: PrismaUser) {
  // Domain logic coupled to Prisma
}
```

**Fix**: Define domain types independently, map at infrastructure boundary.

---

## Verification

Before completing a task, verify:

- [ ] No imports from outer layers to inner layers
- [ ] Business logic is in domain or application layer
- [ ] Infrastructure concerns are isolated
- [ ] Interfaces defined in domain, implemented in infrastructure
- [ ] UI components only call hooks/use cases, not repositories directly
