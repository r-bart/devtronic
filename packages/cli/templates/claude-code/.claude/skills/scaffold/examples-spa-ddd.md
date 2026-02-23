# Scaffold - SPA-DDD Examples

Example files for the SPA-DDD frontend (DDD + Zustand + Apollo) scaffold. Based on cividao-frontend patterns.

---

## apps/dapp/src/domain/_kernel/architecture.ts

```typescript
export interface UseCase<Input, Output> {
  execute: (params: Input) => Promise<Output>
}

export interface Service<Input, Output> {
  execute: (params: Input) => Promise<Output>
}
```

## apps/dapp/src/domain/_kernel/ErrorCodes.ts

```typescript
export enum ErrorCodes {
  UNKNOWN = 'UNKNOWN',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NETWORK_ERROR = 'NETWORK_ERROR',
}
```

## apps/dapp/src/domain/_kernel/DomainError.ts

```typescript
import { z } from 'zod'
import { ErrorCodes } from './ErrorCodes'

const DomainErrorValidation = z.object({
  message: z.string(),
  code: z.nativeEnum(ErrorCodes).default(ErrorCodes.UNKNOWN),
})

export class DomainError extends Error {
  readonly code: ErrorCodes

  private constructor(message: string, code: ErrorCodes) {
    super(message)
    this.name = 'DomainError'
    this.code = code
  }

  static create(data: { message: string; code?: ErrorCodes }): DomainError {
    const { success, data: parsed, error } = DomainErrorValidation.safeParse(data)
    if (!success) throw new Error(error.message)
    return new DomainError(parsed.message, parsed.code)
  }
}
```

## apps/dapp/src/domain/_kernel/CommonResult.ts

```typescript
export type CommonResult<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E }

export const success =<T>(data: T): CommonResult<T, never> => ({
  success: true,
  data,
})

export const failure = <E>(error: E): CommonResult<never, E> => ({
  success: false,
  error,
})
```

## apps/dapp/src/domain/_kernel/Events.ts

```typescript
export enum DomainEvents {
  SET_TRANSACTION = 'domain:set_transaction',
  SUBMIT_TRANSACTION = 'domain:submit_transaction',
  SUCCESS_TRANSACTION = 'domain:success_transaction',
  REVERTED_TRANSACTION = 'domain:reverted_transaction',
  ERROR = 'domain:error',
}

export type DomainEventDetail = {
  [DomainEvents.SET_TRANSACTION]: { txHash: string }
  [DomainEvents.SUCCESS_TRANSACTION]: { txHash: string }
  [DomainEvents.REVERTED_TRANSACTION]: { txHash: string; reason?: string }
  [DomainEvents.ERROR]: { message: string; code?: string }
}

export const dispatchDomainEvent = <K extends DomainEvents>(
  event: K,
  detail?: DomainEventDetail[K]
) => {
  window.dispatchEvent(new CustomEvent(event, { detail }))
}
```

## apps/dapp/src/domain/user/Models/User.ts

```typescript
import { z } from 'zod'

const UserValidation = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(2).max(100),
  createdAt: z.coerce.date(),
})

export class User {
  private readonly _id: string
  private readonly _email: string
  private readonly _name: string
  private readonly _createdAt: Date

  private constructor(id: string, email: string, name: string, createdAt: Date) {
    this._id = id
    this._email = email
    this._name = name
    this._createdAt = createdAt
  }

  static create(data: unknown): User {
    const { success, data: parsed, error } = UserValidation.safeParse(data)
    if (!success) throw new Error(error.message)
    return new User(parsed.id, parsed.email, parsed.name, parsed.createdAt)
  }

  static createFromAPI(apiData: { id: string; email: string; name: string; created_at: string }): User {
    return User.create({
      id: apiData.id,
      email: apiData.email,
      name: apiData.name,
      createdAt: apiData.created_at,
    })
  }

  get id() { return this._id }
  get email() { return this._email }
  get name() { return this._name }
  get createdAt() { return this._createdAt }

  serialize() {
    return {
      id: this._id,
      email: this._email,
      name: this._name,
      createdAt: this._createdAt.toISOString(),
    }
  }
}

export type UserSerialized = ReturnType<User['serialize']>
```

