// Keyboard + mouse input with rebindable actions. Edges are latched per frame.
// (Extracted from Sprocket & Sprout's engine layer; the action list is Trotline's.)

export const ACTIONS = [
  'presetOverview', 'presetCove', 'presetDock', 'presetUnder',
  'orbitLeft', 'orbitRight', 'tiltUp', 'tiltDown', 'zoomIn', 'zoomOut',
  'pixelPass', 'hud', 'sonarView', 'pause', 'faster', 'debug',
] as const;
export type Action = (typeof ACTIONS)[number];

/** Debug keys exist only in dev builds or with ?debug in the address. */
export const DEBUG_KEYS = !!import.meta.env?.DEV || (typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug'));
/** The actions a player sees in the controls lists. */
export const SHOWN_ACTIONS = ACTIONS.filter((a) => a !== 'debug' || DEBUG_KEYS);

export const ACTION_LABELS: Record<Action, string> = {
  presetOverview: 'Camera: overview', presetCove: 'Camera: cove', presetDock: 'Camera: dock', presetUnder: 'Camera: under water',
  orbitLeft: 'Orbit left', orbitRight: 'Orbit right', tiltUp: 'Tilt up', tiltDown: 'Tilt down', zoomIn: 'Zoom in', zoomOut: 'Zoom out',
  pixelPass: 'Pixel pass on/off', hud: 'HUD on/off', sonarView: 'Sonar only / all fish', pause: 'Pause', faster: 'Fast clock (hold)',
  debug: 'Debug readout',
};

export const DEFAULT_BINDS: Record<Action, string[]> = {
  presetOverview: ['Digit1'], presetCove: ['Digit2'], presetDock: ['Digit3'], presetUnder: ['Digit4'],
  orbitLeft: ['KeyA', 'ArrowLeft'], orbitRight: ['KeyD', 'ArrowRight'], tiltUp: ['KeyW', 'ArrowUp'], tiltDown: ['KeyS', 'ArrowDown'],
  zoomIn: ['Equal', 'NumpadAdd', 'KeyE'], zoomOut: ['Minus', 'NumpadSubtract', 'KeyQ'],
  pixelPass: ['KeyP'], hud: ['KeyH'], sonarView: ['KeyV'], pause: ['Space'], faster: ['ShiftLeft'], debug: ['Backquote'],
};

export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map: Record<string, string> = {
    ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', ShiftLeft: 'LShift',
    ShiftRight: 'RShift', ControlLeft: 'LCtrl', Escape: 'Esc', Backquote: '`', Equal: '=', Minus: '-',
    Space: 'Space', Tab: 'Tab', Enter: 'Enter', NumpadAdd: 'Num+', NumpadSubtract: 'Num-', Backspace: 'Bksp',
  };
  return map[code] ?? code;
}

export class Input {
  down = new Set<string>();
  pressed = new Set<string>();
  released = new Set<string>();
  binds: Record<Action, string[]> = structuredClone(DEFAULT_BINDS);
  /** Mouse position in CSS pixels relative to the element; dx/dy are this frame's movement. */
  mouse = { x: 0, y: 0, dx: 0, dy: 0, down: [false, false, false], pressed: [false, false, false], released: [false, false, false], wheel: 0, moved: false };
  /** Set by UI to capture the next key for rebinding. */
  captureKey: ((code: string) => void) | null = null;
  ctrl = false;
  shift = false;

  attach(el: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (this.captureKey) {
        e.preventDefault();
        const cb = this.captureKey;
        this.captureKey = null;
        cb(e.code);
        return;
      }
      if (!e.repeat) this.pressed.add(e.code);
      this.down.add(e.code);
      this.ctrl = e.ctrlKey || e.metaKey;
      this.shift = e.shiftKey;
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow') || e.code === 'Backquote') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.down.delete(e.code);
      this.released.add(e.code);
      this.ctrl = e.ctrlKey || e.metaKey;
      this.shift = e.shiftKey;
    });
    window.addEventListener('blur', () => {
      this.down.clear();
      this.shift = this.ctrl = false;
      this.mouse.down = [false, false, false];
    });
    el.addEventListener('mousemove', (e) => {
      this.mouse.dx += e.offsetX - this.mouse.x;
      this.mouse.dy += e.offsetY - this.mouse.y;
      this.mouse.x = e.offsetX;
      this.mouse.y = e.offsetY;
      this.mouse.moved = true;
    });
    el.addEventListener('mousedown', (e) => {
      if (e.button > 2) return;
      this.mouse.x = e.offsetX;
      this.mouse.y = e.offsetY;
      this.mouse.down[e.button] = true;
      this.mouse.pressed[e.button] = true;
      this.shift = e.shiftKey;
      this.ctrl = e.ctrlKey || e.metaKey;
      e.preventDefault();
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button > 2) return;
      this.mouse.down[e.button] = false;
      this.mouse.released[e.button] = true;
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('wheel', (e) => {
      this.mouse.wheel += Math.sign(e.deltaY);
      e.preventDefault();
    }, { passive: false });
  }

  isDown(a: Action): boolean {
    for (const k of this.binds[a]) if (this.down.has(k)) return true;
    return false;
  }

  wasPressed(a: Action): boolean {
    for (const k of this.binds[a]) if (this.pressed.has(k)) return true;
    return false;
  }

  keyPressed(code: string) {
    return this.pressed.has(code);
  }

  /** Consume an action edge so lower UI layers don't also react. */
  consume(a: Action) {
    for (const k of this.binds[a]) this.pressed.delete(k);
  }

  consumeMouse(button = 0) {
    this.mouse.pressed[button] = false;
    this.mouse.released[button] = false;
  }

  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.mouse.pressed = [false, false, false];
    this.mouse.released = [false, false, false];
    this.mouse.wheel = 0;
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    this.mouse.moved = false;
  }
}
