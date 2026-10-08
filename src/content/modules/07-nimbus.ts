import type { DevOpsModule } from "../types";

export const nimbusModule: DevOpsModule = {
  id: "nimbus",
  codename: "Opération NIMBUS",
  title: "Le cloud",
  roadmapSection: "Cloud Providers · Serverless",
  roadmapTopics: ["AWS / Azure / Google Cloud", "Paiement à l'usage", "Régions & zones", "IAM", "Serverless"],
  briefing:
    "ENTROPIA s'est réfugiée dans le cloud public. Pour la traquer, il faut comprendre comment on loue et sécurise des serveurs chez les grands fournisseurs.",
  lessons: [
    {
      title: "Le cloud, c'est quoi ?",
      summary:
        "Le cloud, c'est utiliser des ordinateurs qui appartiennent à quelqu'un d'autre (Amazon avec AWS, Microsoft avec Azure, Google Cloud), via Internet. Plus besoin d'acheter et d'entretenir ses propres serveurs.",
      analogy: "C'est louer un appartement meublé au lieu de construire ta maison : tu emménages tout de suite.",
      keyPoint: "Le cloud = louer des ressources informatiques chez AWS, Azure, Google Cloud…",
    },
    {
      title: "Payer à l'usage",
      summary:
        "Dans le cloud, on paie ce qu'on consomme, à l'heure ou à la seconde. On peut ajouter des serveurs en quelques minutes quand il y a du monde, et les retirer ensuite.",
      analogy: "C'est comme l'électricité : tu paies ce que tu consommes, pas la centrale.",
      keyPoint: "On paie à l'usage et on ajuste les ressources selon les besoins.",
    },
    {
      title: "Régions et zones",
      summary:
        "Les fournisseurs ont des datacenters partout dans le monde, regroupés en régions (ex. Paris), elles-mêmes découpées en zones indépendantes. Répartir ses serveurs sur plusieurs zones évite qu'une seule panne arrête tout.",
      analogy: "Ne pas mettre tous ses œufs dans le même panier : si un panier tombe, il reste les autres.",
      keyPoint: "Répartir sur plusieurs zones protège d'une panne de datacenter.",
    },
    {
      title: "IAM : qui a le droit de faire quoi",
      summary:
        "L'IAM gère les identités et les permissions. La règle d'or est le moindre privilège : chaque personne ou application reçoit uniquement les droits dont elle a besoin, rien de plus.",
      analogy: "Le stagiaire a un badge qui ouvre son bureau, pas la salle des coffres.",
      keyPoint: "Moindre privilège : donner seulement les droits nécessaires.",
    },
    {
      title: "Le serverless",
      summary:
        "Avec le serverless (AWS Lambda, Azure Functions…), tu fournis seulement ton code. Le fournisseur le lance quand il faut et gère tous les serveurs. Tu paies uniquement quand ton code s'exécute.",
      analogy: "C'est prendre un taxi au lieu d'acheter une voiture : pas d'entretien, tu paies le trajet.",
      keyPoint: "Serverless : on fournit le code, le fournisseur gère les serveurs.",
    },
  ],
  challenges: [
    {
      kind: "choice",
      prompt: "AWS, Azure et Google Cloud sont…",
      options: ["Des langages de programmation", "Des fournisseurs de cloud", "Des systèmes d'exploitation", "Des antivirus"],
      correctIndex: 1,
      explanation: "Ce sont les trois plus grands fournisseurs de cloud au monde.",
    },
    {
      kind: "choice",
      prompt: "Quel est le principal avantage du cloud ?",
      options: [
        "C'est toujours gratuit",
        "On paie à l'usage et on peut ajouter des ressources en quelques minutes",
        "Il n'y a plus besoin d'Internet",
        "On n'a plus jamais de panne",
      ],
      correctIndex: 1,
      explanation: "Souplesse et paiement à l'usage. Attention : les pannes existent toujours, il faut s'y préparer.",
    },
    {
      kind: "choice",
      prompt: "Comment éviter que ton site tombe si un datacenter entier tombe en panne ?",
      options: ["Acheter un plus gros serveur", "Répartir les serveurs sur plusieurs zones", "Changer de mot de passe", "Redémarrer plus souvent"],
      correctIndex: 1,
      explanation: "Plusieurs zones indépendantes = si l'une tombe, les autres prennent le relais.",
    },
    {
      kind: "choice",
      prompt: "Une application doit seulement lire des fichiers. Quels droits lui donner ?",
      options: ["Administrateur complet, c'est plus simple", "Uniquement la lecture de ces fichiers", "Aucun droit", "Les mêmes que le patron"],
      correctIndex: 1,
      explanation: "Moindre privilège : si l'application est piratée, l'attaquant ne pourra pas faire plus que lire.",
    },
    {
      kind: "choice",
      prompt: "Avec le serverless…",
      options: [
        "Il n'y a aucun ordinateur nulle part",
        "Tu fournis ton code et le fournisseur gère les serveurs",
        "Tu dois installer Linux toi-même",
        "Ton code tourne en permanence, même sans visiteurs",
      ],
      correctIndex: 1,
      explanation: "Les serveurs existent, mais ce n'est plus ton problème : tu paies seulement l'exécution du code.",
    },
  ],
};
