import type { DevOpsModule } from "../types";

export const watchtowerModule: DevOpsModule = {
  id: "watchtower",
  codename: "Opération WATCHTOWER",
  title: "Surveiller : monitoring, logs, alertes",
  roadmapSection: "Infrastructure Monitoring · Logs Management · Observability",
  roadmapTopics: ["Monitoring", "Métriques (Prometheus, Grafana)", "Logs", "Alertes", "Traces"],
  briefing:
    "ENTROPIA agit dans l'ombre parce que personne ne surveille rien. Installe la tour de guet pour voir chaque mouvement.",
  lessons: [
    {
      title: "Le monitoring",
      summary: "Surveiller (monitorer), c'est mesurer en permanence la santé des serveurs et des applications, pour détecter un problème avant les utilisateurs.",
      analogy: "C'est le tableau de bord d'une voiture : vitesse, essence, température moteur.",
      keyPoint: "Le monitoring surveille en continu la santé du système.",
    },
    {
      title: "Les métriques",
      summary:
        "Une métrique est un chiffre mesuré dans le temps : utilisation du processeur, mémoire, nombre de visiteurs par seconde. Prometheus collecte ces chiffres, Grafana les affiche en graphiques.",
      analogy: "Prometheus est le thermomètre qui note la température toutes les minutes, Grafana la courbe affichée au mur.",
      keyPoint: "Prometheus collecte les métriques, Grafana les affiche.",
    },
    {
      title: "Les logs",
      summary:
        "Les logs (journaux) racontent ce qui se passe, ligne par ligne : « utilisateur connecté », « erreur de paiement »… On les regroupe dans un seul outil (ELK, Loki) pour chercher facilement.",
      analogy: "C'est le journal de bord du capitaine, consigné heure par heure.",
      keyPoint: "Les logs racontent les événements ; on les centralise pour les chercher.",
    },
    {
      title: "Les alertes",
      summary:
        "Une alerte prévient l'équipe quand quelque chose ne va pas. Bonne pratique : alerter sur ce que vivent les utilisateurs (le site est lent, renvoie des erreurs), pas sur chaque petit pic.",
      analogy: "Un détecteur de fumée doit sonner pour un incendie, pas à chaque toast grillé.",
      keyPoint: "Alerter sur ce que vivent les utilisateurs, pas sur chaque détail.",
    },
    {
      title: "Les traces",
      summary:
        "Une requête peut traverser 10 services. Une trace suit son parcours complet et montre le temps passé dans chacun : on trouve tout de suite le service lent.",
      analogy: "C'est le suivi d'un colis : on voit chaque étape et où il est resté bloqué.",
      keyPoint: "Une trace suit une requête de service en service pour trouver ce qui ralentit.",
    },
  ],
  challenges: [
    {
      kind: "choice",
      prompt: "Pourquoi faire du monitoring ?",
      options: ["Pour décorer le bureau", "Pour détecter les problèmes avant les utilisateurs", "Pour écrire du code plus vite", "Pour remplacer les tests"],
      correctIndex: 1,
      explanation: "Le monitoring donne une vision en temps réel de la santé du système.",
    },
    {
      kind: "choice",
      prompt: "Quel duo est classique pour les métriques ?",
      options: ["Git et GitHub", "Prometheus (collecte) et Grafana (affichage)", "Docker et Nginx", "SSH et DNS"],
      correctIndex: 1,
      explanation: "Prometheus mesure et stocke, Grafana dessine les tableaux de bord.",
    },
    {
      kind: "choice",
      prompt: "Que contiennent les logs ?",
      options: ["Les mots de passe", "Le récit des événements, ligne par ligne", "Les images du site", "Le code source"],
      correctIndex: 1,
      explanation: "Les logs sont le journal de bord : indispensables pour comprendre une erreur.",
    },
    {
      kind: "choice",
      prompt: "Quelle alerte mérite de réveiller l'équipe la nuit ?",
      options: [
        "Le processeur a atteint 70 % pendant 10 secondes",
        "Le site renvoie des erreurs à une grande partie des utilisateurs",
        "Un nouveau commit a été poussé",
        "Il est minuit",
      ],
      correctIndex: 1,
      explanation: "On alerte sur l'impact utilisateur. Trop d'alertes inutiles et plus personne n'y prête attention.",
    },
    {
      kind: "choice",
      prompt: "Une page met 5 secondes à charger et passe par 6 services. Quel outil montre lequel est lent ?",
      options: ["Les traces (tracing)", "Un ping", "Le pare-feu", "Git"],
      correctIndex: 0,
      explanation: "La trace montre le temps passé dans chaque service : le coupable saute aux yeux.",
    },
  ],
};
