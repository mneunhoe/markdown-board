// Legacy H3 → [project:Name] migration helper.
//
// Phase 1 deliverable per `plan.md` §6.1 and `notes/dashboard-spec.md` §15.1
// (Q1). The v1 grammar drops the prototype's `### Project Name` sub-section
// pattern in favour of an inline `[project:Name]` token on the task line.
// Legacy `claude_life`-style vaults need a one-time consented rewrite before
// they parse cleanly under v1; this is the text-level helper that the
// "Migrate this vault?" prompt invokes.
//
// Text-in / text-out by design: the parser stays focused on the v1 grammar
// and never has to special-case the legacy shape. The migration output is a
// v1-grammar-compliant string the caller can save to disk and feed to
// `parseTasks` afterwards.
//
// Idempotent: running on already-migrated input is a no-op (after CRLF
// normalisation), so the UI can re-invoke it safely.
//
// Note canonical-order. The injected token is placed inside the bold span
// in a parser-friendly position, not canonical. The `parseTasks` → `toMarkdown`
// cycle that follows canonicalises tokens (§15.1 / Q3-ish — same rule as the
// rest of the grammar).

const H2_RE = /^## \*{0,2}(.+?)\*{0,2}$/;
const H3_RE = /^### \*{0,2}(.+?)\*{0,2}$/;
const TASK_LINE_RE = /^- \[[ xX]\]\s+(.*)$/;
const SUBTASK_LINE_RE = /^\s+- \[[ xX]\]/;
const EXISTING_PROJECT_TOKEN_RE = /\[\s*project:\s*[^\]]+\]/i;

export interface MigrateLegacyH3Result {
  /** The rewritten Markdown content. Line endings normalised to `\n`. */
  content: string;
  /** Number of `### …` lines removed from inside H2 sections. */
  h3RemovedCount: number;
  /** Number of task lines that received a new `[project:Name]` token. */
  taskTaggedCount: number;
}

export function migrateLegacyH3Buckets(input: string): MigrateLegacyH3Result {
  const lines = input.split(/\r?\n/);
  const out: string[] = [];
  let inSection = false;
  let currentProject: string | null = null;
  let h3RemovedCount = 0;
  let taskTaggedCount = 0;

  for (const line of lines) {
    const h2 = H2_RE.exec(line);
    if (h2) {
      inSection = true;
      currentProject = null;
      out.push(line);
      continue;
    }

    const h3 = H3_RE.exec(line);
    if (h3 && inSection) {
      currentProject = h3[1]!.trim();
      h3RemovedCount++;
      continue;
    }

    if (SUBTASK_LINE_RE.test(line)) {
      out.push(line);
      continue;
    }

    const task = TASK_LINE_RE.exec(line);
    if (task && currentProject !== null) {
      if (EXISTING_PROJECT_TOKEN_RE.test(task[1]!)) {
        out.push(line);
      } else {
        out.push(injectProjectToken(line, currentProject));
        taskTaggedCount++;
      }
      continue;
    }

    out.push(line);
  }

  return { content: out.join('\n'), h3RemovedCount, taskTaggedCount };
}

const BOLD_TASK_RE = /^(- \[[ xX]\]\s+)\*\*(.*)$/;
const PLAIN_TASK_RE = /^(- \[[ xX]\]\s+)(.*)$/;

function injectProjectToken(line: string, project: string): string {
  const bold = BOLD_TASK_RE.exec(line);
  if (bold) {
    return `${bold[1]}**[project:${project}] ${bold[2]}`;
  }
  const plain = PLAIN_TASK_RE.exec(line);
  if (plain) {
    return `${plain[1]}[project:${project}] ${plain[2]}`;
  }
  return line;
}
