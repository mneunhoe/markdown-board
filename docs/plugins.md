# Plugins

markdown-board ships a small set of **first-party plugins** and can load
**third-party plugins** from a vault on desktop. Manage them in
**Settings → Plugins** (toggle on/off, configure). For building your own, see
[`plugin-api.md`](./plugin-api.md).

## Bundled (first-party) plugins

| Plugin          | What it adds                                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Pomodoro**    | A header timer chip + a per-card "start" button; counts pomodoros per task. Configurable focus / break durations. |
| **Week view**   | A "Week" tab — a seven-column day board with drag-to-reschedule.                                                  |
| **iCal export** | A toolbar button + palette command to export the week's scheduled tasks as an `.ics` file.                        |

All three are enabled by default. Disabling one in **Settings → Plugins**
removes its UI and stops loading its code.

## Third-party plugins (desktop)

Put a plugin folder under your vault:

```
<vault>/.markdown-board/plugins/<id>/
  plugin.json
  main.js   ← a single self-contained ES module
```

It's discovered and activated when you open the vault. See
[`plugin-api.md`](./plugin-api.md) for the manifest format and bundling
requirements. The web build loads first-party plugins only.

## Trust model

Plugins run **in-process and unsandboxed** — they have the same access to your
files as the app itself. There is no marketplace, sandbox, or signature check.
**Only install third-party plugins you trust**, and review their source first.

## Storage

Each plugin gets a private JSON file at
`<vault>/.markdown-board/plugins/<id>.json` for its settings/state. It's plain
text and travels with the vault (so it syncs across machines).
