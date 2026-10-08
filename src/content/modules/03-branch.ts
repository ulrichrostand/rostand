import type { DevOpsModule } from "../types";

export const branchModule: DevOpsModule = {
  id: "branch",
  codename: "Opération BRANCH",
  title: "Git & hébergement de code",
  roadmapSection: "Version Control Systems · VCS Hosting",
  roadmapTopics: ["Git", "GitHub", "GitLab", "Bitbucket"],
  briefing:
    "ENTROPIA a corrompu l'historique du dépôt central. Tout ce qui est déployé doit être versionné : code, infrastructure, configuration. Reprends le contrôle de l'historique Git.",
  challenges: [
    {
      kind: "command",
      prompt: "Crée une nouvelle branche `feature/login` et bascule dessus en une seule commande.",
      acceptedAnswers: ["git switch -c feature/login", "git checkout -b feature/login"],
      hint: "git switch avec l'option de création... ou l'ancienne syntaxe checkout.",
      explanation:
        "`git switch -c` (moderne) ou `git checkout -b` (historique) crée et active la branche. Une branche par fonctionnalité, fusionnée via Pull/Merge Request après revue.",
    },
    {
      kind: "order",
      prompt: "Remets dans l'ordre le cycle pour publier une modification.",
      steps: ["git pull (récupérer les derniers changements)", "Modifier les fichiers", "git add", "git commit -m \"message\"", "git push"],
      explanation:
        "Working directory → staging area (`add`) → historique local (`commit`) → dépôt distant (`push`). Commencer par `pull` limite les conflits.",
    },
    {
      kind: "choice",
      prompt: "Différence entre `git merge` et `git rebase` ?",
      options: [
        "Aucune, ce sont des alias",
        "`merge` crée un commit de fusion ; `rebase` réécrit les commits au-dessus de la branche cible pour un historique linéaire",
        "`rebase` supprime la branche",
        "`merge` ne fonctionne qu'en local",
      ],
      correctIndex: 1,
      explanation:
        "`rebase` réécrit l'historique : ne jamais rebaser une branche partagée déjà poussée. `merge` préserve l'historique réel. Beaucoup d'équipes rebasent leur branche locale puis fusionnent via PR.",
    },
    {
      kind: "choice",
      prompt: "Un mot de passe a été commité par erreur. Quelle est la PREMIÈRE action ?",
      options: [
        "Faire un nouveau commit qui supprime le fichier",
        "Révoquer / faire tourner le secret immédiatement",
        "Supprimer la branche",
        "Rien, le dépôt est privé",
      ],
      correctIndex: 1,
      explanation:
        "Un secret poussé est compromis : il reste dans l'historique et dans tous les clones. On le révoque d'abord, puis on nettoie (`git filter-repo`) et on prévient avec des scanners (gitleaks, secret scanning GitHub) et un `.gitignore` correct.",
    },
    {
      kind: "choice",
      prompt: "Sur GitHub, quel mécanisme empêche de pousser directement sur `main` sans revue ni CI verte ?",
      options: ["Les Issues", "Les règles de protection de branche (branch protection / rulesets)", "Les Releases", "Le Wiki"],
      correctIndex: 1,
      explanation:
        "Branch protection / rulesets : PR obligatoire, approbations, status checks verts, historique linéaire. GitLab propose les « protected branches », Bitbucket les « branch permissions ».",
    },
  ],
  recap: [
    "Git = VCS distribué : working dir → staging (`add`) → commit → `push` vers le remote.",
    "Branches courtes par fonctionnalité, fusionnées via Pull/Merge Request avec revue.",
    "`rebase` réécrit l'historique : jamais sur une branche partagée.",
    "Un secret commité doit être révoqué immédiatement ; prévenir avec gitleaks / secret scanning.",
    "GitHub, GitLab, Bitbucket : hébergement + revue de code + CI intégrée + protection de branches.",
    "Tout est versionné en DevOps : code, IaC, configuration, pipelines.",
  ],
};
