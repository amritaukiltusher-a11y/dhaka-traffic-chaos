import { useMemo, useState } from 'react';
import { useLang } from '../i18n';
import { generateHeadlines, hashString, NEWS_CATEGORIES } from '../game/content';

export default function News() {
  const { t, lang } = useLang();
  const todayKey = new Date().toDateString();
  // "daily" headlines are seeded by the date; the button re-rolls with a random seed
  const [reroll, setReroll] = useState<number | null>(null);
  const items = useMemo(() => generateHeadlines(6, reroll ?? hashString(todayKey)), [reroll, todayKey]);
  const today = new Date().toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', { dateStyle: 'full' });

  return (
    <section id="news" className="scroll-mt-16 border-b border-line py-14" aria-labelledby="news-title">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="news-title" className="section-title">
              {t('news.title')}
            </h2>
            <p className="mt-1 text-sm text-slate-400">{today}</p>
          </div>
          <button type="button" className="btn-ghost" onClick={() => setReroll(Math.floor(Math.random() * 2 ** 31))}>
            ↻ {t('news.refresh')}
          </button>
        </div>
        <p className="mt-2 max-w-3xl text-slate-300">{t('news.note')}</p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((h, i) => (
            <li key={`${reroll ?? 'd'}-${i}`} className="flex flex-col rounded-2xl border border-line bg-panel p-5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="rounded bg-sky/15 px-2 py-0.5 font-semibold text-sky">{NEWS_CATEGORIES[lang][(hashString(h.en) + i) % NEWS_CATEGORIES[lang].length]}</span>
                <span className="rounded bg-sun/20 px-2 py-0.5 font-semibold text-sun">{t('news.fictionalTag')}</span>
              </div>
              <p className="mt-3 text-lg font-semibold leading-snug text-white">{h[lang]}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
