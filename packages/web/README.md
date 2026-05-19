# @markdown-board/web

Vite + Svelte 5 web demo. Opens a local vault via the browser's File System
Access API and reproduces the board, list, library, and overview views of
`dashboard.html`.

Built as a plain Vite + Svelte 5 single-page app, not SvelteKit — same toolchain
shape as `@markdown-board/ui`.

## Scripts

- `pnpm dev` — Vite dev server.
- `pnpm build` — Static build to `dist/`.
- `pnpm preview` — Serve the built output.
- `pnpm test` — Vitest unit suite (happy-dom).
- `pnpm test:e2e` — Playwright smoke suite against `vite preview`.
- `pnpm test:e2e:install` — One-time download of the Chromium binary
  Playwright uses (`~/Library/Caches/ms-playwright/` on macOS).
- `pnpm lint` — ESLint.
- `pnpm typecheck` — svelte-check.

## Deploy

The static `dist/` output is hostable on any CDN. `vercel.json` at the
package root makes Vercel's monorepo flow work out of the box:

1. Import the repo into Vercel (vercel.com/new).
2. Set **Root Directory** to `packages/web`.
3. Vercel auto-detects the `buildCommand` / `outputDirectory` from
   `vercel.json`. No environment variables needed.

`.github/workflows/web.yml` mirrors the same deploy as a CI step on `main`.
It needs three repository secrets to actually fire:

- `VERCEL_TOKEN` — from <https://vercel.com/account/tokens>
- `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` — written into
  `packages/web/.vercel/project.json` after `vercel link`

Without these secrets the workflow no-ops with a "secret missing" message,
so forks don't fail CI.

For Netlify or other static hosts, point the build to
`pnpm --filter @markdown-board/web build` and serve `packages/web/dist/`.
