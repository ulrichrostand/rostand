import * as THREE from "three";
import "./style.css";
import { unlockedWeapons } from "./combat/weapons";
import { InputController } from "./core/input";
import { SoundFx } from "./core/sound";
import { CURRICULUM } from "./content/curriculum";
import type { DevOpsModule } from "./content/types";
import { difficultyForModule } from "./game/difficulty";
import { cameraZoomForAspect, Mission } from "./game/mission";
import { isModuleUnlocked, ProgressStore } from "./game/progress";
import { computeMissionScore } from "./game/scoring";
import { ChallengePanel } from "./ui/challengePanel";
import { CommandPanel } from "./ui/commandPanel";
import { requireElement } from "./ui/dom";
import { Hud } from "./ui/hud";
import { LessonPanel } from "./ui/lessonPanel";
import { ScreenManager } from "./ui/screens";
import { prefersTouchControls, TouchControls } from "./ui/touchControls";

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
  private readonly touchControls = new TouchControls(requireElement("#ui"), this.input);
  private readonly challengeContainer = requireElement<HTMLElement>("#challenge");
  private readonly lessonPanel = new LessonPanel(this.challengeContainer);
  private readonly clock = new THREE.Clock();
  private readonly moduleIds = CURRICULUM.map((module) => module.id);
  private readonly idleScene = createIdleScene();

  private mission: Mission | null = null;
  private wrongAttemptsPerTerminal: number[] = [];
  /** Leçons déjà lues dans la mission en cours (ramassées ou transmises au terminal). */
  private readLessons = new Set<number>();
  /** Historique des commandes du gadget, conservé entre missions comme un vrai shell. */
  private readonly commandHistory: string[] = [];
  private minimapTimer = 0;
  private touchMode = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    // Sur mobile, un ratio de 3 triple le coût de rendu pour un gain visuel imperceptible.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, prefersTouchControls() ? 1.5 : 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    window.addEventListener("resize", () => this.resize());
    if (prefersTouchControls()) this.enableTouchMode();
    // Un écran tactile sur un ordinateur portable n'est détecté qu'au premier contact.
    window.addEventListener("touchstart", () => this.enableTouchMode(), { once: true, passive: true });
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

  private enableTouchMode(): void {
    if (this.touchMode) return;
    this.touchMode = true;
    document.body.classList.add("touch");
    this.hud.setTouchMode(true);
    if (this.mission && !this.hud.root.hidden) this.touchControls.show();
  }

  private showMissionUi(title: string): void {
    this.hud.show(title);
    if (this.touchMode) this.touchControls.show();
  }

  private hideMissionUi(): void {
    this.hud.hide();
    this.touchControls.hide();
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
      const gadgetAvailable = unlockedWeapons(this.moduleIds, module.id).length > 0;
      this.mission = new Mission(
        module,
        difficultyForModule(moduleIndex),
        this.camera,
        this.input,
        {
          onTerminalRequested: (terminalIndex) => this.openTerminal(terminalIndex),
          onIntelFound: () => this.showCollectedIntel(),
          onCommandRequested: (guardIndex) => this.openCommandPanel(guardIndex),
          onTakedown: () => this.handleTakedown(),
          onDetected: (livesLeft) => this.handleDetected(livesLeft),
          onMissionFailed: () => this.handleMissionFailed(module),
          onExtraction: () => this.handleExtraction(module),
          onPauseRequested: () => this.showPause(),
          onNotice: (message) => this.hud.showNotice(message),
        },
        { gadgetAvailable },
      );
    } catch (error) {
      console.error("Échec de la création de la mission", error);
      window.alert("Impossible de générer ce secteur. Recharge la page ou choisis un autre module.");
      this.showCampaignMap();
      return;
    }
    this.wrongAttemptsPerTerminal = module.challenges.map(() => 0);
    this.readLessons = new Set();
    this.screens.hide();
    this.mission.setCameraZoom(cameraZoomForAspect(this.camera.aspect));
    this.showMissionUi(`${module.codename} · ${module.title}`);
    this.hud.showNotice("Ramasse les dossiers jaunes 📁 pour apprendre, puis pirate les terminaux rouges.");
    this.mission.resume();
  }

  /**
   * Un débutant ne doit jamais tomber sur une question sans avoir eu la leçon :
   * si le dossier correspondant n'a pas été lu, la cellule Écho le transmet d'abord.
   */
  private openTerminal(terminalIndex: number): void {
    const mission = this.requireMission();
    const lesson = mission.module.lessons[terminalIndex];
    if (!lesson) throw new RangeError(`Aucune leçon pour le terminal ${terminalIndex}`);
    if (this.readLessons.has(terminalIndex)) {
      this.openChallenge(terminalIndex);
      return;
    }
    this.readLessons.add(terminalIndex);
    this.lessonPanel.open(lesson, {
      eyebrow: "Transmission de la cellule Écho",
      intro: "Tu n'as pas encore trouvé le dossier lié à ce terminal. Voici l'essentiel avant de pirater :",
      continueLabel: "Compris, pirater le terminal",
      onContinue: () => this.openChallenge(terminalIndex),
    });
  }

  private openChallenge(terminalIndex: number): void {
    const mission = this.requireMission();
    const challenge = mission.module.challenges[terminalIndex];
    const lesson = mission.module.lessons[terminalIndex];
    const terminal = mission.terminals[terminalIndex];
    if (!challenge || !lesson || !terminal) throw new RangeError(`Aucun défi pour le terminal ${terminalIndex}`);
    this.sound.play("hack");

    const panel = new ChallengePanel(this.challengeContainer, challenge, lesson, terminal.label, this.wrongAttemptsPerTerminal[terminalIndex] ?? 0, {
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

  /** Les dossiers se lisent dans l'ordre du cours, quel que soit l'endroit où on les ramasse. */
  private showCollectedIntel(): void {
    const mission = this.requireMission();
    const lessons = mission.module.lessons;
    const nextUnread = lessons.findIndex((_, index) => !this.readLessons.has(index));
    const lessonIndex = nextUnread === -1 ? (mission.intelCollected - 1) % lessons.length : nextUnread;
    const lesson = lessons[lessonIndex];
    if (!lesson) throw new RangeError(`Leçon ${lessonIndex} introuvable`);
    this.readLessons.add(lessonIndex);
    this.sound.play("success");
    this.lessonPanel.open(lesson, {
      eyebrow: `Dossier ${lessonIndex + 1}/${lessons.length}${nextUnread === -1 ? " · révision" : ""}`,
      continueLabel: "Compris, continuer la mission",
      onContinue: () => mission.resume(),
    });
  }

  private openCommandPanel(guardIndex: number): void {
    const mission = this.requireMission();
    const weapons = unlockedWeapons(this.moduleIds, mission.module.id);
    const target = mission.sentinelIdentity(guardIndex);
    this.sound.play("hack");
    const panel = new CommandPanel(this.challengeContainer, weapons, target, this.commandHistory, {
      onSuccess: (weapon) => {
        panel.close();
        this.sound.play("takedown");
        mission.neutralizeByCommand(guardIndex);
        this.hud.showNotice(`${target.containerName} arrêtée avec ${weapon.label}.`);
        mission.resume();
      },
      onFailure: () => {
        this.sound.play("failure");
        mission.commandFailedOn(guardIndex);
      },
      onCancel: () => {
        panel.close();
        mission.resume();
      },
    });
    panel.open();
  }

  private handleTakedown(): void {
    this.sound.play("takedown");
    this.hud.showNotice("Sentinelle neutralisée en silence.");
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
    this.hideMissionUi();
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
      intelCollected: mission.intelCollected,
      intelTotal: mission.intelTotal,
    });
    this.progress.saveResult(module.id, { bestScore: score.score, stars: score.stars, ghost: score.ghost });
    this.hideMissionUi();

    const moduleIndex = CURRICULUM.indexOf(module);
    const nextModule = CURRICULUM[moduleIndex + 1];
    this.screens.showDebrief(
      {
        module,
        score,
        wrongAttemptsPerTerminal: [...this.wrongAttemptsPerTerminal],
        detections: mission.detections,
        neutralizations: mission.neutralizations,
        intelCollected: mission.intelCollected,
        intelTotal: mission.intelTotal,
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
    this.hideMissionUi();
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
    const hudState = mission.hudState();
    this.hud.render(hudState);
    if (this.touchMode) {
      this.touchControls.sync({
        contextLabel: hudState.contextAction ? (hudState.contextAction.kind === "takedown" ? "Neutraliser" : "Pirater") : null,
        crouched: hudState.posture === "crouching",
        gadgetVisible: hudState.gadgetAvailable,
        gadgetReady: hudState.commandTargetLabel !== null,
      });
    }
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
    this.mission?.setCameraZoom(cameraZoomForAspect(this.camera.aspect));
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
