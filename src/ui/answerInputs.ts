import type { ChoiceChallenge } from "../content/types";
import { button, element, richText } from "./dom";

/**
 * Champs de réponse partagés par les terminaux et l'examen : un QCM, une séquence à ordonner,
 * une ligne de commande. Chaque appel produit un nouvel ordre aléatoire.
 */

/** QCM : ordre des options mélangé à chaque rendu, on ne peut pas réussir en mémorisant une position. */
export function choiceInput(challenge: ChoiceChallenge, onSelect: (optionIndex: number) => void): HTMLElement {
  const list = element("div", { className: "choice-list" });
  shuffleIndexes(challenge.options.length).forEach((optionIndex, displayIndex) => {
    const option = challenge.options[optionIndex] as string;
    const optionButton = button("", () => onSelect(optionIndex), "choice");
    optionButton.append(element("span", { className: "choice-key", text: String.fromCharCode(65 + displayIndex) }), richText("span", option));
    list.append(optionButton);
  });
  return list;
}

export interface OrderInput {
  element: HTMLOListElement;
  currentOrder(): string[];
}

/** Séquence à remettre dans l'ordre avec des boutons ▲/▼ (utilisables au clavier et au doigt). */
export function orderInput(correctSteps: readonly string[]): OrderInput {
  let currentOrder = shuffleUntilDifferent(correctSteps);
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
  return { element: list, currentOrder: () => [...currentOrder] };
}

export interface CommandInput {
  form: HTMLFormElement;
  input: HTMLInputElement;
}

/** Ligne de commande : Entrée valide, sans correcteur ni majuscule automatique (indispensable sur mobile). */
export function commandInput(promptLabel: string, onSubmit: (typedCommand: string) => void): CommandInput {
  const input = element("input", {
    className: "command-input",
    attributes: { type: "text", autocomplete: "off", autocapitalize: "off", spellcheck: "false", maxlength: "300", "aria-label": "Commande à saisir" },
  });
  const form = element("form", { className: "command-form" }, [element("span", { className: "prompt-symbol", text: promptLabel }), input]);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSubmit(input.value);
  });
  return { form, input };
}

export function shuffleIndexes(count: number): number[] {
  const indexes = Array.from({ length: count }, (_, index) => index);
  for (let index = indexes.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [indexes[index], indexes[swapIndex]] = [indexes[swapIndex] as number, indexes[index] as number];
  }
  return indexes;
}

/** Une séquence affichée déjà dans le bon ordre rendrait la question triviale. */
export function shuffleUntilDifferent(steps: readonly string[]): string[] {
  for (let attempt = 0; attempt < 10; attempt++) {
    const shuffled = shuffleIndexes(steps.length).map((index) => steps[index] as string);
    if (shuffled.some((step, index) => step !== steps[index])) return shuffled;
  }
  return [...steps].reverse();
}
