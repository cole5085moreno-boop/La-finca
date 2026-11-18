import * as THREE from 'three';
import { CreatureId } from '../types';

export interface ArticulatedLimbs {
  leftArm?: THREE.Object3D;
  rightArm?: THREE.Object3D;
  leftLeg?: THREE.Object3D;
  rightLeg?: THREE.Object3D;
  head?: THREE.Object3D;
  torso?: THREE.Object3D;
  flashlightMount?: THREE.Object3D;
  weaponMesh?: THREE.Object3D;
  tail?: THREE.Object3D;
  chains?: THREE.Object3D[];
}

export function createPlayerModel(): {
  group: THREE.Group;
  limbs: ArticulatedLimbs;
} {
  const group = new THREE.Group();

  const shirtMat = new THREE.MeshStandardMaterial({
    color: 0x5c3a28,
    roughness: 0.88,
    metalness: 0.02,
  });
  const vestMat = new THREE.MeshStandardMaterial({
    color: 0x2c241d,
    roughness: 0.72,
    metalness: 0.08,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: 0x2f353b,
    roughness: 0.85,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xc29372,
    roughness: 0.65,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x1b1511,
    roughness: 0.55,
    metalness: 0.12,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x555c63,
    roughness: 0.25,
    metalness: 0.85,
  });

  // Legs (pivot at hip y = 0.88)
  const makeLeg = (xOffset: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOffset, 0.88, 0);
    const thigh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.11, 0.42, 4, 8),
      pantsMat
    );
    thigh.position.y = -0.32;
    thigh.castShadow = true;
    legPivot.add(thigh);

    const boot = new THREE.Mesh(
      new THREE.BoxGeometry(0.17, 0.22, 0.28),
      bootMat
    );
    boot.position.set(0, -0.76, 0.04);
    boot.castShadow = true;
    legPivot.add(boot);
    return legPivot;
  };

  const leftLeg = makeLeg(-0.14);
  const rightLeg = makeLeg(0.14);
  group.add(leftLeg, rightLeg);

  // Torso group
  const torso = new THREE.Group();
  torso.position.set(0, 0.9, 0);
  const chest = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.62, 0.26),
    shirtMat
  );
  chest.position.y = 0.32;
  chest.castShadow = true;
  torso.add(chest);

  const vest = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.52, 0.28),
    vestMat
  );
  vest.position.y = 0.33;
  vest.castShadow = true;
  torso.add(vest);

  // Belt & tool pouch
  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.08, 0.3),
    bootMat
  );
  belt.position.y = 0.06;
  torso.add(belt);

  const buckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.07, 0.03),
    metalMat
  );
  buckle.position.set(0, 0.06, 0.16);
  torso.add(buckle);

  // Backpack
  const backpack = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.44, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x3b402d, roughness: 0.9 })
  );
  backpack.position.set(0, 0.34, -0.22);
  backpack.castShadow = true;
  torso.add(backpack);

  // Head + rural felt hat
  const head = new THREE.Group();
  head.position.set(0, 0.72, 0);
  const cranium = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 12, 10),
    skinMat
  );
  cranium.position.y = 0.08;
  cranium.castShadow = true;
  head.add(cranium);

  const hatBrim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.29, 0.025, 16),
    vestMat
  );
  hatBrim.position.y = 0.19;
  hatBrim.castShadow = true;
  head.add(hatBrim);

  const hatCrown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.16, 0.12, 14),
    vestMat
  );
  hatCrown.position.y = 0.25;
  head.add(hatCrown);
  torso.add(head);

  // Arms
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.29, 0.56, 0);
  const lArmMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.075, 0.42, 4, 8),
    shirtMat
  );
  lArmMesh.position.y = -0.24;
  lArmMesh.castShadow = true;
  leftArm.add(lArmMesh);

  // Flashlight in left hand
  const flashlightMount = new THREE.Group();
  flashlightMount.position.set(0, -0.48, 0.14);
  const torchBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.028, 0.2, 10),
    metalMat
  );
  torchBody.rotation.x = Math.PI / 2;
  flashlightMount.add(torchBody);
  leftArm.add(flashlightMount);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.29, 0.56, 0);
  const rArmMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.075, 0.42, 4, 8),
    shirtMat
  );
  rArmMesh.position.y = -0.24;
  rArmMesh.castShadow = true;
  rightArm.add(rArmMesh);

  // Held weapon mesh placeholder
  const weaponMesh = new THREE.Group();
  weaponMesh.position.set(0, -0.45, 0.22);
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.024, 0.68, 8),
    metalMat
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 0.18;
  const stock = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.11, 0.28),
    new THREE.MeshStandardMaterial({ color: 0x3b2214, roughness: 0.7 })
  );
  stock.position.set(0, -0.02, -0.1);
  weaponMesh.add(barrel, stock);
  rightArm.add(weaponMesh);

  torso.add(leftArm, rightArm);
  group.add(torso);

  return {
    group,
    limbs: {
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      head,
      torso,
      flashlightMount,
      weaponMesh,
    },
  };
}

