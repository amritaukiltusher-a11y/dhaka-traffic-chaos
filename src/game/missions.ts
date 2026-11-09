import type { GameResult } from './engine';
import { missionsStore } from '../lib/storage';

/** Three daily missions, the same for everyone on the same (local) day. Checked at the end of each run. */
export type MissionStat = 'nearMisses' | 'distance' | 'coins' | 'chais' | 'time' | 'bestCombo';

interface MissionTemplate {
  id: string;
  icon: string;
  stat: MissionStat;
  bn: string; // {n} is replaced with the target
  en: string;
  targets: [number, number, number];
}

const TEMPLATES: MissionTemplate[] = [
  { id: 'near', icon: '🧵', stat: 'nearMisses', bn: 'এক রানে {n}টা নিয়ার-মিস করুন', en: 'Make {n} near misses in one run', targets: [4, 6, 8] },
  { id: 'dist', icon: '🛣️', stat: 'distance', bn: 'এক রানে {n} মিটার চালান', en: 'Drive {n} metres in one run', targets: [800, 1200, 1600] },
  { id: 'coins', icon: '🪙', stat: 'coins', bn: 'এক রানে {n}টা টাকা কুড়ান', en: 'Collect {n} taka in one run', targets: [15, 25, 35] },
  { id: 'chai', icon: '☕', stat: 'chais', bn: 'এক রানে {n} কাপ চা নিন', en: 'Grab {n} cups of chai in one run', targets: [1, 2, 3] },
  { id: 'time', icon: '⏱️', stat: 'time', bn: '{n} সেকেন্ড টিকে থাকুন', en: 'Survive {n} seconds', targets: [40, 60, 80] },
  { id: 'combo', icon: '🔥', stat: 'bestCombo', bn: '{n} কম্বো ছুঁন', en: 'Reach a {n}x combo', targets: [3, 4, 5] }
];

export const MISSION_REWARDS = [30, 50, 80];

export interface Mission {
  id: string;
  icon: string;
  stat: MissionStat;
  bn: string;
  en: string;
  target: number;
  reward: number;
  done: boolean;
}

export function dayKey(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function missionsFor(day: string, done: string[] = []): Mission[] {
  const rnd = seeded(Number(day.replace(/-/g, '')) || 1);
  const order = TEMPLATES.map((t, i) => ({ i, k: rnd() })).sort((a, b) => a.k - b.k).slice(0, 3);
  return order.map(({ i }, tier) => {
    const t = TEMPLATES[i];
    return { id: `${t.id}-${tier}`, icon: t.icon, stat: t.stat, bn: t.bn, en: t.en, target: t.targets[tier], reward: MISSION_REWARDS[tier], done: done.includes(`${t.id}-${tier}`) };
  });
}

/** today's missions with their saved progress (a new day starts fresh) */
export function todayMissions(): Mission[] {
  const day = dayKey();
  const cur = missionsStore.get();
  return missionsFor(day, cur.day === day ? cur.done : []);
}

/** marks missions finished by this run and returns the newly completed ones */
export function completeMissions(run: GameResult): Mission[] {
  const day = dayKey();
  const cur = missionsStore.get();
  const doneIds = cur.day === day ? cur.done : [];
  const fresh = missionsFor(day, doneIds).filter((m) => !m.done && run[m.stat] >= m.target);
  if (fresh.length || cur.day !== day) missionsStore.set({ day, done: [...doneIds, ...fresh.map((m) => m.id)] });
  return fresh;
}
