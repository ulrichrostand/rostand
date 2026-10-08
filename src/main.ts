import * as THREE from "three";
import "./style.css";
import { InputController } from "./core/input";
import { SoundFx } from "./core/sound";
import { CURRICULUM } from "./content/curriculum";
import type { DevOpsModule } from "./content/types";
import { difficultyForModule } from "./game/difficulty";
import { Mission } from "./game/mission";
import { isModuleUnlocked, ProgressStore } from "./game/progress";
import { computeMissionScore } from "./game/scoring";
import { ChallengePanel } from "./ui/challengePanel";
import { requireElement } from "./ui/dom";
import { Hud } from "./ui/hud";
import { ScreenManager } from "./ui/screens";

const MAX_FRAME_DELTA_SECONDS = 0.05;
const MINIMAP_REFRESH_SECONDS = 0.1;

/** Orchestre écrans, missions et progression. Une seule mission active à la fois. */
class ShadowOpsApp {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
  private readonly input = new InputController(window);
  private readonly sound = new SoundFx();
  private readonly progress = new ProgressStore(safeLocalStorage());
  private readonly screens = new ScreenManager(requireElement("#screen"));
  private readonly hud = new Hud(requireElement("#ui"));
  private readonly challengeContainer = requireElement<HTMLElement>("#challenge");
  private readonly clock = new THREE.Clock();
  private readonly moduleIds = CURRICULUM.map((module) => module.id);
  private readonly idleScene = createIdleScene();

  private mission: Mission | null = null;
  private wrongAttemptsPerTerminal: number[] = [];
  private minimapTimer = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    window.addEventListener("resize", () => this.resize());
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
    this.showTitle();
    // Raccourcis de test : bloc éliminé du build de production (import.meta.env.DEV vaut false).
    if (import.meta.env.DEV) {
      Object.assign(window, {
        shadowOpsDebug: {
          openTerminal: (terminalIndex: number) => {
            this.requireMission().pause();
            this.openTerminal(terminalIndex);
          },
          hackAll: () => this.requireMission().terminals.forEach((_, index) => this.requireMission().markTerminalHacked(index)),
          extract: () => this.handleExtraction(this.requireMission().module),
          mission: () => this.mission,
        },
      });
    }
  }

  private showTitle(): void {
    this.endMission();
    const hasProgress = Object.keys(this.progress.snapshot.records).length > 0;
    this.screens.showTitle(hasProgress, () => this.showCampaignMap(), () => {
      this.progress.reset();
      this.showTitle();
    });
  }

  private showCampaignMap(): void {
    this.endMission();
    const entries = CURRICULUM.map((module) => ({
      module,
      unlocked: isModuleUnlocked(this.moduleIds, module.id, this.progress.snapshot),
      record: this.progress.recordFor(module.id),
    }));
    this.screens.showCampaignMap(
      entries,
      (module) => this.showBriefing(module),
      (module) => this.screens.showDossier(module, () => this.showCampaignMap()),
      () => this.showTitle(),
    );
  }

  private showBriefing(module: DevOpsModule): void {
    const moduleIndex = CURRICULUM.indexOf(module);
    this.screens.showBriefing(module, moduleIndex + 1, () => this.startMission(module), () => this.showCampaignMap());
  }

  private startMission(module: DevOpsModule): void {
    this.endMission();
    const moduleIndex = CURRICULUM.indexOf(module);
    try {
      this.mission = new Mission(module, difficultyForModule(moduleIndex), this.camera, this.input, {
        onTerminalRequested: (terminalIndex) => this.openTerminal(terminalIndex),
        onDetected: (livesLeft) => this.handleDetected(livesLeft),
        onMissionFailed: () => this.handleMissionFailed(module),
        onExtraction: () => this.handleExtraction(module),
        onPauseRequested: () => this.showPause(),
        onNotice: (message) => this.hud.showNotice(message),
      });
    } catch (error) {
      console.error("Échec de la création de la mission", error);
      window.alert("Impossible de générer ce secteur. Recharge la page ou choisis un autre module.");
      this.showCampaignMap();
      return;
    }
    this.wrongAttemptsPerTerminal = module.challenges.map(() => 0);
    this.screens.hide();
    this.hud.show(`${module.codename} · ${module.title}`);
    this.hud.showNotice("Pirate tous les terminaux (losanges rouges) sans te faire repérer.");
    this.mission.resume();
  }

  private openTerminal(terminalIndex: number): void {
    const mission = this.requireMission();
    const challenge = mission.module.challenges[terminalIndex];
    const terminal = mission.terminals[terminalIndex];
    if (!challenge || !terminal) throw new RangeError(`Aucun défi pour le terminal ${terminalIndex}`);
    this.sound.play("hack");

    const panel = new ChallengePanel(this.challengeContainer, challenge, terminal.label, this.wrongAttemptsPerTerminal[terminalIndex] ?? 0, {
      onWrongAnswer: () => {
        this.sound.play("failure");
        mission.raiseNoiseAt(terminalIndex);
      },
      onSolved: ({ wrongAttempts }) => {
        this.wrongAttemptsPerTerminal[terminalIndex] = wrongAttempts;
        panel.close();
        this.sound.play("success");
        mission.markTerminalHacked(terminalIndex);
        mission.resume();
      },
      onDisconnect: (wrongAttempts) => {
        this.wrongAttemptsPerTerminal[terminalIndex] = wrongAttempts;
        panel.close();
        mission.resume();
      },
    });
    panel.open();
  }

  private handleDetected(livesLeft: number): void {
    this.sound.play("alarm");
    this.flashAlert();
    this.screens.showDetected(livesLeft, () => {
      this.screens.hide();
      this.mission?.resume();
    });
  }

  private handleMissionFailed(module: DevOpsModule): void {
    this.sound.play("alarm");
    this.flashAlert();
    this.hud.hide();
    this.screens.showFailed(() => this.startMission(module), () => this.showCampaignMap());
  }

  private handleExtraction(module: DevOpsModule): void {
    const mission = this.requireMission();
    this.sound.play("extract");
    const score = computeMissionScore({
      terminalCount: mission.terminals.length,
      wrongAttemptsPerTerminal: this.wrongAttemptsPerTerminal,
      detections: mission.detections,
      elapsedSeconds: mission.elapsedSeconds,
    });
    this.progress.saveResult(module.id, { bestScore: score.score, stars: score.stars, ghost: score.ghost });
    this.hud.hide();

    const moduleIndex = CURRICULUM.indexOf(module);
    const nextModule = CURRICULUM[moduleIndex + 1];
    this.screens.showDebrief(
      {
        module,
        score,
        wrongAttemptsPerTerminal: [...this.wrongAttemptsPerTerminal],
        detections: mission.detections,
        elapsedSeconds: mission.elapsedSeconds,
        isLastModule: !nextModule,
      },
      () => (nextModule ? this.showBriefing(nextModule) : this.showCampaignMap()),
      () => this.startMission(module),
      () => this.showCampaignMap(),
    );
  }

  private showPause(): void {
    this.screens.showPause(
      () => {
        this.screens.hide();
        this.mission?.resume();
      },
      () => this.showCampaignMap(),
    );
  }

  private endMission(): void {
    if (!this.mission) return;
    this.mission.dispose();
    this.mission = null;
    this.hud.hide();
    this.challengeContainer.hidden = true;
    this.challengeContainer.replaceChildren();
    this.canvas.classList.remove("night-vision");
  }

  private frame(): void {
    const deltaSeconds = Math.min(this.clock.getDelta(), MAX_FRAME_DELTA_SECONDS);
    const elapsedSeconds = this.clock.elapsedTime;
    const mission = this.mission;
    if (!mission) {
      this.animateIdleScene(elapsedSeconds);
      return;
    }
    mission.tick(deltaSeconds, elapsedSeconds);
    // La mission a pu être terminée par un callback pendant tick() (échec, extraction...).
    if (this.mission !== mission) return;

    this.canvas.classList.toggle("night-vision", mission.isNightVisionOn);
    this.renderer.toneMappingExposure = mission.isNightVisionOn ? 2.4 : 1;
    this.hud.render(mission.hudState());
    this.minimapTimer -= deltaSeconds;
    if (this.minimapTimer <= 0) {
      this.hud.drawMinimap(mission.minimapSnapshot());
      this.minimapTimer = MINIMAP_REFRESH_SECONDS;
    }
    this.renderer.render(mission.scene, this.camera);
  }

  private animateIdleScene(elapsedSeconds: number): void {
    this.camera.position.set(Math.cos(elapsedSeconds * 0.1) * 14, 9, Math.sin(elapsedSeconds * 0.1) * 14);
    this.camera.lookAt(0, 0, 0);
    this.renderer.toneMappingExposure = 1;
    this.renderer.render(this.idleScene, this.camera);
  }

  private flashAlert(): void {
    document.body.classList.remove("alert-flash");
    // Force un reflow pour relancer l'animation CSS si deux alertes se suivent.
    void document.body.offsetWidth;
    document.body.classList.add("alert-flash");
  }

  private resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private requireMission(): Mission {
    if (!this.mission) throw new Error("Aucune mission active");
    return this.mission;
  }
}

