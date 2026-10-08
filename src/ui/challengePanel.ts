import { isAnswerCorrect, type ChallengeAnswer } from "../challenges/evaluate";
import type { Challenge, ChoiceChallenge, CommandChallenge, Lesson, OrderChallenge } from "../content/types";
import { button, element, richText } from "./dom";
import { lessonCard } from "./lessonPanel";

export interface ChallengeOutcome {
  wrongAttempts: number;
  /** Vrai si la réponse a été révélée après trop d'échecs. */
  revealed: boolean;
}

export interface ChallengePanelCallbacks {
  onWrongAnswer(): void;
  onSolved(outcome: ChallengeOutcome): void;
  onDisconnect(wrongAttempts: number): void;
}

/** Après 2 échecs on révèle la réponse : l'objectif est d'apprendre, pas de bloquer. */
const ATTEMPTS_BEFORE_REVEAL = 2;

const KIND_LABELS: Record<Challenge["kind"], string> = {
  choice: "QCM",
  command: "Commande",
  order: "Séquence",
};

export class ChallengePanel {
  private wrongAttempts = 0;
  private readonly feedback = element("div", { className: "challenge-feedback", attributes: { role: "status", "aria-live": "polite" } });
  private readonly body = element("div", { className: "challenge-body" });
  private readonly actions = element("div", { className: "challenge-actions" });
  /** Rappel de la leçon, replié par défaut : le joueur choisit de relire avant de répondre. */
  private readonly lessonBox = element("div", { className: "lesson-recall" });

  constructor(
    private readonly container: HTMLElement,
    private readonly challenge: Challenge,
    private readonly lesson: Lesson,
    private readonly terminalLabel: string,
    previousWrongAttempts: number,
    private readonly callbacks: ChallengePanelCallbacks,
  ) {
    this.wrongAttempts = previousWrongAttempts;
  }

  open(): void {
    this.container.replaceChildren(
      element("div", { className: "panel challenge-panel", attributes: { role: "dialog", "aria-modal": "true" } }, [
        element("div", { className: "challenge-header" }, [
          element("span", { className: "blink", text: "●" }),
          element("span", { text: ` ${this.terminalLabel} // accès sécurisé` }),
          element("span", { className: "tag", text: KIND_LABELS[this.challenge.kind] }),
        ]),
        element("p", { className: "challenge-note", text: "Le temps est figé pendant le piratage. Une erreur fait du bruit : les gardes proches viendront vérifier." }),
        richText("h2", this.challenge.prompt, "challenge-prompt"),
        this.lessonBox,
        this.body,
        this.feedback,
        this.actions,
      ]),
    );
    this.lessonBox.hidden = true;
    this.lessonBox.replaceChildren(lessonCard(this.lesson));
    this.container.hidden = false;
    this.renderInput();
  }

  close(): void {
    this.container.hidden = true;
    this.container.replaceChildren();
  }

  private renderInput(): void {
    this.feedback.replaceChildren();
    switch (this.challenge.kind) {
      case "choice":
        this.renderChoice(this.challenge);
        break;
      case "command":
        this.renderCommand(this.challenge);
        break;
      case "order":
        this.renderOrder(this.challenge);
        break;
    }
  }

  private renderChoice(challenge: ChoiceChallenge): void {
    // Ordre mélangé à chaque tentative : on ne peut pas réussir en mémorisant une position.
    const shuffledIndexes = shuffleIndexes(challenge.options.length);
    const list = element("div", { className: "choice-list" });
    shuffledIndexes.forEach((optionIndex, displayIndex) => {
      const option = challenge.options[optionIndex] as string;
      const optionButton = button("", () => this.submit({ kind: "choice", selectedIndex: optionIndex }), "choice");
      optionButton.append(element("span", { className: "choice-key", text: String.fromCharCode(65 + displayIndex) }), richText("span", option));
      list.append(optionButton);
    });
    this.body.replaceChildren(list);
    this.actions.replaceChildren(...this.secondaryActions());
    (list.firstElementChild as HTMLElement | null)?.focus();
  }

