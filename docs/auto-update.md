# Auto-update & releases

markdown-board updates itself from GitHub Releases using Tauri's updater.

## How it works

1. On launch the app fetches the update manifest from the configured endpoint:
   `https://github.com/mneunhoe/markdown-board/releases/latest/download/latest.json`.
2. If `latest.json` advertises a version newer than the running build, the app
   shows a native prompt: _"markdown-board vX.Y.Z is available — download and
   restart to update now?"_
3. On confirmation it downloads the platform artifact, verifies its **minisign
   signature** against the public key baked into the app, installs it, and
   relaunches.

A failed check (offline, GitHub unreachable) is silent and never blocks
startup. The client lives in `packages/desktop/src/lib/updater.ts`.

## Two independent signatures — don't confuse them

| Signature              | Purpose                                                                                                                                                    | Status                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Updater (minisign)** | Gates whether installed apps will _accept_ an update. Required for auto-update to function at all.                                                         | **Active** — key generated, pubkey shipped. |
| **OS code-signing**    | Apple Developer ID + notarization / Windows Authenticode. Removes the Gatekeeper/SmartScreen first-launch warning. Has **nothing** to do with auto-update. | **Gated/off** — pending certificates.       |

So: auto-update works today on unsigned OS builds (the minisign signature is
what's verified). Users still see a one-time OS warning until code-signing
certs are wired — see [installation.md](./installation.md).

## CI secrets

`release.yml` reads these repository secrets. Absent secrets resolve to empty,
so the build still succeeds — just unsigned / without updater artifacts.

| Secret                               | Purpose                                         | Needed for         |
| ------------------------------------ | ----------------------------------------------- | ------------------ |
| `TAURI_SIGNING_PRIVATE_KEY`          | minisign private key (contents of the key file) | updater artifacts  |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | password for that key (empty for our key)       | updater artifacts  |
| `APPLE_CERTIFICATE`                  | base64 of the Developer ID `.p12`               | macOS signing      |
| `APPLE_CERTIFICATE_PASSWORD`         | password for the `.p12`                         | macOS signing      |
| `APPLE_SIGNING_IDENTITY`             | e.g. `Developer ID Application: Name (TEAMID)`  | macOS signing      |
| `APPLE_ID`                           | Apple ID email                                  | macOS notarization |
| `APPLE_PASSWORD`                     | app-specific password for that Apple ID         | macOS notarization |
| `APPLE_TEAM_ID`                      | Apple Developer Team ID                         | macOS notarization |
| `WINDOWS_CERTIFICATE`                | base64 of the Authenticode `.pfx` _(follow-up)_ | Windows signing    |
| `WINDOWS_CERTIFICATE_PASSWORD`       | password for the `.pfx` _(follow-up)_           | Windows signing    |

### The updater key

Generated once with `pnpm --filter @markdown-board/desktop exec tauri signer
generate`. The **public** key lives in `tauri.conf.json`
(`plugins.updater.pubkey`); the **private** key is uploaded to the
`TAURI_SIGNING_PRIVATE_KEY` secret and **must be backed up safely**. If it's
lost, you cannot ship updates that existing installs will accept — you'd have to
distribute a new public key, and users would need to reinstall manually.

### macOS code-signing

`tauri-action` signs + notarizes automatically once the `APPLE_*` secrets are
present; no workflow change needed. Without them the macOS job produces an
unsigned `.app`/`.dmg`.

### Windows code-signing (follow-up)

Stock Tauri signs Windows bundles via `bundle.windows.certificateThumbprint` in
`tauri.conf.json`, with the certificate imported into the runner's certificate
store. This is deferred until an Authenticode certificate is acquired; the
secret slots above are reserved for it.

## Cutting a release

1. Bump the version in `packages/desktop/src-tauri/tauri.conf.json` (and keep
   `Cargo.toml` in sync).
2. Tag and push: `git tag v0.2.0 && git push origin v0.2.0`.
3. `release.yml` fans out across macOS / Linux / Windows runners, builds the
   bundles, and uploads them — plus a signed `latest.json` — to a **draft**
   GitHub Release.
4. Review the draft, then **publish** it. Published is what the
   `releases/latest` updater endpoint resolves to, so installed apps will offer
   the update on their next launch.

To verify auto-update end to end: install `v0.2.0`, publish `v0.2.1`, relaunch
`v0.2.0`, and confirm it prompts → updates → reopens as `v0.2.1`.