## apps/dapp/src/domain/user/Repositories/UserRepository.ts

```typescript
import type { User } from '../Models/User'

export type GetUserByIdUserRepositoryInput = { id: string }
export type GetUserByIdUserRepositoryOutput = Promise<User | null>

export type GetUserByEmailUserRepositoryInput = { email: string }
export type GetUserByEmailUserRepositoryOutput = Promise<User | null>

export interface UserRepository {
  getById(input: GetUserByIdUserRepositoryInput): GetUserByIdUserRepositoryOutput
  getByEmail(input: GetUserByEmailUserRepositoryInput): GetUserByEmailUserRepositoryOutput
}
```

## apps/dapp/src/domain/user/Repositories/GQLUserRepository/index.ts

```typescript
import type { User } from '../../Models/User'
import type {
  UserRepository,
  GetUserByIdUserRepositoryInput,
  GetUserByIdUserRepositoryOutput,
  GetUserByEmailUserRepositoryInput,
  GetUserByEmailUserRepositoryOutput,
} from '../UserRepository'
import { User as UserModel } from '../../Models/User'
import type { Config } from '../../../_config'
import { GetUserByIdQuery } from './queries/GetUserByIdQuery'

export class GQLUserRepository implements UserRepository {
  private readonly _config: Config

  private constructor(config: Config) {
    this._config = config
  }

  static create({ config }: { config: Config }) {
    return new GQLUserRepository(config)
  }

  async getById(input: GetUserByIdUserRepositoryInput): GetUserByIdUserRepositoryOutput {
    const data = await GetUserByIdQuery.execute(this._config, input)
    if (!data) return null
    return UserModel.createFromAPI(data)
  }

  async getByEmail(input: GetUserByEmailUserRepositoryInput): GetUserByEmailUserRepositoryOutput {
    const response = await fetch(`${this._config.API_URL}/users?email=${input.email}`)
    if (!response.ok) return null
    const data = await response.json()
    return data ? UserModel.createFromAPI(data) : null
  }
}
```

## apps/dapp/src/domain/user/Repositories/GQLUserRepository/queries/GetUserByIdQuery.ts

```typescript
import type { Config } from '../../../../_config'

const QUERY = `
  query GetUserById($id: ID!) {
    user(id: $id) {
      id
      email
      name
      created_at
    }
  }
`

export const GetUserByIdQuery = {
  async execute(config: Config, input: { id: string }) {
    const response = await fetch(config.GRAPHQL_URI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { id: input.id } }),
    })
    const { data } = await response.json()
    return data?.user ?? null
  },
}
```

## apps/dapp/src/domain/user/UseCases/GetUserByIdUserUseCase.ts

```typescript
import type { UseCase } from '../../_kernel/architecture'
import type {
  UserRepository,
  GetUserByIdUserRepositoryInput,
  GetUserByIdUserRepositoryOutput,
} from '../Repositories/UserRepository'
import { GQLUserRepository } from '../Repositories/GQLUserRepository'
import type { Config } from '../../_config'

export type GetUserByIdUserUseCaseInput = GetUserByIdUserRepositoryInput
export type GetUserByIdUserUseCaseOutput = GetUserByIdUserRepositoryOutput

export class GetUserByIdUserUseCase implements UseCase<GetUserByIdUserUseCaseInput, Awaited<GetUserByIdUserUseCaseOutput>> {
  private readonly _repository: UserRepository

  private constructor(repository: UserRepository) {
    this._repository = repository
  }

  static create({ config }: { config: Config }) {
    return new GetUserByIdUserUseCase(GQLUserRepository.create({ config }))
  }

  async execute(input: GetUserByIdUserUseCaseInput): Promise<Awaited<GetUserByIdUserUseCaseOutput>> {
    return this._repository.getById(input)
  }
}
```

