import type { DevOpsModule } from "../types";

export const syncModule: DevOpsModule = {
  id: "sync",
  codename: "Opération SYNC",
  title: "GitOps et microservices",
  roadmapSection: "GitOps · Service Mesh",
  roadmapTopics: ["GitOps", "ArgoCD / Flux", "Rollback", "Microservices", "Service mesh"],
  briefing:
    "ENTROPIA modifie le cluster en douce et espionne les échanges entre services. Fais de Git la seule source de vérité et sécurise les communications internes.",
  lessons: [
    {
      title: "GitOps",
      summary:
        "Avec le GitOps, l'état voulu de l'infrastructure est décrit dans un dépôt Git. Pour changer quelque chose, on ne touche pas aux serveurs : on modifie le dépôt (via une Pull Request).",
      analogy: "Le dépôt Git est la partition officielle : si un musicien improvise, on le ramène à la partition.",
      keyPoint: "GitOps : Git est la source de vérité de l'infrastructure.",
    },
    {
      title: "ArgoCD et Flux",
      summary:
        "ArgoCD ou Flux tournent dans le cluster et comparent en permanence ce qui est dans Git avec ce qui tourne vraiment. S'il y a une différence, ils corrigent automatiquement.",
      analogy: "C'est un thermostat : il compare la température voulue et la réelle, et corrige l'écart.",
      keyPoint: "ArgoCD/Flux synchronisent automatiquement le cluster avec Git.",
    },
    {
      title: "Revenir en arrière facilement",
      summary:
        "Une mise à jour pose problème ? On annule le commit fautif dans Git (`git revert`), et l'outil GitOps remet automatiquement la version précédente.",
      analogy: "C'est le bouton « annuler » de toute l'infrastructure.",
      keyPoint: "Rollback en GitOps = annuler le commit dans Git (git revert).",
    },
    {
      title: "Les microservices",
      summary:
        "Au lieu d'une seule grosse application, on peut la découper en petits services indépendants (paiement, catalogue, comptes…), chacun déployé séparément. Ils communiquent entre eux par le réseau.",
      analogy: "Un restaurant avec des postes spécialisés (pâtisserie, grill…) plutôt qu'un seul cuisinier qui fait tout.",
      keyPoint: "Microservices : une application découpée en petits services indépendants.",
    },
    {
      title: "Le service mesh",
      summary:
        "Quand des dizaines de services se parlent, un service mesh (Istio, Linkerd) gère ces communications : il les chiffre, réessaie en cas d'échec et mesure tout.",
      analogy: "C'est la poste interne de l'entreprise : elle achemine, sécurise et trace chaque courrier entre les services.",
      keyPoint: "Un service mesh gère et sécurise les communications entre services.",
    },
  ],
  challenges: [
    {
      kind: "choice",
      prompt: "En GitOps, comment modifie-t-on l'infrastructure ?",
      options: ["En se connectant aux serveurs pour tout changer à la main", "En modifiant le dépôt Git", "En envoyant un e-mail", "En redémarrant le cluster"],
      correctIndex: 1,
      explanation: "Git est la source de vérité : on modifie le dépôt, l'outil GitOps applique.",
    },
    {
      kind: "choice",
      prompt: "Que fait ArgoCD ?",
      options: ["Il écrit les tests", "Il synchronise automatiquement le cluster avec ce qui est dans Git", "Il héberge le code", "Il remplace Docker"],
      correctIndex: 1,
      explanation: "ArgoCD compare Git et le cluster en continu et corrige les différences.",
    },
    {
      kind: "choice",
      prompt: "La dernière mise à jour casse le site. En GitOps, comment revenir en arrière ?",
      options: ["Supprimer le cluster", "Annuler le commit fautif dans Git (git revert)", "Attendre que ça passe", "Modifier la production à la main"],
      correctIndex: 1,
      explanation: "On annule dans Git, et la version précédente est redéployée automatiquement.",
    },
    {
      kind: "choice",
      prompt: "Une architecture en microservices, c'est…",
      options: ["Un seul gros programme", "Une application découpée en petits services indépendants", "Un serveur miniature", "Un type de câble"],
      correctIndex: 1,
      explanation: "Chaque service peut être développé, déployé et mis à l'échelle séparément.",
    },
    {
      kind: "choice",
      prompt: "À quoi sert un service mesh ?",
      options: ["À gérer et sécuriser la communication entre services", "À dessiner des schémas", "À stocker des images", "À compiler du code"],
      correctIndex: 0,
      explanation: "Chiffrement, nouvelles tentatives, mesures : le mesh s'occupe du réseau entre services.",
    },
  ],
};
