import type { DevOpsModule } from "../types";

export const pipelineModule: DevOpsModule = {
  id: "pipeline",
  codename: "Opération PIPELINE",
  title: "CI/CD & gestion d'artefacts",
  roadmapSection: "CI / CD Tools · Artifact Management",
  roadmapTopics: ["GitHub Actions", "GitLab CI", "Jenkins", "CircleCI", "TeamCity", "Artifactory", "Nexus"],
  briefing:
    "La chaîne de livraison d'Helix Corp a été sabotée : du code non testé part en production. Reconstruis un pipeline fiable du commit jusqu'au déploiement.",
  challenges: [
    {
      kind: "order",
      prompt: "Ordonne les étapes d'un pipeline CI/CD classique.",
      steps: ["Checkout du code", "Lint & tests unitaires", "Build de l'artefact / image", "Scan de sécurité & publication dans le registre", "Déploiement en staging", "Déploiement en production"],
      explanation:
        "Échouer vite : les étapes rapides et peu coûteuses d'abord. On construit l'artefact une seule fois et on promeut le même artefact d'environnement en environnement.",
    },
    {
      kind: "choice",
      prompt: "Différence entre Continuous Delivery et Continuous Deployment ?",
      options: [
        "Aucune",
        "Delivery : chaque version est prête mais la mise en prod est déclenchée manuellement ; Deployment : la mise en prod est automatique",
        "Deployment ne fait pas de tests",
        "Delivery ne concerne que le front-end",
      ],
      correctIndex: 1,
      explanation:
        "La CI intègre et teste chaque commit. La Continuous Delivery garde le code toujours déployable (validation humaine). Le Continuous Deployment pousse automatiquement chaque changement vert en production.",
    },
    {
      kind: "choice",
      prompt: "Dans GitHub Actions, où sont décrits les workflows ?",
      options: ["`Jenkinsfile`", "`.github/workflows/*.yml`", "`.gitlab-ci.yml`", "`Dockerfile`"],
      correctIndex: 1,
      explanation:
        "GitHub Actions : `.github/workflows/*.yml`. GitLab CI : `.gitlab-ci.yml`. Jenkins : `Jenkinsfile` (Groovy). CircleCI : `.circleci/config.yml`. Le pipeline est du code versionné.",
    },
    {
      kind: "choice",
      prompt: "Pourquoi publier les artefacts dans un dépôt dédié (Artifactory, Nexus, GitHub Packages, registre d'images) ?",
      options: [
        "Pour éviter d'écrire des tests",
        "Pour avoir des versions immuables et traçables, réutilisées par tous les environnements",
        "Pour remplacer Git",
        "Pour accélérer le DNS",
      ],
      correctIndex: 1,
      explanation:
        "Build once, deploy many : un artefact versionné (ex. `api:1.4.2` ou digest `sha256`) est promu de staging à prod. Le dépôt sert aussi de proxy/cache des dépendances externes.",
    },
    {
      kind: "choice",
      prompt: "Stratégie de déploiement qui envoie d'abord 5 % du trafic sur la nouvelle version ?",
      options: ["Big bang", "Canary release", "Recreate", "Cron"],
      correctIndex: 1,
      explanation:
        "Canary : exposition progressive en surveillant les métriques. Blue/green : bascule instantanée entre deux environnements. Rolling update : remplacement progressif des instances. Les feature flags découplent déploiement et activation.",
    },
  ],
  recap: [
    "CI : chaque commit est intégré, construit et testé automatiquement.",
    "Continuous Delivery (prod manuelle) vs Continuous Deployment (prod automatique).",
    "Pipeline as code : GitHub Actions, GitLab CI, Jenkins, CircleCI, TeamCity.",
    "Build once, deploy many : artefacts immuables dans Artifactory, Nexus ou un registre.",
    "Déploiements : rolling, blue/green, canary, + feature flags et rollback rapide.",
    "Secrets de CI : jamais en clair, fédération OIDC vers le cloud.",
  ],
};
