# ical-export

First-party markdown-board plugin: export the current week's scheduled tasks
as an `.ics` (RFC 5545) calendar file.

- Adds a "↓ Export week (.ics)" button to the view toolbar, plus an
  "Export week to .ics" palette command.
- Each dated, unchecked task becomes an all-day VEVENT on its weekday, with a
  stable FNV-1a UID (so re-imports update rather than duplicate), project /
  priority / section / subtasks in the description, and proper line folding.
- The file is handed to the host's `saveFile` — a browser download on web, a
  native save dialog on desktop.

The RFC 5545 builder (`src/ical.ts`) is pure; week anchoring + day bucketing
come from `@markdown-board/core`. Ported from the legacy `dashboard.html`
(~lines 3779–3921).
