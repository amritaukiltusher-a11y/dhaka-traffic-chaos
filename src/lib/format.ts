import type { Lang } from './storage';

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/** Replace ASCII digits with Bengali digits when the language is Bengali. */
export function digits(input: string | number, lang: Lang): string {
  const s = String(input);
  return lang === 'bn' ? s.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]) : s;
}

export function fmtNum(n: number, lang: Lang): string {
  return digits(Math.round(n).toLocaleString('en-US'), lang);
}

export function fmtTime(seconds: number, lang: Lang): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return digits(`${m}:${r.toString().padStart(2, '0')}`, lang);
}

export function fmtMoney(taka: number, lang: Lang): string {
  return `৳${fmtNum(taka, lang)}`;
}

export function fmtDistance(meters: number, lang: Lang): string {
  if (meters >= 1000) return `${digits((meters / 1000).toFixed(2), lang)} ${lang === 'bn' ? 'কিমি' : 'km'}`;
  return `${fmtNum(meters, lang)} ${lang === 'bn' ? 'মি' : 'm'}`;
}

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 120;
}
