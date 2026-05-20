// scaffoldVault — seed a folder with starter files so a freshly created
// vault opens to a populated board + library instead of an empty state.
//
// Write-if-missing: each template is written only when the target file does
// not already exist, so pointing this at a folder that already holds a vault
// never clobbers the user's content. Mirrors the richer
// `examples/starter-vault/` layout (TASKS.md + DASHBOARD.md + a small
// cross-linked library) but stays generic and LLM-agnostic. theme.yaml and
// archive/ are intentionally skipped: the former would reference font/logo
// files that don't exist yet, the latter is created on the first resolve.

import { FileNotFoundError, type FileAdapter } from '@markdown-board/core';

const TASKS_MD = `# Tasks

## Active
- [ ] **[P1] [Mon] Make this vault yours** - edit TASKS.md here or in any text editor <!-- id:starter01 -->
- [ ] **[P2] Read DASHBOARD.md** - pinned notes live there <!-- id:starter02 -->
- [ ] **[pom:2] Skim the library** - long-form notes in \`library/\` <!-- id:starter03 -->

## Doing
- [ ] **Try resolving a task** - resolved tasks are appended to \`archive/TASKS.md\` <!-- id:starter04 -->

## Done
- [x] **Create this vault** <!-- id:starter05 -->
`;

const DASHBOARD_MD = `# Dashboard

Pinned notes that stay visible in the Overview tab. This file is optional —
delete it if you don't need it.

## Today

Free-form notes about today: what you're focused on, what's blocked, what
you're waiting on.

## This week

Anything bigger than a day but smaller than a project.

## Notes to self

- Task tokens in \`TASKS.md\`: \`[P0]\`–\`[P3]\` priority, \`[Mon]\`–\`[Sun]\` day-of-week, \`[pom:N]\` pomodoro count.
- Long-form notes live in \`library/\`. Wiki-style \`[[links]]\` resolve to other notes; each note shows a "Linked from" backlinks panel.
`;

const GLOSSARY_MD = `# Glossary

Acronyms and shorthand used across this vault.

**WIP:** work in progress.

**TODO:** something to do later.
`;

const EXAMPLE_PROJECT_MD = `# Example Project

**Status:** active

**Owner:** [[Example Person]]

## Goal

What we're trying to accomplish, in one paragraph. Free-form Markdown below —
link to any other note with \`[[double brackets]]\`.

## Open questions

- What does "done" look like?
- Who else needs to weigh in?
`;

const EXAMPLE_PERSON_MD = `# Example Person

**Role:** collaborator

## Context

Where they fit, what they care about, how to work with them. Currently leading
the [[Example Project]].

## Recent interactions

- First intro call
`;

interface ScaffoldFile {
  path: string;
  contents: string;
}

const STARTER_FILES: ScaffoldFile[] = [
  { path: 'TASKS.md', contents: TASKS_MD },
  { path: 'DASHBOARD.md', contents: DASHBOARD_MD },
  { path: 'library/glossary.md', contents: GLOSSARY_MD },
  { path: 'library/projects/example-project.md', contents: EXAMPLE_PROJECT_MD },
  { path: 'library/people/example-person.md', contents: EXAMPLE_PERSON_MD },
];

async function fileExists(adapter: FileAdapter, path: string): Promise<boolean> {
  try {
    await adapter.readFile(path);
    return true;
  } catch (err) {
    if (err instanceof FileNotFoundError) return false;
    throw err;
  }
}

/**
 * Write the starter files into `adapter`, skipping any that already exist.
 * Returns the paths that were actually created so the caller can distinguish
 * "scaffolded a fresh vault" from "opened a folder that already had one".
 */
export async function scaffoldVault(adapter: FileAdapter): Promise<{ created: string[] }> {
  const created: string[] = [];
  for (const file of STARTER_FILES) {
    if (await fileExists(adapter, file.path)) continue;
    await adapter.writeFile(file.path, file.contents);
    created.push(file.path);
  }
  return { created };
}
