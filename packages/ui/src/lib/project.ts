/**
 * Project name helpers shared by ProjectPill and (later) ProjectFilter / board
 * grouping. Mirrors `dashboard.html:2586-2601`:
 *
 * - `projectShort('PSD_GAN — open decisions')` → `'PSD_GAN'`
 *   The display / filter key is the prefix before the first em-dash, en-dash,
 *   or colon, trimmed. Empty result → `null`.
 *
 * - `projectColor(name)` → `'hsl(${hue}, 52%, 45%)'`
 *   Stable FNV-1a-style hash mapping a short name to an HSL hue. `null` /
 *   empty → `'var(--text-muted)'` so call sites can always assign the result
 *   to `--project-color`.
 */

export function projectShort(fullTag: string | null | undefined): string | null {
  if (!fullTag) return null;
  const head = fullTag.split(/[—–:]/)[0]?.trim();
  return head ? head : null;
}

export function projectColor(name: string | null | undefined): string {
  if (!name) return 'var(--text-muted)';
  let h = 2166136261 >>> 0;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const hue = h % 360;
  return `hsl(${hue}, 52%, 45%)`;
}
