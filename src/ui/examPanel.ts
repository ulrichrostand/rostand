import { canonicalCommand } from "../challenges/scenario";
import { formatGrade, gradeOutOf20, isExamAnswerCorrect, mentionFor, PASSING_GRADE, type ExamQuestion, type ExamResponse } from "../game/exam";
import { choiceInput, commandInput, orderInput } from "./answerInputs";
import { describeSolution } from "./challengePanel";
import { button, element, richText } from "./dom";

export interface ExamPlan {
  title: string;
  subtitle: string;
  questions: ExamQuestion[];
  timeLimitSeconds: number;
  previousBestGrade: number | null;
  /** Examen général : rappelle de quel secteur vient chaque question. */
  showModuleTags: boolean;
  moduleLabel(moduleId: string): string;
}

export interface ExamOutcome {
  grade: number;
  correctCount: number;
  questionCount: number;
  elapsedSeconds: number;
  timedOut: boolean;
}

export interface ExamPanelCallbacks {
  /** Enregistre la note ; renvoie la meilleure note pour afficher un éventuel record. */
  onFinished(outcome: ExamOutcome): { bestGrade: number; improved: boolean };
  onRetry(): void;
  onExit(): void;
}

const TIMER_REFRESH_MS = 250;
/**
 * La question suivante s'affiche au même endroit que la précédente : sans ce délai,
 * un double-clic répondrait aussi à la question suivante sans que le joueur l'ait lue.
 */
const ANSWER_COOLDOWN_MS = 300;
const LOW_TIME_SECONDS = 30;

/**
 * Examen chronométré : une seule réponse par question, aucun indice,
 * et la correction détaillée seulement à la fin (comme un vrai examen).
 */
export class ExamPanel {
  private readonly responses: ExamResponse[];
  private currentIndex = 0;
  private startedAt = 0;
  private timerId: number | null = null;
  private finished = false;
  private questionShownAt = 0;
  /** Nœud conservé d'une question à l'autre : sa présence dans le DOM indique que l'examen est toujours affiché. */
  private readonly timerLabel = element("span", { className: "exam-timer", attributes: { role: "timer", "aria-live": "off" } });

  constructor(
    private readonly mount: (content: HTMLElement) => void,
    private readonly plan: ExamPlan,
    private readonly callbacks: ExamPanelCallbacks,
  ) {
    this.responses = plan.questions.map(() => null);
  }

  open(): void {
    const minutes = Math.round(this.plan.timeLimitSeconds / 60);
    const startButton = button("Commencer l'examen", () => this.start(), "btn primary big");
    this.mount(
      element("div", { className: "panel exam" }, [
        element("p", { className: "eyebrow", text: "Mode examen" }),
        element("h1", { text: this.plan.title }),
        element("h2", { className: "subtitle", text: this.plan.subtitle }),
        element("ul", { className: "exam-rules" }, [
          element("li", { text: `${this.plan.questions.length} questions : QCM, séquences et vraies commandes à taper.` }),
          element("li", { text: `Temps limite : ${minutes} min. Le chrono ne s'arrête pas, même si tu changes d'onglet.` }),
          element("li", { text: "Une seule réponse par question, aucun indice. La correction détaillée arrive à la fin." }),
          element("li", { text: `Note sur 20 : ${PASSING_GRADE}/20 pour être admis.${this.plan.previousBestGrade !== null ? ` Ta meilleure note : ${formatGrade(this.plan.previousBestGrade)}.` : ""}` }),
        ]),
        element("div", { className: "row" }, [startButton, button("← Carte", () => this.callbacks.onExit(), "btn ghost")]),
      ]),
    );
    startButton.focus({ preventScroll: true });
  }

  private start(): void {
    this.startedAt = performance.now();
    this.timerId = window.setInterval(() => this.tick(), TIMER_REFRESH_MS);
    this.renderQuestion();
    this.tick();
  }

  private get remainingSeconds(): number {
    return Math.max(0, this.plan.timeLimitSeconds - (performance.now() - this.startedAt) / 1000);
  }

