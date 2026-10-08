/** Question à choix multiple : une seule bonne réponse. */
export interface ChoiceChallenge {
  kind: "choice";
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

/** Saisie d'une commande : comparée après normalisation (espaces, guillemets). */
export interface CommandChallenge {
  kind: "command";
  prompt: string;
  acceptedAnswers: string[];
  hint: string;
  explanation: string;
}

/** Remettre des étapes dans l'ordre (pipeline, cycle de vie...). */
export interface OrderChallenge {
  kind: "order";
  prompt: string;
  /** Étapes dans l'ordre CORRECT ; elles sont mélangées à l'affichage. */
  steps: string[];
  explanation: string;
}

export type Challenge = ChoiceChallenge | CommandChallenge | OrderChallenge;

/** Une étape d'intervention dans le faux terminal : un objectif, la commande attendue, ce que le terminal répond. */
export interface ScenarioStep {
  /** Ce qu'il faut faire, avec un indice sur la commande pour un débutant. */
  goal: string;
  /**
   * Question d'examen : le même objectif, sans donner la commande.
   * Absent = étape non retenue pour l'examen (doublon ou trop triviale).
   */
  exam?: string;
  /** Commandes acceptées telles quelles (après normalisation des espaces et guillemets). */
  accepted: string[];
  /**
   * Motifs (expressions régulières, ancrées automatiquement) pour les commandes à partie libre,
   * comme un message de commit.
   */
  patterns?: string[];
  /** Sortie affichée par le terminal quand la commande est juste. */
  output: string[];
}

/** Intervention pratique : on enchaîne de vraies commandes pour résoudre un incident. */
export interface Scenario {
  title: string;
  /** La situation de départ, racontée simplement. */
  context: string;
  steps: ScenarioStep[];
  /** Ce qu'il faut retenir de l'enchaînement, affiché à la fin. */
  debrief: string;
}

/**
 * Leçon pour grand débutant : une notion, expliquée sans jargon non défini.
 * Chaque leçon prépare exactement le défi de même index dans le module.
 */
export interface Lesson {
  title: string;
  /** L'essentiel en 2-3 phrases simples. */
  summary: string;
  /** Une image de la vie courante pour ancrer la notion. */
  analogy: string;
  /** Exemple concret : une commande ou un fichier, et ce qu'il fait. */
  example?: { code: string; meaning: string };
  /** La phrase à retenir ; elle alimente aussi le récapitulatif de fin de module. */
  keyPoint: string;
}

export interface DevOpsModule {
  id: string;
  /** Nom de code de la mission (habillage narratif). */
  codename: string;
  title: string;
  /** Section correspondante sur https://roadmap.sh/devops */
  roadmapSection: string;
  roadmapTopics: string[];
  briefing: string;
  /** Même longueur que `challenges` : la leçon i prépare le défi i. */
  lessons: Lesson[];
  challenges: Challenge[];
}

/** Le récapitulatif de fin de module = les points clés des leçons (une seule source de vérité). */
export function recapOf(module: DevOpsModule): string[] {
  return module.lessons.map((lesson) => lesson.keyPoint);
}
