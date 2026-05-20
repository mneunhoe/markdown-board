// Pomodoro state machine, ported from the legacy dashboard.html (~2205–2582).
// Module-level reactive singleton shared by `main.ts` (which wires the plugin
// `api`) and `PomodoroChip.svelte` (which renders it). Timer state is persisted
// to plugin storage so it survives reloads / vault re-opens.

import type { PluginContext, TaskRef } from '@markdown-board/plugin-api';

export type Phase = 'idle' | 'focus' | 'short' | 'long';

export interface PomoSettings {
  focus: number;
  shortBreak: number;
  longBreak: number;
  longBreakEvery: number;
}

const DEFAULTS: PomoSettings = { focus: 25, shortBreak: 5, longBreak: 15, longBreakEvery: 4 };

interface PersistedState {
  phase: Phase;
  endTime: number | null;
  pausedRemainingMs: number | null;
  focusCount: number;
  currentTaskId: string | null;
  currentTaskSectionId: string | null;
  currentTaskTitle: string | null;
}

const STORAGE_KEY = 'state';

// Reactive display state (read by the chip).
export const pomo = $state({
  phase: 'idle' as Phase,
  endTime: null as number | null,
  pausedRemainingMs: null as number | null,
  focusCount: 0,
  currentTaskTitle: null as string | null,
  now: Date.now(),
});

// Non-reactive internals.
let currentTaskId: string | null = null;
let currentTaskSectionId: string | null = null;
let api: PluginContext | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;

function readSettings(): PomoSettings {
  const raw = api?.settings.get() ?? {};
  const num = (v: unknown, d: number): number =>
    typeof v === 'number' && Number.isFinite(v) ? v : d;
  return {
    focus: num(raw.focus, DEFAULTS.focus),
    shortBreak: num(raw.shortBreak, DEFAULTS.shortBreak),
    longBreak: num(raw.longBreak, DEFAULTS.longBreak),
    longBreakEvery: num(raw.longBreakEvery, DEFAULTS.longBreakEvery),
  };
}

function durationMs(phase: Phase): number {
  const s = readSettings();
  const minutes = phase === 'short' ? s.shortBreak : phase === 'long' ? s.longBreak : s.focus;
  return minutes * 60_000;
}

// ── Derived display helpers ──────────────────────────────────────────────────

export function isRunning(): boolean {
  return pomo.endTime !== null && pomo.pausedRemainingMs === null;
}
export function isPaused(): boolean {
  return pomo.pausedRemainingMs !== null;
}
export function isQueued(): boolean {
  return pomo.phase !== 'idle' && pomo.endTime === null && pomo.pausedRemainingMs === null;
}

export function remainingMs(): number {
  if (pomo.pausedRemainingMs !== null) return pomo.pausedRemainingMs;
  if (pomo.endTime !== null) return Math.max(0, pomo.endTime - pomo.now);
  return durationMs(pomo.phase === 'idle' ? 'focus' : pomo.phase);
}

