import type { Lesson } from "../content/types";
import { button, element, richText } from "./dom";

/** Carte de leçon réutilisée partout : dossier ramassé, rappel au terminal, codex de fin de module. */
export function lessonCard(lesson: Lesson): HTMLElement {
  const sections: HTMLElement[] = [
    element("h2", { className: "lesson-title", text: lesson.title }),
    richText("p", lesson.summary, "lesson-summary"),
    element("div", { className: "lesson-block analogy" }, [
      element("span", { className: "lesson-label", text: "💡 Pour imaginer" }),
      richText("p", lesson.analogy),
    ]),
  ];
  if (lesson.example) {
    sections.push(
      element("div", { className: "lesson-block example" }, [
        element("span", { className: "lesson-label", text: "⌨️ Exemple" }),
        element("pre", { className: "lesson-code", text: lesson.example.code }),
        richText("p", lesson.example.meaning),
      ]),
    );
  }
  sections.push(
    element("div", { className: "lesson-block keypoint" }, [
      element("span", { className: "lesson-label", text: "✅ À retenir" }),
      richText("p", lesson.keyPoint),
    ]),
  );
  return element("article", { className: "lesson-card" }, sections);
}

export interface LessonPanelOptions {
  /** Ex. « Dossier 2/5 » ou « Transmission de la cellule Écho ». */
  eyebrow: string;
  intro?: string;
  continueLabel: string;
  onContinue(): void;
}

export class LessonPanel {
  constructor(private readonly container: HTMLElement) {}

  open(lesson: Lesson, options: LessonPanelOptions): void {
    const continueButton = button(options.continueLabel, () => {
      this.close();
      options.onContinue();
    }, "btn primary");
    this.container.replaceChildren(
      element("div", { className: "panel lesson-panel", attributes: { role: "dialog", "aria-modal": "true" } }, [
        element("p", { className: "eyebrow", text: `📁 ${options.eyebrow}` }),
        options.intro ? element("p", { className: "lesson-intro", text: options.intro }) : null,
        lessonCard(lesson),
        element("div", { className: "row" }, [continueButton]),
      ]),
    );
    this.container.hidden = false;
    this.container.scrollTop = 0;
    continueButton.focus({ preventScroll: true });
  }

  close(): void {
    this.container.hidden = true;
    this.container.replaceChildren();
  }
}
