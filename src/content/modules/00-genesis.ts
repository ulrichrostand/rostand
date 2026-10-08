import type { DevOpsModule } from "../types";

export const genesisModule: DevOpsModule = {
  id: "genesis",
  codename: "Opération GENESIS",
  title: "Bienvenue dans le DevOps",
  roadmapSection: "Introduction",
  roadmapTopics: ["Serveur", "Dev & Ops", "Terminal", "Automatisation", "Cycle de livraison"],
  briefing:
    "Mission d'entraînement, Spectre. Avant d'affronter ENTROPIA, tu dois comprendre ce qu'est le DevOps. Ramasse les dossiers jaunes : chacun t'explique une notion simplement. Ensuite, pirate les terminaux pour vérifier que tu as compris. Approche les sentinelles par derrière pour les neutraliser.",
  lessons: [
    {
      title: "C'est quoi, un serveur ?",
      summary:
        "Un serveur est un ordinateur qui rend un service aux autres, en continu, 24 h/24. Quand tu ouvres un site web, ton téléphone demande la page à un serveur, qui la lui renvoie.",
      analogy:
        "Un serveur, c'est comme la cuisine d'un restaurant : les clients (ton navigateur) passent commande, la cuisine (le serveur) prépare et renvoie le plat (la page web).",
      keyPoint: "Un serveur est un ordinateur qui fournit un service (site web, base de données…) en continu.",
    },
    {
      title: "Dev + Ops = DevOps",
      summary:
        "Les « Dev » (développeurs) écrivent le code. Les « Ops » (opérations) le font tourner sur les serveurs. Avant, ces deux équipes travaillaient chacune de leur côté et se renvoyaient la faute. Le DevOps, c'est une façon de travailler ensemble et d'automatiser pour livrer plus vite et plus sûrement.",
      analogy:
        "Imagine des cuisiniers et des serveurs de salle qui ne se parlent jamais : les plats arrivent froids. Le DevOps, c'est les faire travailler en équipe, avec des outils qui fluidifient tout.",
      keyPoint: "Le DevOps est une culture de collaboration entre développement et opérations, appuyée par l'automatisation.",
    },
    {
      title: "Le terminal",
      summary:
        "Le terminal est une fenêtre où l'on tape des commandes au lieu de cliquer. Les serveurs n'ont souvent pas d'écran ni de souris : on les pilote avec des commandes. La commande `echo` affiche simplement un texte.",
      analogy: "Cliquer, c'est montrer du doigt dans un menu. Le terminal, c'est parler directement à l'ordinateur avec des phrases précises.",
      example: { code: 'echo "Bonjour"', meaning: "Affiche le mot Bonjour à l'écran." },
      keyPoint: "Le terminal permet de piloter un ordinateur (et surtout un serveur) en tapant des commandes.",
    },
    {
      title: "Automatiser",
      summary:
        "Une tâche répétée à la main finit toujours par être oubliée ou mal faite. Le réflexe DevOps : écrire un script (une liste de commandes) qui la fait automatiquement, toujours de la même façon.",
      analogy: "Plutôt que de préparer ton café à la main chaque matin, tu programmes la cafetière : même résultat, sans effort, sans oubli.",
      keyPoint: "Si une tâche se répète, on l'automatise avec un script ou un outil.",
    },
    {
      title: "Livrer souvent, par petits morceaux",
      summary:
        "Une nouvelle fonctionnalité suit toujours le même cycle : on planifie, on code, on teste, on déploie (on la met en ligne) puis on surveille que tout va bien. En DevOps, on répète ce cycle très souvent, avec de petits changements faciles à vérifier.",
      analogy: "Mieux vaut livrer des pizzas une par une, chaudes, qu'un énorme banquet une fois par an où tout peut rater d'un coup.",
      keyPoint: "Cycle DevOps : planifier → coder → tester → déployer → surveiller, en petites étapes fréquentes.",
    },
  ],
  challenges: [
    {
      kind: "choice",
      prompt: "Qu'est-ce qu'un serveur ?",
      options: [
        "Un ordinateur qui fournit un service (comme un site web) en continu",
        "Un câble qui relie deux ordinateurs",
        "Un logiciel pour dessiner",
        "Un mot de passe administrateur",
      ],
      correctIndex: 0,
      explanation: "Un serveur rend un service aux autres machines, jour et nuit. Les sites, les applis et les jeux en ligne tournent sur des serveurs.",
    },
    {
      kind: "choice",
      prompt: "Le DevOps, c'est avant tout…",
      options: [
        "Un langage de programmation",
        "Une façon de faire travailler ensemble développeurs et opérations, avec de l'automatisation",
        "Une marque d'ordinateur",
        "Un antivirus",
      ],
      correctIndex: 1,
      explanation: "Le DevOps n'est pas un outil mais une façon de travailler : collaboration + automatisation, pour livrer vite et sans casse.",
    },
    {
      kind: "command",
      prompt: "À toi de jouer : tape la commande qui affiche le mot Bonjour.",
      acceptedAnswers: ['echo "Bonjour"', "echo Bonjour"],
      hint: "Relis le dossier « Le terminal » : la commande commence par echo.",
      explanation: "`echo` affiche le texte qu'on lui donne. C'est la commande la plus simple, très utilisée dans les scripts pour afficher des messages.",
    },
    {
      kind: "choice",
      prompt: "Tous les matins, tu redémarres un service à la main en tapant les mêmes 5 commandes. Quel est le réflexe DevOps ?",
      options: ["Continuer, c'est plus sûr", "Écrire un script qui le fait automatiquement", "Demander à quelqu'un d'autre de le faire", "Ne plus redémarrer le service"],
      correctIndex: 1,
      explanation: "Une tâche répétitive = une tâche à automatiser. Le script fait toujours exactement la même chose, sans oubli ni faute de frappe.",
    },
    {
      kind: "order",
      prompt: "Remets dans l'ordre le cycle de vie d'une nouvelle fonctionnalité.",
      steps: ["Planifier", "Coder", "Tester", "Déployer (mettre en ligne)", "Surveiller"],
      explanation: "Ce cycle se répète en boucle. Le DevOps cherche à le rendre rapide et fiable grâce à l'automatisation.",
    },
  ],
};
