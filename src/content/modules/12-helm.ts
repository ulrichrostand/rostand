import type { DevOpsModule } from "../types";

export const helmModule: DevOpsModule = {
  id: "helm",
  codename: "Opération HELM",
  title: "Orchestration de conteneurs",
  roadmapSection: "Container Orchestration",
  roadmapTopics: ["Kubernetes", "GKE / EKS / AKS", "AWS ECS / Fargate", "Docker Swarm", "OpenShift", "Helm"],
  briefing:
    "Le cluster principal d'Helix Corp orchestre des milliers de conteneurs. ENTROPIA y a installé ses propres workloads. Prends la barre du cluster.",
  challenges: [
    {
      kind: "choice",
      prompt: "Quelle est la plus petite unité déployable dans Kubernetes ?",
      options: ["Le conteneur", "Le Pod", "Le Node", "Le Namespace"],
      correctIndex: 1,
      explanation:
        "Un Pod contient un ou plusieurs conteneurs partageant réseau et volumes. On ne crée presque jamais de Pods à la main : un Deployment gère un ReplicaSet qui maintient le nombre voulu de Pods.",
    },
    {
      kind: "command",
      prompt: "Liste les pods de tous les namespaces.",
      acceptedAnswers: ["kubectl get pods -A", "kubectl get pods --all-namespaces", "kubectl get po -A", "kubectl get po --all-namespaces"],
      hint: "kubectl get pods + l'option « all namespaces ».",
      explanation:
        "Diagnostic : `kubectl describe pod <nom>` (événements), `kubectl logs <pod>` (`-p` pour le conteneur précédent), `kubectl get events --sort-by=.lastTimestamp`.",
    },
    {
      kind: "choice",
      prompt: "Quel objet expose un ensemble de Pods derrière une adresse stable à l'intérieur du cluster ?",
      options: ["ConfigMap", "Service", "PersistentVolume", "CronJob"],
      correctIndex: 1,
      explanation:
        "Un Service (ClusterIP, NodePort, LoadBalancer) sélectionne les Pods par labels. L'Ingress (ou la Gateway API) expose du HTTP vers l'extérieur avec routage par hôte et chemin.",
    },
    {
      kind: "choice",
      prompt: "Un pod est en `CrashLoopBackOff`. Que faire en premier ?",
      options: [
        "Supprimer le cluster",
        "Lire les logs du conteneur précédent (`kubectl logs --previous`) et les événements (`kubectl describe`)",
        "Augmenter le nombre de replicas",
        "Changer de cloud provider",
      ],
      correctIndex: 1,
      explanation:
        "CrashLoopBackOff : le conteneur démarre puis plante en boucle. Causes fréquentes : erreur applicative, config ou secret manquant, liveness probe trop agressive, OOMKilled (limite mémoire).",
    },
    {
      kind: "choice",
      prompt: "Pourquoi définir des `requests` et `limits` CPU/mémoire sur les conteneurs ?",
      options: [
        "C'est purement décoratif",
        "Les requests guident le scheduler, les limits empêchent un pod d'affamer le nœud",
        "Pour activer HTTPS",
        "Pour stocker des secrets",
      ],
      correctIndex: 1,
      explanation:
        "Requests = réservation utilisée pour le placement ; limits = plafond (dépassement mémoire → OOMKilled). Indispensables pour l'autoscaling (HPA) et la stabilité. Managés : EKS, GKE, AKS ; alternatives : ECS/Fargate, Swarm, OpenShift ; packaging : Helm.",
    },
  ],
  recap: [
    "Kubernetes : control plane (API server, etcd, scheduler, controllers) + nodes (kubelet).",
    "Objets clés : Pod, Deployment, Service, Ingress, ConfigMap, Secret, Namespace.",
    "`kubectl get`, `describe`, `logs`, `apply -f` ; tout est déclaratif en YAML.",
    "Requests/limits, probes (liveness, readiness) et HPA pour la résilience.",
    "Managés : EKS, GKE, AKS ; alternatives : ECS/Fargate, Docker Swarm, OpenShift.",
    "Helm package les applications Kubernetes en charts versionnés.",
  ],
};
