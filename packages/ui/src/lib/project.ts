/**
 * Project name helpers shared by ProjectPill and (later) ProjectFilter / board
 * grouping. Mirrors `dashboard.html:2586-2601`:
 *
 * - `projectShort('PSD_GAN — open decisions')` → `'PSD_GAN'`
 *   The display / filter key is the prefix before the first em-dash, en-dash,
 *   or colon, trimmed. Empty result → `null`.
 *
 * - `projectColor(name, overrides?)` → `'hsl(${hue}, 52%, 45%)'`
 *   Stable FNV-1a-style hash mapping a short name to an HSL hue. A per-project
 *   override (keyed by short name, a CSS colour string) wins when present.
 *   `null` / empty → `'var(--text-muted)'` so call sites can always assign the
 *   result to `--project-color`.
 *
 * Project-colour overrides reach `ProjectPill` via a Svelte context keyed by
 * `PROJECT_COLOR_OVERRIDES_KEY` (a `() => Record<string,string>` accessor),
 * so the board recolours reactively when the user edits them in Settings —
 * without threading a prop through every view / card.
 */

export const PROJECT_COLOR_OVERRIDES_KEY = Symbol('mb:project-color-overrides');

export function projectShort(fullTag: string | null | undefined): string | null {
  if (!fullTag) return null;
  const head = fullTag.split(/[—–:]/)[0]?.trim();
  return head ? head : null;
}

function hashHue(name: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h % 360;
}

export function projectColor(
  name: string | null | undefined,
  overrides?: Record<string, string>,
): string {
  if (!name) return 'var(--text-muted)';
  const override = overrides?.[name];
  if (override) return override;
  return `hsl(${hashHue(name)}, 52%, 45%)`;
}

function hslToHex(h: number, s: number, l: number): string {
  const sf = s / 100;
  const lf = l / 100;
  const c = (1 - Math.abs(2 * lf - 1)) * sf;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lf - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Hex form of a project's effective colour, for an `<input type="color">`
 * (which only accepts `#rrggbb`). Returns an override verbatim when it already
 * looks like a hex string, otherwise the hashed default converted to hex.
 */
export function projectColorHex(
  name: string | null | undefined,
  overrides?: Record<string, string>,
): string {
  if (!name) return '#8c8c8a';
  const override = overrides?.[name];
  if (override && /^#[0-9a-fA-F]{6}$/.test(override)) return override;
  return hslToHex(hashHue(name), 52, 45);
}
