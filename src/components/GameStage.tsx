import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DriveGame, type GameResult, type HudState } from '../game/engine';
import { InputManager } from '../game/input';
import { SoundEngine } from '../game/audio';
import { eventMessage, resultHeadline, type Headline } from '../game/content';
import { addToTotals, patchPrefs, prefsStore, sanitizeNickname, submitScore, totalsStore } from '../lib/storage';
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
const GOOD = new Set(['pickup', 'nearMiss', 'shield', 'boost']);

const KEY_LEGEND: { keys: string; label: Key }[] = [
  { keys: 'W / ↑', label: 'ctl.accel' },
  { keys: 'S / ↓', label: 'ctl.brake' },
  { keys: 'A D / ← →', label: 'ctl.left' },
  { keys: 'Shift', label: 'ctl.boost' },
  { keys: 'Space', label: 'ctl.special' },
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
  const input = useMemo(() => new InputManager({ onPause: () => {}, onMute: () => {}, onBlur: () => {} }), []);

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
    setSubmitted(false);
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
              const tone: Toast['tone'] = BAD.has(ev.type) ? 'bad' : GOOD.has(ev.type) ? 'good' : 'info';
              let text = eventMessage(ev.type, langRef.current, ev.value);
              if (ev.type === 'nearMiss' && ev.value) text += `  +${ev.value}`;
              showToast(text, tone);
            },
            onOver: (r) => {
              const prevBest = totalsStore.get().best;
              addToTotals(r);
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
      onBlur: () => {
        if (phaseRef.current === 'playing') togglePause();
      }
    });
    input.attach();
    return () => input.detach();
  }, [input, togglePause, toggleSound]);

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
        expanded ? 'fixed inset-0 z-[70] h-[100dvh] w-screen' : 'relative aspect-[4/3] w-full rounded-2xl sm:aspect-[16/10]'
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
          {playing && (
            <IconButton label={phase === 'paused' ? t('stage.resume') : t('stage.pause')} onClick={togglePause}>
              {phase === 'paused' ? '▶' : '⏸'}
            </IconButton>
          )}
          <IconButton label={prefs.sound ? t('stage.soundOn') : t('stage.soundOff')} onClick={toggleSound} pressed={prefs.sound}>
            {prefs.sound ? '🔊' : '🔇'}
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
      <div aria-live="polite" className="pointer-events-none absolute inset-x-0 top-14 z-10 flex justify-center px-3 sm:top-3">
        {toast && playing && (
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

      {playing && isTouch && <TouchControls input={input} />}

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
          </div>
        </div>
      )}
    </section>
  );
}
