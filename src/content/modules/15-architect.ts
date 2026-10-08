import type { DevOpsModule } from "../types";

export const architectModule: DevOpsModule = {
  id: "architect",
  codename: "Opération ARCHITECT",
  title: "Cloud design patterns",
  roadmapSection: "Cloud Design Patterns",
  roadmapTopics: ["Availability", "Data management", "Design & implementation", "Management & monitoring"],
  briefing:
    "Dernière mission : le cœur d'ENTROPIA. Pour l'éteindre définitivement, conçois une architecture résiliente qui ne puisse plus tomber.",
  challenges: [
    {
      kind: "choice",
      prompt: "Un service dépendant répond en erreur de façon répétée. Quel pattern arrête temporairement les appels pour éviter l'effet domino ?",
      options: ["Retry infini", "Circuit breaker", "Sharding", "CQRS"],
      correctIndex: 1,
      explanation:
        "Circuit breaker : fermé (normal) → ouvert (échec rapide) → semi-ouvert (test). Toujours combiné à des timeouts et des retries avec backoff exponentiel et jitter, sinon les retries amplifient la panne.",
    },
    {
      kind: "choice",
      prompt: "Une disponibilité de 99,9 % (« trois neuf ») autorise environ combien d'indisponibilité par mois ?",
      options: ["~4 minutes", "~43 minutes", "~7 heures", "~3 jours"],
      correctIndex: 1,
      explanation:
        "99,9 % ≈ 43 min/mois ; 99,99 % ≈ 4 min/mois. Le SLA est l'engagement contractuel, le SLO l'objectif interne, le SLI la mesure. Le budget d'erreur (100 % − SLO) arbitre entre vitesse et fiabilité.",
    },
    {
      kind: "choice",
      prompt: "Quel pattern sépare les modèles d'écriture et de lecture d'une application ?",
      options: ["Strangler fig", "CQRS", "Sidecar", "Bulkhead"],
      correctIndex: 1,
      explanation:
        "CQRS (Command Query Responsibility Segregation) optimise lectures et écritures séparément, souvent avec de l'event sourcing. Autres patterns data : sharding, cache-aside, materialized view.",
    },
    {
      kind: "choice",
      prompt: "Pour migrer progressivement un monolithe vers des microservices sans « big bang » :",
      options: ["Strangler fig", "Circuit breaker", "Retry", "Cold standby"],
      correctIndex: 0,
      explanation:
        "Strangler fig : une façade (API gateway) route progressivement des fonctionnalités vers les nouveaux services jusqu'à « étrangler » le monolithe. Autres patterns : sidecar, ambassador, gateway routing, anti-corruption layer.",
    },
    {
      kind: "order",
      prompt: "Ordonne ces stratégies de reprise après sinistre du RTO le plus long (moins cher) au plus court (plus cher).",
      steps: ["Backup & restore", "Pilot light", "Warm standby", "Multi-site actif/actif"],
      explanation:
        "RTO = temps pour revenir en service, RPO = perte de données acceptable. Plus on veut un RTO/RPO faible, plus il faut d'infrastructure prête. Une sauvegarde non testée n'est pas une sauvegarde.",
    },
  ],
  recap: [
    "Disponibilité : redondance multi-AZ, health checks, circuit breaker, retries avec backoff, bulkhead.",
    "SLI / SLO / SLA et budget d'erreur pour piloter la fiabilité.",
    "Data : CQRS, event sourcing, sharding, cache-aside.",
    "Design : strangler fig, sidecar, ambassador, API gateway, anti-corruption layer.",
    "Management & monitoring : health endpoints, external configuration store, observabilité.",
    "Reprise : backup/restore → pilot light → warm standby → actif/actif ; tester les restaurations.",
  ],
};