  private tick(): void {
    // Écran remplacé sans passer par « Abandonner » (navigation) : on coupe le chrono, rien n'est noté.
    if (!this.timerLabel.isConnected) {
      this.stopTimer();
      return;
    }
    const remaining = this.remainingSeconds;
    this.timerLabel.textContent = `⏱ ${formatClock(remaining)}`;
    this.timerLabel.classList.toggle("low", remaining <= LOW_TIME_SECONDS);
    if (remaining <= 0) this.finish(true);
  }

  private stopTimer(): void {
    if (this.timerId === null) return;
    window.clearInterval(this.timerId);
    this.timerId = null;
  }

  private renderQuestion(): void {
    const question = this.plan.questions[this.currentIndex];
    if (!question) {
      this.finish(false);
      return;
    }
    const total = this.plan.questions.length;
    const progressFill = element("div", { className: "progress-fill" });
    progressFill.style.width = `${Math.round((this.currentIndex / total) * 100)}%`;
    const body = element("div", { className: "challenge-body" });
    const actions = element("div", { className: "challenge-actions" });
    const skipButton = button("Passer", () => this.answer(null), "btn ghost");
    const abandonButton = button("Abandonner", () => this.abandon(), "btn ghost");
    let focusTarget: HTMLElement | null = null;

    if (question.source === "challenge" && question.challenge.kind === "choice") {
      const list = choiceInput(question.challenge, (selectedIndex) => this.answer({ kind: "choice", selectedIndex }));
      body.append(list);
      actions.append(skipButton, abandonButton);
      focusTarget = list.firstElementChild as HTMLElement | null;
    } else if (question.source === "challenge" && question.challenge.kind === "order") {
      const order = orderInput(question.challenge.steps);
      body.append(order.element);
      actions.append(button("Valider la séquence", () => this.answer({ kind: "order", orderedSteps: order.currentOrder() }), "btn primary"), skipButton, abandonButton);
    } else {
      // Les commandes vides sont ignorées : un Entrée par réflexe ne doit pas coûter une question.
      const submitCommand = (typedCommand: string): void => {
        if (typedCommand.trim().length === 0) {
          input.focus();
          return;
        }
        this.answer({ kind: "command", typedCommand });
      };
      const { form, input } = commandInput("spectre@helix:~$", submitCommand);
      body.append(form);
      actions.append(button("Valider ⏎", () => submitCommand(input.value), "btn primary"), skipButton, abandonButton);
      focusTarget = input;
    }

    const prompt = question.source === "challenge" ? question.challenge.prompt : question.prompt;
    this.mount(
      element("div", { className: "panel exam challenge-panel" }, [
        element("div", { className: "challenge-header exam-header" }, [
          element("span", { text: `Question ${this.currentIndex + 1}/${total}` }),
          this.plan.showModuleTags ? element("span", { className: "tag", text: this.plan.moduleLabel(question.moduleId) }) : null,
          this.timerLabel,
        ]),
        element("div", { className: "progress-track" }, [progressFill]),
        richText("h2", prompt, "challenge-prompt"),
        body,
        actions,
      ]),
    );
    this.questionShownAt = performance.now();
    focusTarget?.focus({ preventScroll: true });
  }

  private answer(response: ExamResponse): void {
    if (this.finished || performance.now() - this.questionShownAt < ANSWER_COOLDOWN_MS) return;
    this.responses[this.currentIndex] = response;
    this.currentIndex++;
    this.renderQuestion();
  }

  private abandon(): void {
    if (!window.confirm("Abandonner l'examen ? Il ne sera pas noté.")) return;
    this.finished = true;
    this.stopTimer();
    this.callbacks.onExit();
  }

  private finish(timedOut: boolean): void {
    if (this.finished) return;
    this.finished = true;
    this.stopTimer();
    const results = this.plan.questions.map((question, index) => isExamAnswerCorrect(question, this.responses[index] ?? null));
    const correctCount = results.filter(Boolean).length;
    const outcome: ExamOutcome = {
      grade: gradeOutOf20(correctCount, results.length),
      correctCount,
      questionCount: results.length,
      elapsedSeconds: Math.min(this.plan.timeLimitSeconds, (performance.now() - this.startedAt) / 1000),
      timedOut,
    };
    const best = this.callbacks.onFinished(outcome);
    this.renderResults(outcome, results, best);
  }

