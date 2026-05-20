// Pure week / day-of-week helpers shared by the week-view and ical-export
// plugins. `day` is already a first-class task field (§ grammar), so the
// bucketing + week-anchoring logic lives in core where it can be golden-tested.
//
// Ported from the legacy dashboard.html (`startOfWeek` ~3474, week bucketing
// ~3497).

import { WEEK_DAYS, type Day, type Task, type Vault } from './types.js';

/** A task plus where it lives, so callers can mutate it back (`{ taskId, sectionId }`). */
export interface WeekTaskRef {
  task: Task;
  sectionId: string;
  sectionName: string;
}

/**
 * The Monday that anchors the week containing `date`. On weekends we look
 * *ahead* to the coming Monday (matches the prototype: planning the next week
 * once the current one is done), Mon–Fri resolve to the current week's Monday.
 * Returns a new Date at local midnight.
 */
export function weekStart(date: Date): Date {
  const d = new Date(date);
  const dow = d.getDay(); // 0 = Sun … 6 = Sat
  let diff: number;
  if (dow === 0)
    diff = 1; // Sun → tomorrow (Mon)
  else if (dow === 6)
    diff = 2; // Sat → Mon
  else diff = 1 - dow; // Mon..Fri → this Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** The seven dates Mon→Sun for the week anchored at `start` (a `weekStart`). */
export function weekDates(start: Date): Date[] {
  return WEEK_DAYS.map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/**
 * Group every dated task in the vault by its weekday. Returns a record keyed
 * by every `Day` (empty arrays included), preserving section order then task
 * order. Tasks with no `day` are omitted (they have no column). Checked tasks
 * are kept — resolution removes them from the vault, so a checked-but-present
 * task is intentional.
 */
export function bucketTasksByDay(vault: Vault): Record<Day, WeekTaskRef[]> {
  const out = Object.fromEntries(WEEK_DAYS.map((d) => [d, [] as WeekTaskRef[]])) as Record<
    Day,
    WeekTaskRef[]
  >;
  for (const section of vault.sections) {
    for (const task of section.tasks) {
      if (task.day === null) continue;
      out[task.day].push({ task, sectionId: section.id, sectionName: section.name });
    }
  }
  return out;
}
