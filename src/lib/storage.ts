import { createPersistedStore } from './store';

export type Lang = 'bn' | 'en';
export type Quality = 'low' | 'high';

/* ------------------------------------------------------------------ prefs */

export interface Prefs {
  lang: Lang;
  sound: boolean;
  quality: Quality;
  nickname: string;
}

const isCoarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

export const DEFAULT_PREFS: Prefs = {
  lang: 'bn',
  sound: true,
  quality: isCoarse ? 'low' : 'high',
  nickname: ''
};

export function sanitizeNickname(input: string): string {
  // strip control characters and angle brackets, collapse whitespace, cap the length
  // eslint-disable-next-line no-control-regex
  const cleaned = input.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim();
  return Array.from(cleaned).slice(0, 16).join('');
}

export const prefsStore = createPersistedStore<Prefs>('dtc:prefs', DEFAULT_PREFS, (raw) => {
  const r = (raw ?? {}) as Partial<Prefs>;
  return {
    lang: r.lang === 'en' ? 'en' : 'bn',
    sound: typeof r.sound === 'boolean' ? r.sound : DEFAULT_PREFS.sound,
    quality: r.quality === 'low' || r.quality === 'high' ? r.quality : DEFAULT_PREFS.quality,
    nickname: typeof r.nickname === 'string' ? sanitizeNickname(r.nickname) : ''
  };
});

export function patchPrefs(patch: Partial<Prefs>) {
  prefsStore.update((p) => ({ ...p, ...patch }));
}

/* ----------------------------------------------------------------- scores */

export interface ScoreEntry {
  id: string;
  name: string;
  score: number;
  distance: number;
  collisions: number;
  time: number;
  date: number;
  /** seeded fictional entries shown so the board is never empty */
  seed?: boolean;
}

const MAX_LOCAL = 50;

function cleanEntry(raw: unknown): ScoreEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<ScoreEntry>;
  const num = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : 0);
  const name = sanitizeNickname(typeof r.name === 'string' ? r.name : '');
  if (!name) return null;
  return {
    id: typeof r.id === 'string' ? r.id.slice(0, 40) : String(Math.random()).slice(2),
    name,
    score: num(r.score, 9_999_999),
    distance: num(r.distance, 9_999_999),
    collisions: num(r.collisions, 99_999),
    time: num(r.time, 99_999),
    date: num(r.date, 4_102_444_800_000)
  };
}

export const scoresStore = createPersistedStore<ScoreEntry[]>('dtc:scores', [], (raw) =>
  Array.isArray(raw) ? raw.map(cleanEntry).filter((e): e is ScoreEntry => e !== null).slice(0, MAX_LOCAL) : []
);

export function submitScore(entry: Omit<ScoreEntry, 'id' | 'date'>): ScoreEntry | null {
  const cleaned = cleanEntry({ ...entry, id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, date: Date.now() });
  if (!cleaned) return null;
  scoresStore.update((list) => [cleaned, ...list].sort((a, b) => b.score - a.score).slice(0, MAX_LOCAL));
  return cleaned;
}

export function clearLocalScores() {
  scoresStore.set([]);
}

/** Fictional demo drivers — clearly flagged `seed` in the UI. */
export const SEED_DRIVERS: ScoreEntry[] = [
  { name: 'জ্যাম-সম্রাট', score: 5200, distance: 9100, collisions: 4, time: 301 },
  { name: 'হর্ন মাস্টার', score: 4300, distance: 7600, collisions: 7, time: 262 },
  { name: 'গর্ত-শিকারি', score: 3600, distance: 6400, collisions: 9, time: 224 },
  { name: 'লেন-বিদ্রোহী', score: 2900, distance: 5100, collisions: 6, time: 188 },
  { name: 'চার্জ-পাগল', score: 2300, distance: 4000, collisions: 11, time: 160 },
  { name: 'ক্ষ্যাপা-বাস ভক্ত', score: 1700, distance: 3000, collisions: 8, time: 131 },
  { name: 'চা-বিরতি', score: 1200, distance: 2100, collisions: 5, time: 97 }
].map((s, i) => ({ ...s, id: `seed-${i}`, date: 0, seed: true }));

/* ----------------------------------------------------------------- totals */

export interface Totals {
  games: number;
  collisions: number;
  distance: number;
  damage: number;
  time: number;
  best: number;
}

const ZERO_TOTALS: Totals = { games: 0, collisions: 0, distance: 0, damage: 0, time: 0, best: 0 };

export const totalsStore = createPersistedStore<Totals>('dtc:totals', ZERO_TOTALS, (raw) => {
  const r = (raw ?? {}) as Partial<Totals>;
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
  return {
    games: n(r.games),
    collisions: n(r.collisions),
    distance: n(r.distance),
    damage: n(r.damage),
    time: n(r.time),
    best: n(r.best)
  };
});

export function addToTotals(run: { score: number; distance: number; collisions: number; damage: number; time: number }) {
  totalsStore.update((t) => ({
    games: t.games + 1,
    collisions: t.collisions + run.collisions,
    distance: t.distance + run.distance,
    damage: t.damage + run.damage,
    time: t.time + run.time,
    best: Math.max(t.best, run.score)
  }));
}

/* ------------------------------------------------------------- newsletter */

export function saveNewsletterLocally(email: string) {
  try {
    const key = 'dtc:newsletter';
    const list: string[] = JSON.parse(localStorage.getItem(key) ?? '[]');
    if (!list.includes(email)) list.push(email);
    localStorage.setItem(key, JSON.stringify(list.slice(-20)));
    return true;
  } catch {
    return false;
  }
}
