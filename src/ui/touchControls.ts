import type { GameAction, InputController, MoveIntent } from "../core/input";
import { element } from "./dom";

const JOYSTICK_RADIUS_PX = 52;
/** En deçà, le pouce tremble : on ignore pour éviter un personnage qui dérive. */
const DEAD_ZONE = 0.15;
/** Pousser le pouce au-delà de l'anneau fait courir : un geste volontaire, pas accidentel. */
const RUN_THRESHOLD = 1.35;
/** Durée pendant laquelle le clic émis au relâchement du doigt est ignoré. */
const GHOST_CLICK_WINDOW_MS = 450;

/**
 * Convertit le déplacement du pouce (en pixels, Y écran vers le bas) en intention de mouvement.
 * Le Z du jeu suit le Y de l'écran : la caméra regarde vers -Z, donc « haut » = avancer.
 */
export function joystickIntent(deltaX: number, deltaY: number, radius = JOYSTICK_RADIUS_PX): MoveIntent {
  const distance = Math.hypot(deltaX, deltaY);
  const magnitude = distance / radius;
  if (magnitude < DEAD_ZONE) return { x: 0, z: 0, running: false };
  return { x: deltaX / distance, z: deltaY / distance, running: magnitude >= RUN_THRESHOLD };
}

/** Le jeu bascule en mode tactile si l'appareil a un pointeur grossier (doigt). */
export function prefersTouchControls(): boolean {
  return window.matchMedia?.("(pointer: coarse)").matches ?? false;
}

export class TouchControls {
  readonly root = element("div", { className: "touch-controls" });
  private readonly joystickZone = element("div", { className: "joystick-zone", attributes: { "aria-hidden": "true" } });
  private readonly joystickBase = element("div", { className: "joystick-base" });
  private readonly joystickKnob = element("div", { className: "joystick-knob" });
  private readonly interactButton: HTMLButtonElement;
  private readonly crouchButton: HTMLButtonElement;
  private readonly commandButton: HTMLButtonElement;
  private activePointerId: number | null = null;
  private originX = 0;
  private originY = 0;

  constructor(
    parent: HTMLElement,
    private readonly input: InputController,
  ) {
    this.joystickBase.append(this.joystickKnob);
    this.joystickZone.append(this.joystickBase);
    this.interactButton = this.actionButton("Pirater", "interact", "touch-btn primary");
    this.crouchButton = this.actionButton("Accroupir", "crouch", "touch-btn crouch");
    this.commandButton = this.actionButton("Gadget", "command", "touch-btn gadget");
    this.root.append(
      this.joystickZone,
      element("div", { className: "touch-actions" }, [
        this.actionButton("❚❚", "pause", "touch-btn small pause"),
        this.actionButton("Vision", "nightVision", "touch-btn small vision"),
        this.crouchButton,
        this.interactButton,
        this.commandButton,
      ]),
    );
    this.bindJoystick();
    this.root.hidden = true;
    parent.append(this.root);
  }

  show(): void {
    this.root.hidden = false;
  }

  hide(): void {
    this.root.hidden = true;
    this.releaseJoystick();
  }

  /** Mise à jour à chaque frame : on ne touche au DOM que si l'état change. */
  sync(state: { contextLabel: string | null; crouched: boolean; gadgetVisible: boolean; gadgetReady: boolean }): void {
    const interactLabel = state.contextLabel ?? "Action";
    if (this.interactButton.textContent !== interactLabel) {
      this.interactButton.textContent = interactLabel;
      this.interactButton.setAttribute("aria-label", interactLabel);
    }
    setIfChanged(this.interactButton, "disabled", state.contextLabel === null);
    setIfChanged(this.commandButton, "hidden", !state.gadgetVisible);
    setIfChanged(this.commandButton, "disabled", !state.gadgetReady);
    if (this.crouchButton.classList.contains("active") !== state.crouched) this.crouchButton.classList.toggle("active", state.crouched);
  }

