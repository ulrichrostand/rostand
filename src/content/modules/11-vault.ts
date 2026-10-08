import type { DevOpsModule } from "../types";

export const vaultModule: DevOpsModule = {
  id: "vault",
  codename: "Opération VAULT",
  title: "Protéger les secrets",
  roadmapSection: "Secret Management",
  roadmapTopics: ["Secrets", "Jamais dans Git", "Coffre-fort (Vault)", "Secrets de CI", "Fuite et rotation"],
  briefing:
    "La salle des coffres contient les clés de toute l'infrastructure. ENTROPIA tente de les voler. Apprends à les protéger.",
  lessons: [
    {
      title: "C'est quoi, un secret ?",
      summary: "Un secret est une information qui donne un accès : mot de passe, clé d'API, jeton (token), certificat. Si quelqu'un la vole, il peut agir à ta place.",
      analogy: "Ce sont les clés de la maison : on ne les laisse pas sur la porte.",
      keyPoint: "Mot de passe, clé d'API, token : ce sont des secrets.",
    },
    {
      title: "Jamais dans le code ni dans Git",
      summary:
        "Un secret écrit dans le code finit dans Git, et Git garde tout l'historique : même supprimé plus tard, il reste récupérable. Des robots scannent GitHub en permanence pour trouver des clés.",
      analogy: "Écrire son code de carte bleue sur un post-it collé dans un lieu public.",
      keyPoint: "Ne jamais écrire un secret dans le code ou dans Git.",
    },
    {
      title: "Le coffre-fort à secrets",
      summary: "Un gestionnaire de secrets (HashiCorp Vault, AWS Secrets Manager…) stocke les secrets chiffrés. L'application les lui demande au démarrage, avec un accès contrôlé et tracé.",
      analogy: "C'est un coffre de banque : on y accède avec une autorisation, et chaque ouverture est enregistrée.",
      keyPoint: "Les secrets se rangent dans un coffre-fort dédié (Vault…).",
    },
    {
      title: "Les secrets dans la CI",
      summary:
        "Les pipelines ont souvent besoin de secrets (pour déployer). GitHub et GitLab offrent un espace « Secrets » chiffré : le secret est injecté au moment de l'exécution, jamais affiché ni écrit dans le dépôt.",
      analogy: "Le livreur reçoit le code du portail au moment de livrer, il n'est pas imprimé sur le colis.",
      keyPoint: "Dans la CI, les secrets vont dans l'espace Secrets du dépôt.",
    },
    {
      title: "En cas de fuite",
      summary:
        "Un secret a fuité ? D'abord le révoquer (le désactiver), puis en créer un nouveau, mettre à jour les applications, et enfin vérifier si quelqu'un l'a utilisé.",
      analogy: "Tu as perdu tes clés : tu changes la serrure d'abord, tu enquêtes ensuite.",
      keyPoint: "Fuite : révoquer → remplacer → mettre à jour → enquêter.",
    },
  ],
  challenges: [
    {
      kind: "choice",
      prompt: "Lequel de ces éléments est un secret ?",
      options: ["Le nom du site", "Une clé d'API", "La couleur du logo", "Le numéro de version"],
      correctIndex: 1,
      explanation: "Une clé d'API donne accès à un service : c'est un secret à protéger.",
    },
    {
      kind: "choice",
      prompt: "Où ne faut-il JAMAIS mettre un mot de passe ?",
      options: ["Dans un coffre-fort à secrets", "Dans le code envoyé sur GitHub", "Dans les Secrets du pipeline", "Dans un gestionnaire de mots de passe"],
      correctIndex: 1,
      explanation: "Git garde tout l'historique : un mot de passe commité est considéré comme compromis.",
    },
    {
      kind: "choice",
      prompt: "HashiCorp Vault, c'est…",
      options: ["Un jeu vidéo", "Un coffre-fort pour stocker et distribuer les secrets", "Un serveur web", "Un langage de programmation"],
      correctIndex: 1,
      explanation: "Vault stocke les secrets chiffrés et contrôle qui peut y accéder.",
    },
    {
      kind: "choice",
      prompt: "Ton pipeline GitHub Actions a besoin d'un token pour déployer. Où le mets-tu ?",
      options: ["Dans le fichier YAML du pipeline", "Dans les Secrets du dépôt GitHub", "Dans le README", "Dans le nom de la branche"],
      correctIndex: 1,
      explanation: "Les Secrets du dépôt sont chiffrés et injectés à l'exécution, sans jamais apparaître dans le code.",
    },
    {
      kind: "order",
      prompt: "Une clé d'API a fuité. Remets les actions dans l'ordre.",
      steps: ["Révoquer la clé compromise", "Créer une nouvelle clé", "Mettre à jour les applications avec la nouvelle clé", "Vérifier les accès suspects dans les journaux"],
      explanation: "On coupe l'accès d'abord : chaque minute compte. On répare, puis on enquête.",
    },
  ],
};
