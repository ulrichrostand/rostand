import type { DevOpsModule } from "../types";

export const architectModule: DevOpsModule = {
  id: "architect",
  codename: "Opération ARCHITECT",
  title: "Concevoir une infrastructure solide",
  roadmapSection: "Cloud Design Patterns",
  roadmapTopics: ["Haute disponibilité", "Scalabilité", "Sauvegardes", "Circuit breaker", "Objectif de disponibilité"],
  briefing:
    "Dernière mission : le cœur d'ENTROPIA. Pour l'éteindre définitivement, conçois une infrastructure qui ne peut plus tomber.",
  lessons: [
    {
      title: "Pas de point unique de panne",
      summary:
        "Si un seul élément (un serveur, une base de données) peut tout arrêter en tombant, c'est un point unique de panne. On double tout ce qui est critique.",
      analogy: "La roue de secours : si un pneu crève, la voiture repart.",
      keyPoint: "Doubler les éléments critiques pour éviter un point unique de panne.",
    },
    {
      title: "Grandir : la scalabilité",
      summary:
        "Pour encaisser plus de visiteurs, on peut prendre un serveur plus puissant (scalabilité verticale) ou ajouter des serveurs (scalabilité horizontale). L'horizontale n'a presque pas de limite.",
      analogy: "Vertical : un camion plus gros. Horizontal : plus de camions.",
      keyPoint: "Scalabilité horizontale = ajouter des serveurs ; verticale = un plus gros serveur.",
    },
    {
      title: "Les sauvegardes",
      summary:
        "Une sauvegarde n'a de valeur que si on sait la restaurer. On garde plusieurs copies, dont une ailleurs, et on teste régulièrement la restauration.",
      analogy: "Un parachute de secours qu'on n'a jamais vérifié, c'est un sac à dos.",
      keyPoint: "Une sauvegarde doit être testée régulièrement par une restauration.",
    },
    {
      title: "Le circuit breaker",
      summary:
        "Si un service appelé est en panne, insister ne fait qu'empirer les choses. Le circuit breaker coupe temporairement les appels, renvoie une réponse de secours, puis réessaie plus tard.",
      analogy: "Le disjoncteur électrique : il coupe le courant pour éviter l'incendie.",
      keyPoint: "Le circuit breaker coupe les appels vers un service en panne pour éviter l'effet domino.",
    },
    {
      title: "Objectif de disponibilité",
      summary:
        "On fixe un objectif mesurable, par exemple 99,9 % de disponibilité. Cela autorise environ 43 minutes de panne par mois. Viser 100 % est impossible et hors de prix.",
      analogy: "Un train « à l'heure à 99 % », c'est un objectif clair qu'on peut mesurer.",
      keyPoint: "99,9 % de disponibilité ≈ 43 minutes de panne autorisées par mois.",
    },
  ],
  challenges: [
    {
      kind: "choice",
      prompt: "Qu'est-ce qu'un point unique de panne ?",
      options: ["Un élément dont la panne arrête tout le système", "Le serveur le plus rapide", "Un mot de passe oublié", "Un bug dans l'interface"],
      correctIndex: 0,
      explanation: "On l'élimine en doublant l'élément (deux serveurs, deux bases répliquées…).",
    },
    {
      kind: "choice",
      prompt: "La scalabilité horizontale, c'est…",
      options: ["Acheter un plus gros serveur", "Ajouter des serveurs supplémentaires", "Réduire le nombre d'utilisateurs", "Changer de langage"],
      correctIndex: 1,
      explanation: "Ajouter des machines derrière un load balancer : c'est ainsi que les grands sites encaissent des millions de visiteurs.",
    },
    {
      kind: "choice",
      prompt: "Quelle est la règle d'or des sauvegardes ?",
      options: ["Les faire une fois par an", "Tester régulièrement qu'on sait les restaurer", "Les garder sur le même serveur", "Ne jamais les vérifier"],
      correctIndex: 1,
      explanation: "Beaucoup d'entreprises découvrent le jour du drame que leurs sauvegardes sont inutilisables.",
    },
    {
      kind: "choice",
      prompt: "Un service de paiement ne répond plus. Que fait un circuit breaker ?",
      options: [
        "Il réessaie sans arrêt",
        "Il coupe temporairement les appels et renvoie une réponse de secours",
        "Il redémarre tous les serveurs",
        "Il supprime le service",
      ],
      correctIndex: 1,
      explanation: "Il évite que la panne d'un service fasse tomber tous ceux qui l'appellent.",
    },
    {
      kind: "choice",
      prompt: "Un objectif de 99,9 % de disponibilité autorise environ combien de panne par mois ?",
      options: ["4 minutes", "43 minutes", "7 heures", "3 jours"],
      correctIndex: 1,
      explanation: "0,1 % d'un mois ≈ 43 minutes. À 99,99 %, on tombe à environ 4 minutes.",
    },
  ],
};
