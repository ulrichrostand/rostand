import { describe, expect, it } from "vitest";
import { CURRICULUM } from "../src/content/curriculum";
import { SCENARIOS } from "../src/content/scenarios";
import { SeededRandom } from "../src/core/rng";
import {
  buildGeneralExam,
  buildModuleExam,
  commandAnswers,
  examQuestionPool,
  formatGrade,
  GENERAL_EXAM_QUESTIONS,
  gradeOutOf20,
  isExamAnswerCorrect,
  mentionFor,
  MODULE_EXAM_PRACTICE_QUESTIONS,
  type ExamQuestion,
} from "../src/game/exam";
import { isStepCommandCorrect } from "../src/challenges/scenario";
import { parseProgress, ProgressStore, type KeyValueStorage } from "../src/game/progress";
import { decodeSaveCode, encodeSaveCode } from "../src/game/saveCode";

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const sources = CURRICULUM.map((module) => ({ module, scenario: SCENARIOS[module.id] }));

/** Aucune commande ne doit être demandée deux fois dans un même examen. */
function expectNoRepeatedCommand(exam: ExamQuestion[]): void {
  const answers = exam.flatMap((question) => [...new Set(commandAnswers(question))]);
  expect(new Set(answers).size).toBe(answers.length);
}

function questionKey(question: ExamQuestion): string {
  return question.source === "challenge" ? `${question.moduleId}:${question.challenge.prompt}` : `${question.moduleId}:${question.prompt}`;
}

describe("contenu d'examen", () => {
  it("chaque module a au moins 3 questions de pratique", () => {
    for (const source of sources) {
      const practice = examQuestionPool(source).filter((question) => question.source === "practice");
      expect(practice.length, source.module.id).toBeGreaterThanOrEqual(MODULE_EXAM_PRACTICE_QUESTIONS);
    }
  });

  it("une question de pratique ne donne jamais la commande attendue", () => {
    for (const source of sources) {
      for (const step of source.scenario?.steps ?? []) {
        if (!step.exam) continue;
        // Commandes d'un seul mot exclues : « date » ou « top » sont aussi des mots courants de l'énoncé.
        const commandStart = (step.accepted[0] ?? "").split(" ").slice(0, 2).join(" ");
        if (commandStart.includes(" ")) expect(step.exam.includes(commandStart), `${source.module.id} : ${step.exam}`).toBe(false);
        expect(step.exam.includes("`"), `${source.module.id} : ${step.exam}`).toBe(false);
      }
    }
  });

  it("la commande canonique de chaque question de pratique est acceptée", () => {
    for (const source of sources) {
      for (const step of source.scenario?.steps ?? []) {
        if (step.exam) expect(isStepCommandCorrect(step, step.accepted[0] ?? ""), step.exam).toBe(true);
      }
    }
  });
});

describe("tirage des questions", () => {
  it("examen de module : tous les défis + 3 commandes de pratique, sans doublon", () => {
    const source = sources[1]!;
    const exam = buildModuleExam(source, new SeededRandom(42));
    expect(exam).toHaveLength(source.module.challenges.length + MODULE_EXAM_PRACTICE_QUESTIONS);
    expect(exam.filter((question) => question.source === "challenge")).toHaveLength(source.module.challenges.length);
    expect(new Set(exam.map(questionKey)).size).toBe(exam.length);
    expectNoRepeatedCommand(exam);
  });

  it("aucun examen de module ne repose deux fois la même commande", () => {
    for (const source of sources) expectNoRepeatedCommand(examQuestionPool(source));
  });

  it("examen général sur tous les modules : 12 questions, aucune commande en double", () => {
    for (let seed = 0; seed < 20; seed++) {
      const exam = buildGeneralExam(sources, new SeededRandom(seed));
      expect(exam).toHaveLength(GENERAL_EXAM_QUESTIONS);
      expectNoRepeatedCommand(exam);
    }
  });

  it("examen général : couvre tous les modules quand c'est possible", () => {
    const picked = sources.slice(0, 4);
    const exam = buildGeneralExam(picked, new SeededRandom(7));
    expect(exam).toHaveLength(GENERAL_EXAM_QUESTIONS);
    expect(new Set(exam.map((question) => question.moduleId))).toEqual(new Set(picked.map((source) => source.module.id)));
    expect(new Set(exam.map(questionKey)).size).toBe(exam.length);
  });

  it("examen général : s'arrête quand les questions sont épuisées", () => {
    const tiny = [{ module: { ...sources[0]!.module, challenges: sources[0]!.module.challenges.slice(0, 1) }, scenario: undefined }];
    expect(buildGeneralExam(tiny, new SeededRandom(1))).toHaveLength(1);
  });

  it("le même tirage donne le même examen (graine), un autre tirage un ordre différent", () => {
    const first = buildModuleExam(sources[2]!, new SeededRandom(3)).map(questionKey);
    expect(buildModuleExam(sources[2]!, new SeededRandom(3)).map(questionKey)).toEqual(first);
    expect(buildModuleExam(sources[2]!, new SeededRandom(4)).map(questionKey)).not.toEqual(first);
  });
});

