import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EnemyAgent, CreatureAIManager } from '../ai/EnemyAI';
import { AudioManager } from '../audio/AudioManager';
import {
  CHAPTERS,
  CRAFT_RECIPES,
  CREATURE_CODEX,
  DOCUMENTS_CATALOG,
  INITIAL_INVENTORY,
  ITEM_CATALOG,
  ZONE_LABELS,
} from '../data';
import { ArticulatedLimbs, createPlayerModel } from '../entities/CharacterModels';
import { SaveManager } from '../systems/SaveManager';
import { WeatherSystem } from '../systems/WeatherSystem';
import {
  CreatureId,
  EndingType,
  GameMode,
  GameSettings,
  InventoryItem,
  PlayerHudState,
  SaveSlotData,
  WeaponId,
} from '../types';
import { createWorldTextures } from '../world/textures';
import {
  buildFincaWorld,
  getZoneAt,
  groundHeightAt,
  InteractableObject,
  WorldData,
} from '../world/WorldBuilder';

export interface EngineCallbacks {
  onHudUpdate: (hud: PlayerHudState) => void;
  onInventoryUpdate: (inv: InventoryItem[]) => void;
  onDocumentOpened: (docId: string) => void;
  onCreatureUnlocked: (cid: CreatureId) => void;
  onRitualChoicePrompt: (hasAmulet: boolean) => void;
  onVictory: (ending: EndingType, summary: string) => void;
  onDefeat: (cause: string) => void;
  onToggleInventory: () => void;
  onToggleMap: () => void;
  onTogglePause: () => void;
}

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _camIdeal = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _attackDir = new THREE.Vector3();

