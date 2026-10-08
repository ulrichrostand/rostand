import { ROADMAP_URL } from "../content/curriculum";
import { recapOf, type DevOpsModule } from "../content/types";
import type { MissionScore } from "../game/scoring";
import type { ModuleRecord } from "../game/progress";
import { describeSolution } from "./challengePanel";
import { lessonCard } from "./lessonPanel";
import { button, element, richText } from "./dom";

export interface CampaignEntry {
  module: DevOpsModule;
  unlocked: boolean;
  record: ModuleRecord | undefined;
  /** Une partie sauvegardée en cours existe pour ce module. */
  inProgress: boolean;
}

export interface TitleScreenOptions {
  hasProgress: boolean;
  resume: { label: string; detail: string; onResume(): void } | null;
  onCampaign(): void;
  onSaveManager(): void;
  onReset(): void;
  qualityLabel: string;
  /** Passe à la qualité suivante et renvoie le nouveau libellé du bouton. */
  onCycleQuality(): string;
}

export interface SaveManagerOptions {
  persistent: boolean;
  savedAt: string | null;
  summary: string;
  code: string;
  /** Renvoie un message d'erreur, ou null si l'import a réussi. */
  onImport(code: string): string | null;
  onImported(): void;
  onBack(): void;
}

export interface DebriefData {
  module: DevOpsModule;
  score: MissionScore;
  wrongAttemptsPerTerminal: number[];
  detections: number;
  neutralizations: number;
  intelCollected: number;
  intelTotal: number;
  elapsedSeconds: number;
  isLastModule: boolean;
}

const CONTROLS: [string, string][] = [
  ["ZQSD / WASD / flèches", "Se déplacer"],
  ["Maj (maintenu)", "Courir — rapide mais bruyant"],
  ["C", "S'accroupir — portée de vue des gardes réduite de 45 %"],
  ["E", "Pirater un terminal, ou neutraliser une sentinelle approchée par derrière"],
  ["F", "Gadget : arrêter une sentinelle à distance avec une vraie commande"],
  ["N", "Vision nocturne"],
  ["Échap", "Pause"],
];

const TOUCH_CONTROLS: [string, string][] = [
  ["Joystick (pouce gauche)", "Se déplacer — il apparaît là où tu poses le pouce"],
  ["Pouce au-delà de l'anneau", "Courir — rapide mais bruyant"],
  ["Accroupir", "Portée de vue des gardes réduite de 45 %"],
  ["Pirater / Neutraliser", "S'allume près d'un terminal ou dans le dos d'une sentinelle"],
  ["Gadget", "Arrêter une sentinelle à distance avec une vraie commande"],
  ["Vision", "Vision nocturne"],
  ["❚❚", "Pause"],
];

/** Les deux listes sont rendues ; le CSS affiche celle du mode d'entrée actif (classe body.touch). */
function controlsList(): HTMLElement[] {
  const toList = (entries: [string, string][], className: string): HTMLElement =>
    element("dl", { className: `controls ${className}` }, entries.flatMap(([key, action]) => [element("dt", { text: key }), element("dd", { text: action })]));
  return [toList(CONTROLS, "keyboard-only"), toList(TOUCH_CONTROLS, "touch-only")];
}

export class ScreenManager {
  constructor(private readonly root: HTMLElement) {}

  hide(): void {
    this.root.hidden = true;
    this.root.replaceChildren();
  }

