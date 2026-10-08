import type { DevOpsModule } from "../types";

export const containerModule: DevOpsModule = {
  id: "container",
  codename: "Opération CONTAINER",
  title: "Conteneurs",
  roadmapSection: "Containers",
  roadmapTopics: ["Docker", "LXC", "Images & registres", "Dockerfile", "Docker Compose"],
  briefing:
    "Les applications d'Helix Corp tournent dans des conteneurs que l'ennemi a piégés. Comprends comment ils sont construits et isolés pour les neutraliser.",
  challenges: [
    {
      kind: "choice",
      prompt: "Pourquoi un conteneur est-il plus léger qu'une machine virtuelle ?",
      options: [
        "Il n'a pas de système de fichiers",
        "Il partage le kernel de l'hôte au lieu d'embarquer un OS complet",
        "Il tourne uniquement en mémoire",
        "Il n'a pas accès au réseau",
      ],
      correctIndex: 1,
      explanation:
        "Le conteneur est un processus isolé par les namespaces (PID, réseau, mount...) et limité par les cgroups (CPU, RAM). Pas de kernel invité, d'où un démarrage en millisecondes.",
    },
    {
      kind: "command",
      prompt: "Construis une image Docker taguée `api:1.0` à partir du Dockerfile du dossier courant.",
      acceptedAnswers: ["docker build -t api:1.0 .", "docker build --tag api:1.0 .", "docker image build -t api:1.0 ."],
      hint: "docker build, l'option de tag, puis le contexte de build.",
      explanation:
        "Le `.` final est le contexte de build envoyé au daemon : un `.dockerignore` évite d'y inclure `node_modules`, `.git` ou des secrets.",
    },
    {
      kind: "command",
      prompt: "Lance l'image `nginx` en arrière-plan en exposant le port 80 du conteneur sur le port 8080 de l'hôte.",
      acceptedAnswers: ["docker run -d -p 8080:80 nginx", "docker run -p 8080:80 -d nginx", "docker run --detach -p 8080:80 nginx", "docker run -d --publish 8080:80 nginx"],
      hint: "docker run -d -p HOTE:CONTENEUR image",
      explanation:
        "`-p hôte:conteneur` publie un port, `-d` détache. Ajoute `--name`, `--restart unless-stopped` et des limites (`--memory`, `--cpus`) en production.",
    },
    {
      kind: "choice",
      prompt: "Quelle pratique réduit le plus la taille et la surface d'attaque d'une image ?",
      options: [
        "Partir de `ubuntu:latest` et tout installer",
        "Un build multi-stage avec une image finale minimale (distroless / alpine) et un utilisateur non-root",
        "Copier tout le dépôt Git dans l'image",
        "Lancer le conteneur en `--privileged`",
      ],
      correctIndex: 1,
      explanation:
        "Multi-stage : on compile dans une étape, on ne copie que l'artefact dans l'image finale. Plus `USER` non-root, des tags figés (pas `latest`) et un scan de vulnérabilités (Trivy, Grype).",
    },
    {
      kind: "choice",
      prompt: "Les données d'une base PostgreSQL dans un conteneur disparaissent à chaque recréation. Solution ?",
      options: ["Augmenter la RAM", "Monter un volume Docker sur le dossier de données", "Utiliser `docker commit`", "Redémarrer le daemon"],
      correctIndex: 1,
      explanation:
        "Le système de fichiers d'un conteneur est éphémère. Les volumes (`-v pgdata:/var/lib/postgresql/data`) persistent hors du cycle de vie du conteneur. Docker Compose décrit services, réseaux et volumes dans un fichier YAML.",
    },
  ],
  recap: [
    "Conteneur = processus isolé (namespaces) et limité (cgroups), partageant le kernel de l'hôte.",
    "Image (immuable, en couches) → conteneur (instance) ; stockée dans un registre.",
    "`docker build -t nom:tag .` puis `docker run -d -p 8080:80 image`.",
    "Images sûres : multi-stage, base minimale, non-root, tags figés, scan Trivy.",
    "Données persistantes dans des volumes ; Docker Compose pour le multi-conteneurs en local.",
    "LXC : conteneurs « système » plus proches d'une VM légère.",
  ],
};
