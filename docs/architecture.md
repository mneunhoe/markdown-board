# Architecture

Placeholder. Lands in Phase 1 alongside the core grammar work.

Will cover:

- Monorepo layout (`packages/core`, `packages/ui`, `packages/web`, `packages/desktop`, `packages/plugin-api`).
- The `FileAdapter` interface and how the web (FSA) and desktop (Tauri) shells implement it.
- State flow: parse → in-memory model → mutations → debounced autosave → external-change watcher.
- Round-trip guarantee between disk and UI.
