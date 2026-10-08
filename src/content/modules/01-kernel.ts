import type { DevOpsModule } from "../types";

export const kernelModule: DevOpsModule = {
  id: "kernel",
  codename: "Opération KERNEL",
  title: "Langages & systèmes d'exploitation",
  roadmapSection: "Learn a Programming Language · Operating System",
  roadmapTopics: ["Python", "Go", "Bash", "JavaScript / Node.js", "Ubuntu / Debian", "RHEL & dérivés", "FreeBSD", "Windows"],
  briefing:
    "ENTROPIA a pris le contrôle du sous-sol d'Helix Corp, là où tournent les serveurs. Avant d'automatiser quoi que ce soit, un DevOps doit savoir écrire du code et comprendre le système sur lequel il tourne. Pirate les 5 terminaux du secteur puis rejoins le point d'extraction.",
  challenges: [
    {
      kind: "choice",
      prompt: "Tu dois écrire un petit outil CLI distribué en un seul binaire statique, sans runtime à installer sur les serveurs. Quel langage est le plus adapté ?",
      options: ["Python", "Go", "Bash", "Ruby"],
      correctIndex: 1,
      explanation:
        "Go compile en un binaire statique unique, multiplateforme (`GOOS`/`GOARCH`). C'est pour ça que Docker, Kubernetes, Terraform ou Prometheus sont écrits en Go. Python reste idéal pour le scripting et l'automatisation rapide.",
    },
    {
      kind: "choice",
      prompt: "Quelle famille de distributions Linux utilise le gestionnaire de paquets `dnf` / `yum` et les paquets `.rpm` ?",
      options: ["Debian / Ubuntu", "RHEL / Fedora / Rocky Linux", "Alpine", "Arch Linux"],
      correctIndex: 1,
      explanation:
        "RHEL et ses dérivés (Fedora, Rocky, AlmaLinux, CentOS Stream) utilisent `.rpm` avec `dnf` (successeur de `yum`). Debian/Ubuntu utilisent `.deb` avec `apt`, Alpine utilise `apk`.",
    },
    {
      kind: "command",
      prompt: "Mets à jour l'index des paquets sur un serveur Ubuntu (en root).",
      acceptedAnswers: ["apt update", "apt-get update", "sudo apt update", "sudo apt-get update"],
      hint: "Le gestionnaire de paquets de Debian/Ubuntu commence par « apt ».",
      explanation:
        "`apt update` rafraîchit la liste des paquets disponibles ; `apt upgrade` installe ensuite les nouvelles versions. Ne pas confondre les deux : `update` ne modifie aucun logiciel installé.",
    },
    {
      kind: "choice",
      prompt: "Sous Linux, quel est le rôle du noyau (kernel) ?",
      options: [
        "Fournir l'interface graphique",
        "Gérer le matériel, la mémoire, les processus et les appels système",
        "Interpréter les scripts Bash",
        "Installer les paquets",
      ],
      correctIndex: 1,
      explanation:
        "Le kernel orchestre CPU, mémoire, I/O, systèmes de fichiers et processus. Les programmes lui parlent via des appels système (`syscalls`). Les conteneurs partagent le kernel de l'hôte : c'est ce qui les rend plus légers que des VM.",
    },
    {
      kind: "order",
      prompt: "Remets dans l'ordre la séquence de démarrage d'un serveur Linux.",
      steps: [
        "Firmware BIOS/UEFI : initialisation du matériel",
        "Bootloader (GRUB) : chargement du kernel",
        "Kernel : initialisation des pilotes et montage de la racine",
        "systemd (PID 1) : démarrage des services",
        "Écran de connexion / services prêts",
      ],
      explanation:
        "UEFI → GRUB → kernel → init (`systemd`, PID 1) → services. Savoir où ça bloque (ex. `journalctl -b` pour les logs du boot courant) est essentiel pour diagnostiquer un serveur qui ne redémarre pas.",
    },
  ],
  recap: [
    "Maîtriser au moins un langage de scripting (Python, Bash) et idéalement un langage compilé (Go).",
    "Go produit des binaires statiques : la plupart des outils cloud native sont écrits en Go.",
    "Deux grandes familles Linux en entreprise : Debian/Ubuntu (`apt`, `.deb`) et RHEL (`dnf`, `.rpm`).",
    "Le kernel gère matériel, mémoire et processus ; les conteneurs partagent le kernel de l'hôte.",
    "Boot : UEFI → GRUB → kernel → systemd (PID 1) → services.",
    "Windows Server reste présent en entreprise (IIS, Active Directory, PowerShell).",
  ],
};
