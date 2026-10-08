import { normalizeCommand } from "../challenges/evaluate";
import { SeededRandom } from "../core/rng";

export type WeaponId = "kill" | "docker" | "kubectl" | "firewall";
export type TargetKind = "sentinel" | "camera";

/**
 * Identité « système » d'une cible : une sentinelle est un processus, un conteneur ou un pod selon le gadget ;
 * une caméra est une machine du réseau (adresse IP) qui envoie son flux à la salle de contrôle.
 */
export interface SentinelIdentity {
  kind: TargetKind;
  pid: number;
  containerId: string;
  /** Nom affiché (sentinelle-3, cam-02) ; c'est aussi le nom du conteneur. */
  containerName: string;
  podName: string;
  ip: string;
}

export interface CommandWeapon {
  id: WeaponId;
  label: string;
  /** Type de cible visé : on ne « kill » pas une caméra, on ne filtre pas une sentinelle au pare-feu. */
  targetKind: TargetKind;
  /** Module de la campagne à partir duquel le gadget est disponible. */
  unlockModuleId: string;
  /** Commande de repérage affichée dans le panneau (on apprend aussi à lire sa sortie). */
  listingCommand: string;
  objective: string;
  hint: string;
  /** Précision pédagogique affichée sous la sortie de la commande. */
  note: string;
  listing(target: SentinelIdentity): string[];
  acceptedCommands(target: SentinelIdentity): string[];
}

const KILL_SIGNALS = ["", "-9 ", "-15 ", "-KILL ", "-TERM ", "-SIGKILL ", "-SIGTERM "];

export const WEAPONS: readonly CommandWeapon[] = [
  {
    id: "kill",
    label: "kill",
    targetKind: "sentinel",
    unlockModuleId: "kernel",
    listingCommand: "ps aux",
    objective: "Repère le PID du processus de la sentinelle, puis arrête-le.",
    hint: "kill suivi du PID (le numéro de la colonne PID sur la ligne de la sentinelle).",
    note: "`ps aux` liste tous les processus. Ne te trompe pas de ligne : arrêter sshd couperait ton propre accès !",
    listing: (target) => [
      "USER       PID  COMMAND",
      "root         1  /sbin/init",
      "root       812  /usr/sbin/sshd -D",
      "www-data  1290  nginx: worker process",
      `entropia  ${String(target.pid).padStart(4, " ")}  ${target.containerName} --patrol`,
      "postgres  2201  postgres: writer process",
    ],
    acceptedCommands: (target) => KILL_SIGNALS.map((signal) => `kill ${signal}${target.pid}`),
  },
  {
    id: "docker",
    label: "docker",
    targetKind: "sentinel",
    unlockModuleId: "container",
    listingCommand: "docker ps",
    objective: "La sentinelle tourne dans un conteneur : arrête-le par son nom.",
    hint: "docker stop suivi du nom du conteneur (colonne NAMES).",
    note: "`docker ps` liste les conteneurs actifs. On peut viser un conteneur par son nom ou son identifiant.",
    listing: (target) => [
      "CONTAINER ID   IMAGE               STATUS          NAMES",
      "3f2a1c9e8b7d   nginx:1.27          Up 3 hours      web",
      "9b1e77aa0c42   postgres:16         Up 3 hours      db",
      `${target.containerId}   entropia/sentinel   Up 12 minutes   ${target.containerName}`,
    ],
    acceptedCommands: (target) =>
      ["docker stop", "docker kill", "docker container stop", "docker container kill", "docker rm -f"].flatMap((verb) => [
        `${verb} ${target.containerName}`,
        `${verb} ${target.containerId}`,
      ]),
  },
  {
    id: "kubectl",
    label: "kubectl",
    targetKind: "sentinel",
    unlockModuleId: "helm",
    listingCommand: "kubectl get pods",
    objective: "La sentinelle est un pod Kubernetes : supprime-le.",
    hint: "kubectl delete pod suivi du nom complet du pod (colonne NAME).",
    note: "Ce pod n'est géré par aucun Deployment : une fois supprimé, Kubernetes ne le recréera pas.",
    listing: (target) => [
      "NAME                               READY   STATUS    AGE",
      "web-7d9f8c6b5-x2k4p                1/1     Running   3h",
      "api-5c8d7f9b4-qm7nz                1/1     Running   3h",
      `${target.podName.padEnd(34, " ")} 1/1     Running   12m`,
    ],
    acceptedCommands: (target) => [
      `kubectl delete pod ${target.podName}`,
      `kubectl delete pods ${target.podName}`,
      `kubectl delete po ${target.podName}`,
      `kubectl delete pod/${target.podName}`,
    ],
  },
  {
    id: "firewall",
    label: "pare-feu",
    targetKind: "camera",
    unlockModuleId: "gateway",
    listingCommand: "sudo tcpdump -c 3 port 554",
    objective: "La caméra envoie son flux vidéo à la salle de contrôle. Bloque son adresse IP dans le pare-feu.",
    hint: "sudo ufw deny from suivi de l'adresse IP de la caméra (après « IP » dans la sortie).",
    note: "Tu es sur le serveur de la salle de contrôle : refuser tout ce qui vient de l'IP de la caméra coupe son flux, définitivement.",
    listing: (target) => [
      `IP ${target.ip}.48122 > 10.0.0.9.554: RTSP flux vidéo ${target.containerName}`,
      `IP ${target.ip}.48122 > 10.0.0.9.554: RTSP flux vidéo ${target.containerName}`,
      "IP 10.0.0.12.51734 > 10.0.0.9.554: RTSP flux vidéo cam-hall",
    ],
    acceptedCommands: (target) => [
      `ufw deny from ${target.ip}`,
      `ufw deny from ${target.ip} to any`,
      `ufw insert 1 deny from ${target.ip}`,
      `iptables -A INPUT -s ${target.ip} -j DROP`,
      `iptables -I INPUT -s ${target.ip} -j DROP`,
    ],
  },
];