  private renderCommand(challenge: CommandChallenge): void {
    const input = element("input", {
      className: "command-input",
      attributes: { type: "text", autocomplete: "off", autocapitalize: "off", spellcheck: "false", maxlength: "300", "aria-label": "Commande à saisir" },
    });
    const form = element("form", { className: "command-form" }, [element("span", { className: "prompt-symbol", text: "agent@helix:~$" }), input]);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.submit({ kind: "command", typedCommand: input.value });
    });
    const hint = element("p", { className: "hint", text: `Indice : ${challenge.hint}` });
    hint.hidden = this.wrongAttempts === 0;
    this.body.replaceChildren(form, hint);
    this.actions.replaceChildren(
      button("Exécuter ⏎", () => this.submit({ kind: "command", typedCommand: input.value }), "btn primary"),
      button("Indice", () => (hint.hidden = false), "btn ghost"),
      ...this.secondaryActions(),
    );
    input.focus();
  }

  private renderOrder(challenge: OrderChallenge): void {
    let currentOrder = shuffleUntilDifferent(challenge.steps);
    const list = element("ol", { className: "order-list" });
    const renderList = (): void => {
      list.replaceChildren(
        ...currentOrder.map((step, index) => {
          const moveUp = button("▲", () => swap(index, index - 1), "icon-btn");
          const moveDown = button("▼", () => swap(index, index + 1), "icon-btn");
          moveUp.disabled = index === 0;
          moveDown.disabled = index === currentOrder.length - 1;
          moveUp.setAttribute("aria-label", `Monter « ${step} »`);
          moveDown.setAttribute("aria-label", `Descendre « ${step} »`);
          return element("li", { className: "order-item" }, [richText("span", step), element("span", { className: "order-controls" }, [moveUp, moveDown])]);
        }),
      );
    };
    const swap = (from: number, to: number): void => {
      if (to < 0 || to >= currentOrder.length) return;
      const reordered = [...currentOrder];
      [reordered[from], reordered[to]] = [reordered[to] as string, reordered[from] as string];
      currentOrder = reordered;
      renderList();
      // Garde le focus sur l'élément déplacé : navigation clavier fluide.
      (list.children[to]?.querySelector(from > to ? ".icon-btn" : ".icon-btn:last-child") as HTMLElement | null)?.focus();
    };
    renderList();
    this.body.replaceChildren(list);
    this.actions.replaceChildren(button("Valider la séquence", () => this.submit({ kind: "order", orderedSteps: currentOrder }), "btn primary"), ...this.secondaryActions());
  }

  private submit(answer: ChallengeAnswer): void {
    if (isAnswerCorrect(this.challenge, answer)) {
      this.showResult(true, false);
      return;
    }
    this.wrongAttempts++;
    this.callbacks.onWrongAnswer();
    if (this.wrongAttempts >= ATTEMPTS_BEFORE_REVEAL) {
      this.showResult(false, true);
      return;
    }
    this.feedback.replaceChildren(
      element("p", { className: "denied", text: "ACCÈS REFUSÉ — bruit détecté. Analyse et réessaie." }),
    );
    if (this.challenge.kind !== "command") {
      // Le QCM et la séquence sont re-mélangés ; la commande garde la saisie pour la corriger.
      window.setTimeout(() => this.renderInput(), 900);
    } else {
      this.body.querySelector<HTMLElement>(".hint")?.removeAttribute("hidden");
      this.body.querySelector<HTMLInputElement>("input")?.select();
    }
  }

  private showResult(correct: boolean, revealed: boolean): void {
    const verdict = correct
      ? element("p", { className: "granted", text: "ACCÈS AUTORISÉ ✔" })
      : element("p", { className: "denied", text: "Trop d'échecs — la cellule Écho force l'accès. Retiens bien ceci :" });
    const children: Node[] = [verdict];
    if (revealed) children.push(element("div", { className: "solution" }, [element("strong", { text: "Réponse : " }), richText("span", describeSolution(this.challenge))]));
    children.push(richText("p", this.challenge.explanation, "explanation"));
    this.body.replaceChildren();
    this.lessonBox.hidden = true;
    this.feedback.replaceChildren(...children);
    const continueButton = button("Continuer la mission", () => this.callbacks.onSolved({ wrongAttempts: this.wrongAttempts, revealed }), "btn primary");
    this.actions.replaceChildren(continueButton);
    continueButton.focus();
  }

  private secondaryActions(): HTMLButtonElement[] {
    const reviewButton = button(this.lessonBox.hidden ? "📁 Revoir le dossier" : "📁 Masquer le dossier", () => {
      this.lessonBox.hidden = !this.lessonBox.hidden;
      reviewButton.textContent = this.lessonBox.hidden ? "📁 Revoir le dossier" : "📁 Masquer le dossier";
    }, "btn ghost");
    return [reviewButton, this.disconnectButton()];
  }

  private disconnectButton(): HTMLButtonElement {
    return button("Se déconnecter", () => this.callbacks.onDisconnect(this.wrongAttempts), "btn ghost");
  }
}

export function describeSolution(challenge: Challenge): string {
  switch (challenge.kind) {
    case "choice":
      return challenge.options[challenge.correctIndex] ?? "";
    case "command":
      return `\`${challenge.acceptedAnswers[0] ?? ""}\``;
    case "order":
      return challenge.steps.map((step, index) => `${index + 1}. ${step}`).join("  →  ");
  }
}

function shuffleIndexes(count: number): number[] {
  const indexes = Array.from({ length: count }, (_, index) => index);
  for (let index = indexes.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [indexes[index], indexes[swapIndex]] = [indexes[swapIndex] as number, indexes[index] as number];
  }
  return indexes;
}

/** Une séquence affichée déjà dans le bon ordre rendrait le défi trivial. */
function shuffleUntilDifferent(steps: string[]): string[] {
  for (let attempt = 0; attempt < 10; attempt++) {
    const shuffled = shuffleIndexes(steps.length).map((index) => steps[index] as string);
    if (shuffled.some((step, index) => step !== steps[index])) return shuffled;
  }
  return [...steps].reverse();
}
