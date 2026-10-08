import * as THREE from "three";
import type { TerminalSlot } from "../level/generator";
import { cellToWorld } from "../level/levelScene";

const LOCKED_COLOR = 0xff3b4e;
const HACKED_COLOR = 0x39ff88;

const SCREEN_REFRESH_SECONDS = 0.12;
const SCREEN_WIDTH = 160;
const SCREEN_HEIGHT = 100;
const CODE_FRAGMENTS = [
  "sudo systemctl restart",
  "kubectl get pods -A",
  "docker ps --format",
  "git log --oneline",
  "terraform plan -out",
  "ssh entropia@10.0.4.2",
  "tail -f /var/log/auth",
  "chmod 600 id_ed25519",
  "curl -s https://api",
  "grep -r ERROR /srv",
];

/** Terminal piratable : console avec un écran qui fait défiler du code (rouge verrouillé, vert piraté). */
export class HackTerminal {
  readonly root = new THREE.Group();
  readonly interactionPoint: THREE.Vector3;
  hacked = false;
  private readonly screenTexture: THREE.CanvasTexture;
  private readonly screenContext: CanvasRenderingContext2D;
  private readonly marker: THREE.Mesh<THREE.OctahedronGeometry, THREE.MeshStandardMaterial>;
  private readonly lines: string[] = [];
  private lastRefresh = -Infinity;
  private lineSeed: number;

  constructor(
    readonly slot: TerminalSlot,
    readonly label: string,
  ) {
    this.root.position.copy(cellToWorld(slot.cell));
    this.interactionPoint = cellToWorld(slot.accessCell);
    // L'écran fait face à la case d'accès, d'où le joueur pirate le terminal.
    this.root.rotation.y = slot.accessCell.z > slot.cell.z ? 0 : Math.PI;
    this.lineSeed = slot.cell.x * 31 + slot.cell.z * 17;

    const canvas = document.createElement("canvas");
    canvas.width = SCREEN_WIDTH;
    canvas.height = SCREEN_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D indisponible : impossible de créer l'écran du terminal");
    this.screenContext = context;
    this.screenTexture = new THREE.CanvasTexture(canvas);
    this.screenTexture.colorSpace = THREE.SRGBColorSpace;

    const caseMaterial = new THREE.MeshStandardMaterial({ color: 0x1e262e, metalness: 0.7, roughness: 0.35 });
    const trimMaterial = new THREE.MeshStandardMaterial({ color: 0x0d1115, metalness: 0.5, roughness: 0.6 });
    const console3d = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.05, 0.55), caseMaterial);
    console3d.position.y = 0.52;
    console3d.castShadow = true;
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.5, 0.04), trimMaterial);
    bezel.position.set(0, 0.78, 0.27);
    const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.2), trimMaterial);
    keyboard.position.set(0, 0.52, 0.36);
    keyboard.rotation.x = 0.25;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.65, 0.4),
      new THREE.MeshStandardMaterial({ map: this.screenTexture, emissiveMap: this.screenTexture, emissive: 0xffffff, emissiveIntensity: 1.6 }),
    );
    screen.position.set(0, 0.78, 0.292);
    this.marker = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.16),
      new THREE.MeshStandardMaterial({ color: LOCKED_COLOR, emissive: LOCKED_COLOR, emissiveIntensity: 2.5 }),
    );
    this.marker.position.y = 1.6;
    this.root.add(console3d, bezel, keyboard, screen, this.marker);
    this.drawScreen();
  }

  markHacked(): void {
    this.hacked = true;
    this.marker.visible = false;
    this.drawScreen();
  }

  update(elapsedSeconds: number): void {
    if (!this.hacked) {
      this.marker.rotation.y = elapsedSeconds * 2;
      this.marker.position.y = 1.6 + Math.sin(elapsedSeconds * 3) * 0.08;
    }
    // Rafraîchissement limité : redessiner un canvas et le renvoyer au GPU à chaque frame serait du gaspillage.
    if (elapsedSeconds - this.lastRefresh < SCREEN_REFRESH_SECONDS) return;
    this.lastRefresh = elapsedSeconds;
    this.lines.push(this.nextLine());
    if (this.lines.length > 6) this.lines.shift();
    this.drawScreen();
  }

  private nextLine(): string {
    this.lineSeed = (this.lineSeed * 1103515245 + 12345) & 0x7fffffff;
    if (this.hacked) return `[ OK ] ${CODE_FRAGMENTS[this.lineSeed % CODE_FRAGMENTS.length]}`;
    const hex = (this.lineSeed % 0xffffff).toString(16).padStart(6, "0");
    return this.lineSeed % 3 === 0 ? `ACCESS DENIED 0x${hex}` : `> ${CODE_FRAGMENTS[this.lineSeed % CODE_FRAGMENTS.length]}`;
  }

  private drawScreen(): void {
    const context = this.screenContext;
    const color = this.hacked ? "#39ff88" : "#ff3b4e";
    context.fillStyle = this.hacked ? "#021208" : "#140305";
    context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    context.fillStyle = color;
    context.font = "bold 13px monospace";
    context.fillText(this.hacked ? `${this.label} // ACCÈS OK` : `${this.label} // VERROUILLÉ`, 6, 15);
    context.fillRect(6, 20, SCREEN_WIDTH - 12, 1);
    context.font = "10px monospace";
    context.globalAlpha = 0.85;
    this.lines.forEach((line, index) => context.fillText(line.slice(0, 26), 6, 34 + index * 11));
    context.globalAlpha = 1;
    // Lignes de balayage façon vieux moniteur.
    context.fillStyle = "rgba(0,0,0,0.25)";
    for (let y = 0; y < SCREEN_HEIGHT; y += 3) context.fillRect(0, y, SCREEN_WIDTH, 1);
    this.screenTexture.needsUpdate = true;
  }
}

export class ExtractionZone {
  readonly root = new THREE.Group();
  unlocked = false;
  private readonly ringMaterial = new THREE.MeshBasicMaterial({
    color: LOCKED_COLOR,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  });
  private readonly beam: THREE.Mesh;

  constructor(readonly position: THREE.Vector3) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.8, 32), this.ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 3, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: HACKED_COLOR, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.beam.position.y = 1.5;
    this.beam.visible = false;
    this.root.position.copy(position);
    this.root.add(ring, this.beam);
  }

  unlock(): void {
    this.unlocked = true;
    this.ringMaterial.color.setHex(HACKED_COLOR);
    this.beam.visible = true;
  }

  update(elapsedSeconds: number): void {
    this.ringMaterial.opacity = 0.45 + Math.sin(elapsedSeconds * 4) * 0.2;
  }
}
