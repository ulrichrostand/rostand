import type { DevOpsModule } from "../types";

export const branchModule: DevOpsModule = {
  id: "branch",
  codename: "Opération BRANCH",
  title: "Git : l'historique du code",
  roadmapSection: "Version Control Systems · VCS Hosting",
  roadmapTopics: ["Git", "Commit", "Branches", "GitHub / GitLab", "Pull Request"],
  briefing:
    "ENTROPIA a corrompu le dépôt de code central. Heureusement, Git garde l'historique de chaque modification. Apprends à t'en servir pour reprendre le contrôle.",
  lessons: [
    {
      title: "Pourquoi Git ?",
      summary:
        "Git enregistre chaque version d'un projet. On peut revenir en arrière, voir qui a changé quoi, et travailler à plusieurs sans s'écraser mutuellement. En DevOps, tout est dans Git : code, configuration, infrastructure.",
      analogy: "Git est une machine à remonter le temps pour ton projet, avec un journal de bord de chaque changement.",
      keyPoint: "Git garde l'historique des versions et permet de travailler à plusieurs.",
    },
    {
      title: "Le commit : une photo du projet",
      summary:
        "Un commit est une sauvegarde de l'état du projet, accompagnée d'un message. On choisit d'abord les fichiers à inclure avec `git add`, puis on enregistre avec `git commit -m \"message\"`.",
      analogy: "`git add` place les objets devant l'appareil photo, `git commit` appuie sur le déclencheur et écrit une légende.",
      example: { code: 'git commit -m "ajout du login"', meaning: "Enregistre une nouvelle version avec ce message." },
      keyPoint: "`git add` prépare les fichiers, `git commit -m \"…\"` enregistre une version.",
    },
    {
      title: "Les branches",
      summary:
        "Une branche est une copie parallèle du projet où l'on travaille sans toucher à la version principale (`main`). Une fois le travail prêt, on le fusionne dans `main`. `git switch -c nom` crée une branche et s'y place.",
      analogy: "C'est un brouillon : tu fais tes essais à côté, et tu ne recopies au propre que quand c'est bon.",
      example: { code: "git switch -c login", meaning: "Crée la branche login et bascule dessus." },
      keyPoint: "Une branche permet de travailler à part ; `git switch -c nom` en crée une.",
    },
    {
      title: "GitHub et GitLab",
      summary:
        "GitHub et GitLab hébergent les dépôts Git en ligne pour partager le code. `git push` envoie tes commits vers le serveur, `git pull` récupère ceux des collègues.",
      analogy: "C'est un Google Drive pour le code, mais avec tout l'historique des versions.",
      keyPoint: "`git push` envoie, `git pull` récupère ; GitHub/GitLab hébergent les dépôts.",
    },
    {
      title: "La Pull Request",
      summary:
        "Avant de fusionner une branche dans `main`, on ouvre une Pull Request (ou Merge Request) : les collègues relisent, commentent, et des tests automatiques se lancent. Règle d'or : ne jamais mettre de mot de passe dans Git.",
      analogy: "C'est demander à un collègue de relire ton courrier important avant de l'envoyer.",
      keyPoint: "Une Pull Request fait relire et tester une branche avant de la fusionner.",
    },
  ],
  challenges: [
    {
      kind: "choice",
      prompt: "À quoi sert Git ?",
      options: ["À héberger un site web", "À garder l'historique des versions du code et collaborer", "À compiler du code", "À protéger un réseau"],
      correctIndex: 1,
      explanation: "Git est un système de gestion de versions : il garde chaque version et facilite le travail en équipe.",
    },
    {
      kind: "command",
      prompt: "Tes fichiers sont déjà ajoutés avec git add. Enregistre une version avec le message ajout login.",
      acceptedAnswers: ['git commit -m "ajout login"'],
      hint: 'git commit -m "ton message"',
      explanation: '`git commit -m "ajout login"` crée une nouvelle version avec ce message dans l\'historique.',
    },
    {
      kind: "command",
      prompt: "Crée une branche appelée feature et bascule dessus.",
      acceptedAnswers: ["git switch -c feature", "git checkout -b feature"],
      hint: "git switch -c suivi du nom.",
      explanation: "`git switch -c feature` (ou l'ancienne forme `git checkout -b feature`) crée la branche et t'y place.",
    },
    {
      kind: "order",
      prompt: "Remets dans l'ordre les étapes pour publier une modification.",
      steps: ["git pull (récupérer le travail des collègues)", "Modifier les fichiers", "git add", 'git commit -m "message"', "git push"],
      explanation: "On récupère d'abord les nouveautés, on modifie, on prépare (add), on enregistre (commit), puis on envoie (push).",
    },
    {
      kind: "choice",
      prompt: "Qu'est-ce qu'une Pull Request ?",
      options: [
        "Une commande pour télécharger Git",
        "Une demande de relecture avant de fusionner ses changements",
        "Un type de serveur",
        "Une sauvegarde automatique",
      ],
      correctIndex: 1,
      explanation: "La Pull Request permet la relecture par les collègues et le lancement des tests avant la fusion dans main.",
    },
  ],
};
