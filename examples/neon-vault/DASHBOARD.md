---
# Customized Overview for this vault. The custom cards count tasks matching
# each filter; builtins keeps only the open/total cards and the priority + day
# breakdowns (drops the section + library breakdowns and the checked card).
stats:
  - label: P0 blockers
    where: { priority: blocker }
  - label: Launch work
    where: { project: Launch }
  - label: This week
    where: { day: [Mon, Tue, Wed, Thu, Fri] }
  - label: Shipped
    where: { checked: true }
builtins:
  cards: [open, total]
  breakdowns: [priority, day]
---

# Neon Dashboard

Pinned notes for the launch sprint. The cards above are driven by the
frontmatter in this file — edit them to track whatever matters this week.

## Today

Cut the release branch first ([[Launch]] is blocked on it), then unblock the
Safari glow bug.

## This week

- Ship the announcement + screencast.
- Get the landing page to "good enough".

## Notes to self

- Tokens: `[P0]`–`[P3]` priority, `[project:Name]` project, `[Mon]`–`[Sun]` day, `[pom:N]` pomodoros.
- The dark theme flips the accent from neon pink to neon cyan — toggle it in Settings.
