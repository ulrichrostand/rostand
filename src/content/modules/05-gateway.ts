import type { DevOpsModule } from "../types";

export const gatewayModule: DevOpsModule = {
  id: "gateway",
  codename: "Opération GATEWAY",
  title: "Serveurs web, proxies & load balancing",
  roadmapSection: "What is and how to setup X?",
  roadmapTopics: ["Forward proxy", "Reverse proxy", "Caching server", "Load balancer", "Firewall", "Nginx", "Apache", "Caddy", "Tomcat", "IIS"],
  briefing:
    "Toutes les requêtes vers Helix Corp transitent par une passerelle compromise. Reconfigure les reverse proxies, les load balancers et le pare-feu pour reprendre la main.",
  challenges: [
    {
      kind: "choice",
      prompt: "Différence entre forward proxy et reverse proxy ?",
      options: [
        "Aucune",
        "Le forward proxy agit pour les clients (sortie) ; le reverse proxy agit pour les serveurs (entrée)",
        "Le reverse proxy chiffre uniquement le DNS",
        "Le forward proxy ne fonctionne qu'en UDP",
      ],
      correctIndex: 1,
      explanation:
        "Forward proxy : les postes internes sortent vers Internet à travers lui (filtrage, cache). Reverse proxy : placé devant les serveurs, il reçoit le trafic entrant (terminaison TLS, routage, cache, protection). Nginx, Caddy, HAProxy, Envoy et Traefik sont des reverse proxies courants.",
    },
    {
      kind: "choice",
      prompt: "Quel algorithme de load balancing envoie la requête au serveur qui a le moins de connexions actives ?",
      options: ["Round robin", "Least connections", "IP hash", "Random"],
      correctIndex: 1,
      explanation:
        "Round robin : chacun son tour. Least connections : idéal pour des requêtes de durées variables. IP hash : même client → même serveur (sessions « collantes »). Les health checks retirent les serveurs défaillants du pool.",
    },
    {
      kind: "command",
      prompt: "Vérifie la syntaxe de la configuration Nginx avant de la recharger.",
      acceptedAnswers: ["nginx -t"],
      hint: "nginx avec l'option de test.",
      explanation:
        "`nginx -t` valide la config ; ensuite `systemctl reload nginx` (ou `nginx -s reload`) applique sans couper les connexions. Recharger une config invalide peut faire tomber le site.",
    },
    {
      kind: "choice",
      prompt: "Un serveur de cache (Varnish, CDN, cache Nginx) sert principalement à :",
      options: [
        "Chiffrer les bases de données",
        "Stocker des réponses pour les resservir sans solliciter le backend",
        "Remplacer le DNS",
        "Compiler le code",
      ],
      correctIndex: 1,
      explanation:
        "Le cache réduit la latence et la charge du backend. Il se pilote avec les en-têtes HTTP (`Cache-Control`, `ETag`, `max-age`). Le piège classique : l'invalidation du cache après un déploiement.",
    },
    {
      kind: "choice",
      prompt: "Politique de pare-feu recommandée pour un serveur web exposé sur Internet ?",
      options: [
        "Tout autoriser puis bloquer les attaques connues",
        "Tout refuser par défaut, n'ouvrir que 80/443 au public et 22 depuis un bastion/VPN",
        "Désactiver le pare-feu derrière un load balancer",
        "Ouvrir uniquement le port 22",
      ],
      correctIndex: 1,
      explanation:
        "« Deny by default » + principe du moindre privilège. Outils : `ufw`, `iptables`/`nftables`, `firewalld`, security groups cloud. Ajouter un WAF pour filtrer au niveau HTTP.",
    },
  ],
  recap: [
    "Forward proxy = sortie des clients ; reverse proxy = entrée devant les serveurs.",
    "Load balancer : round robin, least connections, IP hash + health checks ; L4 vs L7.",
    "Cache : `Cache-Control`, `ETag` ; CDN pour rapprocher le contenu des utilisateurs.",
    "Pare-feu en « deny by default », SSH accessible uniquement via bastion ou VPN.",
    "Serveurs web : Nginx, Apache, Caddy (HTTPS automatique), Tomcat (Java), IIS (Windows).",
    "Toujours `nginx -t` avant `systemctl reload nginx`.",
  ],
};
