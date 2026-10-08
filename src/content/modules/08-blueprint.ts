import type { DevOpsModule } from "../types";

export const blueprintModule: DevOpsModule = {
  id: "blueprint",
  codename: "Opération BLUEPRINT",
  title: "Infrastructure as Code : provisioning",
  roadmapSection: "Provisioning",
  roadmapTopics: ["Terraform", "Pulumi", "AWS CloudFormation", "AWS CDK"],
  briefing:
    "Les plans de l'infrastructure ont été dérobés. Reconstruis-la de façon reproductible : en code, versionnée et revue.",
  challenges: [
    {
      kind: "order",
      prompt: "Ordonne le workflow Terraform standard.",
      steps: ["terraform init", "terraform fmt / validate", "terraform plan", "terraform apply", "terraform destroy (fin de vie)"],
      explanation:
        "`init` télécharge providers et configure le backend, `plan` montre le diff, `apply` l'applique. En CI : `plan` sur la PR, `apply` après merge.",
    },
    {
      kind: "choice",
      prompt: "À quoi sert le fichier d'état (state) Terraform ?",
      options: [
        "Stocker le code source des modules",
        "Faire correspondre les ressources du code aux ressources réelles pour calculer les changements",
        "Remplacer le DNS",
        "Gérer les utilisateurs",
      ],
      correctIndex: 1,
      explanation:
        "Le state lie chaque ressource à son ID réel. En équipe : backend distant (S3 + verrou, Terraform Cloud, GCS) avec verrouillage. Le state peut contenir des secrets : chiffré et jamais commité.",
    },
    {
      kind: "command",
      prompt: "Affiche les changements que Terraform appliquerait, sans rien modifier.",
      acceptedAnswers: ["terraform plan"],
      hint: "terraform + le verbe qui « planifie ».",
      explanation:
        "`terraform plan -out=tfplan` puis `terraform apply tfplan` garantit qu'on applique exactement ce qui a été revu.",
    },
    {
      kind: "choice",
      prompt: "Quelqu'un modifie une ressource à la main dans la console cloud. Comment s'appelle cet écart ?",
      options: ["Un rollback", "Une dérive (drift)", "Un fork", "Un hotfix"],
      correctIndex: 1,
      explanation:
        "Le drift rend l'infra imprévisible ; `terraform plan` le détecte. Règle d'or : toute modification passe par le code et la revue.",
    },
    {
      kind: "choice",
      prompt: "Pulumi et AWS CDK se distinguent de Terraform par :",
      options: [
        "L'absence de state",
        "L'usage de langages de programmation généralistes (TypeScript, Python, Go...) au lieu de HCL",
        "Le fait qu'ils ne fonctionnent qu'on-premise",
        "Leur nature impérative uniquement",
      ],
      correctIndex: 1,
      explanation:
        "Terraform/OpenTofu utilisent HCL (déclaratif). Pulumi et CDK permettent boucles, classes et tests unitaires. CDK génère du CloudFormation (AWS uniquement) ; Pulumi est multi-cloud.",
    },
  ],
  recap: [
    "IaC : infrastructure déclarée en code, versionnée, revue et reproductible.",
    "Terraform : `init` → `plan` → `apply` ; OpenTofu en est le fork open source.",
    "State distant, verrouillé et chiffré ; jamais dans Git.",
    "Le drift (modif manuelle) est l'ennemi : tout passe par le code.",
    "Modules réutilisables pour éviter la duplication (DRY).",
    "CloudFormation/CDK (AWS), Pulumi (langages généralistes, multi-cloud).",
  ],
};