## apps/dapp/src/domain/_config/index.ts

```typescript
export interface Config {
  API_URL: string
  GRAPHQL_URI: string
}

export const createConfig = (): Config => ({
  API_URL: import.meta.env.VITE_API_URL,
  GRAPHQL_URI: import.meta.env.VITE_GRAPHQL_URI,
})
```

## apps/dapp/src/domain/index.ts

```typescript
import { createConfig, type Config } from './_config'
import type { UseCase } from './_kernel/architecture'

type LazyUseCase<I, O> = UseCase<I, O>

export class Domain {
  private readonly _config: Config

  private constructor(config: Config) {
    this._config = config
  }

  static create(envConfig: Partial<Config> = {}) {
    const config = { ...createConfig(), ...envConfig }
    return new Domain(config)
  }

  #getter<Input, Output>(
    importFn: () => Promise<{ default: new (deps: { config: Config }) => LazyUseCase<Input, Output> }>
  ): LazyUseCase<Input, Output> {
    let instance: LazyUseCase<Input, Output> | null = null
    return {
      execute: async (input: Input): Promise<Output> => {
        if (!instance) {
          const { default: UseCaseClass } = await importFn()
          instance = new UseCaseClass({ config: this._config })
        }
        return instance.execute(input)
      },
    }
  }

  get GetUserByIdUserUseCase() {
    return this.#getter(() => import('./user/UseCases/GetUserByIdUserUseCase').then(m => ({ default: m.GetUserByIdUserUseCase as any })))
  }
}

declare global {
  interface Window {
    domain: Domain
  }
}
```

## apps/dapp/src/main.tsx

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App'
import { Domain } from './domain'
import { LayoutProvider } from './context/LayoutContext'
import { initSentry } from './js/sentry'
import './i18n.config'
import './index.css'

if (import.meta.env.VITE_SENTRY_DSN) {
  initSentry({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
  })
}

window.domain = window.domain ?? Domain.create({
  API_URL: import.meta.env.VITE_API_URL,
  GRAPHQL_URI: import.meta.env.VITE_GRAPHQL_URI,
})

ReactDOM.createRoot(document.getElementById('root')!, {
  onUncaughtError: Sentry.captureException,
}).render(
  <React.StrictMode>
    <LayoutProvider>
      <App />
    </LayoutProvider>
  </React.StrictMode>,
)
```

## apps/dapp/src/js/sentry/index.ts

```typescript
import * as Sentry from '@sentry/react'

interface SentryConfig {
  dsn: string
  environment: string
}

export const initSentry = (config: SentryConfig) => {
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  })
}
```

## apps/dapp/src/context/LayoutContext/index.tsx

```typescript
import { createContext, useContext, useState, type ReactNode } from 'react'

interface LayoutState {
  isSidebarOpen: boolean
  toggleSidebar: () => void
}

const LayoutContext = createContext<LayoutState | null>(null)

export const LayoutProvider = ({ children }: { children: ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev)

  return (
    <LayoutContext.Provider value={{ isSidebarOpen, toggleSidebar }}>
      {children}
    </LayoutContext.Provider>
  )
}

export const useLayout = () => {
  const context = useContext(LayoutContext)
  if (!context) throw new Error('useLayout must be used within LayoutProvider')
  return context
}
```

## apps/dapp/src/state/stores/userStore.ts

```typescript
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { User } from '../../domain/user/Models/User'
import { DomainEvents } from '../../domain/_kernel/Events'

interface State {
  user?: User
  isLoading: boolean
  error?: string
  _isListening: boolean
}

interface Actions {
  getOrFetch: (id: string) => Promise<User | undefined>
  updateUser: (id: string) => Promise<User | undefined>
  setUser: (user: User) => void
  reset: () => void
  startListening: () => void
  stopListening: () => void
}

type UserStore = State & Actions

const initialState: State = {
  user: undefined,
  isLoading: false,
  error: undefined,
  _isListening: false,
}