  private renderResults(outcome: ExamOutcome, results: boolean[], best: { bestGrade: number; improved: boolean }): void {
    const mention = mentionFor(outcome.grade);
    const retryButton = button("Repasser l'examen", () => this.callbacks.onRetry(), mention.passed ? "btn" : "btn primary");
    const mapButton = button("Retour à la carte", () => this.callbacks.onExit(), mention.passed ? "btn primary" : "btn ghost");
    const correction = element("ol", { className: "review" });
    this.plan.questions.forEach((question, index) => correction.append(this.correctionItem(question, this.responses[index] ?? null, results[index] ?? false)));

    this.mount(
      element("div", { className: "panel exam debrief" }, [
        element("p", { className: "eyebrow", text: `Résultat · ${this.plan.title}` }),
        element("p", { className: mention.passed ? "exam-grade passed" : "exam-grade failed", text: formatGrade(outcome.grade) }),
        element("p", { className: mention.passed ? "exam-mention passed" : "exam-mention failed", text: mention.label }),
        outcome.timedOut ? element("p", { className: "save-status warn", text: "⏱ Temps écoulé : les questions restantes sont comptées fausses." }) : null,
        element("div", { className: "stats" }, [
          stat("Bonnes réponses", `${outcome.correctCount}/${outcome.questionCount}`),
          stat("Temps", formatClock(outcome.elapsedSeconds)),
          stat("Meilleure note", `${formatGrade(best.bestGrade)}${best.improved ? " 🏆" : ""}`),
        ]),
        best.improved ? element("p", { className: "granted", text: "Nouveau record enregistré !" }) : null,
        element("h2", { text: "Correction" }),
        correction,
        element("div", { className: "row" }, [mapButton, retryButton]),
      ]),
    );
    (mention.passed ? mapButton : retryButton).focus({ preventScroll: true });
  }

  private correctionItem(question: ExamQuestion, response: ExamResponse, correct: boolean): HTMLLIElement {
    const prompt = question.source === "challenge" ? question.challenge.prompt : question.prompt;
    const expected = question.source === "challenge" ? describeSolution(question.challenge) : `\`${canonicalCommand(question.step)}\``;
    const explanation = question.source === "challenge" ? question.challenge.explanation : `Rappel de l'intervention : ${question.step.goal}`;
    return element("li", { className: correct ? "review-item" : "review-item to-review" }, [
      this.plan.showModuleTags ? element("span", { className: "tag", text: this.plan.moduleLabel(question.moduleId) }) : null,
      richText("p", `${correct ? "✔" : "✖"} ${prompt}`, "review-prompt"),
      correct ? null : element("p", { className: "review-answer" }, [element("strong", { text: "Ta réponse : " }), describeResponse(question, response)]),
      element("p", { className: "review-answer" }, [element("strong", { text: correct ? "Réponse : " : "Réponse attendue : " }), richText("span", expected)]),
      richText("p", explanation, "review-explanation"),
    ]);
  }
}

/** La saisie du joueur passe par textContent (jamais richText) : un accent grave tapé ne doit rien interpréter. */
function describeResponse(question: ExamQuestion, response: ExamResponse): HTMLElement {
  if (response === null) return element("em", { text: "sans réponse" });
  switch (response.kind) {
    case "command":
      return element("code", { text: response.typedCommand.trim() });
    case "choice": {
      const options = question.source === "challenge" && question.challenge.kind === "choice" ? question.challenge.options : [];
      return richText("span", options[response.selectedIndex] ?? "?");
    }
    case "order":
      return richText("span", response.orderedSteps.map((step, index) => `${index + 1}. ${step}`).join("  →  "));
  }
}

function stat(label: string, value: string): HTMLElement {
  return element("div", { className: "stat" }, [element("span", { className: "stat-value", text: value }), element("span", { className: "stat-label", text: label })]);
}

function formatClock(totalSeconds: number): string {
  const rounded = Math.ceil(totalSeconds);
  return `${String(Math.floor(rounded / 60)).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
}
