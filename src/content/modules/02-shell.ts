import type { DevOpsModule } from "../types";

export const shellModule: DevOpsModule = {
  id: "shell",
  codename: "Opération SHELL",
  title: "Maîtrise du terminal",
  roadmapSection: "Terminal Knowledge",
  roadmapTopics: ["Bash scripting", "Text manipulation", "Process monitoring", "Performance monitoring", "Networking tools", "Vim / Nano / Emacs"],
  briefing:
    "Les consoles de maintenance du secteur B n'ont pas d'interface graphique : uniquement un shell. Prouve que tu sais lire des logs, surveiller des processus et diagnostiquer le réseau en ligne de commande.",
  challenges: [
    {
      kind: "command",
      prompt: "Affiche uniquement les lignes contenant « ERROR » dans le fichier `app.log`.",
      acceptedAnswers: ["grep ERROR app.log", "grep 'ERROR' app.log", "grep \"ERROR\" app.log", "cat app.log | grep ERROR"],
      hint: "L'outil de recherche de motif par excellence : g...p",
      explanation:
        "`grep MOTIF fichier` filtre les lignes. Options utiles : `-i` (insensible à la casse), `-v` (inverser), `-r` (récursif), `-c` (compter). Évite `cat fichier | grep` : `grep` lit le fichier directement.",
    },
    {
      kind: "command",
      prompt: "Suis en temps réel les nouvelles lignes ajoutées à `/var/log/syslog`.",
      acceptedAnswers: ["tail -f /var/log/syslog", "tail -F /var/log/syslog"],
      hint: "La commande qui lit la fin d'un fichier, avec l'option « follow ».",
      explanation:
        "`tail -f` suit le fichier ; `tail -F` continue même si le fichier est remplacé (rotation de logs). Sur systemd : `journalctl -f`.",
    },
    {
      kind: "choice",
      prompt: "Un serveur rame. Quelle commande donne une vue interactive de la charge CPU, mémoire et des processus les plus gourmands ?",
      options: ["ls -la", "top (ou htop)", "chmod", "df -h"],
      correctIndex: 1,
      explanation:
        "`top`/`htop` montrent load average, CPU, RAM et processus. Pour le disque : `df -h` (espace) et `iostat` (I/O). Mémoire : `free -h`. Processus : `ps aux`. Le load average se lit par rapport au nombre de cœurs.",
    },
    {
      kind: "choice",
      prompt: "Quelle commande indique quel processus écoute sur le port 8080 ?",
      options: ["ping 8080", "ss -tulpn | grep 8080", "traceroute 8080", "curl 8080"],
      correctIndex: 1,
      explanation:
        "`ss -tulpn` (ou l'ancien `netstat -tulpn`) liste les sockets en écoute avec le PID. Autres outils réseau : `ping` (ICMP), `traceroute`/`mtr` (chemin), `dig`/`nslookup` (DNS), `curl` (HTTP), `nc` (TCP brut), `tcpdump` (capture).",
    },
    {
      kind: "choice",
      prompt: "En début de script Bash, que fait `set -euo pipefail` ?",
      options: [
        "Active le mode debug",
        "Arrête le script à la première erreur, sur variable non définie et si une commande d'un pipe échoue",
        "Exécute le script en root",
        "Désactive l'affichage",
      ],
      correctIndex: 1,
      explanation:
        "`-e` stoppe sur erreur, `-u` refuse les variables non définies, `-o pipefail` propage l'échec d'une commande au milieu d'un pipe. Sans ça, un script de déploiement peut continuer silencieusement après une erreur.",
    },
  ],
  recap: [
    "`grep`, `sed`, `awk`, `cut`, `sort`, `uniq`, `wc` : la boîte à outils de manipulation de texte.",
    "`tail -f` / `journalctl -f` pour suivre les logs en direct.",
    "Processus et perf : `ps`, `top`/`htop`, `free -h`, `df -h`, `iostat`, `vmstat`, `lsof`.",
    "Réseau : `ss -tulpn`, `ping`, `traceroute`, `dig`, `curl`, `nc`, `tcpdump`.",
    "Scripts robustes : `set -euo pipefail`, variables entre guillemets, `shellcheck` pour linter.",
    "Savoir éditer un fichier avec `vim` ou `nano` en SSH (`:wq` pour sauver et quitter vim).",
  ],
};