  private actionButton(label: string, action: GameAction, className: string): HTMLButtonElement {
    const node = element("button", { className, text: label, attributes: { type: "button", "aria-label": label === "❚❚" ? "Pause" : label } });
    // pointerdown plutôt que click : réaction immédiate, sans attendre le relâchement du doigt.
    node.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      if (node.disabled) return;
      this.input.trigger(action);
      swallowGhostClick();
    });
    return node;
  }

  private bindJoystick(): void {
    this.joystickZone.addEventListener("pointerdown", (event) => {
      if (this.activePointerId !== null) return;
      event.preventDefault();
      this.activePointerId = event.pointerId;
      this.joystickZone.setPointerCapture(event.pointerId);
      // Joystick « flottant » : il apparaît sous le pouce, où qu'il se pose dans la zone.
      // L'anneau reste entièrement visible même si le pouce se pose au bord de l'écran.
      const zoneBounds = this.joystickZone.getBoundingClientRect();
      const margin = JOYSTICK_RADIUS_PX + 4;
      this.originX = clamp(event.clientX, zoneBounds.left + margin, zoneBounds.right - margin);
      this.originY = clamp(event.clientY, zoneBounds.top + margin, zoneBounds.bottom - margin);
      this.joystickBase.style.left = `${this.originX - zoneBounds.left}px`;
      this.joystickBase.style.top = `${this.originY - zoneBounds.top}px`;
      this.joystickBase.classList.add("visible");
      this.updateJoystick(event);
    });
    this.joystickZone.addEventListener("pointermove", (event) => {
      if (event.pointerId === this.activePointerId) this.updateJoystick(event);
    });
    const release = (event: PointerEvent): void => {
      if (event.pointerId === this.activePointerId) this.releaseJoystick();
    };
    this.joystickZone.addEventListener("pointerup", release);
    this.joystickZone.addEventListener("pointercancel", release);
  }

  private updateJoystick(event: PointerEvent): void {
    const deltaX = event.clientX - this.originX;
    const deltaY = event.clientY - this.originY;
    const intent = joystickIntent(deltaX, deltaY);
    this.input.setVirtualMove(intent);
    // Le bouton reste visuellement dans l'anneau, même si le pouce le dépasse pour courir.
    const distance = Math.hypot(deltaX, deltaY);
    const clampScale = distance > JOYSTICK_RADIUS_PX ? JOYSTICK_RADIUS_PX / distance : 1;
    this.joystickKnob.style.transform = `translate(${deltaX * clampScale}px, ${deltaY * clampScale}px)`;
    this.joystickKnob.classList.toggle("running", intent.running);
  }

  private releaseJoystick(): void {
    this.activePointerId = null;
    this.input.setVirtualMove({ x: 0, z: 0, running: false });
    this.joystickKnob.style.transform = "";
    this.joystickKnob.classList.remove("running");
    this.joystickBase.classList.remove("visible");
  }
}

function setIfChanged(node: HTMLButtonElement, property: "disabled" | "hidden", value: boolean): void {
  if (node[property] !== value) node[property] = value;
}

function clamp(value: number, min: number, max: number): number {
  // Zone trop petite pour l'anneau (écran minuscule) : on centre plutôt que de produire min > max.
  if (min > max) return (min + max) / 2;
  return Math.min(Math.max(value, min), max);
}

/**
 * L'action part au pointerdown, donc un panneau (question, pause) peut s'ouvrir sous le doigt
 * avant qu'il ne se lève : le « click » émis au relâchement validerait alors une réponse au hasard.
 * On intercepte ce clic unique en phase de capture.
 */
function swallowGhostClick(): void {
  const deadline = performance.now() + GHOST_CLICK_WINDOW_MS;
  const swallow = (event: MouseEvent): void => {
    window.removeEventListener("click", swallow, true);
    if (performance.now() > deadline) return;
    event.preventDefault();
    event.stopPropagation();
  };
  window.addEventListener("click", swallow, true);
  window.setTimeout(() => window.removeEventListener("click", swallow, true), GHOST_CLICK_WINDOW_MS);
}
