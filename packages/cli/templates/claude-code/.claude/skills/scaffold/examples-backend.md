# Scaffold - Backend Examples (Clean Architecture)

Example files for the backend (Express + Clean Architecture) scaffold.

---

## src/domain/entities/user.entity.ts

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}
```

## src/domain/repositories/user.repository.ts

```typescript
import type { User } from '../entities/user.entity';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
}
```

## src/application/use-cases/get-user-by-id.use-case.ts

```typescript
import type { UserRepository } from '../../domain/repositories/user.repository';
import type { User } from '../../domain/entities/user.entity';

export class GetUserByIdUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }
}
```

## src/infrastructure/repositories/user.repository.prisma.ts

```typescript
import type { User } from '../../domain/entities/user.entity';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { prisma } from '../database/client';

export class UserPrismaRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async save(user: User): Promise<User> {
    return prisma.user.upsert({
      where: { id: user.id },
      update: user,
      create: user,
    });
  }
}
```

## src/presentation/controllers/user.controller.ts

```typescript
import type { Request, Response } from 'express';
import type { GetUserByIdUseCase } from '../../application/use-cases/get-user-by-id.use-case';

export class UserController {
  constructor(private readonly getUserByIdUseCase: GetUserByIdUseCase) {}

  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const user = await this.getUserByIdUseCase.execute(id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  }
}
```

## src/presentation/routes/user.routes.ts

```typescript
import { Router } from 'express';
import { userController } from '../composition/user.factory';

const router = Router();

router.get('/:id', (req, res) => userController.getById(req, res));

export { router as userRoutes };
```
