# Scaffold - Bootstrap Commands

Reference file for `/scaffold`. Contains the bootstrap commands for each project type.

---

## Command Mapping

Show the command to user before executing, allow modifications.

### Frontend - React (Vite)

```bash
npm create vite@latest {name} -- --template react-ts
```

### Frontend - Next.js

```bash
npx create-next-app@latest {name} --typescript --tailwind --eslint --app --src-dir
```

### SPA DDD - React (Vite) + pnpm Monorepo

```bash
# Create monorepo structure
mkdir -p {name}/apps/dapp && cd {name}

# Initialize pnpm workspace
pnpm init
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - "apps/*"
  - "packages/*"
EOF

# Create turbo.json
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^lint"] },
    "typecheck": { "dependsOn": ["^typecheck"] },
    "clean": { "cache": false }
  }
}
EOF

# Create dapp with Vite
cd apps && pnpm create vite@latest dapp --template react-ts
cd dapp

# Install core dependencies
pnpm add zustand @apollo/client graphql react-router i18next react-i18next i18next-browser-languagedetector zod date-fns classnames uuid

# Install dev dependencies
pnpm add -D typescript @types/react @types/react-dom @types/uuid eslint prettier @sentry/react @sentry/vite-plugin vite-plugin-pwa workbox-precaching

# Optional: Web3 dependencies (if blockchain app)
# pnpm add @wagmi/core @wagmi/connectors viem buffer
```

### Backend - Express

```bash
mkdir {name} && cd {name} && npm init -y && npm i express typescript @types/express @types/node tsx
```

### Fullstack - Next.js

```bash
npx create-next-app@latest {name} --typescript --tailwind --eslint --app --src-dir
```

### Monorepo - Turborepo

```bash
npx create-turbo@latest {name}
```

---

## Monorepo App Commands

After base monorepo created, for each selected app:

```bash
# web
cd apps && npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir

# api
mkdir -p apps/api && cd apps/api && npm init -y

# landing
cd apps && npm create astro@latest landing -- --template minimal --typescript strict

# docs
cd apps && npm create astro@latest docs -- --template starlight --typescript strict

# admin
cd apps && npm create vite@latest admin -- --template react-ts
```
