import * as THREE from "three";

/**
 * Squelette minimal partagé par l'agent et les sentinelles : des groupes pivots (épaules, hanches)
 * qu'on fait osciller pour la marche. Pas de skinning : quelques rotations suffisent à donner vie.
 */
export interface HumanoidRig {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
}

export interface RigMaterials {
  body: THREE.Material;
  armor: THREE.Material;
  /** Matériau émissif (optiques, visière, cœur) : c'est lui qui accroche le bloom. */
  glow: THREE.Material;
}

// Calé pour que les semelles touchent le sol (jambe 0,5 + rayon + demi-épaisseur du pied).
const HIP_HEIGHT = 0.655;

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const part = new THREE.Mesh(geometry, material);
  part.position.set(x, y, z);
  part.castShadow = true;
  return part;
}

function limb(material: THREE.Material, radius: number, length: number, footMaterial: THREE.Material | null): THREE.Group {
  const pivot = new THREE.Group();
  pivot.add(mesh(new THREE.CapsuleGeometry(radius, length, 4, 8), material, 0, -length / 2 - radius * 0.5, 0));
  if (footMaterial) pivot.add(mesh(new THREE.BoxGeometry(radius * 2.2, 0.09, radius * 3.2), footMaterial, 0, -length - radius * 1.2, radius * 0.6));
  return pivot;
}

function createRigSkeleton(materials: RigMaterials, shoulderWidth: number, limbRadius: number): HumanoidRig {
  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = HIP_HEIGHT;
  root.add(hips);

  const torso = new THREE.Group();
  hips.add(torso);
  const head = new THREE.Group();
  head.position.y = 0.72;
  torso.add(head);

  const leftLeg = limb(materials.body, limbRadius, 0.5, materials.armor);
  const rightLeg = limb(materials.body, limbRadius, 0.5, materials.armor);
  leftLeg.position.set(-0.11, 0, 0);
  rightLeg.position.set(0.11, 0, 0);
  hips.add(leftLeg, rightLeg);

  const leftArm = limb(materials.body, limbRadius * 0.8, 0.42, null);
  const rightArm = limb(materials.body, limbRadius * 0.8, 0.42, null);
  leftArm.position.set(-shoulderWidth, 0.56, 0);
  rightArm.position.set(shoulderWidth, 0.56, 0);
  torso.add(leftArm, rightArm);

  return { root, hips, torso, head, leftArm, rightArm, leftLeg, rightLeg };
}

/** Spectre : silhouette fine, gilet tactique, sac à dos et les trois optiques vertes. */
export function createAgentRig(): { rig: HumanoidRig; glow: THREE.MeshStandardMaterial } {
  const glow = new THREE.MeshStandardMaterial({ color: 0x39ff88, emissive: 0x39ff88, emissiveIntensity: 2.2 });
  const materials: RigMaterials = {
    body: new THREE.MeshStandardMaterial({ color: 0x1a1f25, roughness: 0.75, metalness: 0.15 }),
    armor: new THREE.MeshStandardMaterial({ color: 0x2b333c, roughness: 0.45, metalness: 0.5 }),
    glow,
  };
  const rig = createRigSkeleton(materials, 0.24, 0.085);
  rig.torso.add(
    mesh(new THREE.CapsuleGeometry(0.2, 0.36, 4, 10), materials.body, 0, 0.32, 0),
    mesh(new THREE.BoxGeometry(0.38, 0.34, 0.26), materials.armor, 0, 0.38, 0.01),
    mesh(new THREE.BoxGeometry(0.3, 0.38, 0.14), materials.armor, 0, 0.36, -0.2),
    mesh(new THREE.BoxGeometry(0.4, 0.06, 0.28), materials.armor, 0, 0.08, 0),
  );
  rig.head.add(
    mesh(new THREE.SphereGeometry(0.15, 16, 12), materials.body, 0, 0, 0),
    mesh(new THREE.BoxGeometry(0.24, 0.08, 0.08), materials.armor, 0, 0.03, 0.12),
  );
  for (const offsetX of [-0.065, 0, 0.065]) {
    const lens = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8), glow, offsetX, 0.04, 0.19);
    lens.rotation.x = Math.PI / 2;
    rig.head.add(lens);
  }
  return { rig, glow };
}

/** Sentinelle d'ENTROPIA : robot massif, épaulières, cœur et visière rouges. */
export function createSentinelRig(): { rig: HumanoidRig; glow: THREE.MeshStandardMaterial } {
  // Matériau propre à chaque sentinelle : éteindre la visière d'une sentinelle ne doit pas éteindre les autres.
  const glow = new THREE.MeshStandardMaterial({ color: 0xff2d2d, emissive: 0xff2d2d, emissiveIntensity: 3 });
  const materials: RigMaterials = {
    body: new THREE.MeshStandardMaterial({ color: 0x24161a, roughness: 0.6, metalness: 0.4 }),
    armor: new THREE.MeshStandardMaterial({ color: 0x4a2a30, roughness: 0.35, metalness: 0.75 }),
    glow,
  };
  const rig = createRigSkeleton(materials, 0.31, 0.1);
  rig.torso.add(
    mesh(new THREE.BoxGeometry(0.5, 0.5, 0.32), materials.armor, 0, 0.36, 0),
    mesh(new THREE.BoxGeometry(0.36, 0.2, 0.26), materials.body, 0, 0.06, 0),
    mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12), glow, 0, 0.42, 0.17),
    mesh(new THREE.BoxGeometry(0.2, 0.12, 0.34), materials.armor, -0.33, 0.58, 0),
    mesh(new THREE.BoxGeometry(0.2, 0.12, 0.34), materials.armor, 0.33, 0.58, 0),
  );
  rig.torso.children[2]!.rotation.x = Math.PI / 2;
  rig.head.add(
    mesh(new THREE.BoxGeometry(0.3, 0.26, 0.3), materials.armor, 0, 0.04, 0),
    mesh(new THREE.BoxGeometry(0.28, 0.06, 0.04), glow, 0, 0.06, 0.16),
    mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 6), materials.body, 0.1, 0.25, -0.05),
  );
  return { rig, glow };
}

/**
 * Pose de marche + accroupissement.
 * `stride` ∈ [0, 1] : amplitude du pas ; `crouch` ∈ [0, 1] : degré d'accroupissement.
 */
export function poseRig(rig: HumanoidRig, phase: number, stride: number, crouch: number): void {
  const swing = Math.sin(phase) * 0.7 * stride;
  rig.leftLeg.rotation.x = swing - crouch * 0.9;
  rig.rightLeg.rotation.x = -swing - crouch * 0.9;
  rig.leftArm.rotation.x = -swing * 0.8 - crouch * 0.4;
  rig.rightArm.rotation.x = swing * 0.8 - crouch * 0.4;
  rig.torso.rotation.x = crouch * 0.45 + stride * 0.08;
  rig.hips.position.y = HIP_HEIGHT - crouch * 0.26 + Math.abs(Math.cos(phase)) * 0.035 * stride;
}
