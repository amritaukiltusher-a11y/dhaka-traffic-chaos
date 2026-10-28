import { useEffect, useState } from 'react';
import { useLang } from '../i18n';
import { digits } from '../lib/format';
import GameStage from './GameStage';

function TrafficPanel() {
  const { t, lang } = useLang();
  const [snap, setSnap] = useState({ jam: 82, speed: 7 });

  useEffect(() => {
    const id = window.setInterval(() => {
      setSnap({ jam: 55 + Math.floor(Math.random() * 44), speed: 3 + Math.floor(Math.random() * 13) });
    }, 3500);
    return () => window.clearInterval(id);
  }, []);

  const mood = snap.jam > 90 ? t('hero.mood.chaos') : snap.jam > 72 ? t('hero.mood.angry') : t('hero.mood.calm');
  const light = snap.jam > 85 ? 'red' : snap.jam > 68 ? 'yellow' : 'green';

  return (
    <aside className="rounded-2xl border border-line bg-panel/80 p-4" aria-label={t('hero.traffic.title')}>
      <div className="flex items-start gap-4">
        <div className="flex flex-col gap-1.5 rounded-xl bg-black p-2" aria-hidden="true">
          {(['red', 'yellow', 'green'] as const).map((c) => (
            <span
              key={c}
              className="h-5 w-5 rounded-full"
              style={{
                background: light === c ? { red: '#ff3b30', yellow: '#ffc21a', green: '#2fd27a' }[c] : '#272a33',
                boxShadow: light === c ? `0 0 12px ${{ red: '#ff3b30', yellow: '#ffc21a', green: '#2fd27a' }[c]}` : 'none'
              }}
            />
          ))}
        </div>
        <dl className="grid flex-1 grid-cols-3 gap-2 text-sm">
          <div>
            <dt className="text-xs text-slate-400">{t('hero.traffic.jam')}</dt>
            <dd className="font-display text-xl font-bold text-brick">{digits(snap.jam, lang)}%</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">{t('hero.traffic.speed')}</dt>
            <dd className="font-display text-xl font-bold text-sun">
              {digits(snap.speed, lang)} {t('hud.kmh')}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">{t('hero.traffic.mood')}</dt>
            <dd className="font-display text-base font-bold text-sky">{mood}</dd>
          </div>
        </dl>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        <span className="mr-1 rounded bg-sun/20 px-1.5 py-0.5 font-semibold text-sun">{t('common.fictional')}</span>
        {t('hero.traffic.note')}
      </p>
    </aside>
  );
}

export default function Hero() {
  const { t, gameName } = useLang();
  const [signal, setSignal] = useState(0);

  return (
    <section id="play" className="hero-bg relative scroll-mt-16 overflow-hidden border-b border-line">
      <div className="road-stripe absolute inset-x-0 bottom-0 h-3 opacity-70" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:items-center lg:py-14">
        <div className="min-w-0 space-y-6">
          <p className="inline-block rounded-full border border-sun/50 bg-sun/10 px-3 py-1 text-sm font-semibold text-sun">{t('hero.tag')}</p>
          <h1 className="title-gradient font-display text-5xl font-extrabold leading-[1.1] sm:text-6xl">{gameName}</h1>
          <p className="max-w-xl text-lg leading-relaxed text-slate-200">{t('hero.desc')}</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-primary text-lg" onClick={() => setSignal((s) => s + 1)}>
              {t('hero.start')}
            </button>
            <a href="#how" className="btn-ghost">
              {t('hero.howto')}
            </a>
          </div>
          <TrafficPanel />
        </div>
        <GameStage startSignal={signal} />
      </div>
    </section>
  );
}