export class GameEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private settings: GameSettings;
  private audio: AudioManager;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private isSoftwareGl = false;
  private frameId = 0;
  private disposed = false;
  private paused = false;

  private world!: WorldData;
  private weather!: WeatherSystem;
  private ai!: CreatureAIManager;

  // Player state
  private playerGroup!: THREE.Group;
  private playerLimbs!: ArticulatedLimbs;
  private flashlight!: THREE.SpotLight;
  private flashlightTarget!: THREE.Object3D;
  private muzzleLight!: THREE.PointLight;

  private playerPos = new THREE.Vector3(0, 0, 12);
  private playerVelY = 0;
  private onGround = true;
  private yaw = 0;
  private pitch = -0.1;
  private walkPhase = 0;
  private cameraShake = 0;
  private muzzleTimer = 0;
  private attackCooldown = 0;

  // Gameplay state
  private mode: GameMode = 'campaign';
  private chapter = 1;
  private nightsSurvived = 0;
  private gameHour = 21.5;
  private health = 100;
  private maxHealth = 100;
  private stamina = 100;
  private maxStamina = 100;
  private energy = 100;
  private fear = 10;
  private battery = 100;
  private flashlightOn = true;
  private crouching = false;
  private aiming = false;
  private equippedWeapon: WeaponId = 'cuchillo';
  private ammoInClip: Record<'escopeta' | 'revolver', number> = {
    escopeta: 2,
    revolver: 6,
  };
  private inventory: InventoryItem[] = [];
  private unlockedDocs = new Set<string>();
  private unlockedCreatures = new Set<CreatureId>();
  private completedChapters = new Set<number>();
  private xp = 0;
  private level = 1;
  private skills = { sigilo: 1, resistencia: 1, punteria: 1 };
  private achievements = new Set<string>();

  private generatorOn = false;
  private corralRepaired = false;
  private relicFound = false;
  private puestoReached = false;
  private docsRecovered = false;
  private chapelInvestigated = false;
  private objectiveProgress = 0;
  private objectiveTotal = 1;

  private subtitleText: string | null = null;
  private subtitleTimer = 0;
  private worldEventTimer = 14;
  private autosaveTimer = 45;
  private hudEmitTimer = 0;
  private lastThreatLevel = 0;
  private nearestCreature: CreatureId | null = null;

  // Input state
  private keys: Record<string, boolean> = {};
  private pointerLocked = false;
  private draggingLook = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private lastTime = performance.now();

  constructor(
    container: HTMLElement,
    settings: GameSettings,
    callbacks: EngineCallbacks
  ) {
    this.container = container;
    this.settings = settings;
    this.callbacks = callbacks;
    this.audio = new AudioManager(settings);

    this.initRendererAndScene();
    this.bindEvents();
  }

  private detectSoftwareGl(): boolean {
    try {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return true;
    }
  }

  private initRendererAndScene(): void {
    this.isSoftwareGl = this.detectSoftwareGl();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && this.settings.graphicsQuality !== 'baja',
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.shadowMap.enabled =
      !this.isSoftwareGl && this.settings.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(
      this.container.clientWidth || window.innerWidth,
      this.container.clientHeight || window.innerHeight
    );

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070a10);
    this.scene.fog = new THREE.FogExp2(0x070a10, 0.024);

    // Mandatory studio environment map for PBR metals & wet reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(this.settings.fov, w / h, 0.1, 220);

    // Balanced moonlight + cool/warm hemisphere rig (<= 3 shadow casters)
    const hemiLight = new THREE.HemisphereLight(0x4b638a, 0x1b1610, 0.42);
    this.scene.add(hemiLight);

    const moonLight = new THREE.DirectionalLight(0x88a8d9, 0.78);
    moonLight.position.set(42, 62, -36);
    moonLight.castShadow = !this.isSoftwareGl && this.settings.shadows;
    moonLight.shadow.mapSize.set(1024, 1024);
    const d = 52;
    moonLight.shadow.camera.left = -d;
    moonLight.shadow.camera.right = d;
    moonLight.shadow.camera.top = d;
    moonLight.shadow.camera.bottom = -d;
    moonLight.shadow.camera.far = 160;
    moonLight.shadow.bias = -0.0005;
    moonLight.shadow.normalBias = 0.02;
    this.scene.add(moonLight);

    // World
    const textures = createWorldTextures(this.renderer);
    this.world = buildFincaWorld(this.scene, textures, this.isSoftwareGl);
    this.weather = new WeatherSystem(this.scene, moonLight, hemiLight);
    this.ai = new CreatureAIManager(this.scene);

    // Player character & flashlight
    const pm = createPlayerModel();
    this.playerGroup = pm.group;
    this.playerLimbs = pm.limbs;
    this.scene.add(this.playerGroup);

    this.flashlight = new THREE.SpotLight(
      0xfff0d4,
      9.5,
      44,
      Math.PI / 5.5,
      0.52,
      1.35
    );
    this.flashlightTarget = new THREE.Object3D();
    this.scene.add(this.flashlight, this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;

    this.muzzleLight = new THREE.PointLight(0xffaa44, 0, 14);
    this.scene.add(this.muzzleLight);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.startLoop();
  }

  public startNewSession(
    mode: GameMode,
    startChapter = 1,
    challengeId?: string,
    loadData?: SaveSlotData
  ): void {
    this.audio.init();
    this.mode = mode;
    this.paused = false;

    if (loadData) {
      this.chapter = loadData.chapter;
      this.nightsSurvived = loadData.nightsSurvived;
      this.health = loadData.health;
      this.battery = loadData.battery;
      this.gameHour = loadData.gameHour;
      this.generatorOn = loadData.generatorOn;
      this.playerPos.set(loadData.playerPos.x, 0, loadData.playerPos.z);
      this.inventory = JSON.parse(JSON.stringify(loadData.inventory));
      this.unlockedDocs = new Set(loadData.unlockedDocuments);
      this.unlockedCreatures = new Set(loadData.unlockedCreatures);
      this.completedChapters = new Set(loadData.completedChapters);
      this.xp = loadData.xp;
      this.achievements = new Set(loadData.achievements);
    } else {
      this.chapter = startChapter;
      this.nightsSurvived = 0;
      this.health = 100;
      this.stamina = 100;
      this.energy = 100;
      this.fear = 12;
      this.battery = 100;
      this.flashlightOn = true;
      this.generatorOn = startChapter > 1;
      this.corralRepaired = startChapter > 2;
      this.relicFound = startChapter > 3;
      this.puestoReached = startChapter > 4;
      this.docsRecovered = startChapter > 5;
      this.chapelInvestigated = startChapter > 6;
      this.playerPos.set(0, 0, 12.5);
      this.yaw = 0;
      this.inventory = JSON.parse(JSON.stringify(INITIAL_INVENTORY));
      this.unlockedDocs.clear();
      this.xp = 0;
      this.level = 1;

      if (startChapter >= 2) {
        this.giveItem('escopeta', 1);
        this.giveItem('cartuchos_12', 8);
      }
      if (startChapter >= 5) {
        this.giveItem('revolver', 1);
        this.giveItem('balas_38', 12);
        this.giveItem('llave_sotano', 1);
      }
      if (challengeId === 'luna_sangre') {
        this.playerPos.set(32, 0, -10);
      } else if (challengeId === 'cadenas_niebla') {
        this.playerPos.set(-50, 0, 52);
      }
    }

    this.playerPos.y = groundHeightAt(this.playerPos.x, this.playerPos.z);
    this.syncGeneratorLights();
    this.setupChapterOrMode(challengeId);
    this.callbacks.onInventoryUpdate([...this.inventory]);
    this.emitHud();
  }

  private setupChapterOrMode(challengeId?: string): void {
    const chap = CHAPTERS[Math.max(0, Math.min(CHAPTERS.length - 1, this.chapter - 1))];
    this.gameHour = chap.startHour;
    this.objectiveProgress = 0;
    this.objectiveTotal = 1;

    if (this.mode === 'exploration') {
      this.weather.setCondition('luna_llena');
      this.ai.clear();
      this.showSubtitle('Modo Exploración: recorre libremente la finca en General Güemes.');
      return;
    }

    if (this.mode === 'survival' || this.mode === 'infinite_night') {
      this.weather.setCondition(
        this.nightsSurvived % 2 === 0 ? 'tormenta_electrica' : 'luna_llena'
      );
      const waveCreatures: CreatureId[] =
        this.nightsSurvived === 0
          ? ['lobizon', 'duende']
          : this.nightsSurvived === 1
          ? ['lobizon', 'ocumar', 'mulanima']
          : ['lobizon', 'ocumar', 'mulanima', 'familiar'];
      this.ai.spawnCreatures(waveCreatures, this.settings.difficulty);
      this.showSubtitle(
        `Noche ${this.nightsSurvived + 1}: aguanta hasta el amanecer (06:00 hs).`
      );
      return;
    }

    if (this.mode === 'challenges') {
      if (challengeId === 'luna_sangre') {
        this.weather.setCondition('luna_llena');
        this.ai.spawnCreatures(['lobizon'], 'pesadilla');
        this.showSubtitle('Desafío: Sobrevive bajo la luna roja en los corrales.');
      } else if (challengeId === 'cadenas_niebla') {
        this.weather.setCondition('tormenta_total');
        this.ai.spawnCreatures(['mulanima', 'alma_mula'], this.settings.difficulty);
        this.showSubtitle('Desafío: Regresa a la Casa Principal entre la niebla.');
      } else {
        this.weather.setCondition('tormenta_electrica');
        this.battery = 35;
        this.generatorOn = false;
        this.syncGeneratorLights();
        this.ai.spawnCreatures(['duende', 'ocumar'], this.settings.difficulty);
        this.showSubtitle('Desafío: Enciende el generador con poca batería.');
      }
      return;
    }

    // Standard 7-chapter campaign
    this.weather.setCondition(chap.weather);
    this.ai.spawnCreatures(chap.activeCreatures, this.settings.difficulty);
    this.showSubtitle(`${chap.title} — ${chap.objectiveTitle}`);
  }

  public setPaused(p: boolean): void {
    this.paused = p;
    if (p && document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    }
  }

  public updateSettings(s: GameSettings): void {
    this.settings = s;
    this.audio.updateSettings(s);
    this.camera.fov = s.fov;
    this.camera.updateProjectionMatrix();
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && s.shadows;
  }

  public requestPointerLock(): void {
    this.audio.init();
    if (this.paused) return;
    try {
      this.renderer.domElement.requestPointerLock?.();
    } catch {
      // Fallback drag look remains active
    }
  }

  public toggleCameraMode(): void {
    this.settings.cameraMode =
      this.settings.cameraMode === 'third_person'
        ? 'first_person'
        : 'third_person';
    SaveManager.saveSettings(this.settings);
    this.showSubtitle(
      this.settings.cameraMode === 'first_person'
        ? 'Cámara: Primera Persona'
        : 'Cámara: Tercera Persona'
    );
    this.emitHud();
  }

  public equipWeapon(weapon: WeaponId): void {
    if (
      weapon !== 'ninguna' &&
      !this.inventory.some((i) => i.id === weapon && i.quantity > 0)
    ) {
      this.showSubtitle('No tienes esa arma en tu mochila.');
      return;
    }
    this.equippedWeapon = weapon;
    this.audio.playClick();
    this.emitHud();
  }

  public useInventoryItem(itemId: string): boolean {
    const item = this.inventory.find((i) => i.id === itemId && i.quantity > 0);
    if (!item) return false;

    if (item.category === 'armas') {
      this.equipWeapon(itemId as WeaponId);
      return true;
    }

    let used = false;
    if (itemId === 'pilas') {
      this.battery = Math.min(100, this.battery + 65);
      used = true;
      this.showSubtitle('Pilas cambiadas. Linterna recargada.');
    } else if (itemId === 'botiquin') {
      this.health = Math.min(this.maxHealth, this.health + 55);
      used = true;
      this.showSubtitle('Heridas vendadas (+55 Salud).');
    } else if (itemId === 'yuyos_curativos') {
      this.health = Math.min(this.maxHealth, this.health + 25);
      this.fear = Math.max(0, this.fear - 15);
      used = true;
      this.showSubtitle('Cataplasma aplicado (+25 Salud, calma el pulso).');
    } else if (itemId === 'yerba_mate' || itemId === 'mate_energizante') {
      const full = itemId === 'mate_energizante';
      this.energy = Math.min(100, this.energy + (full ? 70 : 35));
      this.stamina = this.maxStamina;
      this.fear = Math.max(0, this.fear - (full ? 45 : 22));
      used = true;
      this.showSubtitle(
        full ? 'Mate amargo caliente: energía y coraje restaurados.' : 'Mate cebado (+Energía).'
      );
    } else if (itemId === 'agua_aljibe') {
      this.stamina = this.maxStamina;
      this.energy = Math.min(100, this.energy + 25);
      used = true;
      this.showSubtitle('Agua fresca del aljibe.');
    } else if (itemId === 'empanada_charqui') {
      this.energy = Math.min(100, this.energy + 40);
      this.health = Math.min(this.maxHealth, this.health + 15);
      used = true;
      this.showSubtitle('Charqui y tortilla consumidos (+40 Energía, +15 Salud).');
    } else if (itemId === 'sal_gruesa' || itemId === 'amuleto_proteccion') {
      // Repel nearby spectral entities immediately!
      let repelledAny = false;
      for (const a of this.ai.agents) {
        if (a.group.position.distanceTo(this.playerPos) < 16) {
          this.ai.damageAgent(a, itemId === 'amuleto_proteccion' ? 120 : 65, true);
          repelledAny = true;
        }
      }
      if (itemId === 'sal_gruesa') used = true;
      this.fear = Math.max(0, this.fear - 30);
      this.showSubtitle(
        repelledAny
          ? '¡La sal consagrada hace retroceder a las apariciones!'
          : 'Trazas un círculo protector con sal gruesa.'
      );
    }

    if (used) {
      this.consumeItem(itemId, 1);
      this.audio.playClick();
      this.emitHud();
    }
    return used;
  }

  public combineItems(idA: string, idB: string): string | null {
    const recipe = CRAFT_RECIPES.find(
      (r) =>
        (r.ingredients[0] === idA && r.ingredients[1] === idB) ||
        (r.ingredients[1] === idA && r.ingredients[0] === idB)
    );
    if (!recipe) return null;

    const hasA = this.inventory.some((i) => i.id === idA && i.quantity > 0);
    const hasB = this.inventory.some((i) => i.id === idB && i.quantity > 0);
    if (!hasA || !hasB) return null;

    this.consumeItem(idA, 1);
    this.consumeItem(idB, 1);
    this.giveItem(recipe.resultId, 1);
    this.grantXp(40);
    this.audio.playClick();
    this.showSubtitle(`Objeto combinado: ${recipe.resultName}`);
    return recipe.resultName;
  }

  public resolveFinalRitual(choice: EndingType): void {
    this.paused = true;
    const summaries: Record<EndingType, string> = {
      verdad_revelada:
        'Con la Cruz de Plata y la Escritura de 1924 en tus manos, quemaste el antiguo pacto sobre las raíces del quebracho. Al romper la maldición, la tormenta se disipó sobre General Güemes y las ánimas descansaron en paz.',
      pacto_roto:
        'Enfrentaste a las bestias sin doblegarte y destruiste el altar del monte. La finca sobrevivió a la noche más oscura, aunque entre los cañaverales todavía resuenan ecos lejanos cuando sale la luna llena.',
      sacrificio_monte:
        'Decidiste renovar el antiguo juramento de tu bisabuelo para proteger la tierra a cualquier costo. Las criaturas regresaron a las sombras del monte, pero ahora tú eres el guardián nocturno de La Finca.',
    };
    this.saveGame('autosave', 'Final Completado');
    this.callbacks.onVictory(choice, summaries[choice]);
  }

  public saveGame(slotId: string, label: string): void {
    const data: SaveSlotData = {
      slotId,
      label,
      timestamp: Date.now(),
      mode: this.mode,
      chapter: this.chapter,
      nightsSurvived: this.nightsSurvived,
      health: Math.round(this.health),
      battery: Math.round(this.battery),
      gameHour: this.gameHour,
      generatorOn: this.generatorOn,
      playerPos: { x: this.playerPos.x, z: this.playerPos.z },
      inventory: this.inventory,
      unlockedDocuments: Array.from(this.unlockedDocs),
      unlockedCreatures: Array.from(this.unlockedCreatures),
      completedChapters: Array.from(this.completedChapters),
      xp: this.xp,
      achievements: Array.from(this.achievements),
    };
    SaveManager.saveToSlot(data);
    this.showSubtitle(`Partida guardada (${label}).`);
  }

  private giveItem(itemId: string, qty = 1): void {
    const template = ITEM_CATALOG[itemId];
    if (!template) return;
    const existing = this.inventory.find((i) => i.id === itemId);
    if (existing) {
      existing.quantity = Math.min(existing.maxStack, existing.quantity + qty);
    } else {
      this.inventory.push({ ...template, quantity: qty });
    }
    this.callbacks.onInventoryUpdate([...this.inventory]);
  }

  private consumeItem(itemId: string, qty = 1): void {
    const existing = this.inventory.find((i) => i.id === itemId);
    if (!existing) return;
    existing.quantity -= qty;
    if (existing.quantity <= 0) {
      this.inventory = this.inventory.filter((i) => i.id !== itemId);
    }
    this.callbacks.onInventoryUpdate([...this.inventory]);
  }

  private grantXp(amount: number): void {
    this.xp += amount;
    const nextLevel = 1 + Math.floor(this.xp / 120);
    if (nextLevel > this.level) {
      this.level = nextLevel;
      this.skills.resistencia = Math.min(5, this.skills.resistencia + 1);
      this.skills.sigilo = Math.min(5, this.skills.sigilo + 1);
      this.skills.punteria = Math.min(5, this.skills.punteria + 1);
      this.maxHealth = 100 + (this.level - 1) * 10;
      this.maxStamina = 100 + (this.level - 1) * 12;
      this.showSubtitle(`Nivel ${this.level}: resistencia y puntería mejoradas.`);
    }
  }

  private showSubtitle(msg: string, duration = 4.5): void {
    this.subtitleText = msg;
    this.subtitleTimer = duration;
  }

  private syncGeneratorLights(): void {
    for (let i = 0; i < this.world.electricLights.length; i++) {
      this.world.electricLights[i].intensity = this.generatorOn ? 3.2 : 0;
      this.world.lampEmissives[i].emissiveIntensity = this.generatorOn ? 2.4 : 0;
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('contextmenu', this.onContextMenu);
    canvas.addEventListener('webglcontextlost', this.onContextLost);
  }

  private onContextMenu = (e: MouseEvent) => e.preventDefault();

  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.paused = true;
  };

  private onPointerLockChange = () => {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
  };

  private onResize = () => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
    this.audio.init();

    if (e.code === 'Escape') {
      this.callbacks.onTogglePause();
      return;
    }
    if (this.paused) return;

    if (e.code === 'KeyI') this.callbacks.onToggleInventory();
    if (e.code === 'KeyM') this.callbacks.onToggleMap();
    if (e.code === 'KeyF') {
      this.flashlightOn = !this.flashlightOn;
      this.audio.playClick();
    }
    if (e.code === 'KeyV') this.toggleCameraMode();
    if (e.code === 'ControlLeft' || e.code === 'KeyC') {
      this.crouching = !this.crouching;
    }
    if (e.code === 'KeyE') this.tryInteract();
    if (e.code === 'KeyR') this.tryReload();
    if (e.code === 'Digit1') this.equipWeapon('escopeta');
    if (e.code === 'Digit2') this.equipWeapon('revolver');
    if (e.code === 'Digit3') this.equipWeapon('machete');
    if (e.code === 'Digit4') this.equipWeapon('cuchillo');
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private onMouseDown = (e: MouseEvent) => {
    this.audio.init();
    if (this.paused) return;
    if (e.button === 2) {
      this.aiming = true;
      return;
    }
    if (e.button === 0) {
      if (!this.pointerLocked) {
        this.draggingLook = true;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
      }
      this.performAttack();
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 2) this.aiming = false;
    if (e.button === 0) this.draggingLook = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.paused) return;
    const sens = 0.0022 * this.settings.mouseSensitivity;
    if (this.pointerLocked) {
      this.yaw -= e.movementX * sens;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch - e.movementY * sens,
        -0.75,
        0.55
      );
    } else if (this.draggingLook) {
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.yaw -= dx * sens * 1.4;
      this.pitch = THREE.MathUtils.clamp(this.pitch - dy * sens * 1.4, -0.75, 0.55);
    }
  };

  private tryReload(): void {
    if (this.equippedWeapon !== 'escopeta' && this.equippedWeapon !== 'revolver') {
      return;
    }
    const ammoId = this.equippedWeapon === 'escopeta' ? 'cartuchos_12' : 'balas_38';
    const maxClip = this.equippedWeapon === 'escopeta' ? 2 : 6;
    const current = this.ammoInClip[this.equippedWeapon];
    if (current >= maxClip) return;

    const reserveItem = this.inventory.find((i) => i.id === ammoId);
    if (!reserveItem || reserveItem.quantity <= 0) {
      this.showSubtitle('Sin munición de reserva en la mochila.');
      return;
    }

    const needed = Math.min(maxClip - current, reserveItem.quantity);
    this.ammoInClip[this.equippedWeapon] += needed;
    this.consumeItem(ammoId, needed);
    this.audio.playClick();
    this.showSubtitle('Arma recargada.');
  }

  private performAttack(): void {
    if (this.attackCooldown > 0) return;

    if (this.equippedWeapon === 'escopeta' || this.equippedWeapon === 'revolver') {
      const w = this.equippedWeapon;
      if (this.ammoInClip[w] <= 0) {
        this.audio.playClick();
        this.showSubtitle('Cargador vacío. Presiona [R] para recargar.');
        this.attackCooldown = 0.35;
        return;
      }

      this.ammoInClip[w]--;
      this.attackCooldown = w === 'escopeta' ? 0.85 : 0.42;
      this.audio.playWeaponSound(w);
      this.muzzleLight.position.copy(this.playerPos).add(new THREE.Vector3(0, 1.4, 0));
      this.muzzleTimer = 0.09;
      if (!this.settings.reduceCameraShake) {
        this.cameraShake = w === 'escopeta' ? 0.25 : 0.12;
      }

      // Raycast from camera forward
      this.camera.getWorldDirection(_attackDir);
      _raycaster.set(this.camera.position, _attackDir);
      _raycaster.far = w === 'escopeta' ? 24 : 38;

      const baseDmg =
        (w === 'escopeta' ? 78 : 42) * (1 + (this.skills.punteria - 1) * 0.12);
      this.checkWeaponHit(w === 'escopeta' ? 24 : 38, baseDmg, false);
    } else if (this.equippedWeapon === 'machete' || this.equippedWeapon === 'cuchillo') {
      const w = this.equippedWeapon;
      this.attackCooldown = w === 'machete' ? 0.52 : 0.34;
      this.audio.playWeaponSound(w);
      this.stamina = Math.max(0, this.stamina - 6);
      const dmg = w === 'machete' ? 38 : 24;
      this.checkWeaponHit(3.1, dmg, false);
    }
  }

  private checkWeaponHit(range: number, damage: number, isHoly: boolean): void {
    this.camera.getWorldDirection(_attackDir);
    let bestAgent: EnemyAgent | null = null;
    let bestDist = range;

    for (const a of this.ai.agents) {
      if (a.state === 'respawn') continue;
      const toEnemy = new THREE.Vector3()
        .subVectors(a.group.position, this.playerPos)
        .add(new THREE.Vector3(0, 1.0, 0));
      const d = toEnemy.length();
      if (d > bestDist) continue;
      toEnemy.normalize();
      const align = toEnemy.dot(_attackDir);
      if (align > 0.78 || d < 2.2) {
        bestDist = d;
        bestAgent = a;
      }
    }

    if (bestAgent) {
      const res = this.ai.damageAgent(bestAgent, damage, isHoly);
      const name = CREATURE_CODEX[bestAgent.creatureId].name;
      if (res.killed) {
        this.grantXp(55);
        this.showSubtitle(`Lograste ahuyentar a ${name} hacia la oscuridad.`);
      } else if (res.repelled) {
        this.grantXp(25);
        this.showSubtitle(`${name} retrocede herido.`);
      } else {
        this.showSubtitle(`Impacto directo en ${name}.`);
      }
    }
  }

  private getNearestInteractable(): InteractableObject | null {
    let best: InteractableObject | null = null;
    let bestD = Infinity;
    for (const obj of this.world.interactables) {
      if (obj.consumed) continue;
      const d = obj.position.distanceTo(this.playerPos);
      if (d <= obj.radius && d < bestD) {
        bestD = d;
        best = obj;
      }
    }
    return best;
  }

  private tryInteract(): void {
    const target = this.getNearestInteractable();
    if (!target) return;

    if (target.kind === 'pickup' && target.itemId) {
      this.giveItem(target.itemId, target.quantity ?? 1);
      target.consumed = true;
      target.mesh.visible = false;
      this.audio.playClick();
      this.grantXp(15);

      if (target.itemId === 'escopeta' || target.itemId === 'revolver' || target.itemId === 'machete') {
        this.equipWeapon(target.itemId as WeaponId);
      }

      if (target.itemId === 'brujula_abuelo' && this.chapter === 3) {
        this.relicFound = true;
        this.advanceCampaignChapter(4);
      }
      if (target.itemId === 'cruz_plata' && this.chapter === 6) {
        this.chapelInvestigated = true;
        this.advanceCampaignChapter(7);
      }
      this.showSubtitle(`Recogido: ${ITEM_CATALOG[target.itemId]?.name ?? target.label}`);
      return;
    }

    if (target.kind === 'document' && target.docId) {
      this.unlockedDocs.add(target.docId);
      target.consumed = true;
      target.mesh.visible = false;
      this.audio.playClick();
      this.grantXp(25);
      this.callbacks.onDocumentOpened(target.docId);

      if (target.docId === 'doc_abuelo_1924' && this.chapter === 5) {
        this.docsRecovered = true;
        this.advanceCampaignChapter(6);
      }
      return;
    }

    if (target.kind === 'door') {
      if (target.lockedBy && !this.inventory.some((i) => i.id === target.lockedBy)) {
        const keyName = ITEM_CATALOG[target.lockedBy]?.name ?? 'una llave';
        this.showSubtitle(`Cerrado con llave. Necesitas: ${keyName}.`);
        return;
      }
      target.isOpen = !target.isOpen;
      target.mesh.rotation.y = target.isOpen ? Math.PI * 0.48 : 0;
      this.audio.playDoorCreak();
      return;
    }

    if (target.kind === 'generator') {
      const hasKit = this.inventory.some((i) => i.id === 'kit_generador');
      const hasBoth =
        this.inventory.some((i) => i.id === 'bidon_nafta') &&
        this.inventory.some((i) => i.id === 'llave_inglesa');
      if (!this.generatorOn) {
        if (!hasKit && !hasBoth) {
          this.showSubtitle(
            'El generador está averiado. Busca el Bidón de Nafta y la Llave Inglesa en el galpón.'
          );
          return;
        }
        if (hasKit) {
          this.consumeItem('kit_generador', 1);
        } else {
          this.consumeItem('bidon_nafta', 1);
          this.consumeItem('llave_inglesa', 1);
        }
        this.generatorOn = true;
        this.syncGeneratorLights();
        this.grantXp(60);
        this.showSubtitle('¡Generador encendido! Se iluminó la Casa Principal y el Galpón.');
        if (this.chapter === 1 && this.mode === 'campaign') {
          this.advanceCampaignChapter(2);
        }
      } else {
        this.generatorOn = false;
        this.syncGeneratorLights();
        this.showSubtitle('Generador apagado.');
      }
      return;
    }

    if (target.kind === 'fence_repair') {
      if (this.corralRepaired) {
        this.showSubtitle('El alambrado del corral ya está reforzado.');
        return;
      }
      this.corralRepaired = true;
      target.consumed = true;
      target.mesh.scale.y = 4.5;
      this.grantXp(55);
      this.showSubtitle('Alambrado reparado. Los animales están más seguros.');
      if (this.chapter === 2 && this.mode === 'campaign') {
        this.advanceCampaignChapter(3);
      }
      return;
    }

    if (target.kind === 'aljibe') {
      this.giveItem('agua_aljibe', 1);
      this.stamina = this.maxStamina;
      this.audio.playClick();
      this.showSubtitle('Llenaste la cantimplora con agua fresca del aljibe.');
      return;
    }

    if (target.kind === 'save_point') {
      this.saveGame('manual_1', `Radio de la Casa · Cap. ${this.chapter}`);
      this.fear = Math.max(0, this.fear - 20);
      return;
    }

    if (target.kind === 'ritual_altar') {
      const hasAmulet =
        this.inventory.some((i) => i.id === 'amuleto_proteccion') ||
        (this.inventory.some((i) => i.id === 'cruz_plata') &&
          this.inventory.some((i) => i.id === 'sal_gruesa'));
      this.setPaused(true);
      this.callbacks.onRitualChoicePrompt(hasAmulet);
    }
  }

  private advanceCampaignChapter(nextChap: number): void {
    this.completedChapters.add(this.chapter);
    this.chapter = nextChap;
    this.saveGame('autosave', `Autoguardado · Cap. ${this.chapter}`);
    this.setupChapterOrMode();
  }

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;

      if (!this.paused) {
        this.update(dt);
      }
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private update(dt: number): void {
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.subtitleTimer > 0) {
      this.subtitleTimer -= dt;
      if (this.subtitleTimer <= 0) this.subtitleText = null;
    }

    // Muzzle flash decay
    if (this.muzzleTimer > 0) {
      this.muzzleTimer -= dt;
      this.muzzleLight.intensity = 6.5;
    } else {
      this.muzzleLight.intensity = 0;
    }

    // Time progression
    this.gameHour += dt * 0.035;
    if (this.gameHour >= 24) this.gameHour -= 24;

    // Survival / Infinite night dawn survival check (06:00)
    if (
      (this.mode === 'survival' || this.mode === 'infinite_night') &&
      this.gameHour >= 6 &&
      this.gameHour < 7
    ) {
      this.nightsSurvived++;
      this.grantXp(100);
      if (this.mode === 'survival' && this.nightsSurvived >= 3) {
        this.paused = true;
        this.callbacks.onVictory(
          'pacto_roto',
          `Sobreviviste ${this.nightsSurvived} noches completas defendiendo la finca contra las leyendas del monte.`
        );
        return;
      }
      this.setupChapterOrMode();
    }

    // Gamepad polling
    let gpMoveX = 0;
    let gpMoveY = 0;
    let gpSprint = false;
    const gamepads = navigator.getGamepads?.();
    const gp = gamepads ? gamepads[0] : null;
    if (gp) {
      if (Math.abs(gp.axes[0]) > 0.2) gpMoveX = gp.axes[0];
      if (Math.abs(gp.axes[1]) > 0.2) gpMoveY = gp.axes[1];
      if (Math.abs(gp.axes[2]) > 0.2) {
        this.yaw -= gp.axes[2] * 2.2 * this.settings.mouseSensitivity * dt;
      }
      if (Math.abs(gp.axes[3]) > 0.2) {
        this.pitch = THREE.MathUtils.clamp(
          this.pitch - gp.axes[3] * 1.6 * dt,
          -0.75,
          0.55
        );
      }
      gpSprint = gp.buttons[4]?.pressed || gp.buttons[10]?.pressed || false;
      if (gp.buttons[0]?.pressed && this.onGround) this.keys['Space'] = true;
    }

    // Player movement
    const moveForward =
      (this.keys['KeyW'] || this.keys['ArrowUp'] ? 1 : 0) -
      (this.keys['KeyS'] || this.keys['ArrowDown'] ? 1 : 0) -
      gpMoveY;
    const moveSide =
      (this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0) -
      (this.keys['KeyA'] || this.keys['ArrowLeft'] ? 1 : 0) +
      gpMoveX;

    const wantsMove = Math.abs(moveForward) > 0.05 || Math.abs(moveSide) > 0.05;
    const wantsSprint =
      (this.keys['ShiftLeft'] || this.keys['ShiftRight'] || gpSprint) &&
      wantsMove &&
      !this.crouching &&
      this.stamina > 6;

    if (wantsSprint) {
      this.stamina = Math.max(0, this.stamina - dt * 16);
      this.energy = Math.max(0, this.energy - dt * 1.4);
    } else {
      const regen = (this.crouching ? 18 : 13) * (0.6 + this.energy / 200);
      this.stamina = Math.min(this.maxStamina, this.stamina + dt * regen);
    }

    const baseSpeed = this.crouching ? 2.8 : wantsSprint ? 7.6 : 4.5;
    _forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const moveVec = new THREE.Vector3()
      .addScaledVector(_forward, moveForward)
      .addScaledVector(_right, moveSide);
    if (moveVec.lengthSq() > 0.001) {
      moveVec.normalize().multiplyScalar(baseSpeed * dt);
      this.tryMovePlayer(moveVec.x, moveVec.z);
      this.walkPhase += dt * (wantsSprint ? 13 : this.crouching ? 5 : 8.5);
      this.audio.playFootstep(
        wantsSprint,
        this.crouching,
        this.weather.rainIntensity > 0.4
      );
    }

    // Jump & gravity
    const groundY = groundHeightAt(this.playerPos.x, this.playerPos.z);
    if (this.keys['Space'] && this.onGround) {
      this.playerVelY = 5.4;
      this.onGround = false;
      this.stamina = Math.max(0, this.stamina - 8);
    }
    this.playerVelY -= 16 * dt;
    this.playerPos.y += this.playerVelY * dt;
    if (this.playerPos.y <= groundY) {
      this.playerPos.y = groundY;
      this.playerVelY = 0;
      this.onGround = true;
    }

    // Player animation & orientation
    this.playerGroup.position.copy(this.playerPos);
    this.playerGroup.rotation.y = this.yaw + Math.PI;
    const isFirstPerson = this.settings.cameraMode === 'first_person';
    this.playerGroup.visible = !isFirstPerson;

    const legSwing = wantsMove ? Math.sin(this.walkPhase) * 0.55 : 0;
    if (this.playerLimbs.leftLeg) this.playerLimbs.leftLeg.rotation.x = legSwing;
    if (this.playerLimbs.rightLeg) this.playerLimbs.rightLeg.rotation.x = -legSwing;
    if (this.playerLimbs.leftArm) {
      this.playerLimbs.leftArm.rotation.x = this.flashlightOn ? -0.95 : -legSwing * 0.5;
    }
    if (this.playerLimbs.rightArm) {
      this.playerLimbs.rightArm.rotation.x = this.aiming ? -1.35 : legSwing * 0.45;
    }
    if (this.playerLimbs.torso) {
      this.playerLimbs.torso.position.y = this.crouching ? 0.55 : 0.9;
    }

    // Flashlight battery & spotlight
    if (this.flashlightOn && this.battery > 0) {
      this.battery = Math.max(0, this.battery - dt * 0.65);
      if (this.battery <= 0) {
        this.flashlightOn = false;
        this.showSubtitle('La batería de la linterna se agotó.');
      }
    }
    const flicker =
      this.lastThreatLevel > 0.65 && Math.random() < 0.08 ? 0.25 : 1.0;
    this.flashlight.intensity =
      this.flashlightOn && this.battery > 0 ? 11.5 * flicker : 0;
    this.flashlight.position
      .copy(this.playerPos)
      .add(new THREE.Vector3(0, this.crouching ? 1.1 : 1.52, 0));
    const lookDir = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    );
    this.flashlightTarget.position
      .copy(this.flashlight.position)
      .addScaledVector(lookDir, 12);

    // Camera smooth damping (Third Person or First Person)
    const targetFov = this.aiming ? this.settings.fov - 15 : this.settings.fov;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 12, dt);
      this.camera.updateProjectionMatrix();
    }

    const eyeH = this.crouching ? 1.15 : 1.62;
    if (isFirstPerson) {
      _camIdeal.copy(this.playerPos).add(new THREE.Vector3(0, eyeH, 0));
      this.camera.position.copy(_camIdeal);
      _camTarget.copy(_camIdeal).addScaledVector(lookDir, 10);
      this.camera.lookAt(_camTarget);
    } else {
      const camDist = this.aiming ? 2.3 : 3.9;
      const shoulder = this.aiming ? 0.65 : 0.52;
      _camIdeal
        .copy(this.playerPos)
        .add(new THREE.Vector3(0, eyeH + 0.38, 0))
        .addScaledVector(_right, shoulder)
        .addScaledVector(_forward, -camDist);
      _camIdeal.y = Math.max(
        groundHeightAt(_camIdeal.x, _camIdeal.z) + 0.65,
        _camIdeal.y
      );
      this.camera.position.x = THREE.MathUtils.damp(
        this.camera.position.x,
        _camIdeal.x,
        14,
        dt
      );
      this.camera.position.y = THREE.MathUtils.damp(
        this.camera.position.y,
        _camIdeal.y,
        14,
        dt
      );
      this.camera.position.z = THREE.MathUtils.damp(
        this.camera.position.z,
        _camIdeal.z,
        14,
        dt
      );

      _camTarget
        .copy(this.playerPos)
        .add(new THREE.Vector3(0, eyeH, 0))
        .addScaledVector(lookDir, 8);
      this.camera.lookAt(_camTarget);
    }

    if (this.cameraShake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake;
      this.cameraShake = Math.max(0, this.cameraShake - dt * 0.9);
    }

    // Safe house check (inside Casa Principal with generator or closed walls)
    const hb = this.world.houseBounds;
    const indoors =
      this.playerPos.x > hb.minX &&
      this.playerPos.x < hb.maxX &&
      this.playerPos.z > hb.minZ &&
      this.playerPos.z < hb.maxZ;
    const safeHouse = indoors && this.generatorOn;

    // Weather & audio environment
    this.weather.update(dt, this.playerPos, this.audio, () => {
      if (this.lastThreatLevel > 0.35) {
        this.showSubtitle('Un relámpago ilumina una silueta entre los árboles...');
      }
    });
    this.audio.setEnvironmentLevels(
      this.weather.rainIntensity,
      this.weather.windIntensity,
      indoors,
      dt,
      this.lastThreatLevel
    );

    // Chapter 4 reach Puesto check
    if (
      this.mode === 'campaign' &&
      this.chapter === 4 &&
      !this.puestoReached &&
      Math.hypot(this.playerPos.x - 54, this.playerPos.z - 48) < 5.5
    ) {
      this.puestoReached = true;
      this.grantXp(60);
      this.advanceCampaignChapter(5);
    }

    // AI Update
    const playerNoise = wantsSprint
      ? 0.95
      : wantsMove && !this.crouching
      ? 0.5
      : wantsMove
      ? 0.15
      : 0.05;

    this.ai.adjustAdaptiveDifficulty(this.health / this.maxHealth);
    const { maxThreat, nearestCreature } = this.ai.update(
      dt,
      this.playerPos,
      this.yaw,
      playerNoise * (1 - (this.skills.sigilo - 1) * 0.08),
      this.flashlightOn,
      this.weather.isFullMoon,
      this.weather.rainIntensity,
      safeHouse,
      this.world.colliders,
      this.audio,
      (dmg, cid) => {
        this.health = Math.max(0, this.health - dmg);
        this.fear = Math.min(100, this.fear + 22);
        if (!this.settings.reduceCameraShake) this.cameraShake = 0.38;
        this.showSubtitle(`¡${CREATURE_CODEX[cid].name} te ha herido!`);
        if (this.health <= 0) {
          this.paused = true;
          this.callbacks.onDefeat(
            `Caíste ante ${CREATURE_CODEX[cid].name} en la oscuridad de la finca.`
          );
        }
      },
      (msg) => this.showSubtitle(msg),
      (cid) => {
        if (!this.unlockedCreatures.has(cid)) {
          this.unlockedCreatures.add(cid);
          SaveManager.mergeUnlockedCodex([cid]);
          this.callbacks.onCreatureUnlocked(cid);
        }
      }
    );

    this.lastThreatLevel = maxThreat;
    this.nearestCreature = nearestCreature;

    // Fear & breathing
    if (maxThreat > 0.35 && !safeHouse) {
      this.fear = Math.min(100, this.fear + dt * maxThreat * 11);
    } else {
      this.fear = Math.max(0, this.fear - dt * (safeHouse ? 9 : 4));
    }
    this.audio.playHeavyBreathing(this.fear, this.stamina);

    // Reactive farm animals
    this.updateAnimals(dt);

    // Dynamic World Events
    this.updateWorldEvents(dt, indoors);

    // Autosave every 45s
    this.autosaveTimer -= dt;
    if (this.autosaveTimer <= 0) {
      this.autosaveTimer = 45;
      this.saveGame('autosave', `Autoguardado · Cap. ${this.chapter}`);
    }

    // Emit HUD at ~15Hz
    this.hudEmitTimer -= dt;
    if (this.hudEmitTimer <= 0) {
      this.hudEmitTimer = 0.065;
      this.emitHud();
    }
  }

  private tryMovePlayer(dx: number, dz: number): void {
    const r = 0.42;
    const nx = THREE.MathUtils.clamp(this.playerPos.x + dx, -108, 108);
    const nz = THREE.MathUtils.clamp(this.playerPos.z + dz, -108, 108);

    let canX = true;
    let canZ = true;
    for (let i = 0; i < this.world.colliders.length; i++) {
      const c = this.world.colliders[i];
      if (
        nx + r > c.minX &&
        nx - r < c.maxX &&
        this.playerPos.z + r > c.minZ &&
        this.playerPos.z - r < c.maxZ
      ) {
        canX = false;
      }
      if (
        this.playerPos.x + r > c.minX &&
        this.playerPos.x - r < c.maxX &&
        nz + r > c.minZ &&
        nz - r < c.maxZ
      ) {
        canZ = false;
      }
    }
    if (canX) this.playerPos.x = nx;
    if (canZ) this.playerPos.z = nz;
  }

  private updateAnimals(dt: number): void {
    for (const animal of this.world.animals) {
      if (animal.barkCooldown > 0) animal.barkCooldown -= dt;

      let nearDanger = false;
      let threatPos: THREE.Vector3 | null = null;
      for (const a of this.ai.agents) {
        if (a.state !== 'respawn' && a.group.position.distanceTo(animal.mesh.position) < 28) {
          nearDanger = true;
          threatPos = a.group.position;
          break;
        }
      }

      if (nearDanger && threatPos) {
        animal.panicked = true;
        const angle = Math.atan2(
          threatPos.x - animal.mesh.position.x,
          threatPos.z - animal.mesh.position.z
        );
        animal.mesh.rotation.y = angle;
        animal.mesh.position.y =
          animal.homePos.y + Math.abs(Math.sin(performance.now() * 0.012)) * 0.14;
        if (animal.kind === 'dog' && animal.barkCooldown <= 0) {
          animal.barkCooldown = 4.5;
          this.audio.playDogBark(this.playerPos, this.yaw, animal.mesh.position);
          if (animal.mesh.position.distanceTo(this.playerPos) < 26) {
            this.showSubtitle('El perro ladra desesperado hacia la oscuridad.');
          }
        }
      } else {
        animal.panicked = false;
        animal.mesh.position.y = animal.homePos.y;
      }
    }
  }

  private updateWorldEvents(dt: number, indoors: boolean): void {
    if (this.mode === 'exploration') return;
    this.worldEventTimer -= dt;
    if (this.worldEventTimer > 0) return;
    this.worldEventTimer = 22 + Math.random() * 18;

    const roll = Math.random();
    if (roll < 0.28 && this.generatorOn) {
      // Brief power surge flicker
      this.world.electricLights.forEach((l) => (l.intensity = 0.4));
      setTimeout(() => {
        if (!this.disposed) this.syncGeneratorLights();
      }, 420);
      this.showSubtitle('Las luces de la finca parpadean por un segundo...');
    } else if (roll < 0.55 && indoors) {
      this.audio.playDoorCreak();
      this.showSubtitle('Se escuchan pasos pesados sobre las chapas del techo.');
    } else if (roll < 0.8) {
      this.audio.playDogBark(this.playerPos, this.yaw, new THREE.Vector3(-4, 0, 10));
      this.showSubtitle('Los caballos se inquietan en los corrales.');
    }
  }

  private emitHud(): void {
    const chap = CHAPTERS[Math.max(0, Math.min(CHAPTERS.length - 1, this.chapter - 1))];
    const zoneId = getZoneAt(this.playerPos.x, this.playerPos.z);
    const nearest = this.getNearestInteractable();
    const hb = this.world.houseBounds;
    const indoors =
      this.playerPos.x > hb.minX &&
      this.playerPos.x < hb.maxX &&
      this.playerPos.z > hb.minZ &&
      this.playerPos.z < hb.maxZ;

    const compassDeg = (((-this.yaw * 180) / Math.PI) % 360 + 360) % 360;

    const escReserve =
      this.inventory.find((i) => i.id === 'cartuchos_12')?.quantity ?? 0;
    const revReserve =
      this.inventory.find((i) => i.id === 'balas_38')?.quantity ?? 0;

    let objectiveTitle = chap.objectiveTitle;
    let objectiveDescription = chap.objectiveDescription;
    if (this.mode === 'survival' || this.mode === 'infinite_night') {
      objectiveTitle = `Sobrevivir la Noche ${this.nightsSurvived + 1}`;
      objectiveDescription = 'Aguanta hasta las 06:00 hs administrando batería, munición y salud.';
    } else if (this.mode === 'exploration') {
      objectiveTitle = 'Exploración libre de La Finca';
      objectiveDescription = 'Recorre la casa, galpones, corrales, capilla y monte sin amenazas.';
    }

    this.callbacks.onHudUpdate({
      health: Math.round(this.health),
      maxHealth: this.maxHealth,
      stamina: Math.round(this.stamina),
      maxStamina: this.maxStamina,
      energy: Math.round(this.energy),
      fear: Math.round(this.fear),
      battery: Math.round(this.battery),
      flashlightOn: this.flashlightOn,
      crouching: this.crouching,
      sprinting:
        Boolean(this.keys['ShiftLeft'] || this.keys['ShiftRight']) &&
        this.stamina > 6,
      cameraMode: this.settings.cameraMode,
      equippedWeapon: this.equippedWeapon,
      ammoInClip: { ...this.ammoInClip },
      ammoReserve: { escopeta: escReserve, revolver: revReserve },
      xp: this.xp,
      level: this.level,
      skills: { ...this.skills },
      currentZone: ZONE_LABELS[zoneId],
      compassDegrees: Math.round(compassDeg),
      gameHour: this.gameHour,
      weather: this.weather.condition,
      generatorOn: this.generatorOn,
      houseProtected: indoors && this.generatorOn,
      nightsSurvived: this.nightsSurvived,
      chapter: this.chapter,
      objectiveTitle,
      objectiveDescription,
      objectiveProgress: this.objectiveProgress,
      objectiveTotal: this.objectiveTotal,
      interactionPrompt: nearest ? `[E] ${nearest.label}` : null,
      subtitleText: this.settings.subtitles ? this.subtitleText : null,
      activeThreatLevel: this.lastThreatLevel,
      nearestCreatureLabel: this.nearestCreature
        ? CREATURE_CODEX[this.nearestCreature].name
        : null,
      playerPos: { x: this.playerPos.x, z: this.playerPos.z },
    });
  }

  public getUnlockedDocuments() {
    return DOCUMENTS_CATALOG.filter((d) => this.unlockedDocs.has(d.id));
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);

    const canvas = this.renderer.domElement;
    canvas.removeEventListener('mousedown', this.onMouseDown);
    canvas.removeEventListener('contextmenu', this.onContextMenu);
    canvas.removeEventListener('webglcontextlost', this.onContextLost);

    this.world.dispose();
    this.weather.dispose();
    this.audio.dispose();
    this.renderer.dispose();
  }
}
