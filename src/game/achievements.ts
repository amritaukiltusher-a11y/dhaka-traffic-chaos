import type { GameResult } from './engine';
import { badgesStore, type Totals } from '../lib/storage';

/** Local, fictional achievements. They are stored in the browser only. */
export interface Badge {
  id: string;
  icon: string;
  bn: string;
  en: string;
  descBn: string;
  descEn: string;
  check: (r: GameResult, t: Totals) => boolean;
}

export const BADGES: Badge[] = [
  { id: 'first', icon: '🛺', bn: 'প্রথম যাত্রা', en: 'First ride', descBn: 'একটা পুরো রান শেষ করুন।', descEn: 'Finish a full run.', check: (_r, t) => t.games >= 1 },
  { id: 'clean', icon: '🧼', bn: 'ধাক্কা-হীন ওস্তাদ', en: 'Spotless driver', descBn: 'একটাও ধাক্কা না খেয়ে ৪৫ সেকেন্ড টিকুন।', descEn: 'Survive 45 seconds without a single crash.', check: (r) => r.time >= 45 && r.collisions === 0 },
  { id: 'thread', icon: '🧵', bn: 'সুতোর ওস্তাদ', en: 'Master of the thread', descBn: 'এক রানে ১০টা নিয়ার-মিস করুন।', descEn: 'Make 10 near misses in one run.', check: (r) => r.nearMisses >= 10 },
  { id: 'combo', icon: '🔥', bn: 'কম্বো সম্রাট', en: 'Combo king', descBn: 'নিয়ার-মিসের ৫ কম্বো ছুঁন।', descEn: 'Reach a 5x near-miss combo.', check: (r) => r.bestCombo >= 5 },
  { id: 'chai', icon: '☕', bn: 'চা-প্রেমী', en: 'Chai lover', descBn: 'এক রানে ৩ কাপ চা নিন।', descEn: 'Grab 3 cups of chai in one run.', check: (r) => r.chais >= 3 },
  { id: 'rain', icon: '🌧️', bn: 'বৃষ্টিবীর', en: 'Rain hero', descBn: 'বৃষ্টির মধ্যে ৬০ সেকেন্ড টিকুন।', descEn: 'Survive 60 seconds in the rain.', check: (r) => r.weather === 'rain' && r.time >= 60 },
  { id: 'far', icon: '🛣️', bn: 'দূরপাল্লার চালক', en: 'Long hauler', descBn: 'এক রানে ৩ কিলোমিটার পাড়ি দিন।', descEn: 'Drive 3 km in one run.', check: (r) => r.distance >= 3000 },
  { id: 'jam', icon: '🚦', bn: 'জ্যামজয়ী', en: 'Jam conqueror', descBn: 'লেভেল ৬-এ পৌঁছান।', descEn: 'Reach level 6.', check: (r) => r.level >= 6 },
  { id: 'hard', icon: '💀', bn: 'কঠিনের কারিগর', en: 'Hard-mode hero', descBn: '"কঠিন" মোডে ১৫০০ পয়েন্ট করুন।', descEn: 'Score 1500 on Hard.', check: (r) => r.difficulty === 'hard' && r.score >= 1500 }
];

/** Unlocks every badge this run earned and returns the ones that are new. */
export function awardBadges(run: GameResult, totals: Totals): Badge[] {
  const have = badgesStore.get();
  const fresh = BADGES.filter((b) => !have[b.id] && b.check(run, totals));
  if (fresh.length) {
    const now = Date.now();
    badgesStore.update((cur) => ({ ...cur, ...Object.fromEntries(fresh.map((b) => [b.id, now])) }));
  }
  return fresh;
}
