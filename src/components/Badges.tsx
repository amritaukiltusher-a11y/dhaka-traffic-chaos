import { BADGES } from '../game/achievements';
import { badgesStore } from '../lib/storage';
import { useStore } from '../lib/store';
import { useLang } from '../i18n';
import { digits } from '../lib/format';

export default function Badges() {
  const { t, lang } = useLang();
  const have = useStore(badgesStore);
  const count = BADGES.filter((b) => have[b.id]).length;

  return (
    <section id="badges" className="scroll-mt-16 border-b border-line py-14" aria-labelledby="badges-title">
      <div className="mx-auto max-w-7xl px-4">
        <h2 id="badges-title" className="section-title">
          {t('badges.title')}
        </h2>
        <p className="mt-2 text-slate-300">{t('badges.sub')}</p>
        <p className="mt-1 text-sm font-semibold text-sun">
          {t('badges.count')}: {digits(count, lang)} / {digits(BADGES.length, lang)}
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BADGES.map((b) => {
            const got = !!have[b.id];
            return (
              <li key={b.id} className={`flex items-center gap-3 rounded-2xl border p-4 ${got ? 'border-sun/60 bg-sun/10' : 'border-line bg-panel opacity-80'}`}>
                <span aria-hidden="true" className={`text-3xl ${got ? '' : 'opacity-40 grayscale'}`}>
                  {b.icon}
                </span>
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold text-white">{lang === 'bn' ? b.bn : b.en}</p>
                  <p className="text-sm text-slate-300">{lang === 'bn' ? b.descBn : b.descEn}</p>
                  <p className={`mt-1 text-xs font-semibold ${got ? 'text-leaf' : 'text-slate-400'}`}>{got ? `✓ ${t('badges.unlocked')}` : t('badges.locked')}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
