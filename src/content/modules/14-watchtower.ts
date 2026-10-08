import type { DevOpsModule } from "../types";

export const watchtowerModule: DevOpsModule = {
  id: "watchtower",
  codename: "Opération WATCHTOWER",
  title: "Monitoring, logs & observabilité",
  roadmapSection: "Infrastructure Monitoring · Logs Management · Observability",
  roadmapTopics: ["Prometheus", "Grafana", "Datadog", "Zabbix", "Elastic Stack", "Loki", "Splunk", "OpenTelemetry", "Jaeger"],
  briefing:
    "ENTROPIA opère dans l'ombre parce que personne ne surveille rien. Installe la tour de guet : métriques, logs et traces pour voir chaque mouvement.",
  challenges: [
    {
      kind: "choice",
      prompt: "Quels sont les trois piliers de l'observabilité ?",
      options: ["CPU, RAM, disque", "Métriques, logs, traces", "Dev, Ops, Sec", "Build, test, deploy"],
      correctIndex: 1,
      explanation:
        "Métriques (valeurs numériques agrégées), logs (événements détaillés), traces (parcours d'une requête à travers les services). OpenTelemetry standardise leur collecte.",
    },
    {
      kind: "choice",
      prompt: "Comment Prometheus récupère-t-il les métriques par défaut ?",
      options: [
        "Les applications les envoient par e-mail",
        "Il les « scrape » en HTTP (modèle pull) sur un endpoint `/metrics`",
        "Il lit la base de données de l'application",
        "Via FTP",
      ],
      correctIndex: 1,
      explanation:
        "Prometheus interroge périodiquement les cibles (exporters, applications instrumentées), stocke des séries temporelles, se requête en PromQL et déclenche des alertes via Alertmanager. Grafana les visualise.",
    },
    {
      kind: "choice",
      prompt: "Quelle alerte est la plus pertinente pour réveiller l'astreinte la nuit ?",
      options: [
        "CPU > 80 % pendant 1 minute",
        "Le taux d'erreurs vu par les utilisateurs dépasse le SLO (burn rate élevé)",
        "Un nouveau commit sur main",
        "Disque utilisé à 40 %",
      ],
      correctIndex: 1,
      explanation:
        "Alerter sur les symptômes vécus par l'utilisateur (erreurs, latence) plutôt que sur les causes. Méthodes : signaux dorés (latence, trafic, erreurs, saturation), RED, USE. Trop d'alertes inutiles = fatigue d'alerte.",
    },
    {
      kind: "choice",
      prompt: "Quelle différence entre Elastic Stack (ELK) et Grafana Loki ?",
      options: [
        "Aucune",
        "ELK indexe le contenu complet des logs (recherche puissante, coûteux) ; Loki n'indexe que les labels (moins cher, requêtes plus ciblées)",
        "Loki ne stocke que des métriques",
        "ELK ne fonctionne que sur Windows",
      ],
      correctIndex: 1,
      explanation:
        "ELK = Elasticsearch + Logstash + Kibana (souvent Beats/Fluent Bit en collecte). Loki s'intègre à Grafana. Splunk, Datadog, Graylog, Papertrail sont d'autres options. Préférer des logs structurés (JSON) avec un ID de corrélation.",
    },
    {
      kind: "choice",
      prompt: "Une requête met 4 secondes et traverse 6 microservices. Quel outil montre où le temps est passé ?",
      options: ["`top`", "Le tracing distribué (OpenTelemetry + Jaeger / Tempo)", "`grep` sur un seul serveur", "Un ping"],
      correctIndex: 1,
      explanation:
        "Une trace est composée de spans (une par opération) reliés par un trace ID propagé dans les en-têtes (W3C `traceparent`). Jaeger, Tempo ou Zipkin affichent la cascade pour repérer le service lent.",
    },
  ],
  recap: [
    "Observabilité = métriques + logs + traces, standardisés par OpenTelemetry.",
    "Prometheus (pull, PromQL, Alertmanager) + Grafana pour les tableaux de bord.",
    "Alerter sur les symptômes utilisateurs et les SLO, pas sur chaque pic de CPU.",
    "Logs centralisés et structurés : ELK, Loki, Splunk, Graylog, Datadog.",
    "Tracing distribué : Jaeger, Tempo, Zipkin pour trouver le service lent.",
    "Zabbix, Datadog, New Relic, Dynatrace : alternatives de monitoring (SaaS ou on-premise).",
  ],
};
