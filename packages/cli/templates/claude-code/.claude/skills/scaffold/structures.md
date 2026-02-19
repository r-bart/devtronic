# Scaffold - Folder Structures

Reference file for `/scaffold`. Contains folder structures for each architecture pattern.

---

## Frontend Tutellus (DDD + Zustand + Apollo)

Based on Tutellus cividao-frontend patterns:

```
{name}/
├── apps/
│   └── dapp/                          # Main application
│       ├── public/                    # Static assets & PWA config
│       │   ├── manifest.json          # PWA manifest
│       │   └── sw.js                  # Service worker
│       ├── src/
│       │   ├── components/            # React components
│       │   │   ├── icons/             # SVG icon components
│       │   │   │   └── flags/         # Country flag icons
│       │   │   ├── modals/            # Modal components
│       │   │   ├── modules/           # Mid-level reusable components
│       │   │   └── templates/         # Page-level layout components
│       │   ├── context/               # React Context providers
│       │   │   └── LayoutContext/     # Layout state (sidebar, modals)
│       │   ├── domain/                # Business logic (DDD)
│       │   │   ├── _config/           # Config management
│       │   │   ├── _fetcher/          # GraphQL client abstraction
│       │   │   │   ├── Fetcher.ts     # Base fetcher class
│       │   │   │   └── GQLClient.ts   # Apollo client wrapper
│       │   │   ├── _kernel/           # Architecture primitives
│       │   │   │   ├── architecture.ts    # UseCase, Service interfaces
│       │   │   │   ├── CommonResult.ts    # Success/Error result types
│       │   │   │   ├── CurrencyAmount.ts  # Money value object
│       │   │   │   ├── DomainError.ts     # Error with Zod + ErrorCodes
│       │   │   │   ├── ErrorCodes.ts      # Error codes enum
│       │   │   │   ├── Events.ts          # Domain events system
│       │   │   │   └── Pagination.ts      # Pagination logic
│       │   │   ├── index.ts           # Domain class with lazy loading
│       │   │   └── [entity]/          # Each domain entity
│       │   │       ├── Models/        # Entities with validation (Zod)
│       │   │       ├── Repositories/  # Interface + GQL implementation
│       │   │       │   ├── [Entity]Repository.ts      # Interface
│       │   │       │   └── GQL[Entity]Repository/     # Implementation
│       │   │       │       ├── index.ts
│       │   │       │       └── queries/               # GraphQL queries
│       │   │       ├── UseCases/      # Application use cases
│       │   │       └── Service/       # Domain services (optional, singular)
│       │   ├── hooks/                 # React hooks (utilities)
│       │   ├── js/                    # Utility functions
│       │   │   ├── array/             # Array utilities
│       │   │   ├── chain/             # Blockchain utilities
│       │   │   ├── const/             # Constants
│       │   │   ├── css/               # CSS utilities
│       │   │   ├── date/              # Date formatting
│       │   │   ├── error/             # Error handling
│       │   │   ├── function/          # Functional utilities
│       │   │   ├── number/            # Number formatting
│       │   │   ├── object/            # Object utilities
│       │   │   ├── sentry/            # Sentry initialization
│       │   │   ├── string/            # String utilities
│       │   │   ├── viem/              # Viem (Ethereum) utilities
│       │   │   └── wagmi/             # Wagmi (Web3) utilities
│       │   ├── pages/                 # React Router v7 page components
│       │   │   └── [Page]/
│       │   │       └── index.tsx      # Exports Component + loader
│       │   ├── state/                 # Zustand stores
│       │   │   ├── stores/            # Store definitions
│       │   │   └── hooks/             # Store hooks with event lifecycle
│       │   ├── App.tsx
│       │   ├── main.tsx               # Entry + Sentry + Domain setup
│       │   └── i18n.config.ts         # i18next with language detection
│       ├── locales/                   # i18n translations (outside src/)
│       │   ├── index.ts               # Barrel export + i18next types
│       │   ├── i18next.d.ts           # Type augmentation
│       │   ├── en/                    # English namespace files
│       │   │   ├── common.ts
│       │   │   ├── dashboard.ts
│       │   │   └── [feature].ts
│       │   └── es/                    # Spanish namespace files
│       │       ├── common.ts
│       │       ├── dashboard.ts
│       │       └── [feature].ts
│       ├── vite.config.ts             # PWA + Sentry + chunks config
│       ├── tsconfig.json              # experimentalDecorators enabled
│       └── package.json
├── packages/                          # Shared packages (tshy for dual ESM/CJS)
│   ├── constants/                     # Shared constants
│   ├── decorators/                    # Cache decorators
│   ├── schemas/                       # Zod validation schemas
│   └── theme/                         # Theme configuration
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

**Key Patterns:**

1. **Domain exposed via window.domain** - Use cases with lazy loading for code splitting
2. **Models with Zod validation** - `static create()` and `static createFromAPI()`
3. **Repository pattern** - Interface + per-operation Input/Output types
4. **Zustand stores** - State + Actions with event listener lifecycle (startListening/stopListening)
5. **Domain Events** - dispatchDomainEvent, stores listen via window.addEventListener
6. **React Router v7** - Lazy loading with loaders, nested route protection
7. **i18n modular** - Namespaced translations per feature (not flat JSON)
8. **PWA ready** - Service worker, manifest, offline caching via Workbox

---

## Frontend (Clean Architecture + DDD Modular)

Based on modern React patterns:

```
src/
├── assets/                          # Static assets
│   ├── fonts/
│   ├── icons/
│   └── images/
├── config/                          # Configuration
│   ├── env.ts                       # Environment (Zod validated)
│   ├── constants.ts
│   └── navigation.ts
├── infrastructure/                  # Global infrastructure
│   ├── http/
│   │   └── client.ts               # Generic HTTP client
│   └── storage/
│       └── local.ts                # localStorage wrapper
├── modules/                         # Feature modules
│   └── [feature]/                  # Each module follows this:
│       ├── index.ts                # Public API (barrel export)
│       ├── domain/
│       │   ├── schemas/            # Entity schemas (Zod)
│       │   ├── constants/
│       │   └── errors/
│       ├── application/
│       │   ├── dto/                # Data Transfer Objects
│       │   ├── use-cases/          # Business logic
│       │   ├── ports/              # Repository interfaces
│       │   └── validation/
│       ├── infrastructure/
│       │   └── [provider]/         # Implementations
│       │       ├── [entity].service.ts
│       │       └── [entity].repository.ts
│       ├── presentation/
│       │   ├── components/
│       │   ├── hooks/              # use-* hooks
│       │   ├── pages/
│       │   └── query-keys.ts       # React Query keys
│       └── composition/
│           └── [feature].factory.ts # DI factory
├── presentation/                    # Global presentation
│   ├── components/
│   │   ├── shared/                 # ErrorBoundary, PageLoader
│   │   └── ui/                     # shadcn/ui components
│   ├── hooks/
│   ├── layouts/
│   ├── pages/
│   ├── providers/
│   │   ├── QueryProvider.tsx
│   │   └── ThemeProvider.tsx
│   └── router/
│       └── routes.tsx
├── shared/                          # Cross-module utilities
│   ├── domain/
│   │   └── errors/                 # DomainError, ValidationError
│   ├── schemas/                    # Common Zod schemas
│   ├── types/                      # Nullable, Optional, Result
│   ├── utils/                      # cn(), etc.
│   └── validation/
└── test/
    └── setup.ts
