import * as THREE from 'three';
import { createFarmAnimal } from '../entities/CharacterModels';
import { ZoneId } from '../types';
import { WorldTextures } from './textures';

export interface ColliderBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  label?: string;
}

export interface InteractableObject {
  id: string;
  kind:
    | 'pickup'
    | 'document'
    | 'door'
    | 'generator'
    | 'fence_repair'
    | 'light_switch'
    | 'ritual_altar'
    | 'save_point'
    | 'aljibe';
  label: string;
  position: THREE.Vector3;
  radius: number;
  mesh: THREE.Object3D;
  itemId?: string;
  quantity?: number;
  docId?: string;
  isOpen?: boolean;
  consumed?: boolean;
  lockedBy?: string;
}

export interface ReactiveAnimal {
  kind: 'horse' | 'cow' | 'dog' | 'pig' | 'chicken';
  mesh: THREE.Group;
  homePos: THREE.Vector3;
  panicked: boolean;
  barkCooldown: number;
}

export interface WorldData {
  colliders: ColliderBox[];
  interactables: InteractableObject[];
  animals: ReactiveAnimal[];
  electricLights: THREE.PointLight[];
  lampEmissives: THREE.MeshStandardMaterial[];
  treeTops: THREE.InstancedMesh;
  caneMeshes: THREE.InstancedMesh;
  houseBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  generatorPos: THREE.Vector3;
  ritualTreePos: THREE.Vector3;
  creekX: number;
  dispose: () => void;
}

export function groundHeightAt(x: number, z: number): number {
  const distFromCenter = Math.hypot(x, z);
  // Flat playable finca yard in core radius
  let h = 0;
  if (distFromCenter > 48) {
    const hillFactor = Math.min(1, (distFromCenter - 48) / 85);
    h +=
      hillFactor *
      (Math.sin(x * 0.045) * Math.cos(z * 0.045) * 3.4 +
        Math.sin((x + z) * 0.02) * 1.8);
  }
  // Gentle creek depression around z = 24
  const creekDist = Math.abs(z - (24 + Math.sin(x * 0.05) * 4));
  if (creekDist < 4.5 && distFromCenter < 110) {
    h -= (1 - creekDist / 4.5) * 0.9;
  }
  return h;
}

export function getZoneAt(x: number, z: number): ZoneId {
  if (x > -10 && x < 10 && z > -9 && z < 9) return 'casa_principal';
  if (x > -8 && x < -1 && z > -8 && z < -2) return 'sotano';
  if (x > 20 && x < 50 && z > -26 && z < 6) return 'corrales';
  if (x > -46 && x < -20 && z > -28 && z < -4) return 'galpones';
  if (x > 44 && x < 64 && z > 38 && z < 58) return 'puesto';
  if (x > -62 && x < -42 && z > 44 && z < 64) return 'cementerio';
  if (x > -78 && x < -56 && z > 28 && z < 48) return 'capilla';
  if (Math.hypot(x - 8, z + 78) < 16) return 'arbol_ritual';
  if (Math.abs(x) < 12 || Math.abs(z - 16) < 6) return 'caminos';
  return 'monte';
}