describe("correction", () => {
  const module = sources[0]!.module;
  const choice = module.challenges.find((challenge) => challenge.kind === "choice")!;
  const practice = examQuestionPool(sources[0]!).find((question) => question.source === "practice")!;

  it("évalue un QCM, une commande de pratique et une absence de réponse", () => {
    const question: ExamQuestion = { source: "challenge", moduleId: module.id, challenge: choice };
    if (choice.kind !== "choice") throw new Error("QCM attendu");
    expect(isExamAnswerCorrect(question, { kind: "choice", selectedIndex: choice.correctIndex })).toBe(true);
    expect(isExamAnswerCorrect(question, { kind: "choice", selectedIndex: (choice.correctIndex + 1) % choice.options.length })).toBe(false);
    expect(isExamAnswerCorrect(question, null)).toBe(false);
    if (practice.source !== "practice") throw new Error("question de pratique attendue");
    expect(isExamAnswerCorrect(practice, { kind: "command", typedCommand: `  ${practice.step.accepted[0]}  ` })).toBe(true);
    expect(isExamAnswerCorrect(practice, { kind: "command", typedCommand: "rm -rf /" })).toBe(false);
  });

  it("une réponse du mauvais type est fausse, sans planter l'examen", () => {
    const question: ExamQuestion = { source: "challenge", moduleId: module.id, challenge: choice };
    expect(isExamAnswerCorrect(question, { kind: "command", typedCommand: "echo" })).toBe(false);
    expect(isExamAnswerCorrect(practice, { kind: "choice", selectedIndex: 0 })).toBe(false);
  });
});

describe("barème", () => {
  it("note sur 20 au demi-point", () => {
    expect(gradeOutOf20(8, 8)).toBe(20);
    expect(gradeOutOf20(0, 8)).toBe(0);
    expect(gradeOutOf20(5, 8)).toBe(12.5);
    expect(gradeOutOf20(7, 12)).toBe(11.5);
    expect(gradeOutOf20(3, 0)).toBe(0);
    expect(gradeOutOf20(99, 8)).toBe(20);
  });

  it("mentions et seuil d'admission", () => {
    expect(mentionFor(20)).toEqual({ label: "Mention très bien", passed: true });
    expect(mentionFor(14).label).toBe("Mention bien");
    expect(mentionFor(12.5).label).toBe("Mention assez bien");
    expect(mentionFor(10).passed).toBe(true);
    expect(mentionFor(9.5).passed).toBe(false);
  });

  it("formate la note à la française", () => {
    expect(formatGrade(15.5)).toBe("15,5/20");
    expect(formatGrade(16)).toBe("16/20");
  });
});

describe("sauvegarde des examens", () => {
  it("garde la meilleure note et compte les tentatives", () => {
    const storage = new MemoryStorage();
    const store = new ProgressStore(storage);
    expect(store.saveExamResult("kernel", 12).improved).toBe(true);
    expect(store.saveExamResult("kernel", 9.5).improved).toBe(false);
    const { record, improved } = store.saveExamResult("kernel", 17);
    expect(improved).toBe(true);
    expect(record).toMatchObject({ bestGrade: 17, attempts: 3 });
    expect(new ProgressStore(storage).examRecordFor("kernel")).toMatchObject({ bestGrade: 17, attempts: 3 });
  });

  it("passe dans le code de sauvegarde", () => {
    const store = new ProgressStore(null);
    store.saveExamResult("general", 14.5);
    expect(decodeSaveCode(encodeSaveCode(store.snapshot)).exams.general?.bestGrade).toBe(14.5);
  });

  it("rejette les notes impossibles et les clés dangereuses", () => {
    const progress = parseProgress(
      JSON.stringify({
        records: {},
        exams: {
          kernel: { bestGrade: 21, attempts: 1, lastTakenAt: "x" },
          shell: { bestGrade: 12, attempts: -1, lastTakenAt: "x" },
          __proto__: { bestGrade: 12, attempts: 1, lastTakenAt: "x" },
          branch: { bestGrade: 12, attempts: 2, lastTakenAt: "x", extra: "ignoré" },
        },
      }),
    );
    expect(Object.keys(progress.exams)).toEqual(["branch"]);
    expect(progress.exams.branch).toEqual({ bestGrade: 12, attempts: 2, lastTakenAt: "x" });
  });

  it("une ancienne sauvegarde sans examens reste lisible", () => {
    expect(parseProgress(JSON.stringify({ version: 2, records: {} })).exams).toEqual({});
  });

  it("refuse un identifiant d'examen invalide", () => {
    expect(() => new ProgressStore(null).saveExamResult("../x", 10)).toThrow(RangeError);
  });
});
