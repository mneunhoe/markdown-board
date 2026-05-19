# @markdown-board/web

Vite + Svelte 5 web demo. Opens a local vault via the browser's File System
Access API and reproduces the board, list, library, and overview views of
`dashboard.html`.

Built as a plain Vite + Svelte 5 single-page app, not SvelteKit — same toolchain
shape as `@markdown-board/ui`. Phase 1 task 4 ships in five sub-slices:

1. **Scaffold** — Vite + Svelte 5 app skeleton, theme tokens, empty-state shell.
2. **FSAFileAdapter** — implements `FileAdapter` from `@markdown-board/core`
   on top of the File System Access API.
3. **Open-vault flow** — folder picker, load `TASKS.md` + `library/`, render
   the four views from `@markdown-board/ui`.
4. **Autosave + watcher** — 500 ms debounced write-back, poll `lastModified`
   for external edits.
5. **Resolve modal + settings + Playwright + deploy** — resolve-task flow,
   settings shell, smoke tests, public demo URL.

## Scripts

- `pnpm dev` — Vite dev server.
- `pnpm build` — Static build to `dist/`.
- `pnpm preview` — Serve the built output.
- `pnpm test` — Vitest suite (happy-dom).
- `pnpm lint` — ESLint.
- `pnpm typecheck` — svelte-check.
