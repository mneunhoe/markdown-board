# Keyboard shortcuts

`Mod` is **⌘ Cmd** on macOS and **Ctrl** on Windows/Linux, so the same binding
works everywhere.

| Shortcut      | Action                    |
| ------------- | ------------------------- |
| `Mod+K`       | Open the command palette  |
| `Mod+O`       | Open a vault              |
| `Mod+,`       | Open settings             |
| `Mod+Shift+L` | Toggle light / dark theme |
| `Mod+1`       | Go to Board               |
| `Mod+2`       | Go to List                |
| `Mod+3`       | Go to Library             |
| `Mod+4`       | Go to Overview            |

Every action is also reachable from the **command palette** (`Mod+K`), which
fuzzy-matches on the action name.

## Remapping

Shortcut overrides are stored per command id under `shortcuts` in your settings
(`markdown-board:settings`). An override replaces the default binding; an empty
string unbinds the default entirely. For example:

```json
{
  "shortcuts": {
    "go-list": "Mod+L",
    "command-palette": ""
  }
}
```

A combo is written as modifiers joined with `+`, ending in the key — e.g.
`Mod+Shift+L`. Recognised modifiers are `Mod`, `Shift`, and `Alt`. (An in-app
editor for these lands with the expanded Settings UI.)

Command ids: `command-palette`, `open-vault`, `open-settings`, `toggle-theme`,
`reload-theme`, `go-board`, `go-list`, `go-library`, `go-overview`.

## Notes

- Shortcuts that carry `Mod` or `Alt` still fire while you're typing in a field;
  plain or `Shift`-only combos are ignored there so they don't interrupt typing.
- While the command palette is open it owns the keyboard (arrows to move, Enter
  to run, Esc to close); only `Mod+K` is honoured globally, to close it.
- On the **web** demo, some browsers reserve combos like `Mod+1`–`Mod+4` (tab
  switching); the desktop app is not affected.
