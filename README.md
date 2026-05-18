# markdown-board

Kanban-first knowledge workspace on plain Markdown files you own. Local-first,
file-based, cross-platform desktop (Tauri 2). No server, no account, no cloud.

> **Status: personal work-in-progress.** This is the rewrite of a single-file
> prototype into a shippable, open-source product. Working name —
> `markdown-board` — is a placeholder; final brand is settled before public
> 1.0. See the hand-off plan for the phased delivery schedule.

## Develop

Requires Node 20+ and pnpm. The pinned pnpm version is provisioned via
[Corepack](https://nodejs.org/api/corepack.html):

```bash
corepack enable
pnpm install
pnpm build
pnpm test
pnpm lint
```

## Repository layout

| Path                      | What it is                                                                        |
| ------------------------- | --------------------------------------------------------------------------------- |
| `packages/core`           | Pure-TS grammar, model, store (Phase 1)                                           |
| `packages/ui`             | Svelte 5 components and views (Phase 1)                                           |
| `packages/web`            | Static SvelteKit web demo with the File System Access API (Phase 1)               |
| `packages/desktop`        | Tauri 2 desktop shell (Phase 2)                                                   |
| `packages/plugin-api`     | Public plugin contract (Phase 4)                                                  |
| `packages/cli`            | Headless task ops (Phase 5+)                                                      |
| `plugins/*`               | First-party plugins: pomodoro, ical-export, week-view, archive-resolver (Phase 4) |
| `docs/*`                  | User-facing documentation                                                         |
| `examples/starter-vault/` | A ready-to-use workspace folder                                                   |
| `notes/*`                 | Internal hand-off notes (e.g. the legacy-dashboard parsing spec)                  |

## License

[MIT](./LICENSE)
