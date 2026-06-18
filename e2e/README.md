# E2E Tests (Playwright)

Regression tests focused on the `/carousel/:id` flash-and-redirect bug.

## Setup (first time)

```bash
bun add -d @playwright/test
bunx playwright install chromium
```

## Run

```bash
# Starts vite automatically on :8080
bunx playwright test

# Or against an already-running preview
E2E_BASE_URL=https://id-preview--<project>.lovable.app bunx playwright test
```

## What it covers

`e2e/carousel-route.spec.ts`:

1. **Direct navigation**: `goto('/carousel/:id')` stays on that route and
   never visits `/` during load.
2. **Editar click**: a link pointing to `/carousel/:id` is injected on `/`
   and clicked; the route remains stable after the SPA navigation.

Both tests fail if the old race in `useCarouselRouteSync` regresses.
