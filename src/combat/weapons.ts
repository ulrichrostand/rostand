import { normalizeCommand } from "../challenges/evaluate";
import { SeededRandom } from "../core/rng";

export type WeaponId = "kill" | "docker" | "kubectl";

/** Identité « système » d'une sentinelle : selon le gadget, c'est un processus, un conteneur ou un pod. */
export interface SentinelIdentity {
  pid: number;
  containerId: string;
  containerName: string;
  podName: string;
}

export interface CommandWeapon {
  id: WeaponId;
  label: string;
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
];

export function weaponById(id: WeaponId): CommandWeapon {
  const weapon = WEAPONS.find((candidate) => candidate.id === id);
  if (!weapon) throw new RangeError(`Gadget inconnu : ${id}`);
  return weapon;
}

/** Gadgets débloqués à un point de la campagne : l'arsenal grandit avec ce qu'on a appris. */
export function unlockedWeapons(moduleIds: readonly string[], currentModuleId: string): CommandWeapon[] {
  const currentIndex = moduleIds.indexOf(currentModuleId);
  return WEAPONS.filter((weapon) => {
    const unlockIndex = moduleIds.indexOf(weapon.unlockModuleId);
    return unlockIndex !== -1 && currentIndex >= unlockIndex;
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
    pid: random.int(3000, 9899),
    containerId: randomString(HEX, 12),
    containerName: name,
    podName: `${name}-${randomString(POD_ALPHABET, 9)}-${randomString(POD_ALPHABET, 5)}`,
  };
}
