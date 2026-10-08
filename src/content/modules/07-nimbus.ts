import type { DevOpsModule } from "../types";

export const nimbusModule: DevOpsModule = {
  id: "nimbus",
  codename: "Opération NIMBUS",
  title: "Cloud providers & serverless",
  roadmapSection: "Cloud Providers · Serverless",
  roadmapTopics: ["AWS", "Azure", "Google Cloud", "DigitalOcean", "Hetzner", "AWS Lambda", "Azure Functions", "Cloudflare", "Vercel", "Netlify"],
  briefing:
    "ENTROPIA s'est étendue au cloud public. Pour la traquer, il faut connaître les modèles de service, les régions, l'IAM et le serverless.",
  challenges: [
    {
      kind: "choice",
      prompt: "Dans le modèle de responsabilité partagée IaaS, qui patche l'OS d'une VM EC2 ?",
      options: ["AWS", "Le client", "Personne, c'est automatique", "Le fournisseur de l'OS"],
      correctIndex: 1,
      explanation:
        "Le cloud provider sécurise le cloud (datacenters, hyperviseur) ; le client sécurise ce qu'il met dans le cloud (OS, applications, données, IAM). Plus on monte en abstraction (PaaS, serverless), plus le provider en prend en charge.",
    },
    {
      kind: "choice",
      prompt: "Pour une haute disponibilité au sein d'une région, on répartit les instances sur :",
      options: ["Plusieurs comptes", "Plusieurs zones de disponibilité (AZ)", "Plusieurs buckets S3", "Plusieurs utilisateurs IAM"],
      correctIndex: 1,
      explanation:
        "Une région contient plusieurs AZ (datacenters isolés mais proches). Multi-AZ protège d'une panne de datacenter ; multi-région protège d'une panne régionale (plus coûteux et complexe).",
    },
    {
      kind: "choice",
      prompt: "Quelle est la bonne pratique IAM ?",
      options: [
        "Utiliser le compte root au quotidien",
        "Moindre privilège, rôles temporaires et MFA",
        "Partager une clé d'accès dans l'équipe",
        "Donner `AdministratorAccess` à toutes les applications",
      ],
      correctIndex: 1,
      explanation:
        "Moindre privilège, rôles assumés avec credentials temporaires (pas de clés longue durée), MFA, et pour la CI une fédération OIDC plutôt que des clés stockées.",
    },
    {
      kind: "choice",
      prompt: "Qu'est-ce qui caractérise le serverless (AWS Lambda, Azure Functions, Cloud Functions) ?",
      options: [
        "Il n'y a aucun serveur physique",
        "Exécution à la demande, scaling automatique jusqu'à zéro et facturation à l'usage",
        "Il faut gérer soi-même le kernel",
        "Les fonctions tournent en continu",
      ],
      correctIndex: 1,
      explanation:
        "Pas de serveur à gérer, scaling automatique, paiement à l'invocation. Limites : cold starts, durée d'exécution maximale, dépendance au provider. Idéal pour de l'événementiel et du trafic irrégulier.",
    },
    {
      kind: "order",
      prompt: "Classe ces modèles du plus de contrôle (et de responsabilité) côté client au moins.",
      steps: ["On-premise", "IaaS (EC2, Compute Engine)", "PaaS (Heroku, App Service, Render)", "Serverless / FaaS (Lambda)", "SaaS (Gmail, Salesforce)"],
      explanation:
        "Plus on monte, moins on gère d'infrastructure, mais moins on contrôle. Le choix dépend des besoins de personnalisation, de l'équipe et des coûts.",
    },
  ],
  recap: [
    "Les 3 grands : AWS, Azure, GCP ; alternatives simples : DigitalOcean, Hetzner, OVH.",
    "Responsabilité partagée : le provider sécurise le cloud, le client sécurise ce qu'il y déploie.",
    "Région > zones de disponibilité : multi-AZ pour la haute disponibilité.",
    "IAM : moindre privilège, rôles temporaires, MFA, OIDC pour la CI.",
    "IaaS → PaaS → FaaS → SaaS : moins de gestion, moins de contrôle.",
    "Serverless/edge (Lambda, Cloudflare Workers, Vercel, Netlify) : à l'usage, attention aux cold starts.",
  ],
};
