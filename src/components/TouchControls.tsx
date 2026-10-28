import { useState, type PointerEvent as RPointerEvent } from 'react';
import type { Action, InputManager } from '../game/input';
import { useLang, type Key } from '../i18n';

interface PadProps {
  action: Action;
  input: InputManager;
  label: Key;
  glyph: string;
  className: string;
}

/**
 * One on-screen button. Pointer events (with pointer capture) give reliable multitouch:
 * every finger has its own pointerId, so steering and accelerating can be held together.
 */
function Pad({ action, input, label, glyph, className }: PadProps) {
  const { t } = useLang();
  const [pressed, setPressed] = useState(false);

  const down = (e: RPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* some browsers throw for synthetic pointers; safe to ignore */
    }
    input.setTouch(action, e.pointerId, true);
    setPressed(true);
  };
  const up = (e: RPointerEvent<HTMLButtonElement>) => {
    input.setTouch(action, e.pointerId, false);
    setPressed(false);
  };

  return (
    <button
      type="button"
      aria-label={t(label)}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={up}
      onContextMenu={(e) => e.preventDefault()}
      style={{ touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
      className={`flex select-none flex-col items-center justify-center rounded-2xl border-2 font-display font-bold leading-none text-white shadow-lg backdrop-blur-sm transition-transform ${
        pressed ? 'scale-95 border-sun bg-sun/50' : 'border-white/40 bg-black/45'
      } ${className}`}
    >
      <span className="text-3xl" aria-hidden="true">
        {glyph}
      </span>
      <span className="mt-1 text-[11px] font-semibold">{t(label)}</span>
    </button>
  );
}

export default function TouchControls({ input }: { input: InputManager }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto flex gap-2">
        <Pad action="left" input={input} label="ctl.left" glyph="◀" className="h-[4.5rem] w-[4.5rem]" />
        <Pad action="right" input={input} label="ctl.right" glyph="▶" className="h-[4.5rem] w-[4.5rem]" />
      </div>
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        <div className="flex gap-2">
          <Pad action="special" input={input} label="ctl.special" glyph="🛡" className="h-14 w-14" />
          <Pad action="horn" input={input} label="ctl.horn" glyph="📢" className="h-14 w-14" />
          <Pad action="boost" input={input} label="ctl.boost" glyph="⚡" className="h-14 w-14" />
        </div>
        <div className="flex gap-2">
          <Pad action="brake" input={input} label="ctl.brake" glyph="▼" className="h-[4.5rem] w-[4.5rem]" />
          <Pad action="accel" input={input} label="ctl.accel" glyph="▲" className="h-[5.5rem] w-[5.5rem]" />
        </div>
      </div>
    </div>
  );
}
