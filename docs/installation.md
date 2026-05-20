# Installation

markdown-board ships as a desktop app for macOS, Windows, and Linux. Grab the
latest build from the [GitHub Releases page][releases] and follow the steps for
your platform.

> **Heads up — builds are not yet OS-code-signed.** The app is functional and
> auto-updates are cryptographically verified (see [auto-update.md][au]), but
> until an Apple Developer ID / Windows Authenticode certificate is in place,
> your OS will show a "unverified developer" warning on first launch. The
> one-time steps to get past it are below.

[releases]: https://github.com/mneunhoe/markdown-board/releases/latest
[au]: ./auto-update.md

## macOS

1. Download the `.dmg` (`markdown-board_<version>_<arch>.dmg`). The universal
   build runs on both Apple Silicon and Intel.
2. Open the `.dmg` and drag **markdown-board** to `Applications`.
3. First launch (unsigned build): a double-click shows _"markdown-board can't be
   opened because Apple cannot check it for malicious software."_ Get past it
   once, either way:
   - **Right-click** the app in `Applications` → **Open** → **Open**, or
   - run `xattr -dr com.apple.quarantine "/Applications/markdown-board.app"`.

   After that it opens normally. Once Developer ID signing + notarization land,
   this step disappears.

## Windows

1. Download the NSIS installer (`markdown-board_<version>_x64-setup.exe`).
2. Run it. On an unsigned build, **SmartScreen** shows _"Windows protected your
   PC"_ → click **More info** → **Run anyway**.
3. Follow the installer. The app installs per-user and appears in the Start
   menu.

## Linux

Two formats are published:

- **`.deb`** (Debian/Ubuntu): `sudo apt install ./markdown-board_<version>_amd64.deb`
  (or `sudo dpkg -i …` then `sudo apt-get -f install` to pull deps).
- **`.AppImage`** (portable): `chmod +x markdown-board_<version>_amd64.AppImage`
  then run it.

markdown-board needs a WebKitGTK runtime (`libwebkit2gtk-4.1`). The `.deb`
declares it as a dependency; for the AppImage, install it via your package
manager if the app fails to start. A Flathub package is planned.

## First run

There's no account and no cloud — markdown-board edits plain Markdown files in a
folder you choose:

1. Click **Pick a vault folder** (or **drag a folder onto the window**).
2. Choose a folder containing a `TASKS.md` (an optional `library/` directory and
   `archive/TASKS.md` are picked up too).
3. Your board renders immediately. Edits autosave back to the files, and the app
   reloads if something else (an editor, a sync client) changes them on disk.

Recently opened vaults appear on the start screen for one-click reopen, and
**New window** opens a second vault side by side.

## Building from source

```bash
pnpm install
pnpm --filter @markdown-board/desktop tauri build
```

The bundle lands in `packages/desktop/src-tauri/target/release/bundle/`. See
[contributing.md](./contributing.md) for the full dev setup.