  showTitle(options: TitleScreenOptions): void {
    const resetButton = button("Réinitialiser la progression", () => {
      if (window.confirm("Effacer toute la progression de la campagne ? Pense à copier ton code de sauvegarde avant.")) options.onReset();
    }, "btn ghost");
    resetButton.hidden = !options.hasProgress;
    const campaignButton = button(
      options.hasProgress ? "Carte des opérations" : "Commencer la campagne",
      options.onCampaign,
      options.resume ? "btn big" : "btn primary big",
    );
    const resumeBlock = options.resume
      ? element("div", { className: "resume-block" }, [
          button(options.resume.label, options.resume.onResume, "btn primary big"),
          element("span", { className: "resume-detail", text: `💾 ${options.resume.detail}` }),
        ])
      : null;
    this.show(
      element("div", { className: "panel title-screen" }, [
        element("p", { className: "eyebrow", text: "Cellule Écho — dossier classifié" }),
        element("h1", { className: "logo", text: "SHADOW OPS" }),
        element("p", { className: "logo-sub", text: "DevOps Infiltration" }),
        element("p", {
          className: "lead",
          text: "Le collectif ENTROPIA a pris le contrôle de toute l'infrastructure d'Helix Corp. Tu es Spectre, agent d'infiltration de la cellule Écho. Traverse 16 secteurs : ramasse les dossiers pour apprendre, pirate les terminaux pour le prouver, et neutralise les sentinelles avec de vraies commandes. Aucune connaissance requise, on part de zéro.",
        }),
        resumeBlock,
        element("div", { className: "row" }, [
          campaignButton,
          button("💾 Sauvegarde", options.onSaveManager, "btn ghost"),
          qualityButton(options.qualityLabel, options.onCycleQuality),
          resetButton,
        ]),
        this.roadmapCredit(),
      ]),
    );
    (resumeBlock?.querySelector("button") ?? campaignButton).focus({ preventScroll: true });
  }

  showSaveManager(options: SaveManagerOptions): void {
    const codeField = element("textarea", {
      className: "save-code",
      attributes: { readonly: "", rows: "4", spellcheck: "false", "aria-label": "Ton code de sauvegarde" },
    });
    codeField.value = options.code;
    const copyStatus = element("p", { className: "save-status", attributes: { role: "status", "aria-live": "polite" } });
    const copyButton = button("Copier le code", () => {
      void copyToClipboard(codeField).then((copied) => {
        copyStatus.textContent = copied
          ? "✔ Code copié. Colle-le dans le jeu sur ton autre appareil (menu 💾 Sauvegarde)."
          : "Copie automatique impossible : le code est sélectionné, copie-le manuellement (appui long ou Ctrl+C).";
      });
    }, "btn primary");

    const importField = element("textarea", {
      className: "save-code",
      attributes: { rows: "4", spellcheck: "false", placeholder: "Colle ici un code SHADOWOPS1…", "aria-label": "Code de sauvegarde à importer" },
    });
    const importStatus = element("p", { className: "save-status", attributes: { role: "status", "aria-live": "polite" } });
    const importButton = button("Importer ce code", () => {
      if (!window.confirm("Importer ce code remplacera toute ta progression actuelle sur cet appareil. Continuer ?")) return;
      const error = options.onImport(importField.value);
      if (error) {
        importStatus.textContent = `✖ ${error}`;
        importStatus.dataset.state = "error";
        return;
      }
      options.onImported();
    }, "btn");

    const backButton = button("← Menu", options.onBack, "btn ghost");
    this.show(
      element("div", { className: "panel save-manager" }, [
        element("p", { className: "eyebrow", text: "Sauvegarde" }),
        element("h1", { text: "💾 Ta progression" }),
        element("p", { className: "lead", text: options.summary }),
        element("p", {
          className: options.persistent ? "save-status" : "save-status warn",
          text: options.persistent
            ? `Sauvegarde automatique activée${options.savedAt ? ` · dernière sauvegarde : ${formatDate(options.savedAt)}` : ""}. Elle a lieu à chaque terminal piraté, dossier ramassé, sentinelle neutralisée et à chaque pause.`
            : "⚠️ Ton navigateur bloque le stockage (navigation privée ?) : la progression sera perdue en fermant la page. Utilise le code ci-dessous pour la garder.",
        }),
        element("h2", { text: "Changer d'appareil" }),
        element("p", { text: "La sauvegarde est enregistrée dans ce navigateur. Pour continuer sur un autre appareil (téléphone ↔ PC), copie ce code puis importe-le là-bas." }),
        codeField,
        element("div", { className: "row" }, [copyButton]),
        copyStatus,
        element("h2", { text: "Importer une sauvegarde" }),
        importField,
        element("div", { className: "row" }, [importButton]),
        importStatus,
        element("div", { className: "row" }, [backButton]),
      ]),
    );
    backButton.focus({ preventScroll: true });
  }

