import { useState } from 'react';
import { UPGRADES, PAINTS, buyUpgrade, chooseOrBuyPaint, upgradeCost } from '../game/garage';
import { todayMissions } from '../game/missions';
import { MAX_UPGRADE, PAINT_IDS, missionsStore, walletStore } from '../lib/storage';
import { useStore } from '../lib/store';
import { useLang } from '../i18n';
import { digits } from '../lib/format';

function hex(n: number) {
  return `#${n.toString(16).padStart(6, '0')}`;
}

export default function Garage() {
  const { t, lang } = useLang();
  const wallet = useStore(walletStore);
  useStore(missionsStore); // re-render when a mission is completed
  const missions = todayMissions();
  const [msg, setMsg] = useState('');

  return (
    <section id="garage" className="scroll-mt-16 border-b border-line py-14" aria-labelledby="garage-title">
      <div className="mx-auto max-w-7xl px-4">
        <h2 id="garage-title" className="section-title">
          {t('garage.title')}
        </h2>
        <p className="mt-2 text-slate-300">{t('garage.sub')}</p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-1.5 font-display text-lg font-bold text-black">
          🪙 {t('garage.wallet')}: {digits(wallet.taka, lang)}
        </p>
        <p role="status" aria-live="polite" className="mt-2 min-h-6 text-sm font-semibold text-leaf">
          {msg}
        </p>

        <div className="mt-4 grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="font-display text-xl font-bold text-white">{t('garage.upgrades')}</h3>
            <ul className="mt-3 space-y-3">
              {UPGRADES.map((u) => {
                const lvl = wallet.up[u.id];
                const cost = upgradeCost(wallet, u.id);
                const poor = cost !== null && wallet.taka < cost;
                return (
                  <li key={u.id} className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-4">
                    <span aria-hidden="true" className="text-3xl">
                      {u.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg font-bold text-white">{lang === 'bn' ? u.bn : u.en}</p>
                      <p className="text-sm text-slate-300">{lang === 'bn' ? u.descBn : u.descEn}</p>
                      <p className="mt-1 text-xs text-slate-400" aria-label={`${t('garage.level')} ${lvl} / ${MAX_UPGRADE}`}>
                        {t('garage.level')} {'●'.repeat(lvl)}
                        {'○'.repeat(MAX_UPGRADE - lvl)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost shrink-0 px-3 py-2 text-sm"
                      disabled={cost === null || poor}
                      onClick={() => setMsg(buyUpgrade(u.id) ? `${lang === 'bn' ? u.bn : u.en}: ${t('garage.bought')}` : t('garage.poor'))}
                    >
                      {cost === null ? t('garage.max') : poor ? `🪙 ${digits(cost, lang)}` : `${t('garage.buy')} · 🪙 ${digits(cost, lang)}`}
                    </button>
                  </li>
                );
              })}
            </ul>

            <h3 className="mt-8 font-display text-xl font-bold text-white">{t('garage.paints')}</h3>
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {PAINT_IDS.map((id) => {
                const p = PAINTS[id];
                const owned = wallet.owned.includes(id);
                const on = wallet.paint === id;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        const r = chooseOrBuyPaint(id);
                        setMsg(r === 'poor' ? t('garage.poor') : r === 'bought' ? t('garage.bought') : '');
                      }}
                      className={`flex w-full flex-col items-center gap-1 rounded-2xl border p-3 text-sm font-semibold ${on ? 'border-sun bg-sun/10 text-white' : 'border-line bg-panel text-slate-200 hover:border-slate-400'}`}
                    >
                      <span aria-hidden="true" className="h-8 w-14 rounded-lg border border-white/30" style={{ backgroundColor: hex(p.hex) }} />
                      <span>{lang === 'bn' ? p.bn : p.en}</span>
                      <span className="text-xs text-slate-400">{on ? t('garage.equipped') : owned ? t('garage.equip') : `🪙 ${digits(p.cost, lang)}`}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-xl font-bold text-white">{t('garage.missions')}</h3>
            <p className="mt-1 text-sm text-slate-300">{t('garage.missionsSub')}</p>
            <ul className="mt-3 space-y-3">
              {missions.map((m) => (
                <li key={m.id} className={`flex items-center gap-3 rounded-2xl border p-4 ${m.done ? 'border-leaf/60 bg-leaf/10' : 'border-line bg-panel'}`}>
                  <span aria-hidden="true" className="text-3xl">
                    {m.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{(lang === 'bn' ? m.bn : m.en).replace('{n}', digits(m.target, lang))}</p>
                    <p className="text-xs text-slate-400">
                      {t('garage.reward')}: 🪙 {digits(m.reward, lang)}
                    </p>
                  </div>
                  {m.done && <span className="shrink-0 text-sm font-bold text-leaf">✓ {t('garage.done')}</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
