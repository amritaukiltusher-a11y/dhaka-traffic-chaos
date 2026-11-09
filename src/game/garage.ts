import type { Loadout } from './engine';
import { MAX_UPGRADE, walletStore, type PaintId, type UpgradeId, type Wallet } from '../lib/storage';

/** The garage: permanent upgrades and paint jobs bought with fictional taka. */
export interface UpgradeDef {
  id: UpgradeId;
  icon: string;
  bn: string;
  en: string;
  descBn: string;
  descEn: string;
  costs: number[];
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'battery', icon: '🔋', bn: 'দক্ষ ব্যাটারি', en: 'Efficient battery', descBn: 'প্রতি লেভেলে ব্যাটারি ৮% কম খরচ হয়।', descEn: 'Each level cuts battery use by 8%.', costs: [100, 250, 500] },
  { id: 'magnet', icon: '🧲', bn: 'চুম্বক', en: 'Magnet', descBn: 'কাছের টাকা, চার্জ আর চা নিজে থেকে কাছে চলে আসে।', descEn: 'Nearby taka, charges and chai drift towards you.', costs: [100, 250, 500] },
  { id: 'shield', icon: '🛡️', bn: 'শক্ত শিল্ড', en: 'Tough shield', descBn: 'প্রতি লেভেলে শিল্ড ০.৬ সেকেন্ড বেশি টেকে।', descEn: 'Each level makes the shield last 0.6 s longer.', costs: [100, 250, 500] },
  { id: 'chai', icon: '☕', bn: 'স্পেশাল চা', en: 'Special chai', descBn: 'প্রতি লেভেলে চা-টার্বো ১.৫ সেকেন্ড বেশি চলে।', descEn: 'Each level makes chai turbo last 1.5 s longer.', costs: [100, 250, 500] }
];

export interface PaintDef {
  hex: number;
  bn: string;
  en: string;
  cost: number;
}

export const PAINTS: Record<PaintId, PaintDef> = {
  green: { hex: 0x237d33, bn: 'সবুজ (আসল)', en: 'Green (original)', cost: 0 },
  sun: { hex: 0xf2b705, bn: 'রোদ-হলুদ', en: 'Sunny yellow', cost: 150 },
  red: { hex: 0xc0222b, bn: 'টকটকে লাল', en: 'Bright red', cost: 150 },
  blue: { hex: 0x1f5fbf, bn: 'আকাশি নীল', en: 'Sky blue', cost: 150 },
  pink: { hex: 0xd2518e, bn: 'গোলাপি', en: 'Pink', cost: 150 },
  black: { hex: 0x23252b, bn: 'কালো ঝলক', en: 'Midnight black', cost: 200 }
};

export function upgradeCost(w: Wallet, id: UpgradeId): number | null {
  const def = UPGRADES.find((u) => u.id === id);
  const lvl = w.up[id];
  return def && lvl < MAX_UPGRADE ? def.costs[lvl] : null;
}

export function buyUpgrade(id: UpgradeId): boolean {
  const w = walletStore.get();
  const cost = upgradeCost(w, id);
  if (cost === null || w.taka < cost) return false;
  walletStore.update((cur) => ({ ...cur, taka: cur.taka - cost, up: { ...cur.up, [id]: cur.up[id] + 1 } }));
  return true;
}

/** Equips an owned paint, or buys it first when affordable. */
export function chooseOrBuyPaint(id: PaintId): 'equipped' | 'bought' | 'poor' {
  const w = walletStore.get();
  if (w.owned.includes(id)) {
    walletStore.update((cur) => ({ ...cur, paint: id }));
    return 'equipped';
  }
  const cost = PAINTS[id].cost;
  if (w.taka < cost) return 'poor';
  walletStore.update((cur) => ({ ...cur, taka: cur.taka - cost, owned: [...cur.owned, id], paint: id }));
  return 'bought';
}

export function loadoutFrom(w: Wallet): Loadout {
  return { battery: w.up.battery, magnet: w.up.magnet, shield: w.up.shield, chai: w.up.chai, paint: PAINTS[w.paint].hex };
}
