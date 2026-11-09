export interface InputState {
  left: boolean;
  right: boolean;
  accel: boolean;
  brake: boolean;
  boost: boolean;
  horn: boolean;
  special: boolean;
}

export type Action = keyof InputState;

export interface InputHandlers {
  onPause: () => void;
  onMute: () => void;
  /** the "sound bomb" key */
  onBomb: () => void;
  /** called when the window loses focus / tab is hidden */
  onBlur: () => void;
}

const KEY_MAP: Record<string, Action | 'pause' | 'mute' | 'bomb'> = {
  KeyW: 'accel',
  ArrowUp: 'accel',
  KeyS: 'brake',
  ArrowDown: 'brake',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'boost',
  ShiftRight: 'boost',
  Space: 'special',
  KeyH: 'horn',
  KeyM: 'mute',
  KeyB: 'bomb',
  Escape: 'pause'
};

const ACTIONS: Action[] = ['left', 'right', 'accel', 'brake', 'boost', 'horn', 'special'];

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
}

/**
 * Merges keyboard and multi-touch input into one mutable InputState object.
 * `state` is mutated in place so the game loop can hold a stable reference.
 */
export class InputManager {
  readonly state: InputState = { left: false, right: false, accel: false, brake: false, boost: false, horn: false, special: false };

  /** while true, game keys are captured (preventDefault) so the page does not scroll */
  captureKeys = false;

  private keys: Record<Action, Set<string>>;
  private touches: Record<Action, Set<number>>;
  private handlers: InputHandlers;
  private attached = false;
  private pad: Record<Action, boolean> = { left: false, right: false, accel: false, brake: false, boost: false, horn: false, special: false };
  private padRaf = 0;
  private padPrev = { pause: false, bomb: false };

  constructor(handlers: InputHandlers) {
    this.handlers = handlers;
    this.keys = this.emptySets();
    this.touches = this.emptyNumSets();
  }

  private emptySets(): Record<Action, Set<string>> {
    return Object.fromEntries(ACTIONS.map((a) => [a, new Set<string>()])) as Record<Action, Set<string>>;
  }
  private emptyNumSets(): Record<Action, Set<number>> {
    return Object.fromEntries(ACTIONS.map((a) => [a, new Set<number>()])) as Record<Action, Set<number>>;
  }

  setHandlers(h: InputHandlers) {
    this.handlers = h;
  }

  private recompute() {
    for (const a of ACTIONS) this.state[a] = this.keys[a].size > 0 || this.touches[a].size > 0 || this.pad[a];
  }

  releaseAll() {
    this.keys = this.emptySets();
    this.touches = this.emptyNumSets();
    this.recompute();
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const mapped = KEY_MAP[e.code];
    if (!mapped || isTypingTarget(e.target)) return;

    if (mapped === 'pause') {
      if (!e.repeat) this.handlers.onPause();
      return;
    }
    if (mapped === 'mute') {
      if (!e.repeat) this.handlers.onMute();
      return;
    }
    if (mapped === 'bomb') {
      if (!e.repeat) this.handlers.onBomb();
      return;
    }
    if (this.captureKeys) e.preventDefault();
    this.keys[mapped].add(e.code);
    this.recompute();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const mapped = KEY_MAP[e.code];
    if (!mapped || mapped === 'pause' || mapped === 'mute' || mapped === 'bomb') return;
    this.keys[mapped].delete(e.code);
    this.recompute();
  };

  private onBlur = () => {
    this.releaseAll();
    this.handlers.onBlur();
  };

  private onVisibility = () => {
    if (document.hidden) this.onBlur();
  };

  /** Called by the on-screen buttons (pointer events give us multitouch for free). */
  setTouch(action: Action, pointerId: number, down: boolean) {
    if (down) this.touches[action].add(pointerId);
    else this.touches[action].delete(pointerId);
    this.recompute();
  }

  /* ---- gamepad (standard mapping): stick/d-pad steer, A/RT accelerate, B/LT brake, X boost, Y shield,
     LB horn, RB sound bomb, Start pause */
  private pollPad = () => {
    this.padRaf = 0;
    let gp: Gamepad | null = null;
    try {
      gp = Array.from(navigator.getGamepads?.() ?? []).find((g): g is Gamepad => !!g && g.connected) ?? null;
    } catch {
      gp = null;
    }
    if (!gp) {
      this.stopPad();
      return;
    }
    const b = (i: number) => !!gp!.buttons[i]?.pressed;
    const v = (i: number) => gp!.buttons[i]?.value ?? 0;
    const ax = gp.axes[0] ?? 0;
    const next: Record<Action, boolean> = {
      left: ax < -0.3 || b(14),
      right: ax > 0.3 || b(15),
      accel: b(0) || v(7) > 0.3 || b(12),
      brake: b(1) || v(6) > 0.3 || b(13),
      boost: b(2),
      special: b(3),
      horn: b(4)
    };
    let changed = false;
    for (const a of ACTIONS) if (next[a] !== this.pad[a]) changed = true;
    this.pad = next;
    if (changed) this.recompute();
    const pause = b(9);
    if (pause && !this.padPrev.pause) this.handlers.onPause();
    this.padPrev.pause = pause;
    const bomb = b(5);
    if (bomb && !this.padPrev.bomb) this.handlers.onBomb();
    this.padPrev.bomb = bomb;
    this.padRaf = requestAnimationFrame(this.pollPad);
  };

  private startPad = () => {
    if (!this.padRaf && this.attached) this.padRaf = requestAnimationFrame(this.pollPad);
  };

  private stopPad() {
    if (this.padRaf) cancelAnimationFrame(this.padRaf);
    this.padRaf = 0;
    this.pad = { left: false, right: false, accel: false, brake: false, boost: false, horn: false, special: false };
    this.recompute();
  }

  attach() {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener('gamepadconnected', this.startPad);
    this.startPad(); // a pad that was already connected before the page opened
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  detach() {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener('gamepadconnected', this.startPad);
    this.stopPad();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.releaseAll();
  }
}
