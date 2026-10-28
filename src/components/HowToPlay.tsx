import { useLang, type Key } from '../i18n';

const KEYS: { keys: string[]; label: Key }[] = [
  { keys: ['W', '↑'], label: 'ctl.accel' },
  { keys: ['S', '↓'], label: 'ctl.brake' },
  { keys: ['A', '←'], label: 'ctl.left' },
  { keys: ['D', '→'], label: 'ctl.right' },
  { keys: ['Shift'], label: 'ctl.boost' },
  { keys: ['Space'], label: 'ctl.special' },
  { keys: ['H'], label: 'ctl.horn' },
  { keys: ['M'], label: 'ctl.mute' },
  { keys: ['Esc'], label: 'ctl.pause' }
];

const RULES: Key[] = ['ctl.rule1', 'ctl.rule2', 'ctl.rule3', 'ctl.rule4', 'ctl.rule5', 'ctl.rule6'];

export default function HowToPlay() {
  const { t } = useLang();
  return (
    <section id="how" className="scroll-mt-16 border-b border-line py-14" aria-labelledby="how-title">
      <div className="mx-auto max-w-7xl px-4">
        <h2 id="how-title" className="section-title">
          {t('ctl.title')}
        </h2>
        <p className="mt-2 max-w-2xl text-slate-300">{t('ctl.sub')}</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-line bg-panel p-5 lg:col-span-1">
            <h3 className="font-display text-xl text-sun">{t('ctl.keysTitle')}</h3>
            <ul className="mt-4 space-y-2">
              {KEYS.map((k) => (
                <li key={k.label} className="flex items-center justify-between gap-3">
                  <span className="flex gap-1">
                    {k.keys.map((key) => (
                      <kbd key={key} className="min-w-8 rounded-md border border-slate-500 bg-black px-2 py-1 text-center font-mono text-sm font-bold text-white shadow-[0_2px_0_#475569]">
                        {key}
                      </kbd>
                    ))}
                  </span>
                  <span className="text-right text-slate-200">{t(k.label)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-line bg-panel p-5 lg:col-span-1">
            <h3 className="font-display text-xl text-sun">{t('ctl.touchTitle')}</h3>
            <p className="mt-3 text-slate-200">{t('ctl.touchDesc')}</p>
            <div className="mt-5 grid grid-cols-4 gap-2 text-center text-xs text-slate-200" aria-hidden="true">
              {['◀', '▶', '▲', '▼', '⚡', '📢', '🛡'].map((g) => (
                <span key={g} className="rounded-xl border border-white/30 bg-black/50 py-3 text-2xl">
                  {g}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-panel p-5 lg:col-span-1">
            <h3 className="font-display text-xl text-sun">{t('ctl.rulesTitle')}</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-200 marker:text-sun">
              {RULES.map((r) => (
                <li key={r}>{t(r)}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
