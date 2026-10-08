import { isWeaponCommandCorrect, type CommandWeapon, type SentinelIdentity } from "../combat/weapons";
import { button, element, richText } from "./dom";

export interface CommandPanelCallbacks {
  onSuccess(weapon: CommandWeapon): void;
  onFailure(): void;
  onCancel(): void;
}

/** Après 2 erreurs on montre la commande attendue : il faut quand même la taper pour la retenir. */
const ATTEMPTS_BEFORE_REVEAL = 2;

/**
 * Gadget de terrain : une vraie commande DevOps tapée contre une sentinelle.
 * On affiche la sortie de la commande de repérage pour apprendre aussi à la lire.
 */
export class CommandPanel {
  private wrongAttempts = 0;
  private weapon: CommandWeapon;
  private readonly body = element("div", { className: "command-body" });

  constructor(
    private readonly container: HTMLElement,
    private readonly weapons: CommandWeapon[],
    private readonly target: SentinelIdentity,
    private readonly history: string[],
    private readonly callbacks: CommandPanelCallbacks,
  ) {
    const latestWeapon = weapons[weapons.length - 1];
    if (!latestWeapon) throw new Error("CommandPanel ouvert sans aucun gadget débloqué");
    // Par défaut, le dernier gadget appris : c'est celui qu'on veut faire pratiquer.
    this.weapon = latestWeapon;
  }

  open(): void {
    this.container.replaceChildren(
      element("div", { className: "panel challenge-panel command-panel", attributes: { role: "dialog", "aria-modal": "true" } }, [
        element("div", { className: "challenge-header" }, [
          element("span", { className: "blink", text: "◎" }),
          element("span", { text: ` Cible verrouillée : ${this.target.containerName}` }),
          element("span", { className: "tag", text: "Gadget" }),
        ]),
        element("p", { className: "challenge-note", text: "Le temps est ralenti. Une commande fausse fait du bruit et attire les sentinelles." }),
        this.body,
      ]),
    );
    this.container.hidden = false;
    this.render();
  }

  close(): void {
    this.container.hidden = true;
    this.container.replaceChildren();
  }

  private render(feedback: HTMLElement | null = null): void {
    const tabs =
      this.weapons.length > 1
        ? element(
            "div",
            { className: "weapon-tabs", attributes: { role: "tablist" } },
            this.weapons.map((weapon) => {
              const tab = button(weapon.label, () => {
                this.weapon = weapon;
                this.render();
              }, weapon === this.weapon ? "tab active" : "tab");
              tab.setAttribute("role", "tab");
              tab.setAttribute("aria-selected", String(weapon === this.weapon));
              return tab;
            }),
          )
        : null;

    const input = element("input", {
      className: "command-input",
      attributes: { type: "text", autocomplete: "off", autocapitalize: "off", spellcheck: "false", maxlength: "200", "aria-label": "Commande gadget" },
    });
    let historyCursor = this.history.length;
    input.addEventListener("keydown", (event) => {
      // Flèche haut/bas : historique des commandes, comme dans un vrai terminal.
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      historyCursor = Math.max(0, Math.min(this.history.length, historyCursor + (event.key === "ArrowUp" ? -1 : 1)));
      input.value = this.history[historyCursor] ?? "";
    });
    const form = element("form", { className: "command-form" }, [element("span", { className: "prompt-symbol", text: "spectre@helix:~$" }), input]);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.submit(input.value);
    });

    const hint = element("p", { className: "hint", text: `Aide : ${this.weapon.hint}` });
    hint.hidden = this.wrongAttempts === 0;
    const reveal =
      this.wrongAttempts >= ATTEMPTS_BEFORE_REVEAL
        ? element("div", { className: "solution" }, [
            element("strong", { text: "Commande attendue : " }),
            element("code", { text: this.weapon.acceptedCommands(this.target)[0] ?? "" }),
            element("span", { text: " — tape-la pour valider." }),
          ])
        : null;

    this.body.replaceChildren(
      ...[
        tabs,
        richText("p", this.weapon.objective, "command-objective"),
        element("pre", { className: "terminal-output", text: [`$ ${this.weapon.listingCommand}`, ...this.weapon.listing(this.target)].join("\n") }),
        richText("p", this.weapon.note, "command-note"),
        form,
        hint,
        reveal,
        feedback,
        element("div", { className: "challenge-actions" }, [
          button("Exécuter ⏎", () => this.submit(input.value), "btn primary"),
          button("Aide", () => (hint.hidden = false), "btn ghost"),
          button("Annuler", () => this.callbacks.onCancel(), "btn ghost"),
        ]),
      ].filter((node): node is HTMLElement => node !== null),
    );
    input.focus();
  }

  private submit(typedCommand: string): void {
    if (typedCommand.trim().length === 0) return;
    this.history.push(typedCommand.trim());
    if (isWeaponCommandCorrect(this.weapon, this.target, typedCommand)) {
      this.callbacks.onSuccess(this.weapon);
      return;
    }
    this.wrongAttempts++;
    this.callbacks.onFailure();
    this.render(element("p", { className: "denied", text: "Commande refusée — la sentinelle a entendu quelque chose. Vérifie la sortie ci-dessus." }));
  }
}
