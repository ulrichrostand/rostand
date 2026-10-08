import type { DevOpsModule } from "../types";

export const helmModule: DevOpsModule = {
  id: "helm",
  codename: "Opération HELM",
  title: "Kubernetes : orchestrer les conteneurs",
  roadmapSection: "Container Orchestration",
  roadmapTopics: ["Kubernetes", "Pod", "Deployment", "Service", "kubectl"],
  briefing:
    "Le cluster principal d'Helix Corp fait tourner des milliers de conteneurs. Les sentinelles sont maintenant des pods Kubernetes. Nouveau gadget : `kubectl delete pod` (touche Q).",
  lessons: [
    {
      title: "Pourquoi Kubernetes ?",
      summary:
        "Gérer 3 conteneurs à la main, ça va. En gérer des centaines sur plusieurs serveurs, non. Kubernetes (K8s) les place sur les serveurs, les redémarre s'ils plantent et en ajoute s'il y a du monde.",
      analogy: "C'est le chef de chantier qui répartit les ouvriers et remplace immédiatement ceux qui sont absents.",
      keyPoint: "Kubernetes orchestre (gère automatiquement) des conteneurs sur plusieurs serveurs.",
    },
    {
      title: "Le pod",
      summary: "Le pod est la plus petite unité de Kubernetes : il contient un conteneur (parfois plusieurs, étroitement liés).",
      analogy: "Le pod est une cosse, les conteneurs sont les petits pois dedans.",
      keyPoint: "Le pod est la plus petite unité : il contient un ou plusieurs conteneurs.",
    },
    {
      title: "Le Deployment",
      summary:
        "Un Deployment dit « je veux 3 copies de mon application ». Kubernetes surveille en permanence : si un pod meurt, il en recrée un aussitôt pour revenir à 3.",
      analogy: "C'est un thermostat : tu fixes la température voulue, il corrige tout seul les écarts.",
      keyPoint: "Un Deployment maintient le nombre de pods demandé.",
    },
    {
      title: "Le Service",
      summary:
        "Les pods naissent et meurent, leur adresse change. Un Service donne une adresse stable qui envoie le trafic vers les pods disponibles.",
      analogy: "C'est le standard téléphonique de l'entreprise : on appelle un seul numéro, il transfère vers quelqu'un de disponible.",
      keyPoint: "Un Service offre une adresse stable vers un groupe de pods.",
    },
    {
      title: "kubectl, la télécommande (ton nouveau gadget)",
      summary:
        "`kubectl` est l'outil en ligne de commande de Kubernetes. `kubectl get pods` liste les pods, `kubectl logs nom` affiche leurs journaux, `kubectl delete pod nom` supprime un pod.",
      analogy: "C'est la télécommande universelle du cluster.",
      example: { code: "kubectl get pods", meaning: "Liste les pods et leur état." },
      keyPoint: "`kubectl get pods` liste les pods ; `kubectl delete pod <nom>` en supprime un.",
    },
  ],
  challenges: [
    {
      kind: "choice",
      prompt: "À quoi sert Kubernetes ?",
      options: ["À écrire du code", "À gérer automatiquement des conteneurs sur plusieurs serveurs", "À envoyer des e-mails", "À remplacer Git"],
      correctIndex: 1,
      explanation: "Kubernetes place, surveille, redémarre et multiplie les conteneurs automatiquement.",
    },
    {
      kind: "choice",
      prompt: "Quelle est la plus petite unité dans Kubernetes ?",
      options: ["Le serveur", "Le pod", "Le cluster", "Le Service"],
      correctIndex: 1,
      explanation: "Le pod contient un ou plusieurs conteneurs. On ne lance jamais un conteneur « nu » dans K8s.",
    },
    {
      kind: "choice",
      prompt: "Ton Deployment demande 3 pods. L'un d'eux plante. Que fait Kubernetes ?",
      options: ["Rien", "Il en recrée un automatiquement", "Il arrête les deux autres", "Il t'envoie un SMS et attend"],
      correctIndex: 1,
      explanation: "Le Deployment ramène toujours le nombre de pods à celui demandé : c'est l'auto-réparation.",
    },
    {
      kind: "choice",
      prompt: "À quoi sert un Service Kubernetes ?",
      options: ["À stocker des fichiers", "À donner une adresse stable pour joindre un groupe de pods", "À compiler le code", "À créer des utilisateurs"],
      correctIndex: 1,
      explanation: "Les pods changent d'adresse en permanence ; le Service reste fixe.",
    },
    {
      kind: "command",
      prompt: "Liste les pods du cluster.",
      acceptedAnswers: ["kubectl get pods", "kubectl get pod", "kubectl get po"],
      hint: "kubectl get …",
      explanation: "`kubectl get pods` affiche chaque pod avec son état (Running, CrashLoopBackOff…).",
    },
  ],
};
