import type { DevOpsModule } from "../types";

export const shellModule: DevOpsModule = {
  id: "shell",
  codename: "Opération SHELL",
  title: "Les bases du terminal",
  roadmapSection: "Terminal Knowledge",
  roadmapTopics: ["Se déplacer (cd, pwd)", "Lire un fichier", "grep", "Permissions", "Scripts Bash"],
  briefing:
    "Les consoles du secteur B n'ont aucune interface graphique : uniquement un terminal. Apprends à te déplacer, à lire les journaux et à lancer tes propres scripts.",
  lessons: [
    {
      title: "Se déplacer dans les dossiers",
      summary:
        "`pwd` affiche le dossier où tu te trouves. `cd nom-du-dossier` entre dans un dossier, et `cd ..` remonte d'un niveau (les deux points désignent le dossier parent).",
      analogy: "C'est comme naviguer dans un immeuble : `pwd` te dit à quel étage tu es, `cd` prend l'escalier, `..` redescend d'un étage.",
      example: { code: "cd ..", meaning: "Remonte au dossier parent." },
      keyPoint: "`pwd` = où suis-je ; `cd dossier` = entrer ; `cd ..` = remonter.",
    },
    {
      title: "Lire un fichier",
      summary:
        "`cat fichier` affiche tout le contenu d'un fichier. Pour les journaux (logs) qui grossissent en permanence, `tail -f fichier` affiche les dernières lignes et continue d'afficher les nouvelles en direct.",
      analogy: "`cat` lit le livre en entier ; `tail -f` regarde quelqu'un écrire en direct par-dessus son épaule.",
      example: { code: "tail -f /var/log/syslog", meaning: "Suit en direct le journal du système." },
      keyPoint: "`cat` affiche un fichier ; `tail -f` suit un journal en temps réel.",
    },
    {
      title: "Chercher avec grep",
      summary:
        "`grep MOT fichier` n'affiche que les lignes qui contiennent MOT. Indispensable pour retrouver une erreur dans un journal de milliers de lignes.",
      analogy: "C'est le Ctrl+F du terminal.",
      example: { code: "grep ERROR app.log", meaning: "Affiche uniquement les lignes contenant ERROR dans app.log." },
      keyPoint: "`grep MOT fichier` filtre les lignes contenant un mot.",
    },
    {
      title: "Les permissions",
      summary:
        "Chaque fichier a des droits : lecture (r), écriture (w) et exécution (x). Un script doit avoir le droit d'exécution pour être lancé. `chmod +x fichier` ajoute ce droit.",
      analogy: "Ce sont des badges d'accès : certains peuvent seulement regarder, d'autres modifier, d'autres actionner la machine.",
      example: { code: "chmod +x deploy.sh", meaning: "Rend le script deploy.sh exécutable." },
      keyPoint: "Droits r/w/x ; `chmod +x fichier` rend un script exécutable.",
    },
    {
      title: "Les scripts Bash",
      summary:
        "Un script Bash est un fichier texte qui contient des commandes, exécutées l'une après l'autre. Il commence par `#!/bin/bash`. Une fois exécutable, on le lance avec `./nom-du-script.sh`.",
      analogy: "C'est une recette écrite : au lieu de dicter chaque étape, tu donnes la fiche et elle est suivie à la lettre.",
      example: { code: "./deploy.sh", meaning: "Lance le script deploy.sh situé dans le dossier courant." },
      keyPoint: "Un script Bash enchaîne des commandes ; on le lance avec ./script.sh.",
    },
  ],
  challenges: [
    {
      kind: "command",
      prompt: "Tu es dans /var/log/nginx. Remonte au dossier parent.",
      acceptedAnswers: ["cd .."],
      hint: "cd suivi de deux points.",
      explanation: "`cd ..` remonte d'un niveau : tu passes de /var/log/nginx à /var/log.",
    },
    {
      kind: "choice",
      prompt: "Tu veux voir en direct les nouvelles lignes qui s'ajoutent à un journal. Quelle commande ?",
      options: ["cat app.log", "tail -f app.log", "ls app.log", "cd app.log"],
      correctIndex: 1,
      explanation: "`tail -f` (f pour follow, suivre) affiche les nouvelles lignes au fur et à mesure.",
    },
    {
      kind: "command",
      prompt: "Affiche uniquement les lignes contenant ERROR dans le fichier app.log.",
      acceptedAnswers: ["grep ERROR app.log", 'grep "ERROR" app.log'],
      hint: "grep MOT fichier",
      explanation: "`grep ERROR app.log` filtre le fichier et ne garde que les lignes avec ERROR.",
    },
    {
      kind: "command",
      prompt: "Le script deploy.sh refuse de se lancer (« Permission denied »). Rends-le exécutable.",
      acceptedAnswers: ["chmod +x deploy.sh", "chmod u+x deploy.sh", "chmod 755 deploy.sh", "chmod 700 deploy.sh"],
      hint: "chmod +x suivi du nom du fichier.",
      explanation: "« Permission denied » signifie qu'il manque le droit d'exécution. `chmod +x` l'ajoute.",
    },
    {
      kind: "order",
      prompt: "Remets dans l'ordre les étapes pour créer et lancer ton premier script.",
      steps: [
        "Créer le fichier deploy.sh",
        "Écrire les commandes dedans (en commençant par #!/bin/bash)",
        "Le rendre exécutable avec chmod +x deploy.sh",
        "Le lancer avec ./deploy.sh",
      ],
      explanation: "Créer → remplir → autoriser l'exécution → lancer. Sans l'étape chmod, le lancement échoue.",
    },
  ],
};
