import type { DevOpsModule } from "../types";

export const gatewayModule: DevOpsModule = {
  id: "gateway",
  codename: "Opération GATEWAY",
  title: "Serveurs web et répartition du trafic",
  roadmapSection: "What is and how to setup X?",
  roadmapTopics: ["Serveur web (Nginx)", "Reverse proxy", "Load balancer", "Cache", "Pare-feu"],
  briefing:
    "Toutes les visites vers Helix Corp passent par une passerelle compromise. Comprends le rôle de chaque équipement pour la remettre en ordre.",
  lessons: [
    {
      title: "Le serveur web",
      summary:
        "Un serveur web (Nginx, Apache) est le programme qui répond aux navigateurs et leur envoie les pages. Avant de recharger sa configuration, on la vérifie avec `nginx -t` pour éviter de tout casser.",
      analogy: "C'est le guichetier : tu demandes un document, il te le tend.",
      example: { code: "nginx -t", meaning: "Vérifie que la configuration de Nginx ne contient pas d'erreur." },
      keyPoint: "Nginx et Apache sont des serveurs web ; `nginx -t` vérifie la configuration.",
    },
    {
      title: "Le reverse proxy",
      summary:
        "Un reverse proxy se place devant les applications. Il reçoit toutes les visites et les dirige vers le bon service (le site, l'API…). Il gère souvent aussi le HTTPS.",
      analogy: "C'est le réceptionniste d'un hôtel : il accueille chaque visiteur et l'envoie au bon étage.",
      keyPoint: "Un reverse proxy reçoit les visites et les redirige vers le bon service.",
    },
    {
      title: "Le load balancer",
      summary:
        "Quand un seul serveur ne suffit plus, on en met plusieurs. Le load balancer (répartiteur de charge) distribue les visiteurs entre eux, et arrête d'envoyer du monde vers un serveur en panne.",
      analogy: "C'est l'employé du supermarché qui oriente les clients vers les caisses libres.",
      keyPoint: "Un load balancer répartit le trafic entre plusieurs serveurs.",
    },
    {
      title: "Le cache",
      summary:
        "Le cache garde une copie des réponses demandées souvent, pour les renvoyer instantanément sans refaire tout le travail. Résultat : un site plus rapide et des serveurs moins chargés.",
      analogy: "Le restaurant prépare à l'avance les plats les plus commandés : ils sont servis tout de suite.",
      keyPoint: "Le cache garde des copies pour répondre plus vite.",
    },
    {
      title: "Le pare-feu",
      summary:
        "Le pare-feu (firewall) bloque tout le trafic, sauf ce qu'on autorise explicitement. Pour un site web : on ouvre 80 et 443 au public, et SSH (22) seulement depuis des adresses de confiance.",
      analogy: "C'est le videur de la boîte de nuit : par défaut personne n'entre, sauf ceux qui sont sur la liste.",
      keyPoint: "Pare-feu : tout bloquer par défaut, n'ouvrir que le nécessaire.",
    },
  ],
  challenges: [
    {
      kind: "command",
      prompt: "Tu as modifié la configuration de Nginx. Vérifie qu'elle ne contient pas d'erreur avant de la recharger.",
      acceptedAnswers: ["nginx -t"],
      hint: "nginx suivi de l'option -t (test).",
      explanation: "`nginx -t` teste la configuration. Recharger une configuration cassée ferait tomber le site.",
    },
    {
      kind: "choice",
      prompt: "Quel équipement reçoit les visiteurs et les envoie vers le bon service, comme un réceptionniste ?",
      options: ["Le reverse proxy", "Le disque dur", "Le DNS", "Le cache du navigateur"],
      correctIndex: 0,
      explanation: "Le reverse proxy est la porte d'entrée unique qui aiguille chaque demande.",
    },
    {
      kind: "choice",
      prompt: "Ton site reçoit trop de visiteurs pour un seul serveur. Que mets-tu en place ?",
      options: ["Un pare-feu plus strict", "Plusieurs serveurs derrière un load balancer", "Un mot de passe plus long", "Un nouveau nom de domaine"],
      correctIndex: 1,
      explanation: "Le load balancer répartit la charge entre plusieurs serveurs et contourne ceux qui sont en panne.",
    },
    {
      kind: "choice",
      prompt: "À quoi sert un cache ?",
      options: ["À chiffrer les données", "À garder une copie des réponses fréquentes pour répondre plus vite", "À sauvegarder les mots de passe", "À bloquer les attaques"],
      correctIndex: 1,
      explanation: "Le cache évite de refaire le même travail : réponse immédiate et serveurs soulagés.",
    },
    {
      kind: "choice",
      prompt: "Quelle règle de pare-feu est la bonne pour un serveur web public ?",
      options: [
        "Tout ouvrir, c'est plus simple",
        "Tout bloquer, sauf 80 et 443 pour tous et SSH pour quelques adresses de confiance",
        "Ouvrir uniquement le port 22 à tout le monde",
        "Désactiver le pare-feu",
      ],
      correctIndex: 1,
      explanation: "On bloque par défaut et on n'ouvre que le strict nécessaire : c'est le principe du moindre privilège.",
    },
  ],
};
