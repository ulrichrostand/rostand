import { seedFromString } from "../core/rng";
import { progressFromUnknown, type PlayerProgress } from "./progress";

const PREFIX = "SHADOWOPS1";
/** Un vrai code fait quelques Ko : au-delà, c'est une erreur de collage ou une tentative d'abus. */
const MAX_CODE_LENGTH = 50_000;

export class SaveCodeError extends Error {}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function checksum(payload: string): string {
  return seedFromString(payload).toString(36);
}

/**
 * Code texte autonome à copier d'un appareil à l'autre (téléphone ↔ PC).
 * La somme de contrôle détecte un code tronqué ou mal recopié ; ce n'est PAS une protection
 * contre la triche (impossible côté client), seulement contre les erreurs.
 */
export function encodeSaveCode(progress: PlayerProgress): string {
  const payload = toBase64Url(JSON.stringify(progress));
  return `${PREFIX}.${payload}.${checksum(payload)}`;
}

export function decodeSaveCode(rawCode: string): PlayerProgress {
  const code = rawCode.replace(/\s+/g, "");
  if (code.length === 0) throw new SaveCodeError("Le code est vide.");
  if (code.length > MAX_CODE_LENGTH) throw new SaveCodeError("Ce code est beaucoup trop long pour être un code de sauvegarde.");
  const parts = code.split(".");
  if (parts.length !== 3 || parts[0] !== PREFIX) {
    throw new SaveCodeError("Ce n'est pas un code de sauvegarde Shadow Ops (il doit commencer par SHADOWOPS1).");
  }
  const [, payload, receivedChecksum] = parts as [string, string, string];
  if (checksum(payload) !== receivedChecksum) {
    throw new SaveCodeError("Le code est incomplet ou a été modifié. Recopie-le en entier.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fromBase64Url(payload));
  } catch {
    throw new SaveCodeError("Le contenu du code est illisible.");
  }
  return progressFromUnknown(parsed);
}
