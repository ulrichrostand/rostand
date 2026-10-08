import type { DevOpsModule } from "../types";

export const pipelineModule: DevOpsModule = {
  id: "pipeline",
  codename: "Opération PIPELINE",
  title: "CI/CD : livrer automatiquement",
  roadmapSection: "CI / CD Tools · Artifact Management",
  roadmapTopics: ["Intégration continue", "Déploiement continu", "Pipeline", "GitHub Actions", "Artefacts"],
  briefing:
    "La chaîne de livraison d'Helix Corp a été sabotée : du code jamais testé part en production. Reconstruis une chaîne automatique et fiable.",
  lessons: [
    {
      title: "L'intégration continue (CI)",
      summary:
        "À chaque fois qu'un développeur envoie du code (push), un robot le récupère, le construit et lance les tests automatiquement. Une erreur est repérée en quelques minutes au lieu de plusieurs semaines.",
      analogy: "C'est un contrôle qualité automatique à la sortie de chaque poste de l'usine.",
      keyPoint: "CI : chaque modification est construite et testée automatiquement.",
    },
    {
      title: "Le déploiement continu (CD)",
      summary:
        "Si les tests passent, la nouvelle version est mise en ligne automatiquement (ou en un clic). Si un test échoue, rien n'est déployé : on corrige d'abord.",
      analogy: "Le colis ne part chez le client que s'il a passé le contrôle qualité.",
      keyPoint: "CD : si tout est vert, la version est déployée automatiquement ; sinon, rien ne part.",
    },
    {
      title: "Le pipeline",
      summary:
        "Le pipeline est la suite d'étapes automatiques : récupérer le code, construire, tester, déployer en environnement de test (staging), puis en production.",
      analogy: "C'est une chaîne de montage : chaque poste fait son travail et passe au suivant.",
      keyPoint: "Pipeline : build → tests → staging → production.",
    },
    {
      title: "GitHub Actions",
      summary:
        "GitHub Actions est l'outil de CI/CD intégré à GitHub. On décrit le pipeline dans un fichier YAML rangé dans `.github/workflows/`. D'ailleurs, ce jeu est testé et déployé avec GitHub Actions !",
      analogy: "C'est le règlement de la chaîne de montage, rangé dans le même classeur que le code.",
      keyPoint: "GitHub Actions : pipelines décrits en YAML dans .github/workflows/.",
    },
    {
      title: "Les artefacts",
      summary:
        "Un artefact est le résultat du build : une image Docker, un fichier exécutable… On le construit une seule fois, on le stocke, puis on déploie exactement le même en test et en production.",
      analogy: "On imprime une seule édition d'un livre et c'est ce même livre qu'on envoie aux relecteurs puis aux lecteurs.",
      keyPoint: "Construire l'artefact une fois, le déployer partout.",
    },
  ],
  challenges: [
    {
      kind: "choice",
      prompt: "Que fait l'intégration continue (CI) ?",
      options: ["Elle écrit le code à ta place", "Elle construit et teste automatiquement chaque modification", "Elle sauvegarde les e-mails", "Elle remplace Git"],
      correctIndex: 1,
      explanation: "La CI détecte les erreurs tôt, à chaque push.",
    },
    {
      kind: "choice",
      prompt: "Les tests échouent dans le pipeline. Que se passe-t-il ?",
      options: ["On déploie quand même", "Le déploiement est bloqué, on corrige d'abord", "On supprime les tests", "Le serveur redémarre"],
      correctIndex: 1,
      explanation: "C'est tout l'intérêt : un code qui casse les tests n'atteint jamais les utilisateurs.",
    },
    {
      kind: "order",
      prompt: "Remets dans l'ordre les étapes d'un pipeline.",
      steps: ["Push du code", "Build (construction)", "Tests automatiques", "Déploiement en test (staging)", "Déploiement en production"],
      explanation: "On vérifie au plus tôt, et la production arrive en dernier, après tous les contrôles.",
    },
    {
      kind: "choice",
      prompt: "Où range-t-on les fichiers de pipeline GitHub Actions ?",
      options: ["Dans le dossier .github/workflows/", "Dans /etc/nginx", "Dans le Dockerfile", "Dans un e-mail"],
      correctIndex: 0,
      explanation: "Chaque fichier YAML de .github/workflows/ décrit un pipeline.",
    },
    {
      kind: "choice",
      prompt: "Pourquoi construire l'artefact une seule fois ?",
      options: [
        "Pour économiser de l'électricité uniquement",
        "Pour déployer exactement la même version, testée, en staging puis en production",
        "Parce que c'est interdit de reconstruire",
        "Pour aller plus lentement",
      ],
      correctIndex: 1,
      explanation: "Ce qui part en production est exactement ce qui a été testé : aucune surprise.",
    },
  ],
};
