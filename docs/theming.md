# Theming

markdown-board ships with light and dark themes out of the box (set under
**Settings → Theme**: System / Light / Dark). You can also fully customise the
look of a vault — colours, fonts, and the header logo — by dropping a
`theme.yaml` file in the **vault root**. It takes effect immediately, with no
restart, and updates live as you edit it.

```
my-vault/
├── TASKS.md
├── theme.yaml          ← your theme
├── fonts/
│   └── Inter.woff2
└── assets/
    └── logo.svg
```

## Quick start

```yaml
name: Sunset
colors:
  accent: '#e8633a'
  background: '#fbf6f0'
  card: '#ffffff'
  text: '#241c17'
logo: assets/logo.svg
```

Save it, and the accent colour, background, and header logo update at once.

## Colours

Each key under `colors` maps to an internal design token. You only need to set
the ones you want to change; everything else falls back to the built-in theme.

| Key             | What it controls             |
| --------------- | ---------------------------- |
| `accent`        | Primary accent / interactive |
| `accentHover`   | Accent on hover              |
| `background`    | Main app background          |
| `surface`       | Secondary surfaces (top bar) |
| `card`          | Card backgrounds             |
| `text`          | Primary text                 |
| `textSecondary` | Secondary text               |
| `textMuted`     | Muted / hint text            |
| `border`        | Borders                      |
| `borderLight`   | Light dividers               |

Any CSS colour value works (`"#rrggbb"`, `rgb(...)`, `hsl(...)`, named colours).
Quote values that start with `#`, since `#` begins a comment in YAML.

## Light + dark variants

A theme applies in both light and dark mode. To tune dark mode separately, add a
`dark:` block — it only overrides the keys you list, and is applied when the
app is in dark mode (or when the OS prefers dark under the **System** setting).

```yaml
colors:
  background: '#fbf6f0'
  text: '#241c17'
dark:
  colors:
    background: '#1a1714'
    text: '#f0e8e0'
```

## Fonts

Set a font family by name (a system font or one already installed):

```yaml
fonts:
  body: 'Inter'
  mono: 'JetBrains Mono'
```

To ship a font with the vault, list the file(s) under `fonts.files` and
reference the family by name. Paths are relative to the vault root. Supported
formats: `woff2`, `woff`, `ttf`, `otf`.

```yaml
fonts:
  body: 'Inter'
  files:
    - family: 'Inter'
      src: fonts/Inter.woff2
      weight: '100 900' # a range, for variable fonts
```

## Logo

`logo` points at an image inside the vault that replaces the header wordmark.
SVG, PNG, JPEG, GIF, and WebP are supported.

```yaml
logo: assets/logo.svg
```

## Escape hatch: raw tokens

Anything not covered by a friendly key can be set directly with a `cssVars`
block, which maps internal `--token` names to values. These are applied last
and win over the friendly keys. For example, to recolour the day-of-week chips:

```yaml
cssVars:
  '--day-mon': 'hsl(210, 60%, 50%)'
  '--day-fri': 'hsl(0, 65%, 52%)'
```

## Troubleshooting

If `theme.yaml` has a problem (a syntax error, an unknown key, or a font/logo
file that can't be found), the app stays fully usable and shows a **"Theme
issue"** indicator in the top bar — hover it to see the details. Valid parts of
the file are still applied; only the offending entries are skipped.
