import type { DevOpsModule } from "../types";

export const kernelModule: DevOpsModule = {
  id: "kernel",
  codename: "Opération KERNEL",
  title: "Linux, le système des serveurs",
  roadmapSection: "Learn a Programming Language · Operating System",
  roadmapTopics: ["Système d'exploitation", "Linux", "Ubuntu / Debian", "Arborescence", "Paquets", "Processus"],
  briefing:
    "ENTROPIA a pris le contrôle du sous-sol d'Helix Corp, là où tournent les serveurs. Presque tous fonctionnent sous Linux : apprends à t'y repérer. Nouveau gadget : tu peux maintenant arrêter une sentinelle à distance avec la commande `kill` (touche Q).",
  lessons: [
    {
      title: "Le système d'exploitation",
      summary:
        "Le système d'exploitation (OS) est le logiciel de base d'un ordinateur : il gère la mémoire, les fichiers et lance les programmes. Windows et macOS sont des OS. Sur les serveurs, c'est Linux qui domine : gratuit, stable et open source (son code est public).",
      analogy: "L'OS est le chef d'orchestre de l'ordinateur : il distribue le travail entre les musiciens (programmes) et les instruments (processeur, mémoire, disque).",
      keyPoint: "La grande majorité des serveurs tournent sous Linux.",
    },
    {
      title: "Les distributions Linux",
      summary:
        "Linux existe en plusieurs « distributions » : Ubuntu, Debian, Fedora, Red Hat… Elles partagent le même cœur mais diffèrent par les outils fournis. Ubuntu est la plus utilisée pour débuter.",
      analogy: "Ce sont différentes recettes du même plat : la base est identique, l'assaisonnement change.",
      keyPoint: "Ubuntu, Debian ou Red Hat sont des distributions Linux : même cœur, outils différents.",
    },
    {
      title: "Fichiers et dossiers",
      summary:
        "Sous Linux, tout part d'un dossier racine noté `/`. Quelques dossiers clés : `/home` (dossiers des utilisateurs), `/etc` (fichiers de configuration), `/var/log` (journaux). La commande `ls` liste le contenu du dossier où tu te trouves.",
      analogy: "C'est une grande armoire (/) avec des tiroirs rangés par thème : les affaires perso dans /home, les réglages dans /etc.",
      example: { code: "ls", meaning: "Liste les fichiers et dossiers du dossier courant." },
      keyPoint: "`ls` liste les fichiers ; la configuration est dans /etc et les journaux dans /var/log.",
    },
    {
      title: "Installer un logiciel",
      summary:
        "Sur Ubuntu, on installe un logiciel avec le gestionnaire de paquets `apt`. Comme installer touche au système, on préfixe la commande par `sudo`, qui donne temporairement les droits d'administrateur.",
      analogy: "`apt` est l'App Store du serveur, et `sudo` est le badge du gardien qui autorise à entrer dans la salle des machines.",
      example: { code: "sudo apt install nginx", meaning: "Télécharge et installe le logiciel nginx (un serveur web)." },
      keyPoint: "`sudo apt install <logiciel>` installe un logiciel sur Ubuntu/Debian.",
    },
    {
      title: "Les processus (et ton nouveau gadget)",
      summary:
        "Un processus est un programme en train de tourner. Chacun reçoit un numéro unique : le PID. La commande `ps` liste les processus, et `kill` suivi du PID arrête un processus. Les sentinelles d'ENTROPIA sont des processus : trouve leur PID et arrête-les !",
      analogy: "Chaque employé d'une usine porte un matricule (le PID). Pour renvoyer quelqu'un chez lui, on appelle son matricule.",
      example: { code: "kill 4242", meaning: "Demande au processus numéro 4242 de s'arrêter." },
      keyPoint: "Un processus a un numéro (PID) ; `ps` les liste et `kill <PID>` en arrête un.",
    },
  ],
  challenges: [
    {
      kind: "choice",
      prompt: "Quel système d'exploitation fait tourner la majorité des serveurs dans le monde ?",
      options: ["Windows", "Linux", "macOS", "Android"],
      correctIndex: 1,
      explanation: "Linux domine sur les serveurs et dans le cloud : il est gratuit, stable, sécurisé et très bien outillé.",
    },
    {
      kind: "choice",
      prompt: "Ubuntu, c'est…",
      options: ["Un langage de programmation", "Une distribution Linux", "Un navigateur web", "Une base de données"],
      correctIndex: 1,
      explanation: "Ubuntu est une distribution Linux, très populaire pour débuter et sur les serveurs.",
    },
    {
      kind: "command",
      prompt: "Tu viens d'arriver sur le serveur. Tape la commande qui liste les fichiers du dossier courant.",
      acceptedAnswers: ["ls", "ls -l", "ls -la", "ls -a", "ls -al", "ls -lh"],
      hint: "Deux lettres seulement, pour « list ».",
      explanation: "`ls` liste le contenu du dossier. Avec `-l` tu obtiens les détails (taille, date), avec `-a` les fichiers cachés.",
    },
    {
      kind: "command",
      prompt: "Installe le serveur web nginx sur ce serveur Ubuntu.",
      acceptedAnswers: ["apt install nginx", "apt-get install nginx", "apt install -y nginx", "apt-get install -y nginx"],
      hint: "sudo apt install … suivi du nom du logiciel.",
      explanation: "`sudo apt install nginx` installe nginx. Le `sudo` est nécessaire car installer modifie le système.",
    },
    {
      kind: "choice",
      prompt: "Comment s'appelle le numéro unique attribué à chaque processus ?",
      options: ["L'IP", "Le PID", "Le port", "Le DNS"],
      correctIndex: 1,
      explanation: "PID = Process ID. C'est ce numéro qu'on donne à `kill` pour arrêter un processus précis.",
    },
  ],
};