/** Décor du menu : une salle serveur stylisée qui tourne lentement en arrière-plan. */
function createIdleScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05080c);
  scene.fog = new THREE.Fog(0x05080c, 10, 30);
  scene.add(new THREE.HemisphereLight(0x6f8fb0, 0x0b0f14, 0.6));
  const rackMaterial = new THREE.MeshStandardMaterial({ color: 0x1a2129, metalness: 0.5, roughness: 0.5 });
  const ledMaterial = new THREE.MeshStandardMaterial({ color: 0x39ff88, emissive: 0x39ff88, emissiveIntensity: 2 });
  const rackGeometry = new THREE.BoxGeometry(0.9, 2.2, 0.9);
  const ledGeometry = new THREE.BoxGeometry(0.06, 0.06, 0.02);
  for (let row = -2; row <= 2; row++) {
    for (let column = -4; column <= 4; column++) {
      if (row === 0) continue;
      const rack = new THREE.Mesh(rackGeometry, rackMaterial);
      rack.position.set(column * 1.1, 1.1, row * 2.6);
      scene.add(rack);
      for (let led = 0; led < 4; led++) {
        const light = new THREE.Mesh(ledGeometry, ledMaterial);
        light.position.set(column * 1.1 + 0.3, 0.5 + led * 0.45, row * 2.6 + 0.46 * Math.sign(-row));
        scene.add(light);
      }
    }
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x0e141a }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const glow = new THREE.PointLight(0x4fc3ff, 30, 25, 1.5);
  glow.position.set(0, 4, 0);
  scene.add(glow);
  return scene;
}

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch (error) {
    console.warn("localStorage inaccessible : la progression ne sera pas sauvegardée.", error);
    return null;
  }
}

function boot(): void {
  const canvas = requireElement<HTMLCanvasElement>("#game");
  try {
    new ShadowOpsApp(canvas);
  } catch (error) {
    console.error("Initialisation impossible", error);
    const fallback = requireElement<HTMLElement>("#screen");
    fallback.hidden = false;
    fallback.textContent = "Impossible de démarrer le jeu : WebGL est requis. Essaie un navigateur récent (Chrome, Firefox, Edge, Safari).";
  }
}

boot();
