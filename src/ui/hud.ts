import { Tile } from "../core/grid";
import type { HudState, MinimapSnapshot } from "../game/mission";
import { element } from "./dom";

const POSTURE_LABELS = { standing: "Debout", crouching: "Accroupi (discret)", running: "Course (bruyant)" } as const;
const MINIMAP_SCALE = 4;
/** Les gardes n'apparaissent sur la carte que dans ce rayon : un « sonar » à courte portée. */
const SONAR_RADIUS = 7;
const NOTICE_DURATION_MS = 4200;

export class Hud {
  readonly root = element("div", { className: "hud" });
  private readonly missionLabel = element("div", { className: "hud-mission" });
  private readonly objective = element("div", { className: "hud-objective" });
  private readonly lives = element("div", { className: "hud-lives", attributes: { "aria-label": "Intégrité" } });
  private readonly exposureFill = element("div", { className: "exposure-fill" });
  private readonly exposureLabel = element("div", { className: "exposure-label" });
  private readonly posture = element("div", { className: "hud-posture" });
  private readonly prompt = element("div", { className: "hud-prompt" });
  private readonly notice = element("div", { className: "hud-notice", attributes: { role: "status", "aria-live": "polite" } });
  private readonly minimap = element("canvas", { className: "minimap", attributes: { "aria-hidden": "true" } });
  private readonly minimapContext: CanvasRenderingContext2D | null;
  private noticeTimer: number | undefined;
  private lastRendered = "";
  /** Murs et sols pré-rendus une fois par niveau : seule la couche dynamique est redessinée. */
  private staticLayer: HTMLCanvasElement | null = null;
  private staticLayerLayout: MinimapSnapshot["layout"] | null = null;

  constructor(parent: HTMLElement) {
    this.minimapContext = this.minimap.getContext("2d");
    this.root.append(
      element("div", { className: "hud-top-left" }, [this.missionLabel, this.objective]),
      element("div", { className: "hud-top-right" }, [this.lives, this.minimap]),
      element("div", { className: "hud-bottom" }, [
        this.prompt,
        element("div", { className: "exposure" }, [element("div", { className: "exposure-track" }, [this.exposureFill]), this.exposureLabel]),
        this.posture,
        element("div", { className: "hud-help", text: "ZQSD/WASD bouger · Maj courir · C s'accroupir · E pirater · N vision nocturne · Échap pause" }),
      ]),
      this.notice,
    );
    this.root.hidden = true;
    parent.append(this.root);
  }

  show(missionTitle: string): void {
    this.missionLabel.textContent = missionTitle;
    this.lastRendered = "";
    this.root.hidden = false;
  }

  hide(): void {
    this.root.hidden = true;
  }

  render(state: HudState): void {
    // Écrire dans le DOM uniquement si l'état a changé : évite des recalculs de layout à chaque frame.
    const exposurePercent = Math.round(state.exposure * 100);
    const signature = [state.livesLeft, state.hackedCount, exposurePercent, state.posture, state.interactionLabel, state.nightVision].join("|");
    if (signature === this.lastRendered) return;
    this.lastRendered = signature;

    this.objective.textContent =
      state.hackedCount < state.terminalCount
        ? `Terminaux piratés : ${state.hackedCount}/${state.terminalCount}`
        : "Objectif : rejoindre l'extraction";
    this.lives.textContent = `Intégrité ${"■".repeat(state.livesLeft)}${"□".repeat(Math.max(0, 3 - state.livesLeft))}`;
    this.exposureFill.style.width = `${exposurePercent}%`;
    this.exposureFill.dataset.level = exposurePercent > 66 ? "high" : exposurePercent > 25 ? "medium" : "low";
    this.exposureLabel.textContent = exposurePercent === 0 ? "Invisible" : `Exposition ${exposurePercent}%`;
    this.posture.textContent = `${POSTURE_LABELS[state.posture]}${state.nightVision ? " · Vision nocturne" : ""}`;
    this.prompt.textContent = state.interactionLabel ? `[E] ${state.interactionLabel}` : "";
    this.prompt.hidden = !state.interactionLabel;
  }

  showNotice(message: string): void {
    this.notice.textContent = message;
    this.notice.classList.add("visible");
    window.clearTimeout(this.noticeTimer);
    this.noticeTimer = window.setTimeout(() => this.notice.classList.remove("visible"), NOTICE_DURATION_MS);
  }

  drawMinimap(snapshot: MinimapSnapshot): void {
    const context = this.minimapContext;
    if (!context) return;
    if (this.staticLayerLayout !== snapshot.layout) this.renderStaticLayer(snapshot);
    context.clearRect(0, 0, this.minimap.width, this.minimap.height);
    if (this.staticLayer) context.drawImage(this.staticLayer, 0, 0);
    const dot = (x: number, z: number, color: string, radius: number): void => {
      context.fillStyle = color;
      context.beginPath();
      context.arc(x * MINIMAP_SCALE, z * MINIMAP_SCALE, radius, 0, Math.PI * 2);
      context.fill();
    };
    for (const terminal of snapshot.terminals) dot(terminal.cell.x + 0.5, terminal.cell.z + 0.5, terminal.hacked ? "#39ff88" : "#ff3b4e", 3);
    const exit = snapshot.layout.exit;
    dot(exit.x + 0.5, exit.z + 0.5, snapshot.exitUnlocked ? "#39ff88" : "#7a5a20", 4);
    for (const guard of snapshot.guards) {
      if (guard.position.distanceTo(snapshot.player) <= SONAR_RADIUS) dot(guard.position.x, guard.position.z, "#ffb020", 2.5);
    }
    dot(snapshot.player.x, snapshot.player.z, "#e8fff0", 3);
  }

  private renderStaticLayer(snapshot: MinimapSnapshot): void {
    const { grid } = snapshot.layout;
    const layer = document.createElement("canvas");
    layer.width = grid.width * MINIMAP_SCALE;
    layer.height = grid.height * MINIMAP_SCALE;
    this.minimap.width = layer.width;
    this.minimap.height = layer.height;
    const context = layer.getContext("2d");
    if (!context) return;
    context.fillStyle = "rgba(5, 10, 14, 0.85)";
    context.fillRect(0, 0, layer.width, layer.height);
    for (let z = 0; z < grid.height; z++) {
      for (let x = 0; x < grid.width; x++) {
        const tile = grid.get(x, z);
        if (tile === Tile.Wall) continue;
        context.fillStyle = tile === Tile.Cover ? "#24404a" : "#16262e";
        context.fillRect(x * MINIMAP_SCALE, z * MINIMAP_SCALE, MINIMAP_SCALE, MINIMAP_SCALE);
      }
    }
    this.staticLayer = layer;
    this.staticLayerLayout = snapshot.layout;
  }
}