  showCampaignMap(
    entries: CampaignEntry[],
    onPlay: (module: DevOpsModule) => void,
    onResume: (module: DevOpsModule) => void,
    onDossier: (module: DevOpsModule) => void,
    onBack: () => void,
  ): void {
    const completedCount = entries.filter((entry) => entry.record).length;
    const progressPercent = Math.round((completedCount / entries.length) * 100);
    const progressFill = element("div", { className: "progress-fill" });
    progressFill.style.width = `${progressPercent}%`;

    const list = element("ol", { className: "campaign-list" });
    entries.forEach((entry, index) => list.append(this.campaignCard(entry, index, onPlay, onResume, onDossier)));

    this.show(
      element("div", { className: "panel campaign" }, [
        element("div", { className: "campaign-header" }, [
          element("div", {}, [
            element("p", { className: "eyebrow", text: "Carte des opérations" }),
            element("h1", { text: "Parcours DevOps" }),
          ]),
          button("← Menu", onBack, "btn ghost"),
        ]),
        element("div", { className: "progress" }, [
          element("div", { className: "progress-track" }, [progressFill]),
          element("span", { text: `${completedCount}/${entries.length} secteurs libérés · ${progressPercent}%` }),
        ]),
        list,
        this.roadmapCredit(),
      ]),
    );
    list
      .querySelector<HTMLButtonElement>(".campaign-card.in-progress .btn.primary, .campaign-card.available .btn.primary")
      ?.focus({ preventScroll: true });
  }

  showBriefing(module: DevOpsModule, moduleNumber: number, warning: string | null, onLaunch: () => void, onBack: () => void): void {
    const launchButton = button("Lancer l'infiltration", onLaunch, "btn primary big");
    this.show(
      element("div", { className: "panel briefing" }, [
        element("p", { className: "eyebrow", text: `Module ${moduleNumber} · ${module.roadmapSection}` }),
        element("h1", { text: module.codename }),
        element("h2", { className: "subtitle", text: module.title }),
        element("p", { className: "lead", text: module.briefing }),
        element("h3", { text: "Notions de la roadmap couvertes" }),
        element("ul", { className: "chips" }, module.roadmapTopics.map((topic) => element("li", { text: topic }))),
        element("h3", { text: "Commandes" }),
        ...controlsList(),
        element("p", { className: "tip", text: "Astuce : les dossiers jaunes 📁 contiennent les leçons. Les racks serveurs bloquent la vue des sentinelles : observe leurs rondes avant de bouger." }),
        warning ? element("p", { className: "save-status warn", text: `💾 ${warning}` }) : null,
        element("div", { className: "row" }, [launchButton, button("Retour", onBack, "btn ghost")]),
      ]),
    );
    launchButton.focus({ preventScroll: true });
  }

  showDebrief(data: DebriefData, onNext: () => void, onReplay: () => void, onMap: () => void): void {
    const { module, score } = data;
    const nextButton = button(data.isLastModule ? "Retour à la carte" : "Mission suivante →", data.isLastModule ? onMap : onNext, "btn primary big");
    this.show(
      element("div", { className: "panel debrief" }, [
        element("p", { className: "eyebrow", text: "Débriefing de mission" }),
        element("h1", { text: `${module.codename} — réussie` }),
        data.isLastModule
          ? element("p", { className: "lead victory", text: "ENTROPIA est neutralisée. Tu as parcouru toute la roadmap DevOps : il est temps de pratiquer sur de vrais projets !" })
          : null,
        element("div", { className: "stats" }, [
          this.stat("Évaluation", "★".repeat(score.stars) + "☆".repeat(3 - score.stars)),
          this.stat("Score", `${score.score} / ${score.maxScore}`),
          this.stat("Précision 1er essai", `${Math.round(score.firstTryAccuracy * 100)} %`),
          this.stat("Dossiers", `${data.intelCollected}/${data.intelTotal}`),
          this.stat("Détections", score.ghost ? "0 — Fantôme 👻" : String(data.detections)),
          this.stat("Neutralisations", String(data.neutralizations)),
          this.stat("Durée", formatDuration(data.elapsedSeconds)),
        ]),
        ...this.recapSections(module, data.wrongAttemptsPerTerminal, false),
        element("div", { className: "row" }, [nextButton, button("Rejouer", onReplay, "btn"), button("Carte", onMap, "btn ghost")]),
      ]),
    );
    nextButton.focus({ preventScroll: true });
  }

