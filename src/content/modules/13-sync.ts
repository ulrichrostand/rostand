import type { DevOpsModule } from "../types";

export const syncModule: DevOpsModule = {
  id: "sync",
  codename: "Opération SYNC",
  title: "GitOps & service mesh",
  roadmapSection: "GitOps · Service Mesh",
  roadmapTopics: ["ArgoCD", "FluxCD", "Istio", "Linkerd", "Consul", "Envoy"],
  briefing:
    "ENTROPIA modifie le cluster en direct et intercepte le trafic entre microservices. Fais de Git la seule source de vérité et chiffre chaque communication interne.",
  challenges: [
    {
      kind: "choice",
      prompt: "Quel est le principe central du GitOps ?",
      options: [
        "Les développeurs se connectent en SSH aux serveurs",
        "Git est la source de vérité ; un agent dans le cluster réconcilie en continu l'état réel avec l'état déclaré",
        "On déploie avec des scripts manuels",
        "On stocke les logs dans Git",
      ],
      correctIndex: 1,
      explanation:
        "L'agent (ArgoCD, Flux) tire les manifests depuis Git (pull) au lieu que la CI pousse vers le cluster. Historique complet, rollback par `git revert`, et correction automatique du drift.",
    },
    {
      kind: "order",
      prompt: "Ordonne le flux d'une mise en production en GitOps.",
      steps: [
        "La CI construit et publie l'image `api:1.5.0`",
        "Une PR met à jour le tag dans le dépôt de configuration",
        "La PR est revue puis mergée",
        "ArgoCD détecte le changement dans Git",
        "ArgoCD synchronise le cluster sur le nouvel état",
      ],
      explanation:
        "Séparer dépôt applicatif et dépôt de configuration clarifie les responsabilités. Le cluster n'expose aucun accès en écriture à la CI.",
    },
    {
      kind: "choice",
      prompt: "Qu'est-ce qu'un service mesh (Istio, Linkerd) ?",
      options: [
        "Un outil de build",
        "Une couche d'infrastructure, souvent des proxies sidecar, qui gère le trafic entre services : mTLS, retries, observabilité",
        "Une base de données distribuée",
        "Un type de VPN pour les développeurs",
      ],
      correctIndex: 1,
      explanation:
        "Le mesh sort la logique réseau du code : chiffrement mTLS, retries, timeouts, circuit breaking, traffic splitting (canary), métriques et traces. Istio s'appuie sur Envoy ; Linkerd sur son propre micro-proxy en Rust.",
    },
    {
      kind: "choice",
      prompt: "Que garantit le mTLS entre microservices ?",
      options: [
        "Uniquement la compression",
        "Chiffrement ET authentification mutuelle des deux services par certificats",
        "La mise en cache",
        "L'équilibrage de charge",
      ],
      correctIndex: 1,
      explanation:
        "En TLS classique seul le serveur prouve son identité ; en mTLS les deux parties le font. C'est une brique du « zero trust » : le réseau interne n'est pas considéré comme sûr.",
    },
    {
      kind: "choice",
      prompt: "Quand un service mesh est-il probablement superflu ?",
      options: [
        "Avec des centaines de microservices et des exigences zero trust",
        "Avec une petite application de 2-3 services : la complexité opérationnelle dépasse le gain",
        "Quand on a besoin de canary releases avancées",
        "Quand on veut du mTLS partout",
      ],
      correctIndex: 1,
      explanation:
        "Un mesh ajoute latence, consommation et complexité. KISS : commencer simple (Ingress, bibliothèques de retry) et adopter un mesh quand le nombre de services le justifie.",
    },
  ],
  recap: [
    "GitOps : Git = source de vérité, réconciliation continue, modèle pull.",
    "ArgoCD (UI riche, Applications) et FluxCD (léger, modulaire) sont les références.",
    "Rollback = `git revert` ; drift corrigé automatiquement.",
    "Service mesh : mTLS, retries, timeouts, circuit breaking, traffic splitting, télémétrie.",
    "Istio (Envoy), Linkerd (simple et léger), Consul (multi-plateforme).",
    "Ne pas adopter un mesh sans besoin réel : coût opérationnel important.",
  ],
};
