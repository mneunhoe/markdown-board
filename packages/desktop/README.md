# @markdown-board/desktop

Tauri 2 desktop shell. Phase 2 of the [hand-off plan]; ships the native
window, file watcher, and `TauriFileAdapter` that the web shell models in
its FSA implementation.

## Status

- ✅ **Slice 1 — scaffold** (2026-05-19). Tauri 2.11 + Vite + Svelte 5
  front-end with a placeholder IPC probe. `pnpm tauri dev` boots a window
  that confirms the Vite ↔ Tauri ↔ Rust path. No vault picker yet.
- ⏳ **Slice 2 — `TauriFileAdapter`** (next).
- ⏳ Slice 3 — Native file watcher (Rust `notify`).
- ⏳ Slice 4 — Drag-and-drop folder → open vault.
- ⏳ Slice 5 — Recent-vaults menu, multi-window.
- ⏳ Codesign / notarize / bundle (macOS, Windows, Linux) + `release.yml`.

## Layout

```
packages/desktop/
├── index.html              Vite entry
├── package.json
├── svelte.config.js
├── tsconfig.json
├── vite.config.ts          Tauri-tuned (port 1420, src-tauri excluded from watch)
├── src/
│   ├── App.svelte          Placeholder IPC probe
│   ├── app.css
│   ├── main.ts             Svelte 5 mount
│   └── vite-env.d.ts
└── src-tauri/
    ├── Cargo.toml          tauri = "2", tauri-build = "2"
    ├── build.rs
    ├── tauri.conf.json     bundle.active = false (real bundle config lands with codesign)
    ├── capabilities/
    │   └── default.json    core:default only (fs scopes land in slice 2)
    ├── icons/              Placeholder PNGs (real icons land with codesign)
    └── src/
        └── main.rs         Minimal tauri::Builder::default().run(generate_context!())
```

## Dev

```sh
# Front-end only (loads in a plain browser; IPC probe will show "unavailable")
pnpm --filter @markdown-board/desktop dev

# Full desktop shell (boots the native window via Tauri)
pnpm --filter @markdown-board/desktop tauri dev
```

`pnpm tauri dev` spawns `pnpm dev` for the Vite front-end, waits for
`devUrl` (http://localhost:1420), then launches the OS window.

## Build

```sh
# Front-end bundle only
pnpm --filter @markdown-board/desktop build

# Full Tauri build (no installers yet; bundle.active is false)
pnpm --filter @markdown-board/desktop tauri build
```

## Toolchain

- Node ≥ 20, pnpm 9.12.3 (Corepack-pinned in the repo root)
- Rust 1.77+ stable (`rustup default stable`)
- macOS: Xcode Command Line Tools
- Linux: `webkit2gtk-4.1`, `libayatana-appindicator3-dev`, `librsvg2-dev`
- Windows: WebView2 (ships with modern Windows 10/11)