  showDossier(module: DevOpsModule, onBack: () => void): void {
    const backButton = button("← Retour à la carte", onBack, "btn primary");
    this.show(
      element("div", { className: "panel debrief" }, [
        element("p", { className: "eyebrow", text: `Dossier · ${module.roadmapSection}` }),
        element("h1", { text: module.title }),
        ...this.recapSections(module, null, true),
        element("div", { className: "row" }, [backButton]),
      ]),
    );
    backButton.focus({ preventScroll: true });
  }

  showPause(persistent: boolean, qualityLabel: string, onCycleQuality: () => string, onResume: () => void, onQuit: () => void): void {
    const resumeButton = button("Reprendre", onResume, "btn primary");
    this.show(
      element("div", { className: "panel small" }, [
        element("h1", { text: "Pause" }),
        element("p", {
          className: persistent ? "save-status" : "save-status warn",
          text: persistent
            ? "💾 Progression sauvegardée. Tu peux quitter et reprendre plus tard depuis l'écran titre."
            : "⚠️ Stockage bloqué par le navigateur : la progression sera perdue en fermant la page.",
        }),
        ...controlsList(),
        element("div", { className: "row" }, [
          resumeButton,
          qualityButton(qualityLabel, onCycleQuality),
          button("Quitter la mission", onQuit, "btn ghost"),
        ]),
      ]),
    );
    resumeButton.focus({ preventScroll: true });
  }

  showDetected(livesLeft: number, onContinue: () => void): void {
    const continueButton = button("Reprendre l'infiltration", onContinue, "btn primary");
    this.show(
      element("div", { className: "panel small alert" }, [
        element("h1", { text: "DÉTECTÉ" }),
        element("p", { text: `Retour au point d'insertion. Intégrité restante : ${livesLeft}. Les terminaux déjà piratés restent acquis.` }),
        element("p", { className: "tip", text: "Accroupis-toi (touche C ou bouton Accroupir) près des gardes et reste derrière les racks : leur cône de vision ne traverse pas les obstacles." }),
        element("div", { className: "row" }, [continueButton]),
      ]),
    );
    continueButton.focus({ preventScroll: true });
  }

  showFailed(onRetry: () => void, onMap: () => void): void {
    const retryButton = button("Réessayer", onRetry, "btn primary");
    this.show(
      element("div", { className: "panel small alert" }, [
        element("h1", { text: "Mission compromise" }),
        element("p", { text: "Spectre a été repéré trop souvent. La cellule Écho t'exfiltre." }),
        element("p", { className: "tip", text: "Les rondes sont toujours identiques pour un même secteur : observe-les et planifie ton chemin." }),
        element("div", { className: "row" }, [retryButton, button("Carte", onMap, "btn ghost")]),
      ]),
    );
    retryButton.focus({ preventScroll: true });
  }

  private show(content: HTMLElement): void {
    this.root.replaceChildren(content);
    this.root.hidden = false;
    this.root.scrollTop = 0;
  }

