import type { DevOpsModule } from "../types";

export const vaultModule: DevOpsModule = {
  id: "vault",
  codename: "Opération VAULT",
  title: "Gestion des secrets",
  roadmapSection: "Secret Management",
  roadmapTopics: ["HashiCorp Vault", "Sealed Secrets", "SOPS", "External Secrets Operator", "AWS / GCP / Azure secret managers"],
  briefing:
    "La salle des coffres d'Helix Corp contient les clés de toute l'infrastructure. ENTROPIA tente de les exfiltrer. Sécurise-les avant qu'il ne soit trop tard.",
  challenges: [
    {
      kind: "choice",
      prompt: "Où NE faut-il JAMAIS stocker une clé d'API en clair ?",
      options: ["Dans un gestionnaire de secrets (Vault)", "Dans le code source ou un dépôt Git", "Dans AWS Secrets Manager", "Dans un secret chiffré de la CI"],
      correctIndex: 1,
      explanation:
        "Un secret dans Git est exposé à tous les clones et reste dans l'historique. Les variables d'environnement sont acceptables à l'exécution si elles sont injectées depuis un coffre, pas écrites en dur.",
    },
    {
      kind: "choice",
      prompt: "Qu'apportent les « dynamic secrets » de HashiCorp Vault ?",
      options: [
        "Des mots de passe plus longs",
        "Des identifiants générés à la demande, à durée de vie limitée et révocables",
        "Une interface graphique",
        "Le chiffrement du disque",
      ],
      correctIndex: 1,
      explanation:
        "Vault crée par exemple un utilisateur de base de données valable 1 h pour une application, puis le révoque. Une fuite devient beaucoup moins grave. Vault gère aussi le chiffrement as a service, les PKI et l'audit.",
    },
    {
      kind: "choice",
      prompt: "Les Secrets Kubernetes natifs sont :",
      options: [
        "Chiffrés par défaut avec une clé forte",
        "Seulement encodés en base64 : il faut activer le chiffrement at rest et restreindre le RBAC",
        "Impossibles à lire",
        "Stockés dans Git automatiquement",
      ],
      correctIndex: 1,
      explanation:
        "Base64 n'est pas du chiffrement. Activer l'encryption at rest d'etcd (KMS), limiter le RBAC, et synchroniser depuis un coffre externe avec External Secrets Operator.",
    },
    {
      kind: "choice",
      prompt: "Tu veux versionner des secrets dans Git en GitOps. Quel outil permet de commiter une version chiffrée que seul le cluster peut déchiffrer ?",
      options: ["Sealed Secrets (ou SOPS)", "Un fichier `.env`", "Base64", "Un commentaire YAML"],
      correctIndex: 0,
      explanation:
        "Sealed Secrets chiffre avec la clé publique du contrôleur du cluster. SOPS chiffre les valeurs d'un YAML/JSON avec KMS, age ou PGP en laissant les clés lisibles pour les diffs.",
    },
    {
      kind: "order",
      prompt: "Une clé a fuité publiquement. Ordonne la réponse à incident.",
      steps: [
        "Révoquer / désactiver la clé compromise",
        "Générer une nouvelle clé et la stocker dans le coffre",
        "Redéployer les services avec la nouvelle clé",
        "Analyser les logs d'accès pour mesurer l'impact",
        "Post-mortem et prévention (scan de secrets en CI)",
      ],
      explanation:
        "Contenir d'abord, rétablir ensuite, puis comprendre et prévenir. Automatiser la rotation régulière réduit la fenêtre d'exposition.",
    },
  ],
  recap: [
    "Aucun secret dans le code ni dans Git, même privé.",
    "Coffres : HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager, Azure Key Vault.",
    "Vault : secrets dynamiques à durée limitée, révocation, audit, PKI.",
    "Secrets Kubernetes = base64 : chiffrement etcd + RBAC + External Secrets Operator.",
    "GitOps : Sealed Secrets ou SOPS pour versionner des secrets chiffrés.",
    "Rotation régulière et procédure de fuite : révoquer → remplacer → redéployer → analyser.",
  ],
};
