import type { LibraryDoc, LibraryTable } from './types.js';

const H1_RE = /^# (.*)$/;
const H2_RE = /^## (.*)$/;
const COLUMN_FIELD_RE = /^\*\*(.+?):\*\*\s*(.*)$/;
const LIST_FIELD_RE = /^-\s+\*\*(.+?):\*\*\s*(.*)$/;
const TABLE_ROW_RE = /^\|.*\|$/;
const TABLE_SEPARATOR_RE = /^\|[\s\-:|]+\|$/;

export function parseLibrary(content: string): LibraryDoc {
  const normalised = content.replace(/\r\n?/g, '\n');
  const lines = normalised.split('\n');

  const doc: LibraryDoc = {
    title: '',
    fields: {},
    sections: { _intro: '' },
    tables: [],
    rawContent: normalised,
    path: '',
  };

  const sectionLines: Record<string, string[]> = { _intro: [] };
  let currentSection = '_intro';

  for (const line of lines) {
    const h1 = H1_RE.exec(line);
    if (h1) {
      doc.title = h1[1]!.trim();
      continue;
    }

    const h2 = H2_RE.exec(line);
    if (h2) {
      currentSection = h2[1]!.trim();
      sectionLines[currentSection] = [];
      continue;
    }

    const col = COLUMN_FIELD_RE.exec(line);
    if (col) {
      doc.fields[col[1]!] = col[2]!;
      continue;
    }

    const list = LIST_FIELD_RE.exec(line);
    if (list) {
      doc.fields[list[1]!] = list[2]!;
      continue;
    }

    sectionLines[currentSection]!.push(line);
  }

  for (const [key, arr] of Object.entries(sectionLines)) {
    doc.sections[key] = arr.join('\n').trim();
  }

  doc.tables = extractTables(lines);
  return doc;
}

function extractTables(lines: string[]): LibraryTable[] {
  const tables: LibraryTable[] = [];

  let i = 0;
  while (i < lines.length - 1) {
    const headerLine = lines[i]!;
    const sepLine = lines[i + 1]!;
    if (!TABLE_ROW_RE.test(headerLine) || !TABLE_SEPARATOR_RE.test(sepLine)) {
      i += 1;
      continue;
    }

    const headers = splitRow(headerLine);
    const rows: string[][] = [];
    let j = i + 2;
    while (j < lines.length && TABLE_ROW_RE.test(lines[j]!)) {
      rows.push(splitRow(lines[j]!));
      j += 1;
    }

    if (rows.length > 0) {
      tables.push({ headers, rows });
      i = j;
    } else {
      i += 1;
    }
  }

  return tables;
}

function splitRow(line: string): string[] {
  let body = line;
  if (body.startsWith('|')) body = body.slice(1);
  if (body.endsWith('|')) body = body.slice(0, -1);
  return body.split('|').map((cell) => cell.trim());
}
