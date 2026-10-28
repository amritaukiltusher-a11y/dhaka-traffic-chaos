import { useMemo } from 'react';
import { useLang } from '../i18n';
import { clearLocalScores, patchPrefs, prefsStore, SEED_DRIVERS, scoresStore, sanitizeNickname } from '../lib/storage';
import { useStore } from '../lib/store';
import { fmtDistance, fmtNum } from '../lib/format';

export default function Leaderboard() {
  const { t, lang } = useLang();
  const local = useStore(scoresStore);
  const prefs = useStore(prefsStore);

  const rows = useMemo(() => [...SEED_DRIVERS, ...local].sort((a, b) => b.score - a.score).slice(0, 10), [local]);

  return (
    <section id="leaderboard" className="scroll-mt-16 border-b border-line bg-panel/40 py-14" aria-labelledby="board-title">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div>
          <h2 id="board-title" className="section-title">
            {t('board.title')}
          </h2>
          <p className="mt-2 text-slate-300">{t('board.note')}</p>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-panel">
            <table className="w-full min-w-[20rem] text-left text-sm">
              <caption className="sr-only">{t('board.title')}</caption>
              <thead className="bg-black/40 text-xs uppercase tracking-wide text-slate-300">
                <tr>
                  <th scope="col" className="px-3 py-3">
                    {t('board.rank')}
                  </th>
                  <th scope="col" className="px-3 py-3">
                    {t('board.driver')}
                  </th>
                  <th scope="col" className="px-3 py-3 text-right">
                    {t('board.score')}
                  </th>
                  <th scope="col" className="hidden px-3 py-3 text-right sm:table-cell">
                    {t('board.distance')}
                  </th>
                  <th scope="col" className="hidden px-3 py-3 text-right sm:table-cell">
                    {t('board.collisions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className={`border-t border-line ${!r.seed ? 'bg-sun/10' : ''}`}>
                    <td className="px-3 py-2.5 font-display text-lg font-bold text-sun">{fmtNum(i + 1, lang)}</td>
                    <td className="px-3 py-2.5 text-white">
                      <span className="break-all font-semibold">{r.name}</span>{' '}
                      {r.seed ? (
                        <span className="ml-1 rounded bg-slate-700 px-1.5 py-0.5 text-[11px] text-slate-200">{t('board.fictionalBadge')}</span>
                      ) : (
                        <span className="ml-1 rounded bg-leaf px-1.5 py-0.5 text-[11px] font-bold text-black">{t('board.you')}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums text-white">{fmtNum(r.score, lang)}</td>
                    <td className="hidden px-3 py-2.5 text-right tabular-nums text-slate-300 sm:table-cell">{fmtDistance(r.distance, lang)}</td>
                    <td className="hidden px-3 py-2.5 text-right tabular-nums text-slate-300 sm:table-cell">{fmtNum(r.collisions, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {local.length === 0 && <p className="mt-3 text-slate-300">{t('board.empty')}</p>}
          <p className="mt-2 text-xs text-slate-400">{t('board.offlineNote')}</p>
        </div>

        <div className="space-y-4 self-start rounded-2xl border border-line bg-panel p-5">
          <div>
            <label htmlFor="board-nick" className="font-display text-xl text-sun">
              {t('board.nick')}
            </label>
            <input
              id="board-nick"
              value={prefs.nickname}
              maxLength={16}
              autoComplete="nickname"
              onChange={(e) => patchPrefs({ nickname: sanitizeNickname(e.target.value) })}
              placeholder={t('stage.nickPlaceholder')}
              aria-describedby="board-nick-help"
              className="mt-3 w-full rounded-lg border border-line bg-black/50 px-3 py-2 text-white placeholder:text-slate-400"
            />
            <p id="board-nick-help" className="mt-2 text-sm text-slate-300">
              {t('board.nickHelp')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="#play" className="btn-primary">
              {t('nav.play')}
            </a>
            <button
              type="button"
              className="btn-ghost"
              disabled={local.length === 0}
              onClick={() => {
                if (window.confirm(t('board.clearConfirm'))) clearLocalScores();
              }}
            >
              {t('board.clear')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