```

**Path aliases for tsconfig.json:**
```json
{
  "compilerOptions": {
    "paths": {
      "@modules/*": ["src/modules/*"],
      "@shared/*": ["src/shared/*"],
      "@infrastructure/*": ["src/infrastructure/*"],
      "@presentation/*": ["src/presentation/*"],
      "@config/*": ["src/config/*"]
    }
  }
}
```

---

## Backend (Clean Architecture)

```
src/
├── domain/
│   ├── entities/
│   ├── repositories/              # Interfaces only
│   ├── value-objects/
│   └── errors/
├── application/
│   ├── use-cases/
│   ├── dtos/
│   └── ports/                     # Service interfaces
├── infrastructure/
│   ├── repositories/              # Implementations
│   ├── services/
│   ├── database/
│   └── config/
└── presentation/
    ├── controllers/
    ├── middleware/
    ├── routes/
    └── server.ts
```

---

## Monorepo Structure

```
{name}/
├── apps/
│   ├── web/                       # Next.js (uses frontend structure)
│   ├── api/                       # Express (uses backend structure)
│   └── [other-apps]/
├── packages/
│   ├── ui/                        # Shared components
│   ├── config/                    # ESLint, TS, Tailwind configs
│   ├── types/                     # Shared types
│   └── utils/                     # Shared utilities
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```
