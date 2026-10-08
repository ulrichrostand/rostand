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

export interface DevOpsModule {
  id: string;
  /** Nom de code de la mission (habillage narratif). */
  codename: string;
  title: string;
  /** Section correspondante sur https://roadmap.sh/devops */
  roadmapSection: string;
  roadmapTopics: string[];
  briefing: string;
  challenges: Challenge[];
  recap: string[];
}
