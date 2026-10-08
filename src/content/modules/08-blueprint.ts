import type { DevOpsModule } from "../types";

export const blueprintModule: DevOpsModule = {
  id: "blueprint",
  codename: "Opération BLUEPRINT",
  title: "L'infrastructure en code (Terraform)",
  roadmapSection: "Provisioning",
  roadmapTopics: ["Infrastructure as Code", "Terraform", "init / plan / apply", "State", "Drift"],
  briefing:
    "Les plans de l'infrastructure ont été volés. Reconstruis-la proprement : décrite dans des fichiers, reproductible à l'identique.",
  lessons: [
    {
      title: "L'infrastructure as Code (IaC)",
      summary:
        "Au lieu de créer serveurs et réseaux en cliquant dans une console, on les décrit dans des fichiers texte. On peut alors les recréer à l'identique, les versionner dans Git et les faire relire.",
      analogy: "C'est un plan d'architecte : avec le même plan, on construit exactement la même maison autant de fois qu'on veut.",
      keyPoint: "IaC : l'infrastructure est décrite dans des fichiers de code.",
    },
    {
      title: "Terraform",
      summary:
        "Terraform est l'outil d'IaC le plus répandu. Dans des fichiers `.tf`, tu décris ce que tu veux obtenir (« 2 serveurs, 1 base de données »), et Terraform se charge de le créer chez le fournisseur cloud.",
      analogy: "Tu donnes la liste de ce que tu veux au traiteur, il s'occupe de tout préparer.",
      keyPoint: "Terraform crée l'infrastructure décrite dans des fichiers .tf.",
    },
    {
      title: "init, plan, apply",
      summary:
        "Trois commandes à connaître : `terraform init` prépare le projet, `terraform plan` montre ce qui VA changer sans rien toucher, `terraform apply` applique les changements.",
      analogy: "Vérifier le panier avant de payer : `plan` affiche le panier, `apply` passe à la caisse.",
      example: { code: "terraform plan", meaning: "Affiche les changements prévus, sans rien modifier." },
      keyPoint: "terraform init → plan (aperçu) → apply (application).",
    },
    {
      title: "Le state",
      summary:
        "Terraform garde un fichier d'état (state) qui liste tout ce qu'il a créé. C'est ainsi qu'il sait ce qui existe déjà et ce qu'il doit modifier.",
      analogy: "C'est l'inventaire du magasin : sans lui, impossible de savoir ce qui est déjà en rayon.",
      keyPoint: "Le state mémorise ce que Terraform a créé.",
    },
    {
      title: "Ne jamais modifier à la main",
      summary:
        "Si quelqu'un modifie un serveur directement dans la console, le code ne correspond plus à la réalité : c'est la dérive (drift). Règle : toute modification passe par le code et la relecture.",
      analogy: "Si un ouvrier déplace un mur sans changer le plan, la prochaine construction sera fausse.",
      keyPoint: "Modifier à la main crée une dérive (drift) : tout passe par le code.",
    },
  ],
  challenges: [
    {
      kind: "choice",
      prompt: "L'infrastructure as Code, c'est…",
      options: ["Écrire une application web", "Décrire serveurs et réseaux dans des fichiers de code", "Programmer un robot", "Installer Windows"],
      correctIndex: 1,
      explanation: "L'infrastructure devient reproductible, versionnée et relue comme du code.",
    },
    {
      kind: "choice",
      prompt: "Avec Terraform, que décris-tu dans tes fichiers .tf ?",
      options: [
        "Ce que tu veux obtenir (serveurs, réseaux…), et Terraform le crée",
        "Les couleurs de ton site web",
        "La liste des bugs à corriger",
        "Les e-mails à envoyer aux clients",
      ],
      correctIndex: 0,
      explanation: "Terraform est déclaratif : tu décris le résultat voulu, il calcule et réalise les étapes pour y arriver.",
    },
    {
      kind: "command",
      prompt: "Affiche ce que Terraform va changer, sans rien modifier.",
      acceptedAnswers: ["terraform plan"],
      hint: "terraform suivi du mot qui veut dire « planifier ».",
      explanation: "`terraform plan` est un aperçu sans risque. Ordre habituel : `init`, puis `plan`, puis `apply`.",
    },
    {
      kind: "choice",
      prompt: "À quoi sert le fichier state de Terraform ?",
      options: ["À stocker le code de l'application", "À mémoriser ce que Terraform a créé", "À chiffrer le réseau", "À envoyer des e-mails"],
      correctIndex: 1,
      explanation: "Le state est l'inventaire de Terraform : il compare ce qui existe avec ce que décrit le code.",
    },
    {
      kind: "choice",
      prompt: "Un collègue modifie un serveur directement dans la console du cloud. Quel est le problème ?",
      options: ["Aucun problème", "Le code ne correspond plus à la réalité (dérive)", "Le serveur devient plus rapide", "Terraform sera supprimé"],
      correctIndex: 1,
      explanation: "La dérive rend l'infrastructure imprévisible. Toute modification doit passer par le code.",
    },
  ],
};