export function createCreatureModel(id: CreatureId): {
  group: THREE.Group;
  limbs: ArticulatedLimbs;
} {
  const group = new THREE.Group();

  if (id === 'lobizon' || id === 'familiar') {
    const isFamiliar = id === 'familiar';
    const furMat = new THREE.MeshStandardMaterial({
      color: isFamiliar ? 0x111015 : 0x241d19,
      roughness: 0.92,
      metalness: 0.05,
    });
    const clawMat = new THREE.MeshStandardMaterial({
      color: 0x999184,
      roughness: 0.35,
      metalness: 0.3,
    });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: isFamiliar ? 0xff1e2d : 0xffaa2b,
      emissive: isFamiliar ? 0xff1122 : 0xff8c1a,
      emissiveIntensity: 3.5,
      roughness: 0.1,
    });

    const torso = new THREE.Group();
    torso.position.set(0, 1.15, 0);

    // Muscular hunched chest
    const chest = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 0.85, 0.56),
      furMat
    );
    chest.position.set(0, 0.35, 0.08);
    chest.rotation.x = 0.32;
    chest.castShadow = true;
    torso.add(chest);

    const waist = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.3, 0.55, 8),
      furMat
    );
    waist.position.y = -0.1;
    torso.add(waist);

    // Spine ridge spikes
    for (let i = 0; i < 4; i++) {
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.28, 6), furMat);
      tuft.position.set(0, 0.15 + i * 0.2, -0.22);
      tuft.rotation.x = -0.7;
      torso.add(tuft);
    }

    // Snouted wolf head
    const head = new THREE.Group();
    head.position.set(0, 0.82, 0.26);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), furMat);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.36), furMat);
    snout.position.set(0, -0.04, 0.24);
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 5), furMat);
    earL.position.set(-0.14, 0.24, -0.02);
    const earR = earL.clone();
    earR.position.x = 0.14;

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8), eyeMat);
    eyeL.position.set(-0.085, 0.06, 0.2);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.085;
    head.add(skull, snout, earL, earR, eyeL, eyeR);
    torso.add(head);

    // Long clawed arms
    const makeBeastArm = (side: number) => {
      const arm = new THREE.Group();
      arm.position.set(side * 0.46, 0.55, 0.16);
      const limb = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.11, 0.72, 4, 8),
        furMat
      );
      limb.position.y = -0.38;
      limb.castShadow = true;
      arm.add(limb);
      for (let c = -1; c <= 1; c++) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.18, 5), clawMat);
        claw.position.set(c * 0.045, -0.82, 0.07);
        claw.rotation.x = Math.PI * 0.82;
        arm.add(claw);
      }
      return arm;
    };
    const leftArm = makeBeastArm(-1);
    const rightArm = makeBeastArm(1);
    torso.add(leftArm, rightArm);

    const makeBeastLeg = (side: number) => {
      const leg = new THREE.Group();
      leg.position.set(side * 0.24, 1.05, 0);
      const lMesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.13, 0.72, 4, 8),
        furMat
      );
      lMesh.position.y = -0.45;
      lMesh.castShadow = true;
      leg.add(lMesh);
      return leg;
    };
    const leftLeg = makeBeastLeg(-1);
    const rightLeg = makeBeastLeg(1);

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.68, 6), furMat);
    tail.position.set(0, -0.1, -0.38);
    tail.rotation.x = -1.1;
    torso.add(tail);

    group.add(torso, leftLeg, rightLeg);
    if (isFamiliar) {
      // Heavy iron collar
      const collar = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.045, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0x45352c, metalness: 0.85, roughness: 0.4 })
      );
      collar.rotation.x = Math.PI / 2;
      collar.position.set(0, 0.74, 0.2);
      torso.add(collar);
    }

    return {
      group,
      limbs: { torso, head, leftArm, rightArm, leftLeg, rightLeg, tail },
    };
  }

  if (id === 'ocumar') {
    const coatMat = new THREE.MeshStandardMaterial({
      color: 0x272019,
      roughness: 0.94,
    });
    const paleFaceMat = new THREE.MeshStandardMaterial({
      color: 0x8e8070,
      roughness: 0.7,
    });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xd9f2d0,
      emissive: 0xa2d996,
      emissiveIntensity: 2.8,
    });

    const torso = new THREE.Group();
    torso.position.set(0, 0.95, 0);
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.26, 0.56, 6, 10),
      coatMat
    );
    body.position.y = 0.25;
    body.rotation.x = 0.45;
    body.castShadow = true;
    torso.add(body);

    const head = new THREE.Group();
    head.position.set(0, 0.62, 0.28);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), coatMat);
    const face = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 10),
      paleFaceMat
    );
    face.position.set(0, -0.02, 0.11);
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), eyeMat);
    eyeL.position.set(-0.055, 0.02, 0.22);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.055;
    head.add(skull, face, eyeL, eyeR);
    torso.add(head);

    const makeLongArm = (side: number) => {
      const arm = new THREE.Group();
      arm.position.set(side * 0.32, 0.45, 0.15);
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.85, 4, 8), coatMat);
      m.position.y = -0.45;
      arm.add(m);
      return arm;
    };
    const leftArm = makeLongArm(-1);
    const rightArm = makeLongArm(1);
    torso.add(leftArm, rightArm);

    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.18, 0.9, 0);
    const ll = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.55, 4, 8), coatMat);
    ll.position.y = -0.35;
    leftLeg.add(ll);
    const rightLeg = leftLeg.clone();
    rightLeg.position.x = 0.18;

    group.add(torso, leftLeg, rightLeg);
    return {
      group,
      limbs: { torso, head, leftArm, rightArm, leftLeg, rightLeg },
    };
  }

  if (id === 'mulanima' || id === 'alma_mula') {
    const isAlma = id === 'alma_mula';
    const hideMat = new THREE.MeshStandardMaterial({
      color: isAlma ? 0x1e2430 : 0x121318,
      roughness: 0.85,
      transparent: isAlma,
      opacity: isAlma ? 0.86 : 1,
    });
    const emberMat = new THREE.MeshStandardMaterial({
      color: isAlma ? 0x5cc8ff : 0xff5a1f,
      emissive: isAlma ? 0x2da8ff : 0xff4500,
      emissiveIntensity: 4.0,
    });
    const chainMat = new THREE.MeshStandardMaterial({
      color: 0x3b3d42,
      metalness: 0.9,
      roughness: 0.35,
    });

    const torso = new THREE.Group();
    torso.position.set(0, 1.15, 0);

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.38, 1.15, 6, 12),
      hideMat
    );
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;
    torso.add(body);

    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.26, 0.68, 8),
      hideMat
    );
    neck.position.set(0, 0.4, 0.65);
    neck.rotation.x = 0.52;
    torso.add(neck);

    const head = new THREE.Group();
    head.position.set(0, 0.72, 0.9);
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.56), hideMat);
    muzzle.position.z = 0.18;
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.26, 5), hideMat);
    earL.position.set(-0.09, 0.2, -0.05);
    const earR = earL.clone();
    earR.position.x = 0.09;
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), emberMat);
    eyeL.position.set(-0.11, 0.06, 0.14);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.11;
    head.add(muzzle, earL, earR, eyeL, eyeR);
    torso.add(head);

    // 4 Mule legs
    const makeHoofLeg = (x: number, z: number) => {
      const l = new THREE.Group();
      l.position.set(x, 1.05, z);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.95, 8), hideMat);
      m.position.y = -0.48;
      l.add(m);
      return l;
    };
    const leftLeg = makeHoofLeg(-0.22, 0.52);
    const rightLeg = makeHoofLeg(0.22, 0.52);
    const leftArm = makeHoofLeg(-0.22, -0.52);
    const rightArm = makeHoofLeg(0.22, -0.52);

    // Spectral trailing iron chains
    const chains: THREE.Object3D[] = [];
    for (let c = 0; c < 4; c++) {
      const link = new THREE.Mesh(
        new THREE.TorusGeometry(0.09, 0.025, 6, 10),
        chainMat
      );
      link.position.set(c % 2 === 0 ? -0.18 : 0.18, 0.22, -0.65 - c * 0.24);
      link.rotation.y = c * 0.6;
      group.add(link);
      chains.push(link);
    }

    // Spectral flame aura light
    const fireLight = new THREE.PointLight(isAlma ? 0x4db8ff : 0xff5a1f, 2.2, 8);
    fireLight.position.set(0, 0.8, 0.3);
    torso.add(fireLight);

    group.add(torso, leftLeg, rightLeg, leftArm, rightArm);
    return {
      group,
      limbs: { torso, head, leftArm, rightArm, leftLeg, rightLeg, chains },
    };
  }

  // El Duende del Monte
  const ponchoMat = new THREE.MeshStandardMaterial({
    color: 0x383d2c,
    roughness: 0.95,
  });
  const hatMat = new THREE.MeshStandardMaterial({
    color: 0x1c1816,
    roughness: 0.85,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0x7a6856,
    roughness: 0.72,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xfff099,
    emissive: 0xe6b800,
    emissiveIntensity: 2.2,
  });

  const torso = new THREE.Group();
  torso.position.set(0, 0.48, 0);
  const poncho = new THREE.Mesh(
    new THREE.ConeGeometry(0.32, 0.64, 8),
    ponchoMat
  );
  poncho.position.y = 0.25;
  poncho.castShadow = true;
  torso.add(poncho);

  const head = new THREE.Group();
  head.position.set(0, 0.62, 0);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), skinMat);
  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.44, 0.03, 14),
    hatMat
  );
  brim.position.y = 0.12;
  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.26, 10),
    hatMat
  );
  crown.position.y = 0.24;
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), eyeMat);
  eyeL.position.set(-0.055, 0.02, 0.13);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.055;
  head.add(skull, brim, crown, eyeL, eyeR);
  torso.add(head);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.1, 0.48, 0);
  const ll = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.46, 6), hatMat);
  ll.position.y = -0.24;
  leftLeg.add(ll);
  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.1;

  group.add(torso, leftLeg, rightLeg);
  return {
    group,
    limbs: { torso, head, leftLeg, rightLeg },
  };
}