export const userStore = create<UserStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      getOrFetch: async (id: string) => {
        if (get().user?.id === id) return get().user
        return get().updateUser(id)
      },

      updateUser: async (id: string) => {
        set({ isLoading: true, error: undefined })
        try {
          const user = await window.domain.GetUserByIdUserUseCase.execute({ id })
          if (user) {
            set({ user, isLoading: false })
            return user
          }
          set({ isLoading: false })
          return undefined
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false })
          return undefined
        }
      },

      setUser: (user: User) => set({ user }),
      reset: () => set(initialState),

      startListening: () => {
        if (get()._isListening) return
        set({ _isListening: true })

        const handleSuccess = () => {
          const user = get().user
          if (user) get().updateUser(user.id)
        }

        window.addEventListener(DomainEvents.SUCCESS_TRANSACTION, handleSuccess)

        ;(get() as any)._cleanup = () => {
          window.removeEventListener(DomainEvents.SUCCESS_TRANSACTION, handleSuccess)
        }
      },

      stopListening: () => {
        if (!get()._isListening) return
        ;(get() as any)._cleanup?.()
        set({ _isListening: false })
      },
    }),
    { name: 'UserStore' }
  )
)
```

## apps/dapp/src/state/hooks/useUserStore.ts

```typescript
import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { userStore } from '../stores/userStore'

export const useUserStore = (id?: string) => {
  const { user, isLoading, error, getOrFetch, updateUser, setUser, reset } = userStore(
    useShallow((state) => ({
      user: state.user,
      isLoading: state.isLoading,
      error: state.error,
      getOrFetch: state.getOrFetch,
      updateUser: state.updateUser,
      setUser: state.setUser,
      reset: state.reset,
    }))
  )

  useEffect(() => {
    userStore.getState().startListening()
    return () => {
      userStore.getState().stopListening()
    }
  }, [])

  useEffect(() => {
    if (id) {
      getOrFetch(id)
    }
  }, [id, getOrFetch])

  return { user, isLoading, error, updateUser, setUser, reset }
}
```

## apps/dapp/src/components/modules/UserCard/index.tsx

```typescript
import type { User } from '../../../domain/user/Models/User'

interface UserCardProps {
  user: User
}

export function UserCard({ user }: UserCardProps) {
  return (
    <div className="user-card">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      <span>Joined: {user.createdAt.toLocaleDateString()}</span>
    </div>
  )
}
```

## apps/dapp/src/i18n.config.ts

```typescript
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { en, es } from '../locales'

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    lng: 'es',
    fallbackLng: 'es',
    supportedLngs: ['es', 'en'],
    ns: ['common', 'dashboard', 'settings', 'wallet', 'error'],
    defaultNS: 'common',
    detection: {
      order: ['cookie', 'localStorage'],
      lookupQuerystring: 'lang',
    },
    interpolation: { escapeValue: false },
    resources: { es, en },
    react: {
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'span'],
    },
  })

export default i18n
```

## apps/dapp/locales/index.ts

```typescript
import common_en from './en/common'
import dashboard_en from './en/dashboard'
import common_es from './es/common'
import dashboard_es from './es/dashboard'

export const en = {
  common: common_en,
  dashboard: dashboard_en,
}

export const es = {
  common: common_es,
  dashboard: dashboard_es,
}
```

## apps/dapp/locales/i18next.d.ts

```typescript
import 'i18next'
import { en } from './index'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: typeof en
  }
}
```

## apps/dapp/locales/en/common.ts

```typescript
export default {
  loading: 'Loading...',
  error: 'An error occurred',
  notFound: 'Not found',
  save: 'Save',
  cancel: 'Cancel',
  confirm: 'Confirm',
}
```

## apps/dapp/locales/es/common.ts

```typescript
export default {
  loading: 'Cargando...',
  error: 'Ocurrio un error',
  notFound: 'No encontrado',
  save: 'Guardar',
  cancel: 'Cancelar',
  confirm: 'Confirmar',
}
```
