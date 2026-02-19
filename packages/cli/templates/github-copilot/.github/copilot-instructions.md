# Project Instructions for GitHub Copilot

## Architecture

This project follows **Clean Architecture + DDD**:

```
Presentation → Application → Domain ← Infrastructure
```

Dependencies point INWARD only.

## Code Quality

After changes, always run:

```bash
npm run typecheck && npm run lint && npm run format
```

## Workflow

For non-trivial features:
1. Define requirements (spec)
2. Research existing code
3. Plan implementation
4. Implement task by task
5. Review quality

## Key Patterns

- **UI state**: Zustand stores
- **Server state**: React Query
- **Data access**: Repository pattern (interfaces in domain/, implementations in infrastructure/)

## Git Rules

- NEVER push to `main` without permission
- Feature branches from `develop`
- NEVER add AI co-authorship messages to commits