export function createFarmAnimal(
  kind: 'horse' | 'cow' | 'dog' | 'pig' | 'chicken'
): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'horse' || kind === 'cow') {
    const color = kind === 'horse' ? 0x4f2e1b : 0xdcd6cc;
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1d1713, roughness: 0.8 });

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.36, 1.1, 6, 10),
      mat
    );
    body.rotation.x = Math.PI / 2;
    body.position.y = 1.1;
    body.castShadow = true;
    g.add(body);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.56, 8), mat);
    neck.position.set(0, 1.45, 0.62);
    neck.rotation.x = 0.45;
    g.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.45), mat);
    head.position.set(0, 1.66, 0.84);
    g.add(head);

    if (kind === 'cow') {
      const spot = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.55), darkMat);
      spot.position.set(0.18, 1.15, 0.1);
      g.add(spot);
    }

    const legGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.9, 6);
    [
      [-0.2, 0.48],
      [0.2, 0.48],
      [-0.2, -0.48],
      [0.2, -0.48],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(lx, 0.45, lz);
      leg.castShadow = true;
      g.add(leg);
    });
  } else if (kind === 'dog') {
    const mat = new THREE.MeshStandardMaterial({ color: 0x6b4b2a, roughness: 0.88 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.42, 4, 8), mat);
    body.rotation.x = Math.PI / 2;
    body.position.y = 0.44;
    body.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), mat);
    head.position.set(0, 0.62, 0.32);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.16), mat);
    snout.position.set(0, 0.58, 0.46);
    g.add(body, head, snout);
    const legGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.36, 6);
    [
      [-0.1, 0.18],
      [0.1, 0.18],
      [-0.1, -0.18],
      [0.1, -0.18],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(lx, 0.18, lz);
      g.add(leg);
    });
  } else if (kind === 'pig') {
    const mat = new THREE.MeshStandardMaterial({ color: 0xb8867c, roughness: 0.8 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.45, 4, 8), mat);
    body.rotation.x = Math.PI / 2;
    body.position.y = 0.4;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), mat);
    head.position.set(0, 0.44, 0.34);
    g.add(body, head);
  } else {
    const mat = new THREE.MeshStandardMaterial({ color: 0xc9beae, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), mat);
    body.position.y = 0.2;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), mat);
    head.position.set(0, 0.34, 0.1);
    const comb = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.06, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xa62626 })
    );
    comb.position.set(0, 0.42, 0.11);
    g.add(body, head, comb);
  }
  return g;
}
