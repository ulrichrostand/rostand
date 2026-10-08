import type { DevOpsModule } from "../types";

export const containerModule: DevOpsModule = {
  id: "container",
  codename: "Opération CONTAINER",
  title: "Les conteneurs avec Docker",
  roadmapSection: "Containers",
  roadmapTopics: ["Conteneur", "Image", "Dockerfile", "docker ps / stop", "Ports"],
  briefing:
    "Les sentinelles de ce secteur tournent dans des conteneurs Docker. Nouveau gadget : tu peux les arrêter avec `docker stop` suivi de leur nom (touche Q).",
  lessons: [
    {
      title: "Le problème « ça marche sur ma machine »",
      summary:
        "Une application a besoin de plein de choses pour fonctionner : une version précise d'un langage, des bibliothèques, des réglages. Un conteneur emballe l'application AVEC tout ça, pour qu'elle tourne pareil partout.",
      analogy: "C'est un conteneur maritime : peu importe le bateau ou le camion, ce qu'il y a dedans arrive intact.",
      keyPoint: "Un conteneur emballe une application avec tout ce dont elle a besoin.",
    },
    {
      title: "Image et conteneur",
      summary:
        "Une image est le modèle figé (l'application + ses dépendances). Un conteneur est une image en train de tourner. On peut lancer plusieurs conteneurs à partir de la même image.",
      analogy: "L'image est le moule à gâteau, le conteneur est le gâteau. Un moule, autant de gâteaux que tu veux.",
      example: { code: "docker run nginx", meaning: "Lance un conteneur à partir de l'image nginx." },
      keyPoint: "Image = modèle ; conteneur = image en cours d'exécution.",
    },
    {
      title: "Lister et arrêter (ton nouveau gadget)",
      summary:
        "`docker ps` liste les conteneurs qui tournent, avec leur nom. `docker stop nom` arrête proprement un conteneur. C'est exactement ce que tu utiliseras contre les sentinelles !",
      analogy: "`docker ps`, c'est la liste des machines allumées dans l'atelier ; `docker stop`, c'est l'interrupteur.",
      example: { code: "docker stop web", meaning: "Arrête le conteneur nommé web." },
      keyPoint: "`docker ps` liste les conteneurs ; `docker stop <nom>` en arrête un.",
    },
    {
      title: "Ports et données",
      summary:
        "Un conteneur est isolé : pour y accéder, on relie un port de la machine à un port du conteneur avec `-p 8080:80`. Et ses fichiers disparaissent quand on le supprime, sauf si on utilise un volume.",
      analogy: "`-p` perce une fenêtre dans la boîte ; le volume est un casier extérieur où ranger ce qu'on veut garder.",
      example: { code: "docker run -d -p 8080:80 nginx", meaning: "Lance nginx en arrière-plan, accessible sur le port 8080." },
      keyPoint: "`-p hôte:conteneur` ouvre un port ; un volume conserve les données.",
    },
    {
      title: "Le Dockerfile",
      summary:
        "Le Dockerfile est la recette d'une image : on part d'une base (`FROM`), on copie le code (`COPY`), on installe (`RUN`) et on indique la commande de démarrage (`CMD`). `docker build` fabrique l'image.",
      analogy: "C'est la fiche recette que n'importe quel cuisinier peut suivre pour obtenir exactement le même plat.",
      example: { code: "docker build -t monapp .", meaning: "Construit une image nommée monapp à partir du Dockerfile du dossier." },
      keyPoint: "Le Dockerfile décrit l'image ; `docker build` la construit.",
    },
  ],
  challenges: [
    {
      kind: "choice",
      prompt: "Qu'est-ce qu'un conteneur ?",
      options: [
        "Un ordinateur physique",
        "Une boîte isolée qui contient une application et tout ce dont elle a besoin",
        "Un dossier de sauvegarde",
        "Un câble réseau",
      ],
      correctIndex: 1,
      explanation: "Le conteneur garantit que l'application tourne de la même façon sur ton PC, en test et en production.",
    },
    {
      kind: "choice",
      prompt: "Quelle est la différence entre une image et un conteneur ?",
      options: [
        "Aucune",
        "L'image est le modèle, le conteneur est l'image en train de tourner",
        "Le conteneur est plus ancien que l'image",
        "L'image ne fonctionne que sous Windows",
      ],
      correctIndex: 1,
      explanation: "Le moule (image) et le gâteau (conteneur) : on lance autant de conteneurs qu'on veut depuis une image.",
    },
    {
      kind: "command",
      prompt: "Liste les conteneurs en cours d'exécution.",
      acceptedAnswers: ["docker ps", "docker container ls", "docker container ps"],
      hint: "docker suivi de deux lettres (comme la commande Linux pour les processus).",
      explanation: "`docker ps` affiche les conteneurs actifs avec leur nom, leur image et leurs ports.",
    },
    {
      kind: "command",
      prompt: "Lance l'image nginx en arrière-plan, accessible sur le port 8080 de la machine (le conteneur écoute sur le port 80).",
      acceptedAnswers: [
        "docker run -d -p 8080:80 nginx",
        "docker run -p 8080:80 -d nginx",
        "docker run -p 8080:80 nginx",
        "docker run --detach -p 8080:80 nginx",
        "docker run -d --publish 8080:80 nginx",
      ],
      hint: "Relis le dossier « Ports et données » : docker run -d -p HÔTE:CONTENEUR image",
      explanation: "`-p 8080:80` relie le port 8080 de la machine au port 80 du conteneur ; `-d` lance en arrière-plan.",
    },
    {
      kind: "order",
      prompt: "Remets dans l'ordre les étapes pour faire tourner ton application dans Docker.",
      steps: ["Écrire le Dockerfile", "Construire l'image (docker build)", "Lancer un conteneur (docker run)", "Vérifier qu'il tourne (docker ps)"],
      explanation: "Recette → image → conteneur → vérification.",
    },
  ],
};
