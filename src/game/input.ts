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
  /** called when the window loses focus / tab is hidden */
  onBlur: () => void;
}

const KEY_MAP: Record<string, Action | 'pause' | 'mute'> = {
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
    for (const a of ACTIONS) this.state[a] = this.keys[a].size > 0 || this.touches[a].size > 0;
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
    if (this.captureKeys) e.preventDefault();
    this.keys[mapped].add(e.code);
    this.recompute();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const mapped = KEY_MAP[e.code];
    if (!mapped || mapped === 'pause' || mapped === 'mute') return;
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

  attach() {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  detach() {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.releaseAll();
  }
}
