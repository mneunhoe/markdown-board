# Sync recipes

markdown-board ships **no sync engine** (see plan §1, non-goals). A vault is
just a folder of Markdown files, so you sync it with whatever you already use.
This page covers the common options and how the app behaves when files change
underneath it.

## How the app reacts to external changes

The app watches the open vault's `TASKS.md`. When it changes on disk:

- **No unsaved local edits** → the app quietly reloads the on-disk version.
- **You have unsaved edits _and_ the file also changed on disk** → a
  **conflict dialog** opens showing _Yours_ vs _On disk_ (and the last-saved
  version on demand), with **Keep mine**, **Take theirs**, and an editable
  **merge** box. Autosave pauses until you choose, so nothing is clobbered.

This means it is safe to point a sync tool at the vault folder; the worst case
is a conflict prompt rather than silent data loss. Custom `theme.yaml` edits
also hot-reload the same way (see [theming](./theming.md)).

## iCloud Drive (macOS / iOS)

Put the vault inside `~/Library/Mobile Documents/com~apple~CloudDocs/` (i.e.
anywhere under iCloud Drive). iCloud may _evict_ unused files to save space —
keep the vault folder "Always download" (right-click → **Download Now** /
disable "Optimize Mac Storage") so `TASKS.md` is always present on disk.

## Dropbox

Place the vault under your Dropbox folder. Use **Make available offline** /
"Online-only off" so files are local. Dropbox keeps `.conflicted` copies if two
machines write at once; the app won't read those automatically — open the
conflicted copy, reconcile by hand, and delete it.

## Syncthing

Add the vault folder as a Syncthing share. Recommended settings:

- Enable **file versioning** (Staggered or Simple) as a safety net.
- Be aware Syncthing also syncs hidden files — exclude `.DS_Store` and editor
  cruft via `.stignore` if you like; leave `theme.yaml` /
  `.markdown-board.json` in.

Near-simultaneous edits on two devices can produce a Syncthing
`sync-conflict` file; resolve those manually like Dropbox's.

## Plain git repository

A vault is a tidy git repo: text files, line-oriented, diff-friendly.

```sh
cd my-vault
git init
printf '.DS_Store\n' > .gitignore
git add . && git commit -m "Initial vault"
```

- Commit/push on your own cadence (or via a scheduled job).
- Merge conflicts in `TASKS.md` resolve like any text conflict; the canonical
  serialization (one task per line) keeps diffs small.
- The in-app conflict dialog and git operate independently. Pulling while the
  app is open with unsaved edits triggers the in-app conflict prompt; if the app
  is closed, resolve in git as usual.

## General tips

- Let one device "win" for a given editing session rather than editing the same
  vault on two machines simultaneously.
- Keep the sync client running so changes propagate before you switch devices.
- The grammar profile (default vs `obsidian-tasks`) is an app-level setting, not
  stored in the vault — set it the same on each device if you sync across them,
  or files will be rewritten into whichever profile is active.
