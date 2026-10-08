import type { DevOpsModule } from "../types";

export const packetModule: DevOpsModule = {
  id: "packet",
  codename: "Opération PACKET",
  title: "Les bases du réseau",
  roadmapSection: "Networking & Protocols",
  roadmapTopics: ["Adresse IP", "DNS", "Ports", "HTTP / HTTPS", "SSH"],
  briefing:
    "Le centre de télécommunications d'Helix Corp est tombé. Pour rerouter le trafic, il faut comprendre comment les machines se trouvent et se parlent sur un réseau.",
  lessons: [
    {
      title: "L'adresse IP",
      summary:
        "Chaque machine sur un réseau a une adresse IP, par exemple `192.168.1.10`. C'est grâce à elle que les données savent où aller.",
      analogy: "L'adresse IP, c'est l'adresse postale de la machine : sans elle, le facteur ne sait pas où livrer le colis.",
      keyPoint: "Une adresse IP identifie une machine sur le réseau.",
    },
    {
      title: "Le DNS",
      summary:
        "Personne ne retient des adresses comme `142.250.74.110`. Le DNS traduit un nom facile (`google.com`) en adresse IP. C'est la première étape quand tu ouvres un site.",
      analogy: "Le DNS est l'annuaire du téléphone d'Internet : tu cherches un nom, il te donne le numéro.",
      keyPoint: "Le DNS traduit un nom de domaine en adresse IP.",
    },
    {
      title: "Les ports",
      summary:
        "Une machine peut offrir plusieurs services en même temps. Chacun écoute sur un port numéroté : 80 pour le web (HTTP), 443 pour le web sécurisé (HTTPS), 22 pour SSH.",
      analogy: "Si l'IP est l'adresse de l'immeuble, le port est le numéro de l'appartement.",
      keyPoint: "Ports à connaître : 80 (HTTP), 443 (HTTPS), 22 (SSH).",
    },
    {
      title: "HTTP et HTTPS",
      summary:
        "HTTP est le langage du web : le navigateur demande une page, le serveur répond avec un code. 200 = OK, 404 = page introuvable, 500 = erreur du serveur. HTTPS, c'est HTTP chiffré : personne ne peut lire ce qui passe (le petit cadenas).",
      analogy: "HTTP, c'est une carte postale lisible par tous ; HTTPS, une lettre dans une enveloppe scellée.",
      keyPoint: "HTTPS chiffre les échanges ; codes HTTP : 200 OK, 404 introuvable, 500 erreur serveur.",
    },
    {
      title: "SSH : se connecter à distance",
      summary:
        "SSH permet d'ouvrir un terminal sur un serveur distant, de façon chiffrée. On tape `ssh utilisateur@adresse`.",
      analogy: "C'est une télécommande sécurisée qui te permet de piloter un ordinateur à l'autre bout du monde.",
      example: { code: "ssh deploy@10.0.0.5", meaning: "Se connecte au serveur 10.0.0.5 avec l'utilisateur deploy." },
      keyPoint: "`ssh utilisateur@adresse` ouvre un terminal sécurisé sur un serveur distant.",
    },
  ],
  challenges: [
    {
      kind: "choice",
      prompt: "À quoi sert une adresse IP ?",
      options: ["À chiffrer un mot de passe", "À identifier une machine sur le réseau", "À nommer un fichier", "À mesurer la vitesse d'Internet"],
      correctIndex: 1,
      explanation: "L'adresse IP indique où envoyer les données, comme une adresse postale.",
    },
    {
      kind: "choice",
      prompt: "Que fait le DNS ?",
      options: [
        "Il traduit un nom de domaine (google.com) en adresse IP",
        "Il bloque les virus",
        "Il accélère la connexion Wi-Fi",
        "Il stocke les mots de passe",
      ],
      correctIndex: 0,
      explanation: "Le DNS est l'annuaire d'Internet : nom → adresse IP.",
    },
    {
      kind: "choice",
      prompt: "Sur quel port un site en HTTPS répond-il par défaut ?",
      options: ["22", "80", "443", "8080"],
      correctIndex: 2,
      explanation: "443 pour HTTPS, 80 pour HTTP, 22 pour SSH.",
    },
    {
      kind: "choice",
      prompt: "Ton navigateur affiche « Erreur 404 ». Qu'est-ce que ça veut dire ?",
      options: ["Le serveur a planté", "La page demandée est introuvable", "Tout va bien", "Le mot de passe est faux"],
      correctIndex: 1,
      explanation: "404 = introuvable. 500 indiquerait une panne côté serveur, 200 que tout va bien.",
    },
    {
      kind: "command",
      prompt: "Connecte-toi en SSH au serveur 10.0.0.5 avec l'utilisateur deploy.",
      acceptedAnswers: ["ssh deploy@10.0.0.5", "ssh -l deploy 10.0.0.5"],
      hint: "ssh utilisateur@adresse",
      explanation: "`ssh deploy@10.0.0.5` ouvre un terminal sécurisé sur le serveur.",
    },
  ],
};
