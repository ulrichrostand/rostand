import type { ScenarioStep } from "../content/types";
import { normalizeCommand } from "./evaluate";

/**
 * Commandes que le faux terminal « connaît » : les autres déclenchent un vrai message bash
 * « command not found », ce qui apprend aussi à repérer une faute de frappe.
 */
const KNOWN_COMMANDS = new Set([
  "echo", "whoami", "date", "clear", "pwd", "cd", "ls", "cat", "less", "tail", "head", "grep", "chmod", "chown",
  "sudo", "apt", "apt-get", "systemctl", "journalctl", "git", "ping", "dig", "nslookup", "curl", "ssh", "exit",
  "nginx", "ufw", "iptables", "docker", "aws", "terraform", "ansible", "ansible-playbook", "gh", "npm", "vault",
  "kubectl", "argocd", "top", "htop", "ps", "kill", "pg_restore", "mkdir", "rm", "cp", "mv", "touch", "man",
]);

/** Les motifs sont écrits par nous (contenu du jeu), jamais par l'utilisateur : pas de risque de ReDoS externe. */
function matchesPattern(pattern: string, command: string): boolean {
  try {
    return new RegExp(`^(?:${pattern})$`).test(command);
  } catch (error) {
    console.error(`Motif de scénario invalide : ${pattern}`, error);
    return false;
  }
}

export function isStepCommandCorrect(step: ScenarioStep, typedCommand: string): boolean {
  const normalized = normalizeCommand(typedCommand);
  if (normalized.length === 0) return false;
  if (step.accepted.some((accepted) => normalizeCommand(accepted) === normalized)) return true;
  return (step.patterns ?? []).some((pattern) => matchesPattern(pattern, normalized));
}

/** Réponse réaliste du terminal à une commande qui ne fait pas ce qui est demandé. */
export function simulateWrongCommand(typedCommand: string): string[] {
  const normalized = normalizeCommand(typedCommand);
  const program = normalized.split(" ")[0] ?? "";
  if (program.length === 0) return [];
  if (!KNOWN_COMMANDS.has(program)) return [`bash: ${program}: command not found`];
  return ["(la commande s'exécute, mais ce n'est pas ce qui est demandé à cette étape)"];
}

/** Commande montrée quand on révèle la solution : la première forme acceptée, la plus canonique. */
export function canonicalCommand(step: ScenarioStep): string {
  return step.accepted[0] ?? "";
}
