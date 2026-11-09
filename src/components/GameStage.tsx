import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DriveGame, type GameResult, type HudState } from '../game/engine';
import { InputManager } from '../game/input';
import { SoundEngine } from '../game/audio';
import { eventMessage, randomBomb, resultHeadline, type Headline } from '../game/content';
import { awardBadges, type Badge } from '../game/achievements';
import { loadoutFrom } from '../game/garage';
import { completeMissions, type Mission } from '../game/missions';
import { GAME_NAME } from '../config';
import { addTaka, addToTotals, patchPrefs, prefsStore, sanitizeNickname, submitScore, totalsStore, walletStore, type Difficulty } from '../lib/storage';
import { useStore } from '../lib/store';
import { fmtDistance, fmtMoney, fmtNum, fmtTime } from '../lib/format';
import { useLang, type Key } from '../i18n';
import { useIsTouch } from './hooks';
import Hud from './Hud';
import TouchControls from './TouchControls';

type Phase = 'loading' | 'menu' | 'playing' | 'paused' | 'over' | 'error';

interface Toast {
  id: number;
  text: string;
  tone: 'good' | 'bad' | 'info';
}

const BAD = new Set(['crash', 'pothole', 'pedestrian', 'lowBattery', 'pursuit']);
const GOOD = new Set(['pickup', 'nearMiss', 'shield', 'boost', 'chai']);
const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];
const WEATHER_ICON = { night: '🌙', dusk: '🌇', rain: '🌧️' } as const;

const KEY_LEGEND: { keys: string; label: Key }[] = [
  { keys: 'W / ↑', label: 'ctl.accel' },
  { keys: 'S / ↓', label: 'ctl.brake' },
  { keys: 'A D / ← →', label: 'ctl.left' },
  { keys: 'Shift', label: 'ctl.boost' },
  { keys: 'Space', label: 'ctl.special' },
  { keys: 'B', label: 'ctl.bomb' },
  { keys: 'H', label: 'ctl.horn' },
  { keys: 'M', label: 'ctl.mute' },
  { keys: 'Esc', label: 'ctl.pause' }
];

function IconButton({ label, onClick, children, pressed }: { label: string; onClick: () => void; children: ReactNode; pressed?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className="flex h-10 min-w-10 items-center justify-center rounded-lg bg-black/60 px-2 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur-sm hover:bg-black/80"
    >
      {children}
    </button>
  );
}

