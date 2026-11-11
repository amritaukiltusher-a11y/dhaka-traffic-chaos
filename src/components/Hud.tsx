import type { HudState } from '../game/engine';
import { fmtDistance, fmtMoney, fmtNum, fmtTime, digits } from '../lib/format';
import { useLang, type Key } from '../i18n';

function Bar({ value, color, label, valueText }: { value: number; color: string; label: string; valueText: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-200">
        <span>{label}</span>
        <span>{valueText}</span>
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-black/60 ring-1 ring-white/20"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
      >
        <div className="h-full rounded-full transition-[width] duration-100" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

const WEATHER_ICON = { night: '🌙', dusk: '🌇', rain: '🌧️' } as const;

export default function Hud({ hud }: { hud: HudState }) {
  const { t, lang } = useLang();
  const batteryColor = hud.battery > 50 ? '#2fd27a' : hud.battery > 25 ? '#ffc21a' : '#ff4d3d';
  const gapPct = (hud.gap / 30) * 100;
  const gapColor = hud.gap > 14 ? '#4cc9ff' : hud.gap > 8 ? '#ffc21a' : '#ff4d3d';
  const danger = hud.gap < 12;

  return (
    <>
      {danger && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 motion-safe:animate-pulse"
          style={{ boxShadow: `inset 0 0 ${60 + (12 - hud.gap) * 8}px rgba(255,40,40,${0.25 + (12 - hud.gap) * 0.03})` }}
        />
      )}
      <div className="pointer-events-none absolute left-2 top-2 w-[min(15rem,56%)] space-y-1.5 rounded-xl bg-black/55 p-2.5 text-white backdrop-blur-sm sm:left-3 sm:top-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">{t('hud.score')}</span>
          <span className="font-display text-2xl font-bold leading-none text-sun">{fmtNum(hud.score, lang)}</span>
        </div>
        <div className="flex justify-between text-[11px] text-slate-200">
          <span>
            {fmtDistance(hud.distance, lang)}
          </span>
          <span>{fmtTime(hud.time, lang)}</span>
          <span>
            {WEATHER_ICON[hud.weather]} {t('hud.level')} {digits(hud.level, lang)} · 📍 {t(`zone.${hud.zone}` as Key)}
          </span>
        </div>
        <Bar value={hud.battery} color={batteryColor} label={t('hud.battery')} valueText={`${digits(Math.round(hud.battery), lang)}%`} />
        <Bar value={gapPct} color={gapColor} label={t('hud.pursuit')} valueText={hud.gap < 3 ? '!!!' : `${digits(Math.round(hud.gap), lang)} ${lang === 'bn' ? 'মি' : 'm'}`} />
        <div className="flex items-center justify-between text-[11px] text-slate-200">
          <span>
            {t('hud.speed')}: <b className="text-white">{digits(hud.speed, lang)}</b> {t('hud.kmh')}
          </span>
          <span className="flex gap-1">
            {hud.coins > 0 && (
              <span className="rounded bg-yellow-400 px-1.5 py-0.5 font-bold text-black">
                🪙 {digits(hud.coins, lang)}
              </span>
            )}
            {hud.chai > 0 && (
              <span className="rounded bg-amber-500 px-1.5 py-0.5 font-bold text-black">
                ☕ {digits(Math.ceil(hud.chai), lang)}
              </span>
            )}
            {hud.boosting && hud.chai <= 0 && <span className="rounded bg-sun px-1.5 py-0.5 font-bold text-black">{t('hud.boost')}</span>}
            <span className={`rounded px-1.5 py-0.5 font-bold ${hud.shield > 0 ? 'bg-sky text-black' : hud.shieldCd > 0 ? 'bg-slate-700 text-slate-300' : 'bg-leaf text-black'}`}>
              {t('hud.shield')} {hud.shield > 0 ? '●' : hud.shieldCd > 0 ? digits(Math.ceil(hud.shieldCd), lang) : t('hud.ready')}
            </span>
          </span>
        </div>
        {hud.combo >= 2 && (
          <div className="flex justify-between rounded bg-brick/80 px-1.5 py-0.5 text-[11px] font-bold text-white">
            <span>🔥 {t('hud.combo')}</span>
            <span>×{digits(Math.min(5, hud.combo), lang)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-white/15 pt-1 text-[11px] text-slate-200">
          <span>{t('hud.damage')}</span>
          <b className="text-brick">{fmtMoney(hud.damage, lang)}</b>
        </div>
      </div>
    </>
  );
}
