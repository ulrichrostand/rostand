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