export function formatTime(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function phaseLabel(): string {
  const base =
    pomo.phase === 'short' ? 'Short break' : pomo.phase === 'long' ? 'Long break' : 'Pomodoro';
  if (isPaused()) return `${base} (paused)`;
  if (isQueued()) return `${base} (queued)`;
  return base;
}

/** Filled / empty streak dots within the current long-break cycle. */
export function streak(): { filled: number; total: number } {
  const total = readSettings().longBreakEvery;
  return { filled: pomo.focusCount % total, total };
}

// ── Persistence ──────────────────────────────────────────────────────────────

function persist(): void {
  if (!api) return;
  const state: PersistedState = {
    phase: pomo.phase,
    endTime: pomo.endTime,
    pausedRemainingMs: pomo.pausedRemainingMs,
    focusCount: pomo.focusCount,
    currentTaskId,
    currentTaskSectionId,
    currentTaskTitle: pomo.currentTaskTitle,
  };
  void api.storage.set(STORAGE_KEY, state);
}

async function restore(): Promise<void> {
  if (!api) return;
  const s = await api.storage.get<PersistedState>(STORAGE_KEY);
  if (!s) return;
  pomo.phase = s.phase;
  pomo.endTime = s.endTime;
  pomo.pausedRemainingMs = s.pausedRemainingMs;
  pomo.focusCount = s.focusCount;
  pomo.currentTaskTitle = s.currentTaskTitle;
  currentTaskId = s.currentTaskId;
  currentTaskSectionId = s.currentTaskSectionId;
  pomo.now = Date.now();
  if (pomo.endTime !== null) {
    if (Date.now() >= pomo.endTime) complete();
    else startTicking();
  }
}

// ── Ticking ──────────────────────────────────────────────────────────────────

function startTicking(): void {
  if (intervalId !== null) return;
  intervalId = setInterval(tick, 500);
}
function stopTicking(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
function tick(): void {
  pomo.now = Date.now();
  if (pomo.endTime !== null && pomo.now >= pomo.endTime) complete();
}

// ── Transitions ──────────────────────────────────────────────────────────────

function clearTaskLink(): void {
  currentTaskId = null;
  currentTaskSectionId = null;
  pomo.currentTaskTitle = null;
}

export function start(phase: Phase, ref?: TaskRef): void {
  pomo.phase = phase === 'idle' ? 'focus' : phase;
  pomo.endTime = Date.now() + durationMs(pomo.phase);
  pomo.pausedRemainingMs = null;
  if (ref) {
    currentTaskId = ref.taskId;
    currentTaskSectionId = ref.sectionId;
    pomo.currentTaskTitle = api?.tasks.find(ref)?.title ?? null;
  }
  pomo.now = Date.now();
  startTicking();
  persist();
}

export function pause(): void {
  if (!isRunning() || pomo.endTime === null) return;
  pomo.pausedRemainingMs = Math.max(0, pomo.endTime - Date.now());
  pomo.endTime = null;
  stopTicking();
  persist();
}

export function resume(): void {
  if (pomo.pausedRemainingMs === null) return;
  pomo.endTime = Date.now() + pomo.pausedRemainingMs;
  pomo.pausedRemainingMs = null;
  pomo.now = Date.now();
  startTicking();
  persist();
}

export function stop(): void {
  pomo.phase = 'idle';
  pomo.endTime = null;
  pomo.pausedRemainingMs = null;
  clearTaskLink();
  stopTicking();
  persist();
}

function complete(): void {
  const ended = pomo.phase;
  stopTicking();
  pomo.endTime = null;
  pomo.pausedRemainingMs = null;
  if (ended === 'focus') {
    if (api && currentTaskId && currentTaskSectionId) {
      api.tasks.mutate({ taskId: currentTaskId, sectionId: currentTaskSectionId }, (task) => {
        task.pomodoros = (task.pomodoros || 0) + 1;
      });
    }
    pomo.focusCount += 1;
    const every = readSettings().longBreakEvery;
    const nextPhase: Phase = every > 0 && pomo.focusCount % every === 0 ? 'long' : 'short';
    api?.ui.notify(
      `Pomodoro complete${pomo.currentTaskTitle ? ` · ${pomo.currentTaskTitle}` : ''} — time for a ${nextPhase === 'long' ? 'long' : 'short'} break.`,
    );
    clearTaskLink();
    pomo.phase = nextPhase; // queued; user presses play to start the break
  } else {
    pomo.phase = 'focus'; // break done → next focus queued
  }
  persist();
}

export function startForTask(ref: TaskRef): void {
  start('focus', ref);
}

/** Multiplexed play/pause/resume/start-queued button. */
export function playClicked(): void {
  if (pomo.phase === 'idle') start('focus');
  else if (isRunning()) pause();
  else if (isPaused()) resume();
  else start(pomo.phase); // queued
}

// ── Lifecycle (called by main.ts) ────────────────────────────────────────────

export async function init(ctx: PluginContext): Promise<void> {
  api = ctx;
  await restore();
}

export function teardown(): void {
  stopTicking();
  persist();
  api = null;
}

/** Test seam: reset the singleton between cases. */
export function __resetForTest(): void {
  stopTicking();
  pomo.phase = 'idle';
  pomo.endTime = null;
  pomo.pausedRemainingMs = null;
  pomo.focusCount = 0;
  pomo.currentTaskTitle = null;
  pomo.now = Date.now();
  currentTaskId = null;
  currentTaskSectionId = null;
  api = null;
}
