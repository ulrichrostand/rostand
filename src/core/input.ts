export type GameAction = "interact" | "crouch" | "nightVision" | "pause";

/** Mapping par code physique (KeyW...) : fonctionne en AZERTY (ZQSD) comme en QWERTY (WASD). */
const ACTION_KEYS: Record<GameAction, readonly string[]> = {
  interact: ["KeyE", "Enter"],
  crouch: ["KeyC", "ControlLeft"],
  nightVision: ["KeyN"],
  pause: ["Escape", "KeyP"],
};

const MOVE_KEYS = {
  forward: ["KeyW", "ArrowUp"],
  backward: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  run: ["ShiftLeft", "ShiftRight"],
} as const;

export interface MoveIntent {
  x: number;
  z: number;
  running: boolean;
}

export class InputController {
  private readonly heldKeys = new Set<string>();
  private readonly pendingActions = new Set<GameAction>();

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    // Ne jamais intercepter la saisie dans les champs de commande des terminaux.
    if (isTypingTarget(event.target)) return;
    if (!event.repeat) {
      for (const [action, codes] of Object.entries(ACTION_KEYS) as [GameAction, readonly string[]][]) {
        if (codes.includes(event.code)) this.pendingActions.add(action);
      }
    }
    if (isGameKey(event.code)) event.preventDefault();
    this.heldKeys.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.heldKeys.delete(event.code);
  };

  // Évite un joueur qui « glisse » quand la fenêtre perd le focus touche enfoncée.
  private readonly handleBlur = (): void => this.heldKeys.clear();

  constructor(private readonly target: Window) {
    target.addEventListener("keydown", this.handleKeyDown);
    target.addEventListener("keyup", this.handleKeyUp);
    target.addEventListener("blur", this.handleBlur);
  }

  moveIntent(): MoveIntent {
    const isHeld = (codes: readonly string[]): boolean => codes.some((code) => this.heldKeys.has(code));
    const x = (isHeld(MOVE_KEYS.right) ? 1 : 0) - (isHeld(MOVE_KEYS.left) ? 1 : 0);
    const z = (isHeld(MOVE_KEYS.backward) ? 1 : 0) - (isHeld(MOVE_KEYS.forward) ? 1 : 0);
    const length = Math.hypot(x, z) || 1;
    return { x: x / length, z: z / length, running: isHeld(MOVE_KEYS.run) };
  }

  /** Consomme l'action : un appui = un déclenchement, même si la frame suivante la relit. */
  consume(action: GameAction): boolean {
    return this.pendingActions.delete(action);
  }

  clear(): void {
    this.pendingActions.clear();
    this.heldKeys.clear();
  }

  dispose(): void {
    this.target.removeEventListener("keydown", this.handleKeyDown);
    this.target.removeEventListener("keyup", this.handleKeyUp);
    this.target.removeEventListener("blur", this.handleBlur);
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
}

const GAME_KEYS = new Set<string>([
  ...Object.values(MOVE_KEYS).flat(),
  ...Object.values(ACTION_KEYS).flat().filter((code) => code !== "Enter"),
]);

function isGameKey(code: string): boolean {
  return GAME_KEYS.has(code);
}
