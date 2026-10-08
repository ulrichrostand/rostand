import { canonicalCommand, isStepCommandCorrect, simulateWrongCommand } from "../challenges/scenario";
import { normalizeCommand } from "../challenges/evaluate";
import type { Scenario } from "../content/types";
import { button, element, richText } from "./dom";

export interface ScenarioPanelCallbacks {
  onWrongCommand(): void;
  /** Étape franchie : permet de reprendre l'intervention là où on l'a laissée. */
  onStepCompleted(nextStepIndex: number): void;
  onCompleted(wrongAttempts: number): void;
  onDisconnect(wrongAttempts: number): void;
}

/** Après 2 erreurs sur une étape, on peut afficher la commande : bloquer un débutant n'apprend rien. */
const ATTEMPTS_BEFORE_SOLUTION = 2;
const PROMPT = "spectre@helix:~$";

/**
 * Console d'intervention : un faux terminal où l'on enchaîne de vraies commandes
 * pour résoudre un incident, avec les sorties que produiraient les vrais outils.
 */
export class ScenarioPanel {
  private stepIndex: number;
  private wrongAttempts: number;
  private wrongOnCurrentStep = 0;
  private readonly history: string[] = [];
  private readonly scrollback = element("div", { className: "shell-scrollback", attributes: { role: "log", "aria-live": "polite" } });
  private readonly goalBox = element("div", { className: "scenario-goal" });
  private readonly actions = element("div", { className: "challenge-actions" });
  private readonly input = element("input", {
    className: "command-input",
    attributes: { type: "text", autocomplete: "off", autocapitalize: "off", spellcheck: "false", maxlength: "200", "aria-label": "Commande" },
  });

  constructor(
    private readonly container: HTMLElement,
    private readonly scenario: Scenario,
    private readonly terminalLabel: string,
    startStep: number,
    previousWrongAttempts: number,
    private readonly callbacks: ScenarioPanelCallbacks,
  ) {
    this.stepIndex = Math.min(Math.max(0, startStep), scenario.steps.length);
    this.wrongAttempts = previousWrongAttempts;
  }

  open(): void {
    const form = element("form", { className: "command-form" }, [element("span", { className: "prompt-symbol", text: PROMPT }), this.input]);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.execute(this.input.value);
    });
    let historyCursor = 0;
    this.input.addEventListener("keydown", (event) => {
      // Flèches haut/bas : historique des commandes, comme dans un vrai terminal.
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      if (event.key === "ArrowUp") historyCursor = Math.max(0, historyCursor - 1);
      else historyCursor = Math.min(this.history.length, historyCursor + 1);
      this.input.value = this.history[historyCursor] ?? "";
    });
    this.input.addEventListener("focus", () => (historyCursor = this.history.length));

    this.container.replaceChildren(
      element("div", { className: "panel challenge-panel scenario-panel", attributes: { role: "dialog", "aria-modal": "true" } }, [
        element("div", { className: "challenge-header" }, [
          element("span", { className: "blink", text: "●" }),
          element("span", { text: ` ${this.terminalLabel} // intervention` }),
          element("span", { className: "tag", text: "Pratique" }),
        ]),
        element("h2", { className: "challenge-prompt", text: this.scenario.title }),
        richText("p", this.scenario.context, "scenario-context"),
        this.goalBox,
        this.scrollback,
        form,
        this.actions,
      ]),
    );
    this.container.hidden = false;
    if (this.stepIndex > 0) this.appendLine(`(reprise de l'intervention à l'étape ${this.stepIndex + 1})`, "muted");
    this.render();
  }

  close(): void {
    this.container.hidden = true;
    this.container.replaceChildren();
  }

  private get currentStep() {
    return this.scenario.steps[this.stepIndex];
  }

  private render(): void {
    const step = this.currentStep;
    if (!step) {
      this.renderCompleted();
      return;
    }
    this.goalBox.replaceChildren(
      element("span", { className: "scenario-step", text: `Étape ${this.stepIndex + 1}/${this.scenario.steps.length}` }),
      richText("p", step.goal),
    );
    const showSolution = button("Montrer la commande", () => {
      this.appendLine(`Commande attendue : ${canonicalCommand(step)}`, "hint");
      this.input.focus();
    }, "btn ghost");
    showSolution.hidden = this.wrongOnCurrentStep < ATTEMPTS_BEFORE_SOLUTION;
    this.actions.replaceChildren(
      button("Exécuter ⏎", () => this.execute(this.input.value), "btn primary"),
      showSolution,
      button("Se déconnecter", () => this.callbacks.onDisconnect(this.wrongAttempts), "btn ghost"),
    );
    this.input.disabled = false;
    this.input.focus();
  }

  private execute(rawCommand: string): void {
    const command = rawCommand.trim();
    const step = this.currentStep;
    if (!step || command.length === 0) return;
    this.history.push(command);
    this.input.value = "";
    this.appendLine(`${PROMPT} ${command}`, "command");

    if (!isStepCommandCorrect(step, command)) {
      this.wrongAttempts++;
      this.wrongOnCurrentStep++;
      for (const line of simulateWrongCommand(command)) this.appendLine(line, "error");
      this.callbacks.onWrongCommand();
      this.render();
      return;
    }

    if (normalizeCommand(command) === "clear") this.scrollback.replaceChildren();
    for (const line of step.output) this.appendLine(line, "output");
    this.stepIndex++;
    this.wrongOnCurrentStep = 0;
    this.callbacks.onStepCompleted(this.stepIndex);
    this.render();
  }

  private renderCompleted(): void {
    this.goalBox.replaceChildren(
      element("p", { className: "granted", text: "INTERVENTION RÉUSSIE ✔" }),
      richText("p", this.scenario.debrief, "explanation"),
    );
    this.input.disabled = true;
    const continueButton = button("Continuer la mission", () => this.callbacks.onCompleted(this.wrongAttempts), "btn primary");
    this.actions.replaceChildren(continueButton);
    continueButton.focus();
  }

  private appendLine(text: string, kind: "command" | "output" | "error" | "hint" | "muted"): void {
    this.scrollback.append(element("div", { className: `shell-line ${kind}`, text: text.length === 0 ? " " : text }));
    this.scrollback.scrollTop = this.scrollback.scrollHeight;
  }
}