export function buildFincaWorld(
  scene: THREE.Scene,
  textures: WorldTextures,
  isSoftwareGl: boolean
): WorldData {
  const colliders: ColliderBox[] = [];
  const interactables: InteractableObject[] = [];
  const animals: ReactiveAnimal[] = [];
  const electricLights: THREE.PointLight[] = [];
  const lampEmissives: THREE.MeshStandardMaterial[] = [];
  const disposables: Array<{ dispose: () => void }> = [];

  const track = <T extends { dispose: () => void }>(obj: T): T => {
    disposables.push(obj);
    return obj;
  };

  // Materials
  const groundMat = track(
    new THREE.MeshStandardMaterial({
      map: textures.ground,
      roughness: 0.95,
      metalness: 0.02,
    })
  );
  const roadMat = track(
    new THREE.MeshStandardMaterial({
      map: textures.dirtRoad,
      roughness: 0.92,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  const adobeMat = track(
    new THREE.MeshStandardMaterial({
      map: textures.adobe,
      roughness: 0.88,
    })
  );
  const woodMat = track(
    new THREE.MeshStandardMaterial({
      map: textures.wood,
      roughness: 0.82,
    })
  );
  const zincMat = track(
    new THREE.MeshStandardMaterial({
      map: textures.zincRoof,
      roughness: 0.45,
      metalness: 0.68,
    })
  );
  const stoneMat = track(
    new THREE.MeshStandardMaterial({
      map: textures.stone,
      roughness: 0.9,
    })
  );
  const ironMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x2b2e33,
      roughness: 0.38,
      metalness: 0.82,
    })
  );

  // 1. Extended Terrain (280m x 280m, no floating void)
  const terrainGeo = track(new THREE.PlaneGeometry(280, 280, 72, 72));
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    posAttr.setY(i, groundHeightAt(vx, vz));
  }
  terrainGeo.computeVertexNormals();
  const terrain = new THREE.Mesh(terrainGeo, groundMat);
  terrain.receiveShadow = true;
  scene.add(terrain);

  // Outer Andean foothill silhouettes in distance
  const hillMat = track(
    new THREE.MeshStandardMaterial({ color: 0x0d1216, roughness: 0.98 })
  );
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const dist = 135;
    const hill = new THREE.Mesh(
      track(new THREE.ConeGeometry(34 + (i % 3) * 10, 26 + (i % 4) * 6, 7)),
      hillMat
    );
    hill.position.set(Math.cos(angle) * dist, 8, Math.sin(angle) * dist);
    scene.add(hill);
  }

  // Creek water ribbon at z ≈ 24
  const creekGeo = track(new THREE.PlaneGeometry(180, 5.5, 24, 2));
  creekGeo.rotateX(-Math.PI / 2);
  const creekPos = creekGeo.attributes.position;
  for (let i = 0; i < creekPos.count; i++) {
    const cx = creekPos.getX(i);
    const cz = creekPos.getZ(i);
    creekPos.setZ(i, cz + Math.sin(cx * 0.05) * 4);
  }
  const creekMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x16242b,
      roughness: 0.14,
      metalness: 0.1,
      clearcoat: 0.9,
      transparent: true,
      opacity: 0.88,
    })
  );
  const creek = new THREE.Mesh(creekGeo, creekMat);
  creek.position.set(0, -0.35, 24);
  scene.add(creek);

  // Dirt Roads (raised +0.025m above flat ground to prevent z-fighting)
  const addRoadSegment = (x: number, z: number, w: number, l: number, rotY = 0) => {
    const r = new THREE.Mesh(track(new THREE.PlaneGeometry(w, l)), roadMat);
    r.rotation.x = -Math.PI / 2;
    r.rotation.z = rotY;
    r.position.set(x, 0.025, z);
    r.receiveShadow = true;
    scene.add(r);
  };
  addRoadSegment(0, 32, 4.4, 96, 0); // North-south main road
  addRoadSegment(0, -44, 4.2, 68, 0); // Toward ritual tree
  addRoadSegment(-34, 16, 4.0, 68, Math.PI / 2); // West toward capilla & galpones
  addRoadSegment(34, 16, 4.0, 68, Math.PI / 2); // East toward corrales & puesto
  addRoadSegment(54, 34, 3.8, 36, 0); // Puesto spur

  // Wooden bridge over creek at x = 0, z = 24
  const bridge = new THREE.Group();
  bridge.position.set(0, 0.06, 24);
  const deck = new THREE.Mesh(track(new THREE.BoxGeometry(4.8, 0.22, 6.8)), woodMat);
  deck.receiveShadow = true;
  bridge.add(deck);
  for (const sx of [-2.2, 2.2]) {
    const rail = new THREE.Mesh(track(new THREE.BoxGeometry(0.16, 0.9, 6.8)), woodMat);
    rail.position.set(sx, 0.55, 0);
    bridge.add(rail);
  }
  scene.add(bridge);

  // Helper to add collider + wall
  const addWall = (
    parent: THREE.Object3D,
    wx: number,
    wy: number,
    wz: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    worldOffsetX = 0,
    worldOffsetZ = 0,
    castShadow = true
  ) => {
    const mesh = new THREE.Mesh(track(new THREE.BoxGeometry(w, h, d)), mat);
    mesh.position.set(wx, wy, wz);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    colliders.push({
      minX: worldOffsetX + wx - w / 2 - 0.15,
      maxX: worldOffsetX + wx + w / 2 + 0.15,
      minZ: worldOffsetZ + wz - d / 2 - 0.15,
      maxZ: worldOffsetZ + wz + d / 2 + 0.15,
    });
    return mesh;
  };

  // Helper to create lantern with switchable light
  const addElectricLamp = (x: number, y: number, z: number, color = 0xffb86b, dist = 16) => {
    const bulbMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xffd59e,
        emissive: color,
        emissiveIntensity: 0,
      })
    );
    const bulb = new THREE.Mesh(track(new THREE.SphereGeometry(0.11, 8, 8)), bulbMat);
    bulb.position.set(x, y, z);
    const cap = new THREE.Mesh(track(new THREE.ConeGeometry(0.24, 0.15, 8)), ironMat);
    cap.position.set(x, y + 0.1, z);
    scene.add(bulb, cap);

    const light = new THREE.PointLight(color, 0, dist, 1.8);
    light.position.set(x, y - 0.12, z);
    scene.add(light);
    electricLights.push(light);
    lampEmissives.push(bulbMat);
    return light;
  };

  // Helper to create glowing pickup prop
  const addPickup = (
    id: string,
    itemId: string,
    label: string,
    x: number,
    y: number,
    z: number,
    color = 0xd99b43,
    quantity = 1
  ) => {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const box = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.38, 0.24, 0.28)),
      track(
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.45,
          metalness: 0.25,
          emissive: color,
          emissiveIntensity: 0.25,
        })
      )
    );
    box.castShadow = true;
    group.add(box);
    scene.add(group);
    interactables.push({
      id,
      kind: 'pickup',
      label,
      position: new THREE.Vector3(x, y, z),
      radius: 2.3,
      mesh: group,
      itemId,
      quantity,
    });
  };

  const addDocumentProp = (
    id: string,
    docId: string,
    label: string,
    x: number,
    y: number,
    z: number
  ) => {
    const paper = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.32, 0.03, 0.42)),
      track(
        new THREE.MeshStandardMaterial({
          color: 0xe6dac3,
          roughness: 0.8,
          emissive: 0x5c4724,
          emissiveIntensity: 0.35,
        })
      )
    );
    paper.position.set(x, y, z);
    paper.rotation.y = 0.25;
    scene.add(paper);
    interactables.push({
      id,
      kind: 'document',
      label,
      position: new THREE.Vector3(x, y, z),
      radius: 2.3,
      mesh: paper,
      docId,
    });
  };

  const addDoor = (
    id: string,
    label: string,
    x: number,
    z: number,
    rotY = 0,
    lockedBy?: string
  ) => {
    const doorPivot = new THREE.Group();
    doorPivot.position.set(x, 0, z);
    doorPivot.rotation.y = rotY;
    const panel = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.4, 2.3, 0.12)),
      woodMat
    );
    panel.position.set(0.7, 1.15, 0);
    panel.castShadow = true;
    const handle = new THREE.Mesh(track(new THREE.SphereGeometry(0.06, 6, 6)), ironMat);
    handle.position.set(1.22, 1.05, 0.08);
    doorPivot.add(panel, handle);
    scene.add(doorPivot);
    interactables.push({
      id,
      kind: 'door',
      label,
      position: new THREE.Vector3(x + 0.7, 1.1, z),
      radius: 2.6,
      mesh: doorPivot,
      isOpen: false,
      lockedBy,
    });
  };

  // ==========================================================
  // A. CASA PRINCIPAL (Centered at 0, 0) — 14m x 12m + Galería Porch
  // ==========================================================
  const house = new THREE.Group();
  // Floor slab
  const houseFloor = new THREE.Mesh(
    track(new THREE.BoxGeometry(14.4, 0.14, 15.2)),
    woodMat
  );
  houseFloor.position.set(0, 0.07, 1.2);
  houseFloor.receiveShadow = true;
  house.add(houseFloor);

  // Outer Adobe Walls with Front Door gap (z = 6, x in [-1, 1]) & Back Door gap (z = -6, x in [2, 4])
  addWall(house, -4.1, 1.6, 6.0, 6.0, 3.2, 0.35, adobeMat);
  addWall(house, 4.1, 1.6, 6.0, 6.0, 3.2, 0.35, adobeMat);
  addWall(house, -7.0, 1.6, 0.0, 0.35, 3.2, 12.2, adobeMat);
  addWall(house, 7.0, 1.6, 0.0, 0.35, 3.2, 12.2, adobeMat);
  addWall(house, -2.5, 1.6, -6.0, 9.2, 3.2, 0.35, adobeMat);
  addWall(house, 5.5, 1.6, -6.0, 3.2, 3.2, 0.35, adobeMat);

  // Interior partition walls (kitchen / bedroom / storage)
  addWall(house, -1.5, 1.6, -1.2, 0.25, 3.0, 6.2, adobeMat);
  addWall(house, 3.2, 1.6, 0.5, 4.5, 3.0, 0.25, adobeMat);

  // Roof (gable corrugated zinc, raised high enough for third-person camera clearance outside)
  const roofLeft = new THREE.Mesh(track(new THREE.BoxGeometry(15.6, 0.16, 7.8)), zincMat);
  roofLeft.position.set(0, 4.15, -3.4);
  roofLeft.rotation.x = -0.24;
  roofLeft.castShadow = true;
  const roofRight = new THREE.Mesh(track(new THREE.BoxGeometry(15.6, 0.16, 7.8)), zincMat);
  roofRight.position.set(0, 4.15, 3.4);
  roofRight.rotation.x = 0.24;
  roofRight.castShadow = true;
  // Porch roof (galería)
  const porchRoof = new THREE.Mesh(track(new THREE.BoxGeometry(15.2, 0.14, 3.4)), zincMat);
  porchRoof.position.set(0, 3.15, 7.6);
  porchRoof.rotation.x = 0.12;
  house.add(roofLeft, roofRight, porchRoof);

  // Porch wooden columns
  for (const px of [-6.8, -2.2, 2.2, 6.8]) {
    const post = new THREE.Mesh(track(new THREE.CylinderGeometry(0.11, 0.13, 3.1, 8)), woodMat);
    post.position.set(px, 1.55, 8.8);
    post.castShadow = true;
    house.add(post);
  }

  // Interior furniture: Kitchen table, bed, desk, cellar trapdoor
  const kitchenTable = new THREE.Mesh(track(new THREE.BoxGeometry(2.1, 0.85, 1.2)), woodMat);
  kitchenTable.position.set(-4.2, 0.45, 2.2);
  kitchenTable.castShadow = true;
  house.add(kitchenTable);

  const bedFrame = new THREE.Mesh(track(new THREE.BoxGeometry(2.2, 0.6, 1.4)), woodMat);
  bedFrame.position.set(5.2, 0.35, -3.2);
  const mattress = new THREE.Mesh(
    track(new THREE.BoxGeometry(2.0, 0.25, 1.25)),
    track(new THREE.MeshStandardMaterial({ color: 0x7d7668, roughness: 0.9 }))
  );
  mattress.position.set(5.2, 0.72, -3.2);
  house.add(bedFrame, mattress);

  // Sótano Secreto hatch inside back-left room (-4.6, -4.4)
  const hatch = new THREE.Mesh(track(new THREE.BoxGeometry(1.6, 0.12, 1.6)), ironMat);
  hatch.position.set(-4.6, 0.18, -4.4);
  house.add(hatch);
  interactables.push({
    id: 'sotano_hatch',
    kind: 'door',
    label: 'Abrir trampilla del Sótano Secreto',
    position: new THREE.Vector3(-4.6, 0.6, -4.4),
    radius: 2.5,
    mesh: hatch,
    lockedBy: 'llave_sotano',
  });

  // Save point radio / desk in living room
  const radioDesk = new THREE.Mesh(track(new THREE.BoxGeometry(1.2, 0.8, 0.7)), woodMat);
  radioDesk.position.set(4.5, 0.45, 3.2);
  const radioBox = new THREE.Mesh(track(new THREE.BoxGeometry(0.45, 0.3, 0.28)), ironMat);
  radioBox.position.set(4.5, 0.98, 3.2);
  house.add(radioDesk, radioBox);
  interactables.push({
    id: 'casa_save_radio',
    kind: 'save_point',
    label: 'Guardar partida en la radio de la sala',
    position: new THREE.Vector3(4.5, 0.9, 3.2),
    radius: 2.5,
    mesh: radioBox,
  });

  scene.add(house);

  // House Doors & Lights
  addDoor('door_casa_front', 'Puerta principal de la Casa', -0.7, 6.0, 0);
  addDoor('door_casa_back', 'Puerta trasera hacia el patio', 2.3, -6.0, 0);
  addElectricLamp(0, 2.95, 7.6, 0xffaa55, 18); // Porch warm tungsten
  addElectricLamp(-4.0, 2.75, 2.0, 0xffc67d, 14); // Kitchen
  addElectricLamp(3.5, 2.75, 2.5, 0xffc67d, 14); // Living room

  // Casa Principal pickups & documents
  addDocumentProp(
    'doc_pickup_llamada',
    'doc_llamada',
    'Leer nota del Capataz Don Rufino',
    -4.2,
    0.92,
    2.2
  );
  addPickup('pickup_escopeta', 'escopeta', 'Recoger Escopeta Calibre 12', 5.2, 0.9, -2.5, 0x99734a);
  addPickup('pickup_cartuchos_casa', 'cartuchos_12', 'Cartuchos Cal. 12 (x6)', 5.6, 0.9, -3.5, 0xb8382c, 6);
  addPickup('pickup_botiquin_casa', 'botiquin', 'Botiquín de Campo', -5.4, 0.8, 4.4, 0xd64545, 1);
  addPickup('pickup_pilas_casa', 'pilas', 'Pilas Alcalinas (x2)', 3.8, 0.9, 3.2, 0xd9a73b, 2);
  addPickup('pickup_llave_sotano', 'llave_sotano', 'Llave del Sótano', -4.2, 0.9, 1.4, 0xd4b254, 1);
  // Sótano items inside the cellar corner
  addPickup('pickup_revolver_sotano', 'revolver', 'Recoger Revólver .38 del Abuelo', -5.6, 0.6, -4.8, 0x7c828a, 1);
  addPickup('pickup_balas_sotano', 'balas_38', 'Balas .38 (x12)', -5.2, 0.6, -5.0, 0xc79f44, 12);
  addDocumentProp(
    'doc_pickup_pacto',
    'doc_abuelo_1924',
    'Leer Escritura del Pacto de 1924',
    -4.0,
    0.6,
    -4.8
  );

  // Aljibe (old brick well in patio)
  const aljibe = new THREE.Group();
  aljibe.position.set(-11.5, 0, 10.5);
  const wellBase = new THREE.Mesh(
    track(new THREE.CylinderGeometry(1.15, 1.25, 1.05, 14, 1, true)),
    stoneMat
  );
  wellBase.position.y = 0.52;
  const wellArchL = new THREE.Mesh(track(new THREE.BoxGeometry(0.14, 1.5, 0.14)), ironMat);
  wellArchL.position.set(-0.95, 1.6, 0);
  const wellArchR = wellArchL.clone();
  wellArchR.position.x = 0.95;
  const wellBeam = new THREE.Mesh(track(new THREE.BoxGeometry(2.1, 0.14, 0.14)), ironMat);
  wellBeam.position.set(0, 2.35, 0);
  aljibe.add(wellBase, wellArchL, wellArchR, wellBeam);
  scene.add(aljibe);
  colliders.push({ minX: -12.8, maxX: -10.2, minZ: 9.2, maxZ: 11.8 });
  interactables.push({
    id: 'aljibe_agua',
    kind: 'aljibe',
    label: 'Llenar cantimplora en el Aljibe',
    position: new THREE.Vector3(-11.5, 1.0, 10.5),
    radius: 2.8,
    mesh: aljibe,
  });

  // ==========================================================
  // B. CORRALES Y ESTABLOS ((34, -12))
  // ==========================================================
  const corralGroup = new THREE.Group();
  const buildFenceSegment = (x1: number, z1: number, x2: number, z2: number) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);
    const seg = new THREE.Group();
    seg.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    seg.rotation.y = angle;
    for (const ry of [0.55, 1.05]) {
      const rail = new THREE.Mesh(track(new THREE.BoxGeometry(0.1, 0.1, len)), woodMat);
      rail.position.y = ry;
      rail.castShadow = true;
      seg.add(rail);
    }
    const posts = Math.max(2, Math.floor(len / 3));
    for (let p = 0; p <= posts; p++) {
      const pz = -len / 2 + (p / posts) * len;
      const post = new THREE.Mesh(track(new THREE.CylinderGeometry(0.09, 0.11, 1.4, 6)), woodMat);
      post.position.set(0, 0.7, pz);
      seg.add(post);
    }
    corralGroup.add(seg);
  };
  buildFenceSegment(22, -24, 46, -24);
  buildFenceSegment(46, -24, 46, 2);
  buildFenceSegment(22, 2, 31, 2); // gap for gate
  buildFenceSegment(37, 2, 46, 2);
  buildFenceSegment(22, -24, 22, 2);
  scene.add(corralGroup);
  colliders.push({ minX: 21.7, maxX: 46.3, minZ: -24.3, maxZ: -23.7 });
  colliders.push({ minX: 45.7, maxX: 46.3, minZ: -24.3, maxZ: 2.3 });
  colliders.push({ minX: 21.7, maxX: 22.3, minZ: -24.3, maxZ: 2.3 });

  // Repairable corral breach
  const breachMarker = new THREE.Mesh(
    track(new THREE.BoxGeometry(2.6, 0.25, 0.3)),
    track(new THREE.MeshStandardMaterial({ color: 0x6b4528, roughness: 0.9 }))
  );
  breachMarker.position.set(34, 0.15, 2);
  scene.add(breachMarker);
  interactables.push({
    id: 'corral_fence_repair',
    kind: 'fence_repair',
    label: 'Reparar alambrado y tranquera del corral',
    position: new THREE.Vector3(34, 0.8, 2),
    radius: 3.0,
    mesh: breachMarker,
  });

  // Water trough & food bin
  const trough = new THREE.Mesh(track(new THREE.BoxGeometry(3.2, 0.65, 1.0)), woodMat);
  trough.position.set(27, 0.33, -18);
  scene.add(trough);
  addPickup('pickup_charqui_corral', 'empanada_charqui', 'Charqui y Tortilla', 25, 0.6, -4, 0xb8763e, 2);
  addPickup('pickup_yuyos_corral', 'yuyos_curativos', 'Cataplasma de Yuyos', 42, 0.4, -8, 0x4b8042, 2);

  // Reactive Animals
  const spawnAnimal = (
    kind: ReactiveAnimal['kind'],
    x: number,
    z: number,
    rotY = 0
  ) => {
    const mesh = createFarmAnimal(kind);
    mesh.position.set(x, groundHeightAt(x, z), z);
    mesh.rotation.y = rotY;
    scene.add(mesh);
    animals.push({
      kind,
      mesh,
      homePos: new THREE.Vector3(x, groundHeightAt(x, z), z),
      panicked: false,
      barkCooldown: 0,
    });
  };
  spawnAnimal('horse', 30, -14, 0.6);
  spawnAnimal('horse', 36, -16, -1.1);
  spawnAnimal('cow', 40, -10, 2.2);
  spawnAnimal('cow', 28, -8, 0.2);
  spawnAnimal('pig', 25, -3, 1.3);
  spawnAnimal('chicken', 26, -1.5, 0);
  spawnAnimal('chicken', 27.2, -2.2, 1.9);
  spawnAnimal('dog', -3.5, 10.5, 0.2); // Guard dog near porch!

  // ==========================================================
  // C. GALPONES Y MAQUINARIA ((-34, -16))
  // ==========================================================
  const galpon = new THREE.Group();
  addWall(galpon, -34, 2.2, -26, 14, 4.4, 0.35, woodMat);
  addWall(galpon, -41, 2.2, -17, 0.35, 4.4, 18, woodMat);
  addWall(galpon, -27, 2.2, -21, 0.35, 4.4, 10, woodMat);
  const galponRoof = new THREE.Mesh(track(new THREE.BoxGeometry(15.2, 0.18, 19.2)), zincMat);
  galponRoof.position.set(-34, 4.5, -17);
  galponRoof.castShadow = true;
  galpon.add(galponRoof);

  // 3D Composite Tractor inside Galpón
  const tractor = new THREE.Group();
  tractor.position.set(-35, 0, -16);
  const tBodyMat = track(
    new THREE.MeshStandardMaterial({ color: 0x7d231d, roughness: 0.45, metalness: 0.35 })
  );
  const tireMat = track(new THREE.MeshStandardMaterial({ color: 0x16171a, roughness: 0.9 }));
  const chassis = new THREE.Mesh(track(new THREE.BoxGeometry(1.7, 1.1, 3.2)), tBodyMat);
  chassis.position.y = 1.05;
  chassis.castShadow = true;
  const cab = new THREE.Mesh(track(new THREE.BoxGeometry(1.5, 1.25, 1.3)), ironMat);
  cab.position.set(0, 2.1, -0.5);
  const exhaust = new THREE.Mesh(track(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 8)), ironMat);
  exhaust.position.set(0.4, 2.0, 0.9);
  tractor.add(chassis, cab, exhaust);
  const wheelRearGeo = track(new THREE.CylinderGeometry(0.78, 0.78, 0.45, 14));
  wheelRearGeo.rotateZ(Math.PI / 2);
  const wheelFrontGeo = track(new THREE.CylinderGeometry(0.45, 0.45, 0.32, 12));
  wheelFrontGeo.rotateZ(Math.PI / 2);
  for (const sx of [-1.05, 1.05]) {
    const rw = new THREE.Mesh(wheelRearGeo, tireMat);
    rw.position.set(sx, 0.78, -0.8);
    const fw = new THREE.Mesh(wheelFrontGeo, tireMat);
    fw.position.set(sx * 0.85, 0.45, 1.15);
    tractor.add(rw, fw);
  }
  galpon.add(tractor);
  colliders.push({ minX: -36.5, maxX: -33.5, minZ: -18, maxZ: -14 });

  // Electrical Generator at (-28.5, -10.5)
  const genPos = new THREE.Vector3(-28.5, 0, -10.5);
  const genGroup = new THREE.Group();
  genGroup.position.copy(genPos);
  const genBody = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.6, 1.15, 1.1)),
    track(new THREE.MeshStandardMaterial({ color: 0x8f5b1e, roughness: 0.4, metalness: 0.65 }))
  );
  genBody.position.y = 0.62;
  genBody.castShadow = true;
  const genTank = new THREE.Mesh(track(new THREE.CylinderGeometry(0.28, 0.28, 0.8, 10)), ironMat);
  genTank.rotation.z = Math.PI / 2;
  genTank.position.set(0, 1.32, 0);
  genGroup.add(genBody, genTank);
  galpon.add(genGroup);
  colliders.push({ minX: -29.6, maxX: -27.4, minZ: -11.3, maxZ: -9.7 });
  interactables.push({
    id: 'galpon_generator',
    kind: 'generator',
    label: 'Reparar / Encender Generador Eléctrico',
    position: genPos.clone(),
    radius: 2.8,
    mesh: genGroup,
  });

  scene.add(galpon);
  addElectricLamp(-34, 4.1, -15, 0xffe2ad, 20);
  addPickup('pickup_nafta', 'bidon_nafta', 'Recoger Bidón de Nafta', -38.5, 0.4, -22, 0xb52b2b, 1);
  addPickup('pickup_llave_inglesa', 'llave_inglesa', 'Llave Inglesa y Alambre', -31.5, 0.5, -23.5, 0x8d99ae, 1);
  addPickup('pickup_machete', 'machete', 'Machete de Monte', -39.2, 0.8, -12.5, 0xa8b0b8, 1);
  addPickup('pickup_llave_capilla', 'llave_capilla', 'Llave de la Capilla', -29.5, 0.6, -24.2, 0xd4b254, 1);

  // ==========================================================
  // D. EL MONTE Y CAÑAVERALES (InstancedMesh for high FPS)
  // ==========================================================
  const treeCount = 220;
  const trunkGeo = track(new THREE.CylinderGeometry(0.28, 0.46, 5.2, 7));
  trunkGeo.translate(0, 2.6, 0);
  const trunkMat = track(new THREE.MeshStandardMaterial({ color: 0x332418, roughness: 0.95 }));
  const canopyGeo = track(new THREE.DodecahedronGeometry(2.35, 1));
  canopyGeo.translate(0, 5.8, 0);
  const canopyMat = track(new THREE.MeshStandardMaterial({ color: 0x1a2c1c, roughness: 0.9 }));

  const treeTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const treeTops = new THREE.InstancedMesh(canopyGeo, canopyMat, treeCount);
  treeTrunks.castShadow = !isSoftwareGl;
  treeTops.castShadow = false;

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  let placedTrees = 0;
  let attempts = 0;
  while (placedTrees < treeCount && attempts < 1400) {
    attempts++;
    const angle = Math.random() * Math.PI * 2;
    const rad = 28 + Math.random() * 92;
    const tx = Math.cos(angle) * rad;
    const tz = Math.sin(angle) * rad;

    // Keep roads & key landmarks clear
    if (Math.abs(tx) < 6.5) continue;
    if (Math.abs(tz - 16) < 5.5) continue;
    if (Math.abs(tz - 24) < 5) continue;
    if (tx > 18 && tx < 50 && tz > -28 && tz < 6) continue; // Corrales
    if (tx > -44 && tx < -24 && tz > -30 && tz < -4) continue; // Galpones
    if (Math.hypot(tx - 54, tz - 48) < 12) continue; // Puesto
    if (Math.hypot(tx + 52, tz - 54) < 14) continue; // Cementerio
    if (Math.hypot(tx + 66, tz - 38) < 13) continue; // Capilla
    if (Math.hypot(tx - 8, tz + 78) < 14) continue; // Ritual Tree

    const ty = groundHeightAt(tx, tz);
    const sc = 0.85 + Math.random() * 0.55;
    dummy.position.set(tx, ty, tz);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    dummy.scale.set(sc, sc * (0.9 + Math.random() * 0.3), sc);
    dummy.updateMatrix();
    treeTrunks.setMatrixAt(placedTrees, dummy.matrix);
    treeTops.setMatrixAt(placedTrees, dummy.matrix);
    tint.setHSL(0.32 + (Math.random() - 0.5) * 0.05, 0.25, 0.14 + Math.random() * 0.08);
    treeTops.setColorAt(placedTrees, tint);

    if (placedTrees < 140) {
      colliders.push({
        minX: tx - 0.45 * sc,
        maxX: tx + 0.45 * sc,
        minZ: tz - 0.45 * sc,
        maxZ: tz + 0.45 * sc,
      });
    }
    placedTrees++;
  }
  treeTrunks.count = placedTrees;
  treeTops.count = placedTrees;
  treeTrunks.instanceMatrix.needsUpdate = true;
  treeTops.instanceMatrix.needsUpdate = true;
  if (treeTops.instanceColor) treeTops.instanceColor.needsUpdate = true;
  treeTrunks.computeBoundingSphere();
  treeTops.computeBoundingSphere();
  scene.add(treeTrunks, treeTops);

  // Cañaverales (Sugarcane patches)
  const caneCount = 260;
  const caneGeo = track(new THREE.CylinderGeometry(0.04, 0.06, 3.1, 5));
  caneGeo.translate(0, 1.55, 0);
  const caneMat = track(new THREE.MeshStandardMaterial({ color: 0x3a4a24, roughness: 0.85 }));
  const caneMeshes = new THREE.InstancedMesh(caneGeo, caneMat, caneCount);
  for (let i = 0; i < caneCount; i++) {
    const cluster = i % 2 === 0 ? { x: 24, z: -48 } : { x: -24, z: -48 };
    const cx = cluster.x + (Math.random() - 0.5) * 24;
    const cz = cluster.z + (Math.random() - 0.5) * 24;
    dummy.position.set(cx, groundHeightAt(cx, cz), cz);
    dummy.rotation.set((Math.random() - 0.5) * 0.14, Math.random() * Math.PI, (Math.random() - 0.5) * 0.14);
    dummy.scale.setScalar(0.85 + Math.random() * 0.4);
    dummy.updateMatrix();
    caneMeshes.setMatrixAt(i, dummy.matrix);
  }
  caneMeshes.computeBoundingSphere();
  scene.add(caneMeshes);

  // Relic in El Monte (Chapter 3)
  addPickup('pickup_brujula', 'brujula_abuelo', 'Brújula de Vigilancia del Abuelo', 28, groundHeightAt(28, -56) + 0.5, -56, 0xd4af37, 1);

  // ==========================================================
  // F. LUGARES ESPECIALES
  // ==========================================================
  // 1. Puesto de Vigilancia (54, 48)
  const puesto = new THREE.Group();
  puesto.position.set(54, groundHeightAt(54, 48), 48);
  addWall(puesto, -2.5, 1.4, 0, 0.25, 2.8, 5, woodMat, 54, 48);
  addWall(puesto, 2.5, 1.4, 0, 0.25, 2.8, 5, woodMat, 54, 48);
  addWall(puesto, 0, 1.4, -2.5, 5, 2.8, 0.25, woodMat, 54, 48);
  const pRoof = new THREE.Mesh(track(new THREE.BoxGeometry(5.8, 0.15, 5.8)), zincMat);
  pRoof.position.y = 2.95;
  puesto.add(pRoof);
  scene.add(puesto);
  addElectricLamp(54, groundHeightAt(54, 48) + 2.5, 48, 0xffaa44, 14);
  addDocumentProp('doc_pickup_peon', 'doc_peon', 'Leer Bitácora del Puesto de Vigilancia', 54, groundHeightAt(54, 48) + 0.6, 48);
  addPickup('pickup_cartuchos_puesto', 'cartuchos_12', 'Cartuchos Cal. 12 (x6)', 52.8, groundHeightAt(52.8, 47.2) + 0.5, 47.2, 0xb8382c, 6);
  addPickup('pickup_botiquin_puesto', 'botiquin', 'Botiquín de Campo', 55.2, groundHeightAt(55.2, 47.2) + 0.5, 47.2, 0xd64545, 1);

  // 2. Cementerio Rural (-52, 54)
  const cemGroup = new THREE.Group();
  const cemBaseY = groundHeightAt(-52, 54);
  cemGroup.position.set(-52, cemBaseY, 54);
  for (let i = 0; i < 12; i++) {
    const gx = -7 + (i % 4) * 4.5;
    const gz = -5 + Math.floor(i / 4) * 5;
    const stone = new THREE.Mesh(track(new THREE.BoxGeometry(0.9, 1.1, 0.24)), stoneMat);
    stone.position.set(gx, 0.55, gz);
    stone.rotation.z = (Math.random() - 0.5) * 0.14;
    cemGroup.add(stone);

    const crossV = new THREE.Mesh(track(new THREE.BoxGeometry(0.08, 1.25, 0.08)), ironMat);
    crossV.position.set(gx + 0.8, 0.62, gz);
    const crossH = new THREE.Mesh(track(new THREE.BoxGeometry(0.55, 0.08, 0.08)), ironMat);
    crossH.position.set(gx + 0.8, 0.95, gz);
    cemGroup.add(crossV, crossH);
  }
  scene.add(cemGroup);
  addPickup('pickup_sal_cementerio', 'sal_gruesa', 'Sal Gruesa Consagrada', -52, cemBaseY + 0.5, 54, 0xdce6f2, 2);

  // 3. Capilla Antigua (-66, 38)
  const capilla = new THREE.Group();
  const capY = groundHeightAt(-66, 38);
  capilla.position.set(-66, capY, 38);
  addWall(capilla, -3.5, 2.0, 0, 0.35, 4.0, 9, adobeMat, -66, 38);
  addWall(capilla, 3.5, 2.0, 0, 0.35, 4.0, 9, adobeMat, -66, 38);
  addWall(capilla, 0, 2.0, -4.5, 7, 4.0, 0.35, adobeMat, -66, 38);
  const capRoof = new THREE.Mesh(track(new THREE.ConeGeometry(5.6, 2.2, 4)), zincMat);
  capRoof.position.y = 5.0;
  capRoof.rotation.y = Math.PI / 4;
  const bellCross = new THREE.Mesh(track(new THREE.BoxGeometry(0.12, 1.2, 0.12)), ironMat);
  bellCross.position.y = 6.5;
  const altar = new THREE.Mesh(track(new THREE.BoxGeometry(2.4, 1.05, 1.0)), stoneMat);
  altar.position.set(0, 0.52, -3.2);
  capilla.add(capRoof, bellCross, altar);
  scene.add(capilla);
  addElectricLamp(-66, capY + 3.4, 36, 0xffe4b8, 15);
  addPickup('pickup_cruz_capilla', 'cruz_plata', 'Cruz de Plata Antigua', -66, capY + 1.15, 34.8, 0xe8edf2, 1);
  addDocumentProp('doc_pickup_cura', 'doc_cura', 'Leer Carta del Padre Anselmo', -66.6, capY + 1.12, 34.8);

  // 4. Árbol del Ritual (8, -78)
  const ritualPos = new THREE.Vector3(8, groundHeightAt(8, -78), -78);
  const ritualTree = new THREE.Group();
  ritualTree.position.copy(ritualPos);
  const rTrunk = new THREE.Mesh(track(new THREE.CylinderGeometry(1.1, 1.65, 9.5, 10)), trunkMat);
  rTrunk.position.y = 4.75;
  rTrunk.castShadow = true;
  const rCrown = new THREE.Mesh(track(new THREE.DodecahedronGeometry(4.8, 1)), canopyMat);
  rCrown.position.y = 10.2;
  const altarStone = new THREE.Mesh(track(new THREE.CylinderGeometry(1.4, 1.6, 0.9, 8)), stoneMat);
  altarStone.position.set(0, 0.45, 2.4);
  ritualTree.add(rTrunk, rCrown, altarStone);

  // Ritual eerie candles
  const candleLight = new THREE.PointLight(0xff6b2b, 2.8, 14);
  candleLight.position.set(0, 1.4, 2.4);
  ritualTree.add(candleLight);
  for (let c = 0; c < 5; c++) {
    const a = (c / 5) * Math.PI * 2;
    const candle = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.06, 0.07, 0.28, 6)),
      track(new THREE.MeshStandardMaterial({ color: 0xe8dec8, emissive: 0xff7b29, emissiveIntensity: 1.5 }))
    );
    candle.position.set(Math.cos(a) * 1.1, 0.98, 2.4 + Math.sin(a) * 1.1);
    ritualTree.add(candle);
  }
  scene.add(ritualTree);
  colliders.push({ minX: 6.5, maxX: 9.5, minZ: -79.5, maxZ: -76.5 });
  interactables.push({
    id: 'ritual_altar_final',
    kind: 'ritual_altar',
    label: 'Altar del Pacto — Decidir el destino de La Finca',
    position: ritualPos.clone().add(new THREE.Vector3(0, 0.8, 2.4)),
    radius: 3.4,
    mesh: altarStone,
  });

  return {
    colliders,
    interactables,
    animals,
    electricLights,
    lampEmissives,
    treeTops,
    caneMeshes,
    houseBounds: { minX: -7.2, maxX: 7.2, minZ: -6.2, maxZ: 6.2 },
    generatorPos: genPos,
    ritualTreePos: ritualPos,
    creekX: 0,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