export default function GameStage({ startSignal }: { startSignal: number }) {
  const { t, lang } = useLang();
  const prefs = useStore(prefsStore);
  const isTouch = useIsTouch();

  const wrapRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<DriveGame | null>(null);
  const audio = useMemo(() => new SoundEngine(), []);
  const input = useMemo(() => new InputManager({ onPause: () => {}, onMute: () => {}, onBomb: () => {}, onBlur: () => {} }), []);

  const [phase, setPhaseState] = useState<Phase>('loading');
  const phaseRef = useRef<Phase>('loading');
  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const [hud, setHud] = useState<HudState | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [headline, setHeadline] = useState<Headline | null>(null);
  const [isBest, setIsBest] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [nick, setNick] = useState(prefs.nickname);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const [payout, setPayout] = useState<{ earned: number; coins: number; total: number; missions: Mission[] } | null>(null);
  const wallet = useStore(walletStore);
  const [shareMsg, setShareMsg] = useState('');

  const langRef = useRef(lang);
  langRef.current = lang;
  const expandedRef = useRef(false);
  expandedRef.current = expanded;
  const nickRef = useRef(nick);
  nickRef.current = nick;
  const pendingStart = useRef(false);
  const toastId = useRef(0);
  const toastTimer = useRef<number | undefined>(undefined);

  /* --------------------------------------------------------------- actions */

  const showToast = useCallback((text: string, tone: Toast['tone']) => {
    window.clearTimeout(toastTimer.current);
    setToast({ id: ++toastId.current, text, tone });
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  /** "Sound bomb": cartoon effect + funny Bengali shout + a text bubble. Also fired on every crash. */
  const lastBomb = useRef({ t: 0, idx: -1 });
  const soundBomb = useCallback(
    (auto: boolean): boolean => {
      const now = performance.now();
      if (now - lastBomb.current.t < (auto ? 1500 : 350)) return false;
      lastBomb.current.t = now;
      audio.unlock();
      const { idx, line } = randomBomb(lastBomb.current.idx);
      lastBomb.current.idx = idx;
      audio.bomb(line.bn, line.sfx);
      const text = langRef.current === 'bn' ? line.bn : `${line.bn} (${line.en})`;
      showToast(`${auto ? '💥' : '🔊'} ${text}`, auto ? 'bad' : 'info');
      return true;
    },
    [audio, showToast]
  );
  const soundBombRef = useRef(soundBomb);
  soundBombRef.current = soundBomb;

  const togglePause = useCallback(() => {
    const e = engineRef.current;
    if (!e) return;
    if (phaseRef.current === 'playing') {
      e.pause();
      input.releaseAll();
      setPhase('paused');
    } else if (phaseRef.current === 'paused') {
      e.resume();
      setPhase('playing');
    } else if (expandedRef.current) {
      setExpanded(false); // Escape also leaves the expanded view when not playing
    }
  }, [input, setPhase]);

  const toggleSound = useCallback(() => {
    patchPrefs({ sound: !prefsStore.get().sound });
  }, []);

  const startGame = useCallback(() => {
    const e = engineRef.current;
    if (!e) return;
    audio.unlock();
    audio.setEnabled(prefsStore.get().sound);
    const name = sanitizeNickname(nickRef.current);
    if (name !== prefsStore.get().nickname) patchPrefs({ nickname: name });
    e.setDifficulty(prefsStore.get().difficulty);
    e.setLoadout(loadoutFrom(walletStore.get()));
    if (prefsStore.get().music) {
      audio.unlock();
      audio.setMusic(true);
    }
    setPayout(null);
    setSubmitted(false);
    setNewBadges([]);
    setShareMsg('');
    setResult(null);
    setHeadline(null);
    setHud(null);
    setToast(null);
    input.releaseAll();
    e.startRun();
    setPhase('playing');
    if (isTouch) setExpanded(true);
    else {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      wrapRef.current?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    }
    (document.activeElement as HTMLElement | null)?.blur?.();
  }, [audio, input, isTouch, setPhase]);

  const shareResult = useCallback(async () => {
    if (!result) return;
    const l = langRef.current;
    const name = GAME_NAME[l];
    const text =
      l === 'bn'
        ? `আমি "${name}"-এ ${fmtNum(result.score, l)} পয়েন্ট করেছি, ${fmtDistance(result.distance, l)} চালিয়ে! পারলে হারিয়ে দাও 🛺`
        : `I scored ${fmtNum(result.score, l)} in "${name}" and drove ${fmtDistance(result.distance, l)}! Beat me if you can 🛺`;
    const url = window.location.href.split('#')[0];
    try {
      if (navigator.share) {
        await navigator.share({ title: name, text, url });
        return;
      }
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShareMsg(t('res.copied'));
    } catch {
      setShareMsg(`${text} ${url}`);
    }
  }, [result, t]);

  const backToMenu = useCallback(() => {
    engineRef.current?.startDemo();
    input.releaseAll();
    setHud(null);
    setPhase('menu');
  }, [input, setPhase]);

  /* --------------------------------------------------- engine life-cycle */

  useEffect(() => {
    let cancelled = false;
    let engine: DriveGame | null = null;
    setPhase('loading');

    (async () => {
      try {
        // wait for web-fonts (the 3D shop signs are drawn with Bengali text) but never block for long
        await Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => window.setTimeout(r, 1500))]);
        if (cancelled || !canvasRef.current) return;
        engine = new DriveGame(
          canvasRef.current,
          {
            onHud: (h) => setHud(h),
            onEvent: (ev) => {
              if (ev.type === 'crash' || ev.type === 'pedestrian') {
                try {
                  if (prefsStore.get().sound) navigator.vibrate?.(ev.type === 'crash' ? [70, 40, 90] : 45); // haptic thud on phones
                } catch {
                  /* vibration is optional */
                }
                if (soundBombRef.current(true)) return;
              }
              const tone: Toast['tone'] = BAD.has(ev.type) ? 'bad' : GOOD.has(ev.type) ? 'good' : 'info';
              let text = eventMessage(ev.type, langRef.current, ev.value);
              if (ev.type === 'nearMiss' && ev.value) text += `  +${ev.value}${ev.extra && ev.extra >= 2 ? `  🔥×${Math.min(5, ev.extra)}` : ''}`;
              showToast(text, tone);
            },
            onOver: (r) => {
              const prevBest = totalsStore.get().best;
              addToTotals(r);
              setNewBadges(awardBadges(r, totalsStore.get()));
              const done = completeMissions(r);
              const earned = r.coins + Math.floor(r.score / 250) + done.reduce((n, m) => n + m.reward, 0);
              addTaka(earned);
              setPayout({ earned, coins: r.coins, total: walletStore.get().taka, missions: done });
              setIsBest(r.score > 0 && r.score > prevBest);
              setResult(r);
              setHeadline(resultHeadline(r));
              input.releaseAll();
              setPhase('over');
            },
            onError: () => setPhase('error')
          },
          input.state,
          audio,
          prefsStore.get().quality
        );
        engineRef.current = engine;
        engine.setLoadout(loadoutFrom(walletStore.get()));
        engine.startDemo();
        setPhase('menu');
        if (pendingStart.current) {
          pendingStart.current = false;
          startGameRef.current();
        }
      } catch (err) {
        console.error('Could not start the game engine:', err);
        if (!cancelled) setPhase('error');
      }
    })();

    return () => {
      cancelled = true;
      engine?.dispose();
      engineRef.current = null;
      window.clearTimeout(toastTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey]);

  const startGameRef = useRef(startGame);
  startGameRef.current = startGame;

  // keyboard / touch input wiring
  useEffect(() => {
    input.setHandlers({
      onPause: togglePause,
      onMute: toggleSound,
      onBomb: () => {
        if (phaseRef.current === 'playing') soundBombRef.current(false);
      },
      onBlur: () => {
        if (phaseRef.current === 'playing') togglePause();
      }
    });
    input.attach();
    return () => input.detach();
  }, [input, togglePause, toggleSound]);

  useEffect(() => {
    if (phase !== 'playing') engineRef.current?.setLoadout(loadoutFrom(wallet));
  }, [wallet, phase]);

  useEffect(() => {
    input.captureKeys = phase === 'playing' || phase === 'paused';
  }, [input, phase]);

  // sound + quality preferences
  useEffect(() => {
    audio.setEnabled(prefs.sound);
  }, [audio, prefs.sound]);
  useEffect(() => {
    engineRef.current?.setQuality(prefs.quality);
  }, [prefs.quality, phase]);

  // "Start Driving" button in the hero
  useEffect(() => {
    if (startSignal === 0) return;
    if (phaseRef.current === 'menu' || phaseRef.current === 'over') startGameRef.current();
    else if (phaseRef.current === 'loading') pendingStart.current = true;
  }, [startSignal]);

  // stop the page from scrolling while the player is touching the game
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || phase !== 'playing') return;
    const block = (e: TouchEvent) => e.preventDefault();
    el.addEventListener('touchmove', block, { passive: false });
    return () => el.removeEventListener('touchmove', block);
  }, [phase]);

  // lock page scroll while the stage is expanded
  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  useEffect(() => () => audio.dispose(), [audio]);

  const submit = () => {
    if (!result || submitted) return;
    const name = sanitizeNickname(nick) || t('res.anon');
    patchPrefs({ nickname: sanitizeNickname(nick) });
    const saved = submitScore({ name, score: result.score, distance: result.distance, collisions: result.collisions, time: result.time });
    if (saved) setSubmitted(true);
  };

  /* ---------------------------------------------------------------- render */

  const playing = phase === 'playing' || phase === 'paused';
  const showToolbar = phase !== 'loading' && phase !== 'error';

  return (
    <section
      ref={wrapRef}
      aria-label={t('stage.label')}
      className={`overflow-hidden bg-ink text-white shadow-2xl ring-1 ring-line ${
        expanded ? 'fixed inset-0 z-[70] h-[100dvh] w-screen' : 'relative aspect-[4/5] w-full rounded-2xl sm:aspect-[16/10]'
      }`}
      style={{ touchAction: playing ? 'none' : 'auto', overscrollBehavior: 'contain' }}
    >
      <div className="absolute inset-0">
        <canvas ref={canvasRef} className="block h-full w-full" role="img" aria-label={t('stage.preview')} />
      </div>

      {phase === 'loading' && (
        <div className="absolute inset-0 grid place-items-center bg-ink/90" role="status">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-line border-t-sun motion-reduce:animate-none" />
            <p className="mt-4 font-display text-lg">{t('stage.loading')}</p>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div className="absolute inset-0 grid place-items-center bg-ink p-6 text-center" role="alert">
          <div>
            <p className="font-display text-lg text-brick">{t('stage.error')}</p>
            <button type="button" className="btn-primary mt-4" onClick={() => setRetryKey((k) => k + 1)}>
              {t('stage.retry')}
            </button>
          </div>
        </div>
      )}

      {/* toolbar */}
      {showToolbar && (
        <div className="absolute right-2 top-2 z-10 flex gap-1.5 sm:right-3 sm:top-3">
          {(phase === 'menu' || (phase === 'playing' && !isTouch)) && (
            <button
              type="button"
              onClick={() => soundBomb(false)}
              aria-label={t('stage.bomb')}
              title={`${t('stage.bomb')} (B)`}
              className="flex h-10 items-center gap-1.5 rounded-lg bg-brick px-3 text-sm font-bold text-white ring-1 ring-white/30 hover:brightness-110"
            >
              <span aria-hidden="true">💣</span>
              <span>{t('stage.bomb')}</span>
            </button>
          )}
          {playing && (
            <IconButton label={phase === 'paused' ? t('stage.resume') : t('stage.pause')} onClick={togglePause}>
              {phase === 'paused' ? '▶' : '⏸'}
            </IconButton>
          )}
          <IconButton label={prefs.sound ? t('stage.soundOn') : t('stage.soundOff')} onClick={toggleSound} pressed={prefs.sound}>
            {prefs.sound ? '🔊' : '🔇'}
          </IconButton>
          <IconButton
            label={t('stage.music')}
            pressed={prefs.music}
            onClick={() => {
              const on = !prefs.music;
              patchPrefs({ music: on });
              audio.unlock();
              audio.setMusic(on);
            }}
          >
            {prefs.music ? '🎵' : '🎶'}
          </IconButton>
          <IconButton
            label={`${t('stage.quality')}: ${prefs.quality === 'low' ? t('stage.qualityLow') : t('stage.qualityHigh')}`}
            onClick={() => patchPrefs({ quality: prefs.quality === 'low' ? 'high' : 'low' })}
          >
            <span className="text-xs">{prefs.quality === 'low' ? t('stage.qualityLow') : t('stage.qualityHigh')}</span>
          </IconButton>
          <IconButton label={expanded ? t('stage.exitFullscreen') : t('stage.fullscreen')} onClick={() => setExpanded((v) => !v)} pressed={expanded}>
            {expanded ? '⤡' : '⤢'}
          </IconButton>
        </div>
      )}

      {/* HUD */}
      {playing && hud && <Hud hud={hud} />}

      {/* event toast */}
      <div aria-live="polite" className="pointer-events-none absolute inset-x-0 top-14 z-10 flex justify-center px-3 sm:justify-end">
        {toast && (playing || phase === 'menu') && (
          <div
            key={toast.id}
            className={`max-w-[85%] rounded-xl px-4 py-2 text-center text-sm font-semibold shadow-lg sm:max-w-md sm:text-base motion-safe:animate-[pop_.25s_ease-out] ${
              toast.tone === 'bad' ? 'bg-brick text-white' : toast.tone === 'good' ? 'bg-leaf text-black' : 'bg-sun text-black'
            }`}
          >
            {toast.text}
          </div>
        )}
      </div>

      {/* keyboard legend while driving */}
      {phase === 'playing' && !isTouch && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex flex-wrap justify-center gap-1 px-2" aria-hidden="true">
          {KEY_LEGEND.map((k) => (
            <span key={k.keys} className="rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-slate-100">
              <kbd className="font-mono font-bold text-sun">{k.keys}</kbd> {t(k.label)}
            </span>
          ))}
        </div>
      )}

      {playing && isTouch && <TouchControls input={input} onBomb={() => soundBomb(false)} />}

      {/* main menu */}
      {phase === 'menu' && (
        <div className="absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-ink/95 via-ink/40 to-transparent p-4 pb-5 text-center">
          <p className="mb-2 rounded-full bg-black/55 px-3 py-1 text-xs text-slate-200">{t('stage.preview')}</p>
          <div className="mb-3 flex w-full max-w-sm flex-col gap-1 text-left">
            <label htmlFor="nick" className="text-xs font-semibold text-slate-200">
              {t('stage.nickname')}
            </label>
            <input
              id="nick"
              value={nick}
              maxLength={16}
              onChange={(e) => setNick(e.target.value)}
              placeholder={t('stage.nickPlaceholder')}
              autoComplete="nickname"
              className="rounded-lg border border-line bg-black/70 px-3 py-2 text-white placeholder:text-slate-400"
            />
          </div>
          <div className="mb-3 flex w-full max-w-sm flex-col gap-1 text-left">
            <span id="diff-label" className="text-xs font-semibold text-slate-200">
              {t('stage.difficulty')}
            </span>
            <div role="radiogroup" aria-labelledby="diff-label" className="grid grid-cols-3 gap-1.5">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={prefs.difficulty === d}
                  onClick={() => patchPrefs({ difficulty: d })}
                  className={`rounded-lg border px-2 py-1.5 text-sm font-semibold ${prefs.difficulty === d ? 'border-sun bg-sun text-black' : 'border-line bg-black/60 text-white hover:bg-black/80'}`}
                >
                  {t(`diff.${d}` as Key)}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="btn-primary text-lg" onClick={startGame}>
            {t('stage.start')}
          </button>
          <div className="mt-3 hidden flex-wrap justify-center gap-1 sm:flex" aria-hidden="true">
            {KEY_LEGEND.slice(0, 6).map((k) => (
              <span key={k.keys} className="rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-slate-100">
                <kbd className="font-mono font-bold text-sun">{k.keys}</kbd> {t(k.label)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* pause menu */}
      {phase === 'paused' && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={t('stage.paused')}>
          <div className="w-full max-w-xs rounded-2xl border border-line bg-panel p-5 text-center">
            <h2 className="font-display text-2xl text-sun">{t('stage.paused')}</h2>
            <div className="mt-4 flex flex-col gap-2">
              <button type="button" className="btn-primary" onClick={togglePause} autoFocus>
                {t('stage.resume')}
              </button>
              <button type="button" className="btn-ghost" onClick={startGame}>
                {t('stage.restart')}
              </button>
              <button type="button" className="btn-ghost" onClick={backToMenu}>
                {t('stage.menu')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* results */}
      {phase === 'over' && result && (
        <div className="absolute inset-0 z-20 overflow-y-auto bg-black/80 p-3 sm:p-5" role="dialog" aria-modal="true" aria-label={t('res.title')}>
          <div className="mx-auto w-full max-w-lg rounded-2xl border border-line bg-panel p-4 sm:p-6">
            <h2 className="text-center font-display text-3xl text-sun">{t('res.title')}</h2>
            <p className="text-center text-sm text-slate-300">{result.reason === 'battery' ? t('res.reasonBattery') : t('res.reasonCaught')}</p>
            {isBest && <p className="mt-2 text-center font-semibold text-leaf">★ {t('res.newBest')}</p>}

            <label htmlFor="res-nick" className="mt-3 block text-xs font-semibold text-slate-300">
              {t('res.player')}
            </label>
            <input
              id="res-nick"
              value={nick}
              maxLength={16}
              disabled={submitted}
              onChange={(e) => setNick(e.target.value)}
              placeholder={t('stage.nickPlaceholder')}
              className="mb-3 w-full rounded-lg border border-line bg-black/50 px-3 py-2 text-white placeholder:text-slate-400 disabled:opacity-60"
            />

            <dl className="grid grid-cols-2 gap-2 text-sm">
              {(
                [
                  ['res.score', fmtNum(result.score, lang)],
                  ['res.distance', fmtDistance(result.distance, lang)],
                  ['res.collisions', fmtNum(result.collisions, lang)],
                  ['res.battery', `${fmtNum(result.battery, lang)}%`],
                  ['res.time', fmtTime(result.time, lang)],
                  ['res.damage', fmtMoney(result.damage, lang)]
                ] as [Key, string][]
              ).map(([k, v]) => (
                <div key={k} className="rounded-lg bg-black/40 p-2">
                  <dt className="text-[11px] text-slate-400">{t(k)}</dt>
                  <dd className="font-display text-lg font-bold text-white">{v}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-2 text-center text-xs text-slate-300">
              {WEATHER_ICON[result.weather]} {t(`weather.${result.weather}` as Key)} · {t(`diff.${result.difficulty}` as Key)} · {t('res.nearMisses')}: {fmtNum(result.nearMisses, lang)} · {t('res.bestCombo')}: ×{fmtNum(Math.min(5, result.bestCombo), lang)} · ☕ {fmtNum(result.chais, lang)}
            </p>

            {payout && (
              <p className="mt-3 rounded-lg bg-yellow-400 px-3 py-2 text-center text-sm font-bold text-black" role="status">
                🪙 {t('res.taka')}: +{fmtNum(payout.earned, lang)} · {t('res.takaTotal')}: {fmtNum(payout.total, lang)}
                {payout.missions.length > 0 && ` · ✅ ${t('res.missionsDone')} ${fmtNum(payout.missions.length, lang)}`}
              </p>
            )}

            {newBadges.length > 0 && (
              <div className="mt-3 rounded-lg border border-leaf/50 bg-leaf/10 p-3" role="status">
                <p className="text-sm font-semibold text-leaf">🏅 {t('res.newBadges')}</p>
                <ul className="mt-1 flex flex-wrap gap-2">
                  {newBadges.map((b) => (
                    <li key={b.id} className="rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                      {b.icon} {lang === 'bn' ? b.bn : b.en}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {headline && (
              <figure className="mt-3 rounded-lg border border-sun/40 bg-sun/10 p-3">
                <figcaption className="text-[11px] font-semibold uppercase tracking-wide text-sun">{t('res.headlineLabel')} · {t('common.fictional')}</figcaption>
                <blockquote className="mt-1 font-semibold text-white">{headline[lang]}</blockquote>
              </figure>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button type="button" className="btn-primary flex-1" onClick={submit} disabled={submitted}>
                {submitted ? t('res.submitted') : t('res.submit')}
              </button>
              <button type="button" className="btn-ghost flex-1" onClick={startGame} autoFocus>
                {t('res.again')}
              </button>
              <button type="button" className="btn-ghost flex-1" onClick={backToMenu}>
                {t('stage.menu')}
              </button>
            </div>
            <button type="button" className="btn-ghost mt-2 w-full" onClick={shareResult}>
              📤 {t('res.share')}
            </button>
            {shareMsg && (
              <p role="status" className="mt-2 text-center text-sm text-leaf">
                {shareMsg}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
