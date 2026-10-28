import { useLang, type Key } from '../i18n';
import { totalsStore } from '../lib/storage';
import { useStore } from '../lib/store';
import { fmtDistance, fmtMoney, fmtNum, fmtTime } from '../lib/format';
import { hashString } from '../game/content';
import { useNow } from './hooks';

/** Fictional, deterministic "ticking" counters: value = f(seconds since local midnight, day seed). */
const CITY_COUNTERS: { key: Key; perSecond: number; offset: number }[] = [
  { key: 'stats.jamMinutes', perSecond: 41, offset: 120_000 },
  { key: 'stats.potholes', perSecond: 0.6, offset: 900 },
  { key: 'stats.honks', perSecond: 230, offset: 2_000_000 },
  { key: 'stats.teaCups', perSecond: 3.4, offset: 15_000 }
];

export default function Stats() {
  const { t, lang } = useLang();
  const totals = useStore(totalsStore);
  const now = useNow(1000);

  const d = new Date(now);
  const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const secs = Math.floor((now - midnight) / 1000);
  const seed = hashString(d.toDateString());

  const yours: [Key, string][] = [
    ['stats.games', fmtNum(totals.games, lang)],
    ['stats.best', fmtNum(totals.best, lang)],
    ['stats.collisions', fmtNum(totals.collisions, lang)],
    ['stats.distance', fmtDistance(totals.distance, lang)],
    ['stats.damage', fmtMoney(totals.damage, lang)],
    ['stats.time', fmtTime(totals.time, lang)]
  ];

  return (
    <section id="stats" className="scroll-mt-16 border-b border-line bg-panel/40 py-14" aria-labelledby="stats-title">
      <div className="mx-auto max-w-7xl px-4">
        <h2 id="stats-title" className="section-title">
          {t('stats.title')}
        </h2>
        <p className="mt-2 max-w-3xl text-slate-300">{t('stats.note')}</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-panel p-5">
            <h3 className="font-display text-xl text-sky">{t('stats.yours')}</h3>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {yours.map(([k, v]) => (
                <div key={k} className="rounded-xl bg-black/40 p-3">
                  <dt className="text-xs text-slate-400">{t(k)}</dt>
                  <dd className="mt-1 break-words font-display text-xl font-bold text-white">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-2xl border border-sun/30 bg-panel p-5">
            <h3 className="flex flex-wrap items-center gap-2 font-display text-xl text-sun">
              {t('stats.city')}
              <span className="rounded bg-sun/20 px-1.5 py-0.5 font-sans text-xs font-semibold text-sun">{t('common.fictional')}</span>
            </h3>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              {CITY_COUNTERS.map((c, i) => (
                <div key={c.key} className="rounded-xl bg-black/40 p-3">
                  <dt className="text-xs text-slate-400">{t(c.key)}</dt>
                  <dd className="mt-1 font-display text-xl font-bold tabular-nums text-white">{fmtNum(c.offset + (seed % (997 + i * 131)) + secs * c.perSecond, lang)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
