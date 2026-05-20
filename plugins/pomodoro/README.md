# pomodoro

First-party markdown-board plugin: a focus-timer chip in the header plus a
per-task "start" button.

- **Header chip** — play / pause / stop, current phase, a streak indicator,
  and the linked task title.
- **Task action** — a `▶` button on each card starts a focus session for that
  task; completing the session increments the task's `[pom:N]` count.
- **Commands** — "Pomodoro: start / pause" and "Pomodoro: stop" in the palette.
- **Settings** — focus / short-break / long-break minutes and the long-break
  cadence (configured in the app's Settings → Plugins).
- **Persistence** — timer state is stored in the vault at
  `.markdown-board/plugins/pomodoro.json`, so a running session survives a
  reload (an expired session auto-completes on restore).

Ported from the legacy `dashboard.html` pomodoro (~lines 2205–2582).
