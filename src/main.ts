import * as THREE from "three";
import "./style.css";
import { unlockedWeapons } from "./combat/weapons";
import { InputController } from "./core/input";
import { SeededRandom } from "./core/rng";
import { FrameRateMonitor, lowerQuality, nextQuality, QUALITY_PROFILES, SettingsStore, type GraphicsQuality } from "./core/settings";
import { Ambience } from "./core/ambience";
import { AudioEngine, SoundFx } from "./core/sound";
import { CURRICULUM } from "./content/curriculum";
import type { DevOpsModule } from "./content/types";
import { difficultyForModule } from "./game/difficulty";
import { buildGeneralExam, buildModuleExam, examTimeLimitSeconds, GENERAL_EXAM_ID, GENERAL_EXAM_MIN_MODULES, mentionFor, type ExamQuestion } from "./game/exam";
import { cameraZoomForAspect, Mission, type ShotResult, type TargetRef } from "./game/mission";
import { isModuleUnlocked, LEVEL_LAYOUT_VERSION, ProgressStore, type MissionCheckpoint } from "./game/progress";
import { decodeSaveCode, encodeSaveCode, SaveCodeError } from "./game/saveCode";
import { computeMissionScore } from "./game/scoring";
import { SCENARIOS } from "./content/scenarios";
import { ChallengePanel } from "./ui/challengePanel";
import { ExamPanel, type ExamOutcome } from "./ui/examPanel";
import { ScenarioPanel } from "./ui/scenarioPanel";
import { CommandPanel } from "./ui/commandPanel";
import { requireElement } from "./ui/dom";
import { Hud } from "./ui/hud";
import { LessonPanel } from "./ui/lessonPanel";
import { RenderPipeline } from "./render/renderPipeline";
import { ScreenManager } from "./ui/screens";
import { prefersTouchControls, TouchControls } from "./ui/touchControls";

const MAX_FRAME_DELTA_SECONDS = 0.05;
const MINIMAP_REFRESH_SECONDS = 0.1;

