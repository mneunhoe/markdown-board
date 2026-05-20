# week-view

First-party markdown-board plugin: a **Week** view — a seven-column board
(Mon–Sun) grouping tasks by their `day` field.

- Adds a "Week" tab; switchable from the command palette ("Go to Week").
- Each column lists the tasks scheduled for that weekday (across all sections),
  with a count and the date; today's column is highlighted.
- Drag a card to another column to reschedule it (sets the task's `day`).
- Cards reuse the shared `TaskCard`, so resolve + full-edit work inline.

Day bucketing and week anchoring live in `@markdown-board/core`
(`bucketTasksByDay`, `weekStart`, `weekDates`). Ported from the legacy
`dashboard.html` (~lines 3491–3598).
