import type { DevOpsModule } from "../types";

export const packetModule: DevOpsModule = {
  id: "packet",
  codename: "Opération PACKET",
  title: "Réseau & protocoles",
  roadmapSection: "Networking & Protocols",
  roadmapTopics: ["Modèle OSI", "DNS", "HTTP / HTTPS", "SSL / TLS", "SSH", "FTP / SFTP", "SMTP / IMAP / POP3S", "SPF / DKIM / DMARC"],
  briefing:
    "Le centre de télécommunications d'Helix Corp est sous contrôle ennemi. Pour rerouter le trafic, il faut comprendre comment les paquets voyagent : couches OSI, DNS, HTTP et chiffrement.",
  challenges: [
    {
      kind: "order",
      prompt: "Range ces couches du modèle OSI de la plus basse (1) à la plus haute (7) — version simplifiée.",
      steps: [
        "Physique (câbles, signaux)",
        "Liaison (Ethernet, adresses MAC)",
        "Réseau (IP, routage)",
        "Transport (TCP / UDP, ports)",
        "Application (HTTP, DNS, SSH)",
      ],
      explanation:
        "OSI : Physique, Liaison, Réseau, Transport, Session, Présentation, Application. Un load balancer « L4 » travaille sur IP/port (TCP), un « L7 » comprend HTTP (chemins, en-têtes, cookies).",
    },
    {
      kind: "choice",
      prompt: "Quel enregistrement DNS fait pointer un nom de domaine vers une adresse IPv4 ?",
      options: ["MX", "CNAME", "A", "TXT"],
      correctIndex: 2,
      explanation:
        "A → IPv4, AAAA → IPv6, CNAME → alias vers un autre nom, MX → serveurs mail, TXT → texte libre (SPF, vérifications), NS → serveurs faisant autorité. Diagnostic : `dig exemple.com A`.",
    },
    {
      kind: "choice",
      prompt: "Ports par défaut de SSH, HTTP et HTTPS ?",
      options: ["21, 80, 8080", "22, 80, 443", "22, 8080, 8443", "23, 80, 443"],
      correctIndex: 1,
      explanation:
        "SSH 22, HTTP 80, HTTPS 443. À connaître aussi : DNS 53, SMTP 25/587, IMAPS 993, POP3S 995, FTP 21, PostgreSQL 5432, MySQL 3306, Redis 6379.",
    },
    {
      kind: "command",
      prompt: "Connecte-toi en SSH au serveur `10.0.0.5` avec l'utilisateur `deploy`.",
      acceptedAnswers: ["ssh deploy@10.0.0.5", "ssh -l deploy 10.0.0.5"],
      hint: "ssh utilisateur@hôte",
      explanation:
        "Bonnes pratiques SSH : authentification par clé (`ssh-keygen -t ed25519`), désactiver le login root et les mots de passe (`PermitRootLogin no`, `PasswordAuthentication no`), bastion pour les réseaux privés.",
    },
    {
      kind: "choice",
      prompt: "Quel trio d'enregistrements DNS protège un domaine contre l'usurpation d'e-mails ?",
      options: ["A, AAAA, CNAME", "SPF, DKIM, DMARC", "MX, NS, SOA", "HTTP, TLS, SSH"],
      correctIndex: 1,
      explanation:
        "SPF liste les serveurs autorisés à envoyer, DKIM signe les mails, DMARC définit la politique en cas d'échec (none / quarantine / reject) et les rapports.",
    },
  ],
  recap: [
    "Modèle OSI : L4 = transport (TCP/UDP, ports), L7 = application (HTTP).",
    "DNS : A/AAAA (IP), CNAME (alias), MX (mail), TXT, NS ; debug avec `dig`.",
    "HTTPS = HTTP + TLS : chiffrement, intégrité, authentification du serveur via certificat.",
    "SSH par clé ed25519, root et mot de passe désactivés.",
    "Préférer SFTP/FTPS à FTP (en clair).",
    "Mail : SMTP pour envoyer, IMAP/POP3S pour lire ; SPF + DKIM + DMARC contre l'usurpation.",
  ],
};
