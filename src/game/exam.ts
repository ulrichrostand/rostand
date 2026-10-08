import { isAnswerCorrect, normalizeCommand, type ChallengeAnswer } from "../challenges/evaluate";
import { isStepCommandCorrect } from "../challenges/scenario";
import type { Challenge, DevOpsModule, Scenario, ScenarioStep } from "../content/types";
import type { SeededRandom } from "../core/rng";

/** Identifiant de l'examen qui couvre tous les secteurs libérés (les autres portent l'id du module). */
export const GENERAL_EXAM_ID = "general";
/** Questions de pratique ajoutées aux 5 défis d'un module : 8 questions au total. */
export const MODULE_EXAM_PRACTICE_QUESTIONS = 3;
export const GENERAL_EXAM_QUESTIONS = 12;
/** L'examen général n'a de sens que s'il mélange plusieurs secteurs. */
export const GENERAL_EXAM_MIN_MODULES = 2;
/** Généreux pour un débutant qui tape encore lentement, mais assez court pour interdire de chercher. */
export const SECONDS_PER_QUESTION = 60;
export const PASSING_GRADE = 10;

/** Une question d'examen vient soit d'un défi de terminal, soit d'une étape d'intervention pratique. */
export type ExamQuestion =
  | { source: "challenge"; moduleId: string; challenge: Challenge }
  | { source: "practice"; moduleId: string; prompt: string; step: ScenarioStep };

/** Réponse donnée ; null = question passée ou temps écoulé. */
export type ExamResponse = ChallengeAnswer | null;

export interface ExamModuleSource {
  module: DevOpsModule;
  scenario: Scenario | undefined;
}

export interface Mention {
  label: string;
  passed: boolean;
}

/** Commandes qui répondent à la question (vide pour un QCM ou une séquence) : sert à repérer les doublons. */
export function commandAnswers(question: ExamQuestion): string[] {
  if (question.source === "practice") return question.step.accepted.map(normalizeCommand);
  return question.challenge.kind === "command" ? question.challenge.acceptedAnswers.map(normalizeCommand) : [];
}

/** Ajoute la question si elle ne redemande pas une commande déjà demandée (ex. `ls` en défi puis en pratique). */
function addUnlessRepeated(question: ExamQuestion, picked: ExamQuestion[], askedCommands: Set<string>): boolean {
  const answers = commandAnswers(question);
  if (answers.some((answer) => askedCommands.has(answer))) return false;
  for (const answer of answers) askedCommands.add(answer);
  picked.push(question);
  return true;
}

/**
 * Toutes les questions possibles d'un module : ses défis, puis les étapes pratiques retenues pour l'examen,
 * sauf celles qui redemandent une commande déjà couverte par un défi.
 */
export function examQuestionPool({ module, scenario }: ExamModuleSource): ExamQuestion[] {
  const pool: ExamQuestion[] = [];
  const askedCommands = new Set<string>();
  for (const challenge of module.challenges) addUnlessRepeated({ source: "challenge", moduleId: module.id, challenge }, pool, askedCommands);
  for (const step of scenario?.steps ?? []) {
    if (step.exam) addUnlessRepeated({ source: "practice", moduleId: module.id, prompt: step.exam, step }, pool, askedCommands);
  }
  return pool;
}

/** Examen de module : tous les défis (le socle du cours) + quelques commandes de pratique tirées au sort. */
export function buildModuleExam(source: ExamModuleSource, random: SeededRandom): ExamQuestion[] {
  const pool = examQuestionPool(source);
  const challenges = pool.filter((question) => question.source === "challenge");
  const practice = random.shuffle(pool.filter((question) => question.source === "practice")).slice(0, MODULE_EXAM_PRACTICE_QUESTIONS);
  return random.shuffle([...challenges, ...practice]);
}

/**
 * Examen général : on pioche à tour de rôle dans chaque module (ordre aléatoire),
 * pour couvrir le plus de secteurs possible au lieu d'en sur-représenter un.
 */
export function buildGeneralExam(sources: readonly ExamModuleSource[], random: SeededRandom, questionCount = GENERAL_EXAM_QUESTIONS): ExamQuestion[] {
  const pools = random.shuffle(sources.map((source) => random.shuffle(examQuestionPool(source))));
  const picked: ExamQuestion[] = [];
  // Plusieurs modules partagent des commandes (cd /var/log, git push...) : on ne les pose qu'une fois.
  const askedCommands = new Set<string>();
  const longestPool = Math.max(0, ...pools.map((pool) => pool.length));
  for (let round = 0; round < longestPool && picked.length < questionCount; round++) {
    for (const pool of pools) {
      const question = pool[round];
      if (question) addUnlessRepeated(question, picked, askedCommands);
      if (picked.length === questionCount) break;
    }
  }
  return random.shuffle(picked);
}

export function isExamAnswerCorrect(question: ExamQuestion, response: ExamResponse): boolean {
  if (response === null) return false;
  if (question.source === "practice") return response.kind === "command" && isStepCommandCorrect(question.step, response.typedCommand);
  // Une réponse d'un autre type ne peut venir que d'un bug d'interface : on la compte fausse sans planter l'examen.
  if (response.kind !== question.challenge.kind) return false;
  return isAnswerCorrect(question.challenge, response);
}

/** Note sur 20 arrondie au demi-point, comme un vrai barème. */
export function gradeOutOf20(correctCount: number, questionCount: number): number {
  if (questionCount <= 0) return 0;
  const clampedCorrect = Math.min(Math.max(correctCount, 0), questionCount);
  return Math.round((clampedCorrect / questionCount) * 40) / 2;
}

export function mentionFor(grade: number): Mention {
  if (grade >= 16) return { label: "Mention très bien", passed: true };
  if (grade >= 14) return { label: "Mention bien", passed: true };
  if (grade >= 12) return { label: "Mention assez bien", passed: true };
  if (grade >= PASSING_GRADE) return { label: "Admis", passed: true };
  return { label: "Ajourné — à retravailler", passed: false };
}

export function examTimeLimitSeconds(questionCount: number): number {
  return questionCount * SECONDS_PER_QUESTION;
}

/** Note au format français : « 15,5/20 ». */
export function formatGrade(grade: number): string {
  return `${grade.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/20`;
}
