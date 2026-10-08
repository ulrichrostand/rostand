import type { DevOpsModule } from "../types";

export const puppeteerModule: DevOpsModule = {
  id: "puppeteer",
  codename: "Opération PUPPETEER",
  title: "Configurer des serveurs en masse (Ansible)",
  roadmapSection: "Configuration Management",
  roadmapTopics: ["Gestion de configuration", "Ansible", "Inventaire", "Playbook", "Idempotence"],
  briefing:
    "ENTROPIA a déréglé des centaines de serveurs. Impossible de les réparer un par un : il faut un chef d'orchestre.",
  lessons: [
    {
      title: "Configurer 100 serveurs",
      summary:
        "Installer et régler un serveur à la main prend du temps ; en régler cent est impossible sans erreur. Un outil de gestion de configuration applique automatiquement les mêmes réglages partout.",
      analogy: "Un chef d'orchestre dirige tous les musiciens en même temps au lieu de passer voir chacun.",
      keyPoint: "La gestion de configuration règle automatiquement beaucoup de serveurs à l'identique.",
    },
    {
      title: "Ansible",
      summary:
        "Ansible est l'outil le plus simple pour débuter. Il se connecte aux serveurs en SSH, sans rien installer dessus, et applique ce que tu as décrit dans des fichiers YAML (un format texte lisible).",
      analogy: "Il passe par la porte d'entrée habituelle (SSH) au lieu de demander qu'on installe une porte spéciale.",
      keyPoint: "Ansible passe par SSH, sans agent à installer, et se décrit en YAML.",
    },
    {
      title: "L'inventaire",
      summary: "L'inventaire est la liste des serveurs que gère Ansible, souvent regroupés : les serveurs web, les bases de données…",
      analogy: "C'est le carnet d'adresses des serveurs.",
      keyPoint: "L'inventaire liste les serveurs à gérer.",
    },
    {
      title: "Le playbook",
      summary:
        "Un playbook est un fichier YAML qui liste des tâches : installer nginx, copier un fichier, démarrer un service. On le lance avec `ansible-playbook -i inventaire playbook.yml`.",
      analogy: "C'est la partition que le chef d'orchestre fait jouer à tous les musiciens.",
      example: { code: "ansible-playbook -i inventory.ini site.yml", meaning: "Applique le playbook site.yml aux serveurs de l'inventaire." },
      keyPoint: "Un playbook YAML liste les tâches ; `ansible-playbook -i inventaire fichier.yml` le lance.",
    },
    {
      title: "L'idempotence",
      summary:
        "Une tâche idempotente vérifie avant d'agir : si nginx est déjà installé, elle ne fait rien. On peut donc relancer un playbook autant de fois qu'on veut sans rien casser.",
      analogy: "Un bouton « allumer » (et pas « basculer ») : appuyer deux fois laisse la lumière allumée.",
      keyPoint: "Idempotent : relancer donne le même résultat, sans effet indésirable.",
    },
  ],
  challenges: [
    {
      kind: "choice",
      prompt: "Pourquoi utiliser un outil comme Ansible ?",
      options: [
        "Pour dessiner l'architecture",
        "Pour configurer automatiquement beaucoup de serveurs de la même façon",
        "Pour écrire des pages web",
        "Pour héberger des vidéos",
      ],
      correctIndex: 1,
      explanation: "Automatiser la configuration évite les oublis et les différences entre serveurs.",
    },
    {
      kind: "choice",
      prompt: "Comment Ansible se connecte-t-il aux serveurs ?",
      options: ["Par SSH, sans agent à installer", "Par clé USB", "Par e-mail", "Par Bluetooth"],
      correctIndex: 0,
      explanation: "Ansible utilise SSH, déjà présent sur les serveurs Linux : rien à installer.",
    },
    {
      kind: "choice",
      prompt: "Qu'est-ce que l'inventaire Ansible ?",
      options: ["La liste des serveurs à gérer", "La liste des mots de passe", "Un journal d'erreurs", "Le code de l'application"],
      correctIndex: 0,
      explanation: "L'inventaire indique à Ansible sur quels serveurs travailler.",
    },
    {
      kind: "command",
      prompt: "Lance le playbook site.yml sur les serveurs de l'inventaire inventory.ini.",
      acceptedAnswers: ["ansible-playbook -i inventory.ini site.yml", "ansible-playbook site.yml -i inventory.ini"],
      hint: "ansible-playbook -i <inventaire> <playbook>",
      explanation: "`ansible-playbook -i inventory.ini site.yml` applique les tâches du playbook à chaque serveur listé.",
    },
    {
      kind: "choice",
      prompt: "Un playbook est idempotent. Que se passe-t-il si tu le relances ?",
      options: ["Il casse tout", "Il ne refait que ce qui manque, le résultat reste le même", "Il installe tout en double", "Il supprime les serveurs"],
      correctIndex: 1,
      explanation: "L'idempotence rend l'automatisation sûre : on peut relancer sans crainte.",
    },
  ],
};
