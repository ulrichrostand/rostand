# SHADOW OPS — DevOps Infiltration

Jeu d'infiltration **3D** (façon *Splinter Cell*) pour apprendre le DevOps en suivant la roadmap
[roadmap.sh/devops](https://roadmap.sh/devops).

> Le collectif ENTROPIA a pris le contrôle de l'infrastructure d'Helix Corp. Tu es **Spectre**,
> agent de la cellule Écho. Traverse 15 secteurs, pirate leurs terminaux en maîtrisant les notions
> DevOps, et reste dans l'ombre.

## Principe

- **1 module de la roadmap = 1 mission** dans un complexe 3D généré (salles, couloirs, racks serveurs).
- Chaque mission contient **5 terminaux** à pirater : chacun est un défi (QCM, commande à taper, séquence à remettre dans l'ordre).
- Des **gardes** patrouillent avec un **cône de vision** visible, bloqué par les murs et les racks. S'accroupir réduit leur portée de vue, courir fait du bruit.
- Une mauvaise réponse **fait du bruit** : les gardes proches viennent inspecter le terminal.
- Après 2 erreurs, la réponse est révélée avec son explication : le but est d'apprendre, pas de bloquer.
- En fin de mission : **débriefing** avec score, étoiles, statut « Fantôme » (0 détection), **récapitulatif des points clés** et **revue de chaque terminal** (les questions ratées sont marquées « À revoir »).
- Chaque module terminé débloque le suivant ; son **dossier** (récap) reste consultable depuis la carte.
- Progression sauvegardée localement (localStorage).

## Parcours (aligné sur roadmap.sh/devops)

| # | Mission | Section de la roadmap |
|---|---------|-----------------------|
| 1 | KERNEL | Learn a Programming Language · Operating System |
| 2 | SHELL | Terminal Knowledge (bash, texte, processus, perf, réseau, éditeurs) |
| 3 | BRANCH | Version Control Systems · VCS Hosting |
| 4 | PACKET | Networking & Protocols (OSI, DNS, HTTP/S, TLS, SSH, mail) |
| 5 | GATEWAY | What is and how to setup X (proxies, LB, cache, firewall, Nginx) |
| 6 | CONTAINER | Containers (Docker, LXC) |
| 7 | NIMBUS | Cloud Providers · Serverless |
| 8 | BLUEPRINT | Provisioning (Terraform, Pulumi, CloudFormation, CDK) |
| 9 | PUPPETEER | Configuration Management (Ansible, Chef, Puppet, Salt) |
| 10 | PIPELINE | CI/CD Tools · Artifact Management |
| 11 | VAULT | Secret Management |
| 12 | HELM | Container Orchestration (Kubernetes, EKS/GKE/AKS, ECS…) |
| 13 | SYNC | GitOps · Service Mesh |
| 14 | WATCHTOWER | Infrastructure Monitoring · Logs Management · Observability |
| 15 | ARCHITECT | Cloud Design Patterns |

L'ordre suit la roadmap, avec deux ajustements pédagogiques : le réseau est vu avant les proxies,
et les conteneurs avant le cloud (prérequis du serverless et de Kubernetes).

## Commandes

| Touche | Action |
|--------|--------|
| ZQSD / WASD / flèches | Se déplacer (touches physiques : AZERTY et QWERTY) |
| Maj | Courir (bruyant) |
| C | S'accroupir (discret) |
| E | Pirater un terminal |
| N | Vision nocturne |
| Échap | Pause |

**Sur mobile / tablette** (détecté automatiquement) : joystick flottant sous le pouce gauche
(le pousser au-delà de l'anneau fait courir), boutons à droite : Pirater (s'allume près d'un
terminal), Accroupir, Vision, Pause. La caméra recule automatiquement en mode portrait.

## Lancer le projet

```bash
npm ci
npm run dev        # serveur de développement
npm test           # tests unitaires (vitest)
npm run build      # typecheck + build de production dans dist/
npm run preview    # sert le build
```

Le workflow `.github/workflows/ci.yml` lance typecheck, tests et build à chaque PR, puis déploie
sur **GitHub Pages** à chaque push sur `main` (activer *Settings → Pages → Source : GitHub Actions*).

## Architecture

```
src/
  core/        grille, pathfinding BFS, ligne de vue DDA, RNG déterministe, entrées, sons
  level/       génération procédurale BSP + construction de la scène Three.js
  entities/    joueur, gardes (machine à états patrouille/suspicion/inspection), terminaux
  game/        boucle de mission, difficulté, score, progression
  challenges/  évaluation des réponses (pure, testée)
  content/     les 15 modules (questions, explications, récapitulatifs)
  ui/          HUD + minimap, écrans, panneau de piratage, contrôles tactiles
tests/         génération des niveaux, IA des gardes, contenu, score, sauvegarde, joystick
```

Ajouter ou modifier une notion = éditer un fichier de `src/content/modules/` ; le test
`tests/logic.test.ts` vérifie la cohérence du contenu (index de bonne réponse, commandes acceptées…).

### Choix techniques

- **Three.js + Vite + TypeScript strict**, aucune dépendance runtime autre que Three.js.
- Niveaux **générés de façon déterministe** (graine = id du module) : les rondes sont identiques d'une partie à l'autre, on peut les apprendre. Chaque niveau généré est validé (tous les terminaux et la sortie accessibles) et testé pour les 15 modules.
- Cônes de vision **découpés contre les murs** par lancer de rayons sur la grille (DDA, O(distance)).
- Murs et racks en `InstancedMesh`, éclairage plafonné : fluide sur un portable.
- Sécurité : tout le texte passe par `textContent` (aucun `innerHTML`), CSP stricte dans `index.html`, sauvegarde locale validée avant usage.

## Limites connues

- Nécessite WebGL.
- Les défis « commande » sont plus confortables avec un clavier physique (clavier virtuel sur mobile).