export function weaponById(id: WeaponId): CommandWeapon {
  const weapon = WEAPONS.find((candidate) => candidate.id === id);
  if (!weapon) throw new RangeError(`Gadget inconnu : ${id}`);
  return weapon;
}

/** Gadgets débloqués à un point de la campagne : l'arsenal grandit avec ce qu'on a appris. */
export function unlockedWeapons(moduleIds: readonly string[], currentModuleId: string, targetKind?: TargetKind): CommandWeapon[] {
  const currentIndex = moduleIds.indexOf(currentModuleId);
  return WEAPONS.filter((weapon) => {
    const unlockIndex = moduleIds.indexOf(weapon.unlockModuleId);
    const kindMatches = targetKind === undefined || weapon.targetKind === targetKind;
    return kindMatches && unlockIndex !== -1 && currentIndex >= unlockIndex;
  });
}

export function isWeaponCommandCorrect(weapon: CommandWeapon, target: SentinelIdentity, typedCommand: string): boolean {
  const normalized = normalizeCommand(typedCommand);
  if (normalized.length === 0) return false;
  return weapon.acceptedCommands(target).some((accepted) => normalizeCommand(accepted) === normalized);
}

const HEX = "0123456789abcdef";
const POD_ALPHABET = "bcdfghjklmnpqrstvwxz2456789";

/** Identités déterministes : mêmes PID d'une partie à l'autre pour un même secteur. */
export function createSentinelIdentity(seed: number, sentinelNumber: number): SentinelIdentity {
  const random = new SeededRandom(seed + sentinelNumber * 104729);
  const randomString = (alphabet: string, length: number): string =>
    Array.from({ length }, () => alphabet[random.int(0, alphabet.length - 1)]).join("");
  const name = `sentinelle-${sentinelNumber}`;
  return {
    kind: "sentinel",
    pid: random.int(3000, 9899),
    containerId: randomString(HEX, 12),
    containerName: name,
    podName: `${name}-${randomString(POD_ALPHABET, 9)}-${randomString(POD_ALPHABET, 5)}`,
    ip: `10.0.8.${random.int(10, 250)}`,
  };
}

export function createCameraIdentity(seed: number, cameraNumber: number): SentinelIdentity {
  const random = new SeededRandom(seed + cameraNumber * 7919 + 17);
  const name = `cam-${String(cameraNumber).padStart(2, "0")}`;
  return {
    kind: "camera",
    pid: random.int(3000, 9899),
    containerId: name,
    containerName: name,
    podName: name,
    // Plage dédiée aux caméras, distincte des adresses de la sortie tcpdump (10.0.0.x).
    ip: `10.0.7.${random.int(20, 250)}`,
  };
}
