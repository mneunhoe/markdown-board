# Plugin API

markdown-board plugins are small ES modules that export an `activate` function.
They run **in-process, unsandboxed**, with full access to the app and your vault
(see the [trust model](#trust-model)). The contract lives in
[`@markdown-board/plugin-api`](../packages/plugin-api/src/index.ts); this page is
the practical guide.

## A hello-world plugin

A plugin is a directory with a `plugin.json` manifest and a bundled JS entry:

```
my-plugin/
  plugin.json
  main.js
```

`plugin.json`:

```json
{
  "id": "hello",
  "name": "Hello",
  "version": "1.0.0",
  "entry": "main.js",
  "minAppVersion": "1.0.0",
  "description": "Says hello from the command palette."
}
```

`main.js` (a single self-contained ES module):

```js
export function activate(api) {
  api.commands.register('greet', () => api.ui.notify('Hello from a plugin!'), {
    title: 'Hello: greet',
    group: 'Hello',
  });
}

export function deactivate() {
  // Optional. Anything you registered is disposed automatically; use this only
  // for resources the host doesn't track (timers, listeners you created).
}
```

Drop the folder into `<your-vault>/.markdown-board/plugins/hello/` and reopen
the vault on the **desktop** app. Open the command palette (`Cmd/Ctrl-K`), run
"Hello: greet", and you'll see the notice.

## What `activate(api)` can do

The `api` (a `PluginContext`) exposes:

| Area         | Call                                                   | Notes                                                     |
| ------------ | ------------------------------------------------------ | --------------------------------------------------------- |
| Commands     | `api.commands.register(id, run, opts?)`                | Appears in the palette; `opts.keybinding` sets a default. |
| Views        | `api.views.register(id, Component, { title })`         | Adds a top-level tab. Component reads `getViewContext()`. |
| Slots        | `api.slots.register('header' \| 'view-toolbar', Comp)` | Mounts UI in the header or above the active view.         |
| Task actions | `api.taskActions.register({ id, label, icon, run })`   | Adds a per-card button; `run({ taskId, sectionId })`.     |
| Hooks        | `api.hooks.on(event, handler)`                         | `vault.opened/saved`, `task.created/updated/resolved`.    |
| Storage      | `api.storage.get/set/delete/keys`                      | Per-plugin JSON in `.markdown-board/plugins/<id>.json`.   |
| Tasks        | `api.tasks.find(ref)` / `api.tasks.mutate(ref, fn)`    | Read / mutate a task in the live vault (autosaves).       |
| UI           | `api.ui.saveFile(name, text, mime?)` / `api.ui.notify` | Save a file (download / dialog); show a status message.   |
| Settings     | `api.settings.get()`                                   | Your manifest `settings` schema, defaults applied.        |
| Log          | `api.log.info/warn/error`                              | Namespaced console logging.                               |

Each `register` / `on` returns a `Disposable`; the host disposes them all when
the plugin is disabled or the vault closes.

### Settings schema

Declare settings in the manifest to get inputs in **Settings → Plugins**:

```json
"settings": [
  { "key": "focus", "label": "Focus minutes", "type": "number", "default": 25, "min": 1, "max": 180 }
]
```

Read the resolved values with `api.settings.get()`.

### Svelte views & slots

View / slot components are Svelte 5 components. They take no props — read the
live vault and host handlers from the shell's view context:

```svelte
<script>
  import { getViewContext } from '@markdown-board/shell';
  const view = getViewContext();
  const vault = $derived(view.getVault());
</script>
```

(First-party plugins import `@markdown-board/shell` directly; bundled
third-party plugins should externalise it — see below.)

## Versioning & compatibility

`PLUGIN_API_VERSION` is `1.0.0`. The host activates a plugin only when its
`minAppVersion` shares the host's **major** version and is ≤ the host version.
Breaking changes bump the major.

## Distribution

- **First-party** plugins live in `plugins/*` and are bundled into the app.
- **Third-party** plugins (desktop) load from
  `<vault>/.markdown-board/plugins/<id>/`. The `entry` is imported from a blob
  URL, so it must be a **single self-contained ES module** with no bare
  `import` specifiers (bundle your dependencies; treat `@markdown-board/*` as
  externals the host provides). Web builds load first-party plugins only.

## Trust model

Plugins are **not sandboxed**. They execute in the app process with the same
file-system reach as the app and can read/write anything in your vault. Install
only plugins you trust. There is no marketplace or signing; see
[`plugins.md`](./plugins.md) for the bundled list.
