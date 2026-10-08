import type { DevOpsModule } from "../types";

export const puppeteerModule: DevOpsModule = {
  id: "puppeteer",
  codename: "Opération PUPPETEER",
  title: "Gestion de configuration",
  roadmapSection: "Configuration Management",
  roadmapTopics: ["Ansible", "Chef", "Puppet", "Salt"],
  briefing:
    "Des centaines de serveurs ont été reconfigurés par ENTROPIA. Ramène-les tous dans un état connu, de façon automatisée et idempotente.",
  challenges: [
    {
      kind: "choice",
      prompt: "Que signifie « idempotent » pour une tâche de configuration ?",
      options: [
        "Elle s'exécute en parallèle",
        "L'exécuter une ou plusieurs fois produit le même état final",
        "Elle ne peut être lancée qu'une fois",
        "Elle est écrite en Python",
      ],
      correctIndex: 1,
      explanation:
        "Une tâche idempotente vérifie l'état avant d'agir : relancer un playbook ne casse rien et ne change que ce qui dérive. C'est ce qui rend l'automatisation sûre.",
    },
    {
      kind: "choice",
      prompt: "Quelle particularité d'architecture distingue Ansible de Puppet et Chef ?",
      options: [
        "Ansible est agentless : il se connecte en SSH sans agent installé",
        "Ansible ne fonctionne que sous Windows",
        "Ansible nécessite une base de données",
        "Ansible est compilé",
      ],
      correctIndex: 0,
      explanation:
        "Ansible pousse via SSH (WinRM sous Windows), sans agent. Puppet et Chef utilisent des agents qui tirent leur configuration d'un serveur (pull). Salt supporte les deux modes.",
    },
    {
      kind: "command",
      prompt: "Exécute le playbook `site.yml` sur les hôtes de l'inventaire `inventory.ini`.",
      acceptedAnswers: ["ansible-playbook -i inventory.ini site.yml", "ansible-playbook site.yml -i inventory.ini", "ansible-playbook --inventory inventory.ini site.yml"],
      hint: "ansible-playbook -i <inventaire> <playbook>",
      explanation:
        "`--check --diff` simule et affiche les changements : un « dry run » à lancer avant toute exécution en production.",
    },
    {
      kind: "choice",
      prompt: "Dans Ansible, comment réutiliser proprement un ensemble de tâches (installer et configurer Nginx) dans plusieurs playbooks ?",
      options: ["Copier-coller les tâches", "Créer un rôle (role)", "Écrire un script Bash", "Utiliser un cron"],
      correctIndex: 1,
      explanation:
        "Un rôle regroupe `tasks`, `handlers`, `templates`, `defaults`, `vars`. Partage via Ansible Galaxy. Les handlers ne redémarrent un service que si la configuration a changé.",
    },
    {
      kind: "choice",
      prompt: "Terraform ou Ansible : quelle répartition est la plus courante ?",
      options: [
        "Terraform crée l'infrastructure, Ansible configure l'intérieur des machines",
        "Ansible crée les VPC, Terraform installe les paquets",
        "Ils sont interchangeables",
        "Ni l'un ni l'autre en production",
      ],
      correctIndex: 0,
      explanation:
        "Provisioning (créer réseaux, VM, bases) vs configuration (paquets, fichiers, services). Avec des images immuables (Packer) ou des conteneurs, la configuration se déplace au moment du build.",
    },
  ],
  recap: [
    "Gestion de configuration = amener des serveurs vers un état désiré, de façon répétable.",
    "Idempotence : relancer ne change que ce qui dérive.",
    "Ansible : agentless (SSH), YAML, playbooks, rôles, inventaires, `--check --diff`.",
    "Puppet / Chef : agents en mode pull ; Salt : les deux.",
    "Terraform provisionne, Ansible configure.",
    "Tendance : infrastructure immuable (images Packer, conteneurs) plutôt que patcher en place.",
  ],
};