  private campaignCard(
    entry: CampaignEntry,
    index: number,
    onPlay: (module: DevOpsModule) => void,
    onResume: (module: DevOpsModule) => void,
    onDossier: (module: DevOpsModule) => void,
  ): HTMLLIElement {
    const { module, unlocked, record, inProgress } = entry;
    const status = inProgress ? "in-progress" : record ? "completed" : unlocked ? "available" : "locked";
    const actions = element("div", { className: "card-actions" });
    if (inProgress) actions.append(button("Reprendre", () => onResume(module), "btn primary"));
    if (unlocked) actions.append(button(record ? "Rejouer" : inProgress ? "Recommencer" : "Infiltrer", () => onPlay(module), inProgress ? "btn ghost" : "btn primary"));
    if (record) actions.append(button("Dossier", () => onDossier(module), "btn ghost"));
    const stars = record ? `${"★".repeat(record.stars)}${"☆".repeat(3 - record.stars)}${record.ghost ? " 👻" : ""}` : "";
    const badge = inProgress ? `💾 En cours ${stars}`.trim() : record ? stars : unlocked ? "Disponible" : "🔒 Verrouillé";
    return element("li", { className: `campaign-card ${status}` }, [
      element("span", { className: "card-index", text: String(index).padStart(2, "0") }),
      element("div", { className: "card-body" }, [
        element("p", { className: "card-codename", text: module.codename }),
        element("h3", { text: module.title }),
        element("p", { className: "card-section", text: module.roadmapSection }),
      ]),
      element("div", { className: "card-side" }, [element("span", { className: "card-badge", text: badge }), actions]),
    ]);
  }

  /** Récapitulatif + cours + revue de chaque terminal : le cœur pédagogique de fin de module. */
  private recapSections(module: DevOpsModule, wrongAttemptsPerTerminal: number[] | null, lessonsOpen: boolean): HTMLElement[] {
    const review = element("ol", { className: "review" });
    module.challenges.forEach((challenge, index) => {
      const hadErrors = (wrongAttemptsPerTerminal?.[index] ?? 0) > 0;
      review.append(
        element("li", { className: hadErrors ? "review-item to-review" : "review-item" }, [
          richText("p", challenge.prompt, "review-prompt"),
          element("p", { className: "review-answer" }, [element("strong", { text: "Réponse : " }), richText("span", describeSolution(challenge))]),
          richText("p", challenge.explanation, "review-explanation"),
          hadErrors ? element("span", { className: "tag warn", text: "À revoir" }) : null,
        ]),
      );
    });
    // Chaque dossier est dépliable : on relit le cours sans noyer le récapitulatif.
    const lessons = module.lessons.map((lesson, index) => {
      const details = element("details", { className: "lesson-details" }, [
        element("summary", { text: `📁 Dossier ${index + 1} — ${lesson.title}` }),
        lessonCard(lesson),
      ]);
      details.open = lessonsOpen && index === 0;
      return details;
    });
    return [
      element("h2", { text: "Récapitulatif — à retenir" }),
      element("ul", { className: "recap" }, recapOf(module).map((point) => richText("li", point))),
      element("h2", { text: "Les dossiers du module" }),
      element("div", { className: "lesson-list" }, lessons),
      element("h2", { text: "Revue des terminaux" }),
      review,
    ];
  }

  private stat(label: string, value: string): HTMLElement {
    return element("div", { className: "stat" }, [element("span", { className: "stat-value", text: value }), element("span", { className: "stat-label", text: label })]);
  }

  private roadmapCredit(): HTMLElement {
    return element("p", { className: "credit" }, [
      document.createTextNode("Parcours basé sur la roadmap "),
      element("a", { text: "roadmap.sh/devops", attributes: { href: ROADMAP_URL, target: "_blank", rel: "noopener noreferrer" } }),
    ]);
  }
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes} min ${String(seconds).padStart(2, "0")} s`;
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "inconnue";
  return date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

/** API presse-papiers si disponible (contexte sécurisé), sinon sélection du texte pour copie manuelle. */
async function copyToClipboard(field: HTMLTextAreaElement): Promise<boolean> {
  try {
    if (!navigator.clipboard) throw new Error("API presse-papiers indisponible");
    await navigator.clipboard.writeText(field.value);
    return true;
  } catch (error) {
    console.warn("Copie automatique impossible, sélection manuelle proposée.", error);
    field.focus();
    field.select();
    return false;
  }
}

function qualityButton(label: string, onCycle: () => string): HTMLButtonElement {
  const node = button(label, () => {
    node.textContent = onCycle();
  }, "btn ghost");
  node.title = "Haute : ombres et effets lumineux. Basse : le plus fluide sur les appareils modestes.";
  return node;
}
