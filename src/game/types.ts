export type GameScreen = 'menu' | 'playing' | 'paused' | 'victory' | 'defeat';

export type GameMode =
  | 'campaign'
  | 'survival'
  | 'infinite_night'
  | 'exploration'
  | 'challenges';

export type Difficulty = 'historia' | 'normal' | 'pesadilla';

export type WeatherCondition =
  | 'despejado'
  | 'luna_llena'
  | 'nublado'
  | 'tormenta_electrica'
  | 'lluvia_intensa'
  | 'neblina'
  | 'viento_fuerte'
  | 'tormenta_total';

export type CreatureId =
  | 'lobizon'
  | 'ocumar'
  | 'mulanima'
  | 'duende'
  | 'familiar'
  | 'alma_mula';

export type AIState =
  | 'patrol'
  | 'explore'
  | 'listen'
  | 'observe'
  | 'suspect'
  | 'detect'
  | 'chase'
  | 'attack'
  | 'search'
  | 'retreat'
  | 'respawn';

export type WeaponId = 'ninguna' | 'escopeta' | 'revolver' | 'machete' | 'cuchillo';

export type ItemCategory =
  | 'armas'
  | 'herramientas'
  | 'medicina'
  | 'alimentos'
  | 'municiones'
  | 'llaves'
  | 'documentos'
  | 'especiales';

export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  description: string;
  quantity: number;
  maxStack: number;
  condition?: number; // 0-100
  weight: number;
  usable?: boolean;
  combinableWith?: string[];
}

export interface CraftRecipe {
  id: string;
  ingredients: [string, string];
  resultId: string;
  resultName: string;
  description: string;
}

export interface DocumentEntry {
  id: string;
  title: string;
  author: string;
  date: string;
  location: string;
  content: string;
}

export interface CreatureEntry {
  id: CreatureId;
  name: string;
  subtitle: string;
  region: string;
  portraitUrl: string;
  description: string;
  behavior: string;
  weakness: string;
  dangerLevel: 'Alto' | 'Muy Alto' | 'Extremo' | 'Crítico';
}

export interface ChapterDefinition {
  number: number;
  title: string;
  subtitle: string;
  weather: WeatherCondition;
  startHour: number;
  activeCreatures: CreatureId[];
  objectiveTitle: string;
  objectiveDescription: string;
  targetZone: ZoneId;
  requiredAction:
    | 'restore_generator'
    | 'protect_corral'
    | 'find_watchtower_relic'
    | 'reach_puesto'
    | 'recover_documents'
    | 'investigate_chapel'
    | 'perform_ritual';
}

export type ZoneId =
  | 'casa_principal'
  | 'sotano'
  | 'corrales'
  | 'galpones'
  | 'monte'
  | 'caminos'
  | 'puesto'
  | 'cementerio'
  | 'capilla'
  | 'arbol_ritual';

export interface GameSettings {
  graphicsQuality: 'alta' | 'media' | 'baja';
  shadows: boolean;
  fov: number;
  mouseSensitivity: number;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  subtitles: boolean;
  reduceCameraShake: boolean;
  difficulty: Difficulty;
  cameraMode: 'third_person' | 'first_person';
}

export interface PlayerHudState {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  energy: number;
  fear: number; // 0-100
  battery: number; // 0-100
  flashlightOn: boolean;
  crouching: boolean;
  sprinting: boolean;
  cameraMode: 'third_person' | 'first_person';
  equippedWeapon: WeaponId;
  ammoInClip: Record<'escopeta' | 'revolver', number>;
  ammoReserve: Record<'escopeta' | 'revolver', number>;
  xp: number;
  level: number;
  skills: {
    sigilo: number;
    resistencia: number;
    punteria: number;
  };
  currentZone: string;
  compassDegrees: number;
  gameHour: number; // 0-24 float
  weather: WeatherCondition;
  generatorOn: boolean;
  houseProtected: boolean;
  nightsSurvived: number;
  chapter: number;
  objectiveTitle: string;
  objectiveDescription: string;
  objectiveProgress: number;
  objectiveTotal: number;
  interactionPrompt: string | null;
  subtitleText: string | null;
  activeThreatLevel: number; // 0-1
  nearestCreatureLabel: string | null;
  playerPos: { x: number; z: number };
}

export type EndingType = 'verdad_revelada' | 'pacto_roto' | 'sacrificio_monte';

export interface SaveSlotData {
  slotId: string;
  label: string;
  timestamp: number;
  mode: GameMode;
  chapter: number;
  nightsSurvived: number;
  health: number;
  battery: number;
  gameHour: number;
  generatorOn: boolean;
  playerPos: { x: number; z: number };
  inventory: InventoryItem[];
  unlockedDocuments: string[];
  unlockedCreatures: CreatureId[];
  completedChapters: number[];
  xp: number;
  achievements: string[];
}