/** Orchestre écrans, missions et progression. Une seule mission active à la fois. */
class ShadowOpsApp {
  private readonly pipeline: RenderPipeline;
  private readonly settings = new SettingsStore(safeLocalStorage(), prefersTouchControls());
  private readonly frameRateMonitor = new FrameRateMonitor();
  private readonly aimRaycaster = new THREE.Raycaster();
  private readonly groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly aimPointScratch = new THREE.Vector3();
  private readonly camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
  private readonly input = new InputController(window);
  private readonly audio = new AudioEngine(this.settings.soundEnabled);
  private readonly sound = new SoundFx(this.audio);
  private readonly ambience = new Ambience(this.audio);
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
  /** Étape atteinte dans l'intervention de la console principale (reprise si on se déconnecte). */
  private scenarioStep = 0;
  /** Leçons déjà lues dans la mission en cours (ramassées ou transmises au terminal). */
  private readLessons = new Set<number>();
  /** Historique des commandes du gadget, conservé entre missions comme un vrai shell. */
  private readonly commandHistory: string[] = [];
  private minimapTimer = 0;
  private touchMode = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.pipeline = new RenderPipeline(canvas, QUALITY_PROFILES[this.settings.quality]);
    window.addEventListener("resize", () => this.resize());
    this.input.attachPointerAim(canvas);
    if (prefersTouchControls()) this.enableTouchMode();
    // Un écran tactile sur un ordinateur portable n'est détecté qu'au premier contact.
    window.addEventListener("touchstart", () => this.enableTouchMode(), { once: true, passive: true });
    // L'indicateur n'apparaît qu'en mission : dans les menus, la sauvegarde est affichée autrement.
    this.progress.onSaved = () => {
      if (this.mission && !this.hud.root.hidden) this.hud.showSaved();
    };
    this.resize();
    this.pipeline.renderer.setAnimationLoop(() => this.frame());
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
          camera: () => this.camera,
          scenario: (moduleId: string) => SCENARIOS[moduleId],
          ambience: () => this.ambience,
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
    this.canvas.classList.add("aiming");
    if (this.touchMode) this.touchControls.show();
  }

  private hideMissionUi(): void {
    this.hud.hide();
    this.canvas.classList.remove("aiming");
    this.touchControls.hide();
  }

  private showTitle(): void {
    this.endMission();
    const checkpoint = this.resumableCheckpoint();
    const resumeModule = checkpoint ? this.moduleById(checkpoint.moduleId) : undefined;
    this.screens.showTitle({
      hasProgress: Object.keys(this.progress.snapshot.records).length > 0 || checkpoint !== null,
      resume:
        checkpoint && resumeModule
          ? {
              label: `Reprendre : ${resumeModule.codename}`,
              detail: `${checkpoint.hackedTerminals.length}/${resumeModule.challenges.length} terminaux · ${checkpoint.collectedIntel.length}/${resumeModule.lessons.length} dossiers`,
              onResume: () => this.startMission(resumeModule, checkpoint),
            }
          : null,
      onCampaign: () => this.showCampaignMap(),
      onSaveManager: () => this.showSaveManager(),
      qualityLabel: this.qualityLabel(),
      onCycleQuality: () => this.cycleQuality(),
      soundLabel: this.soundLabel(),
      onToggleSound: () => this.toggleSound(),
      onReset: () => {
        this.progress.reset();
        this.showTitle();
      },
    });
  }

  private showCampaignMap(): void {
    this.endMission();
    const checkpoint = this.resumableCheckpoint();
    const entries = CURRICULUM.map((module) => ({
      module,
      unlocked: isModuleUnlocked(this.moduleIds, module.id, this.progress.snapshot),
      record: this.progress.recordFor(module.id),
      inProgress: checkpoint?.moduleId === module.id,
      examRecord: this.progress.examRecordFor(module.id),
    }));
    this.screens.showCampaignMap(entries, this.progress.examRecordFor(GENERAL_EXAM_ID), {
      onPlay: (module) => this.showBriefing(module),
      onResume: (module) => {
        if (checkpoint?.moduleId === module.id) this.startMission(module, checkpoint);
      },
      onDossier: (module) => this.screens.showDossier(module, () => this.showCampaignMap()),
      onExam: (module) => this.openModuleExam(module),
      onGeneralExam: () => this.openGeneralExam(),
      onBack: () => this.showTitle(),
    });
  }

  private completedModules(): DevOpsModule[] {
    return CURRICULUM.filter((module) => this.progress.recordFor(module.id) !== undefined);
  }

  private openModuleExam(module: DevOpsModule): void {
    const questions = buildModuleExam({ module, scenario: SCENARIOS[module.id] }, examRandom());
    this.openExam(module.id, `Examen — ${module.codename}`, module.title, questions, false, () => this.openModuleExam(module));
  }

  private openGeneralExam(): void {
    const modules = this.completedModules();
    // Garde-fou : le bouton est désactivé sous ce seuil, mais l'état peut changer (import de sauvegarde).
    if (modules.length < GENERAL_EXAM_MIN_MODULES) {
      this.showCampaignMap();
      return;
    }
    const questions = buildGeneralExam(modules.map((module) => ({ module, scenario: SCENARIOS[module.id] })), examRandom());
    this.openExam(GENERAL_EXAM_ID, "Examen général", `${modules.length} secteurs libérés`, questions, true, () => this.openGeneralExam());
  }

  private openExam(examId: string, title: string, subtitle: string, questions: ExamQuestion[], showModuleTags: boolean, retry: () => void): void {
    this.endMission();
    const exam = new ExamPanel(
      (content) => this.screens.present(content),
      {
        title,
        subtitle,
        questions,
        timeLimitSeconds: examTimeLimitSeconds(questions.length),
        previousBestGrade: this.progress.examRecordFor(examId)?.bestGrade ?? null,
        showModuleTags,
        moduleLabel: (moduleId) => this.moduleById(moduleId)?.codename ?? moduleId,
      },
      {
        onFinished: (outcome: ExamOutcome) => {
          this.sound.play(mentionFor(outcome.grade).passed ? "extract" : "failure");
          const { record, improved } = this.progress.saveExamResult(examId, outcome.grade);
          return { bestGrade: record.bestGrade, improved };
        },
        onRetry: retry,
        onExit: () => this.showCampaignMap(),
      },
    );
    exam.open();
  }

  private showBriefing(module: DevOpsModule): void {
    const moduleIndex = CURRICULUM.indexOf(module);
    const checkpoint = this.resumableCheckpoint();
    const replacedModule = checkpoint && checkpoint.moduleId !== module.id ? this.moduleById(checkpoint.moduleId) : undefined;
    const warning = replacedModule
      ? `Attention : ta mission en cours (${replacedModule.codename}) sera remplacée par celle-ci dès la première sauvegarde.`
      : checkpoint?.moduleId === module.id
        ? "Tu avais une partie en cours sur ce secteur : lancer l'infiltration la recommence depuis le début."
        : null;
    this.screens.showBriefing(module, moduleIndex, warning, () => this.startMission(module), () => this.showCampaignMap());
  }

  private showSaveManager(): void {
    const snapshot = this.progress.snapshot;
    const completed = CURRICULUM.filter((module) => module.id in snapshot.records).length;
    const stars = Object.values(snapshot.records).reduce((total, record) => total + record.stars, 0);
    const checkpoint = this.resumableCheckpoint();
    this.screens.showSaveManager({
      persistent: this.progress.isPersistent,
      savedAt: snapshot.savedAt,
      summary: `${completed}/${CURRICULUM.length} secteurs libérés · ${stars} étoiles${checkpoint ? ` · mission en cours : ${this.moduleById(checkpoint.moduleId)?.codename ?? checkpoint.moduleId}` : ""}`,
      code: encodeSaveCode(snapshot),
      onImport: (code) => {
        try {
          this.progress.replaceWith(decodeSaveCode(code));
          return null;
        } catch (error) {
          if (error instanceof SaveCodeError) return error.message;
          console.error("Import de sauvegarde impossible", error);
          return "Import impossible : code invalide.";
        }
      },
      onImported: () => this.showSaveManager(),
      onBack: () => this.showTitle(),
    });
  }

  private startMission(module: DevOpsModule, checkpoint: MissionCheckpoint | null = null): void {
    this.endMission();
    const moduleIndex = CURRICULUM.indexOf(module);
    try {
      const gadgetTargets = {
        sentinel: unlockedWeapons(this.moduleIds, module.id, "sentinel").length > 0,
        camera: unlockedWeapons(this.moduleIds, module.id, "camera").length > 0,
      };
      this.mission = new Mission(
        module,
        difficultyForModule(moduleIndex),
        this.camera,
        this.input,
        {
          onTerminalRequested: (terminalIndex) => this.openTerminal(terminalIndex),
          onIntelFound: () => this.showCollectedIntel(),
          onCommandRequested: (target) => this.openCommandPanel(target),
          onTakedown: () => this.handleTakedown(),
          onShot: (result) => this.handleShot(result),
          onDetected: (livesLeft) => this.handleDetected(livesLeft),
          onMissionFailed: () => this.handleMissionFailed(module),
          onExtraction: () => this.handleExtraction(module),
          onPauseRequested: () => this.showPause(),
          onNotice: (message) => this.hud.showNotice(message),
        },
        { gadgetTargets, moduleIndex, quality: QUALITY_PROFILES[this.settings.quality] },
      );
    } catch (error) {
      console.error("Échec de la création de la mission", error);
      window.alert("Impossible de générer ce secteur. Recharge la page ou choisis un autre module.");
      this.showCampaignMap();
      return;
    }
    // + 1 : la console principale compte aussi dans le score.
    this.wrongAttemptsPerTerminal = [...module.challenges.map(() => 0), 0];
    this.readLessons = new Set();
    this.scenarioStep = 0;
    const resumed = checkpoint !== null && this.applyCheckpoint(this.mission, module, checkpoint);
    this.screens.hide();
    this.mission.setCameraZoom(cameraZoomForAspect(this.camera.aspect));
    this.showMissionUi(`${module.codename} · ${module.title}`);
    this.hud.showNotice(
      resumed
        ? "Mission reprise depuis ta dernière sauvegarde."
        : checkpoint
          ? "Ta sauvegarde de mission date d'une ancienne version du jeu : le secteur repart de zéro (ta campagne est intacte)."
          : "Ramasse les dossiers 📁, pirate les terminaux rouges et résous l'incident sur la console principale bleue.",
    );
    this.mission.resume();
    this.ambience.start();
  }

  /** Renvoie false si la sauvegarde ne correspond plus à ce secteur (version du jeu différente). */
  private applyCheckpoint(mission: Mission, module: DevOpsModule, checkpoint: MissionCheckpoint): boolean {
    if (checkpoint.moduleId !== module.id || checkpoint.layoutVersion !== LEVEL_LAYOUT_VERSION || !mission.restoreState(checkpoint)) {
      console.warn("Point de reprise incompatible : la mission repart de zéro.");
      this.progress.clearCheckpoint();
      return false;
    }
    this.wrongAttemptsPerTerminal = [...module.challenges, null].map((_, index) => checkpoint.wrongAttemptsPerTerminal[index] ?? 0);
    this.readLessons = new Set(checkpoint.readLessons.filter((index) => index < module.lessons.length));
    return true;
  }

  /**
   * Sauvegarde automatique : appelée après chaque étape qui compte (terminal, dossier,
   * neutralisation, détection, pause). Écrire quelques centaines d'octets est négligeable.
   */
  private saveCheckpoint(): void {
    const mission = this.mission;
    if (!mission) return;
    this.progress.saveCheckpoint({
      moduleId: mission.module.id,
      ...mission.captureState(),
      wrongAttemptsPerTerminal: [...this.wrongAttemptsPerTerminal],
      readLessons: [...this.readLessons],
    });
  }

  private resumableCheckpoint(): MissionCheckpoint | null {
    const checkpoint = this.progress.checkpoint;
    return checkpoint && this.moduleById(checkpoint.moduleId) ? checkpoint : null;
  }

  private moduleById(moduleId: string): DevOpsModule | undefined {
    return CURRICULUM.find((module) => module.id === moduleId);
  }

  /**
   * Un débutant ne doit jamais tomber sur une question sans avoir eu la leçon :
   * si le dossier correspondant n'a pas été lu, la cellule Écho le transmet d'abord.
   */
  private openTerminal(terminalIndex: number): void {
    const mission = this.requireMission();
    if (terminalIndex >= mission.module.challenges.length) {
      this.openScenario(terminalIndex);
      return;
    }
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
        this.saveCheckpoint();
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

  /** Console principale : intervention pratique en plusieurs commandes. */
  private openScenario(terminalIndex: number): void {
    const mission = this.requireMission();
    const scenario = SCENARIOS[mission.module.id];
    const terminal = mission.terminals[terminalIndex];
    if (!scenario || !terminal) throw new RangeError(`Aucun scénario pour ${mission.module.id}`);
    this.sound.play("hack");
    const panel = new ScenarioPanel(this.challengeContainer, scenario, terminal.label, this.scenarioStep, this.wrongAttemptsPerTerminal[terminalIndex] ?? 0, {
      onWrongCommand: () => {
        this.sound.play("failure");
        mission.raiseNoiseAt(terminalIndex);
      },
      onStepCompleted: (nextStep) => {
        this.scenarioStep = nextStep;
        this.sound.play("hack");
      },
      onCompleted: (wrongAttempts) => {
        this.wrongAttemptsPerTerminal[terminalIndex] = wrongAttempts;
        panel.close();
        this.sound.play("success");
        mission.markTerminalHacked(terminalIndex);
        this.saveCheckpoint();
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
    this.saveCheckpoint();
    this.sound.play("success");
    this.lessonPanel.open(lesson, {
      eyebrow: `Dossier ${lessonIndex + 1}/${lessons.length}${nextUnread === -1 ? " · révision" : ""}`,
      continueLabel: "Compris, continuer la mission",
      onContinue: () => mission.resume(),
    });
  }

  private openCommandPanel(targetRef: TargetRef): void {
    const mission = this.requireMission();
    // Seuls les gadgets adaptés à la cible sont proposés : pare-feu pour une caméra, kill/docker/kubectl pour une sentinelle.
    const weapons = unlockedWeapons(this.moduleIds, mission.module.id, targetRef.kind);
    const target = mission.targetIdentity(targetRef);
    this.sound.play("hack");
    const panel = new CommandPanel(this.challengeContainer, weapons, target, this.commandHistory, {
      onSuccess: (weapon) => {
        panel.close();
        this.sound.play("takedown");
        mission.neutralizeByCommand(targetRef);
        this.saveCheckpoint();
        this.hud.showNotice(
          targetRef.kind === "camera"
            ? `${target.containerName} coupée définitivement par le pare-feu.`
            : `${target.containerName} arrêtée avec ${weapon.label}.`,
        );
        mission.resume();
      },
      onFailure: () => {
        this.sound.play("failure");
        mission.commandFailedOn(targetRef);
      },
      onCancel: () => {
        panel.close();
        mission.resume();
      },
    });
    panel.open();
  }

  private handleShot(result: ShotResult): void {
    this.sound.play(result === "miss" ? "shot" : "shotHit");
    if (result === "sentinel") {
      this.hud.showNotice("Sentinelle neutralisée par l'IEM. Le tir a fait du bruit : reste prudent.");
      this.saveCheckpoint();
    } else if (result === "camera") {
      this.hud.showNotice("Caméra brouillée 12 secondes. Passe vite… ou coupe-la au pare-feu (F) si tu as le gadget.");
    }
  }

  private handleTakedown(): void {
    this.saveCheckpoint();
    this.sound.play("takedown");
    this.hud.showNotice("Sentinelle neutralisée en silence.");
  }

  private handleDetected(livesLeft: number): void {
    this.saveCheckpoint();
    this.sound.play("alarm");
    this.flashAlert();
    this.screens.showDetected(livesLeft, () => {
      this.screens.hide();
      this.mission?.resume();
    });
  }

  private handleMissionFailed(module: DevOpsModule): void {
    // Mission perdue : la reprendre n'aurait pas de sens, on repart du début.
    this.progress.clearCheckpoint();
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
    this.saveCheckpoint();
    this.screens.showPause({
      persistent: this.progress.isPersistent,
      qualityLabel: this.qualityLabel(),
      onCycleQuality: () => this.cycleQuality(),
      soundLabel: this.soundLabel(),
      onToggleSound: () => this.toggleSound(),
      onResume: () => {
        this.screens.hide();
        this.mission?.resume();
      },
      onQuit: () => {
        this.saveCheckpoint();
        this.showTitle();
      },
    });
  }

  /** Projette le curseur sur le sol : le pistolet vise là où pointe la souris. En tactile, auto-visée. */
  private mouseAimPoint(): THREE.Vector3 | null {
    const pointer = this.input.aimPosition;
    if (this.touchMode || !pointer) return null;
    this.aimRaycaster.setFromCamera(new THREE.Vector2(pointer.x, pointer.y), this.camera);
    return this.aimRaycaster.ray.intersectPlane(this.groundPlane, this.aimPointScratch);
  }

  private soundLabel(): string {
    return this.settings.soundEnabled ? "Son : activé" : "Son : coupé";
  }

  private toggleSound(): string {
    const enabled = !this.settings.soundEnabled;
    this.settings.setSoundEnabled(enabled);
    this.audio.setEnabled(enabled);
    // Son coupé : l'ambiance s'arrête (inutile de synthétiser du silence) et repart si on le réactive en mission.
    if (!enabled) this.ambience.stop();
    else if (this.mission) this.ambience.start();
    return this.soundLabel();
  }

  private qualityLabel(): string {
    return `Graphismes : ${QUALITY_PROFILES[this.settings.quality].label}`;
  }

  /** Bouton de réglage : bloom, vignette et résolution changent tout de suite ; ombres et poussière au prochain secteur. */
  private cycleQuality(): string {
    this.applyQuality(nextQuality(this.settings.quality));
    return this.qualityLabel();
  }

  private applyQuality(quality: GraphicsQuality): void {
    this.settings.setQuality(quality);
    this.pipeline.applyProfile(QUALITY_PROFILES[quality]);
    this.frameRateMonitor.reset();
  }

  private endMission(): void {
    if (!this.mission) return;
    this.mission.dispose();
    this.mission = null;
    this.ambience.stop();
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
    mission.setAimPoint(this.mouseAimPoint());
    mission.tick(deltaSeconds, elapsedSeconds);
    // La mission a pu être terminée par un callback pendant tick() (échec, extraction...).
    if (this.mission !== mission) return;
    if (!mission.isPaused) this.watchFrameRate(deltaSeconds);

    this.canvas.classList.toggle("night-vision", mission.isNightVisionOn);
    this.pipeline.exposure = mission.isNightVisionOn ? 2.4 : 1;
    const hudState = mission.hudState();
    this.hud.render(hudState);
    this.ambience.update(deltaSeconds, hudState.exposure, mission.isPaused);
    if (this.touchMode) {
      this.touchControls.sync({
        contextLabel: hudState.contextAction ? (hudState.contextAction.kind === "takedown" ? "Neutraliser" : "Pirater") : null,
        crouched: hudState.posture === "crouching",
        gadgetVisible: hudState.gadgetAvailable,
        gadgetReady: hudState.commandTargetLabel !== null,
        shootReady: hudState.ammo > 0,
      });
    }
    this.minimapTimer -= deltaSeconds;
    if (this.minimapTimer <= 0) {
      this.hud.drawMinimap(mission.minimapSnapshot());
      this.minimapTimer = MINIMAP_REFRESH_SECONDS;
    }
    this.pipeline.render(mission.scene, this.camera);
  }

  /** Si l'appareil ne suit pas, on baisse la qualité d'un cran plutôt que de laisser le jeu saccader. */
  private watchFrameRate(deltaSeconds: number): void {
    if (!this.frameRateMonitor.sample(deltaSeconds)) return;
    const lower = lowerQuality(this.settings.quality);
    if (!lower) return;
    this.applyQuality(lower);
    this.hud.showNotice(`Qualité graphique réduite à « ${QUALITY_PROFILES[lower].label} » pour garder le jeu fluide (modifiable en pause).`);
  }

  private animateIdleScene(elapsedSeconds: number): void {
    this.camera.position.set(Math.cos(elapsedSeconds * 0.1) * 14, 9, Math.sin(elapsedSeconds * 0.1) * 14);
    this.camera.lookAt(0, 0, 0);
    this.pipeline.exposure = 1;
    this.pipeline.render(this.idleScene, this.camera);
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
    this.pipeline.setSize(width, height);
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

/** Tirage différent à chaque examen : repasser un examen ne redonne pas les mêmes questions dans le même ordre. */
function examRandom(): SeededRandom {
  const entropy = new Uint32Array(1);
  crypto.getRandomValues(entropy);
  return new SeededRandom(entropy[0] ?? Date.now());
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
