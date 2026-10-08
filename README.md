# SHADOW OPS — DevOps Infiltration

Jeu d'infiltration **3D** (façon *Splinter Cell*) pour apprendre le DevOps en suivant la roadmap
[roadmap.sh/devops](https://roadmap.sh/devops).

> Le collectif ENTROPIA a pris le contrôle de l'infrastructure d'Helix Corp. Tu es **Spectre**,
> agent de la cellule Écho. Traverse 16 secteurs, pirate leurs terminaux en maîtrisant les notions
> DevOps, et reste dans l'ombre.

## Principe

Pensé pour un **grand débutant** : aucune connaissance requise, on part de « c'est quoi un serveur ? ».

- **1 module de la roadmap = 1 mission** dans un complexe 3D généré (salles, couloirs, racks serveurs).
- **Apprendre** : chaque mission contient **5 dossiers jaunes** à ramasser. Chacun est une leçon courte :
  explication simple, analogie de la vie courante, exemple de commande, point à retenir.
- **Prouver** : **5 terminaux** à pirater, un par leçon (QCM, commande à taper, étapes à remettre dans l'ordre).
  Si tu arrives à un terminal sans avoir lu son dossier, la cellule Écho te transmet la leçon d'abord :
  jamais de question sans cours. Le dossier reste consultable pendant la question.
- **Pratiquer** : chaque secteur a une **console principale** (terminal bleu) : un vrai incident à résoudre
  en enchaînant 4 à 6 commandes dans un faux terminal qui répond comme les vrais outils
  (installer et vérifier nginx, publier un correctif avec Git, diagnostiquer le réseau couche par couche,
  déployer un conteneur, `terraform plan/apply`, réparer une CI rouge, sauver un pod en `CrashLoopBackOff`…).
  Historique avec les flèches, `command not found` pour une faute de frappe, solution proposée après 2 erreurs.
- **Combattre** :
  - **Pistolet IEM** (clic gauche ou Espace, visée à la souris ; bouton Tirer avec visée automatique sur mobile) :
    neutralise une sentinelle **dans ton champ de tir**, brouille une caméra 12 s. Munitions limitées
    (un terminal piraté = +1), et le tir fait du bruit : les gardes proches viennent voir.
  - **Neutralisation silencieuse** (E) : approche une sentinelle par derrière sans être repéré.
  - **Gadgets = vraies commandes DevOps** (F) : les sentinelles sont des processus, des conteneurs puis des pods.
    On lit la sortie de `ps aux` / `docker ps` / `kubectl get pods` et on tape `kill <PID>`,
    `docker stop <nom>` ou `kubectl delete pod <nom>`. L'arsenal se débloque au fil des modules ;
    chaque terminal piraté recharge le gadget. Une commande fausse fait du bruit.
  - **Pare-feu** (gadget, à partir du module GATEWAY) : on lit le flux de la caméra avec `tcpdump`
    et on bloque son IP avec `ufw deny from <IP>` (ou `iptables … -j DROP`) : caméra coupée définitivement.
- Les **sentinelles** ont un **cône de vision** visible, bloqué par les murs et les racks. S'accroupir réduit leur portée, courir fait du bruit.
- Les **caméras de surveillance** (dès le module 1) balaient la salle : si elles te voient trop longtemps, c'est l'alerte.
- En fin de mission : **débriefing** (score, étoiles, dossiers, neutralisations, statut « Fantôme »),
  **récapitulatif**, **tous les dossiers du module** et **revue de chaque terminal**. Le cours reste consultable depuis la carte.
- **Mode examen** (carte des opérations) : pour chaque module terminé, un examen chronométré de 8 questions
  (les 5 défis + 3 commandes de pratique tirées au sort, formulées sans donner la commande), et un
  **examen général** de 12 questions mélangeant tous les secteurs libérés. Une seule réponse par question,
  aucun indice, **note sur 20** avec mention, **correction détaillée** à la fin, meilleure note sauvegardée.
- **Son** : ambiance de salle serveur entièrement synthétisée (bourdonnement, ventilation, bips de machines)
  avec un **bourdon de tension qui monte quand tu es repéré**. Activable/désactivable depuis l'écran titre ou la pause.
- **Sauvegarde** :
  - automatique à chaque terminal piraté, dossier ramassé, sentinelle neutralisée et à chaque pause (témoin « 💾 Sauvegardé ») ;
  - **reprise de mission** depuis l'écran titre ou la carte, exactement où tu l'as laissée ;
  - **code de sauvegarde** (menu 💾 Sauvegarde) à copier puis importer pour passer du téléphone au PC.
    Le code est vérifié (somme de contrôle + validation stricte du contenu) avant d'être importé.

## Parcours (aligné sur roadmap.sh/devops)

| # | Mission | Section de la roadmap |
|---|---------|-----------------------|
| 0 | GENESIS | Introduction : serveur, Dev + Ops, terminal, automatisation (tutoriel) |
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
| Souris + clic gauche (ou Espace) | Viser et tirer au pistolet IEM |
| Maj | Courir (bruyant) |
| C | S'accroupir (discret) |
| E | Pirater un terminal / ouvrir la console principale / neutraliser une sentinelle par derrière |
| F | Gadget : arrêter une sentinelle ou couper une caméra avec une vraie commande |
| N | Vision nocturne |
| Échap | Pause |

**Sur mobile / tablette** (détecté automatiquement) : joystick flottant sous le pouce gauche
(le pousser au-delà de l'anneau fait courir), boutons à droite : Pirater/Neutraliser (selon
la situation), Tirer, Gadget, Accroupir, Vision, Pause. La caméra recule automatiquement en mode portrait.

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
  combat/      gadgets-commandes (kill, docker, kubectl, pare-feu) et identités des cibles
  core/        grille, pathfinding BFS, ligne de vue DDA, RNG déterministe, entrées, sons + ambiance, réglages
  level/       génération procédurale BSP + construction de la scène Three.js
  render/      pipeline de rendu (bloom, vignette, ombres) selon la qualité
  entities/    joueur, sentinelles (patrouille/suspicion/inspection/neutralisée), caméras, terminaux, dossiers
  game/        boucle de mission, difficulté, score, examen, progression, points de reprise, code de sauvegarde
  challenges/  évaluation des réponses et des commandes de scénario (pure, testée)
  content/     les 16 modules (leçons, questions, explications) et leurs interventions pratiques
  ui/          HUD + minimap, écrans, panneaux (leçon, piratage, console, gadget, examen), contrôles tactiles
tests/         niveaux, IA, caméras, gadgets, scénarios, examen, ambiance, contenu, score, sauvegarde, joystick
```

Ajouter ou modifier une notion = éditer un fichier de `src/content/modules/` ; le test
`tests/logic.test.ts` vérifie la cohérence du contenu (index de bonne réponse, commandes acceptées…).
Les interventions pratiques sont dans `src/content/scenarios.ts` : une étape avec un champ `exam`
devient aussi une question d'examen (`tests/exam.test.ts` vérifie qu'elle ne donne pas la réponse
et qu'aucune commande n'est posée deux fois).

### Graphismes

- Post-traitement : **bloom** (néons, écrans, visières, LED), vignettage, ton ACES.
- **Ombres douces** dynamiques autour du joueur (qualité haute).
- Décor procédural (aucune image à télécharger) : murs en panneaux avec bande lumineuse,
  sol métallique, réglettes et flaques de lumière, néons qui grésillent, câbles, grilles,
  poussière en suspension, **couleur d'ambiance propre à chaque secteur**.
- Personnages articulés avec cycle de marche et accroupissement ; cônes de vision en dégradé ;
  écrans de terminaux animés.
- **Qualité réglable** (Haute / Moyenne / Basse) depuis l'écran titre ou la pause, choisie
  automatiquement (Moyenne sur mobile) et **abaissée automatiquement** si le jeu passe sous ~40 images/s.

### Choix techniques

- **Three.js + Vite + TypeScript strict**, aucune dépendance runtime autre que Three.js.
- Niveaux **générés de façon déterministe** (graine = id du module) : les rondes sont identiques d'une partie à l'autre, on peut les apprendre. Chaque niveau généré est validé (tous les terminaux et la sortie accessibles) et testé pour les 16 modules.
- Cônes de vision **découpés contre les murs** par lancer de rayons sur la grille (DDA, O(distance)).
- Murs et racks en `InstancedMesh`, éclairage plafonné : fluide sur un portable.
- Sécurité : tout le texte passe par `textContent` (aucun `innerHTML`), CSP stricte dans `index.html`, sauvegarde locale validée avant usage.

## Limites connues

- Nécessite WebGL.
- Les défis « commande » sont plus confortables avec un clavier physique (clavier virtuel sur mobile).
