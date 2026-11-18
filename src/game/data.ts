import {
  ChapterDefinition,
  CraftRecipe,
  CreatureEntry,
  CreatureId,
  DocumentEntry,
  GameSettings,
  InventoryItem,
  WeatherCondition,
  ZoneId,
} from './types';

export const DEFAULT_SETTINGS: GameSettings = {
  graphicsQuality: 'alta',
  shadows: true,
  fov: 68,
  mouseSensitivity: 1.0,
  masterVolume: 0.85,
  musicVolume: 0.65,
  sfxVolume: 0.9,
  subtitles: true,
  reduceCameraShake: false,
  difficulty: 'normal',
  cameraMode: 'third_person',
};

export const WEATHER_LABELS: Record<WeatherCondition, string> = {
  despejado: 'Noche despejada',
  luna_llena: 'Luna llena',
  nublado: 'Parcialmente nublado',
  tormenta_electrica: 'Tormenta eléctrica',
  lluvia_intensa: 'Lluvia intensa',
  neblina: 'Neblina espesa',
  viento_fuerte: 'Viento fuerte del norte',
  tormenta_total: 'Tormenta con relámpagos',
};

export const ZONE_LABELS: Record<ZoneId, string> = {
  casa_principal: 'Casa Principal',
  sotano: 'Sótano Secreto',
  corrales: 'Corrales y Establos',
  galpones: 'Galpones de Maquinaria',
  monte: 'El Monte y Cañaverales',
  caminos: 'Caminos y Tranqueras',
  puesto: 'Puesto de Vigilancia',
  cementerio: 'Cementerio Rural',
  capilla: 'Capilla Antigua',
  arbol_ritual: 'Árbol del Ritual',
};

export const CHAPTERS: ChapterDefinition[] = [
  {
    number: 1,
    title: 'Capítulo 1: El Regreso',
    subtitle: 'General Güemes, Salta — 21:30 hs',
    weather: 'nublado',
    startHour: 21.5,
    activeCreatures: ['duende'],
    objectiveTitle: 'Restablecer la electricidad de la finca',
    objectiveDescription:
      'Revisa la Casa Principal, busca bidón de nafta y llave inglesa en los Galpones y repara el generador.',
    targetZone: 'galpones',
    requiredAction: 'restore_generator',
  },
  {
    number: 2,
    title: 'Capítulo 2: Los Aullidos',
    subtitle: 'Noche de Luna Llena — 23:00 hs',
    weather: 'luna_llena',
    startHour: 23.0,
    activeCreatures: ['lobizon', 'duende'],
    objectiveTitle: 'Proteger los corrales del Lobizón',
    objectiveDescription:
      'Los perros ladran hacia el monte. Inspecciona los corrales, ahuyenta a la bestia y repara el alambrado roto.',
    targetZone: 'corrales',
    requiredAction: 'protect_corral',
  },
  {
    number: 3,
    title: 'Capítulo 3: Algo en el Monte',
    subtitle: 'Neblina sobre los cañaverales — 00:45 hs',
    weather: 'neblina',
    startHour: 0.75,
    activeCreatures: ['ocumar', 'lobizon'],
    objectiveTitle: 'Recuperar la brújula de vigilancia en El Monte',
    objectiveDescription:
      'Adéntrate entre los quebrachos y cañaverales para hallar la reliquia de tu abuelo evitando las emboscadas del Ocumar.',
    targetZone: 'monte',
    requiredAction: 'find_watchtower_relic',
  },
  {
    number: 4,
    title: 'Capítulo 4: El Camino de las Cadenas',
    subtitle: 'Tormenta eléctrica — 01:40 hs',
    weather: 'tormenta_electrica',
    startHour: 1.66,
    activeCreatures: ['mulanima', 'ocumar'],
    objectiveTitle: 'Alcanzar el Antiguo Puesto de Vigilancia',
    objectiveDescription:
      'Cruza el camino rural y el puente bajo la tormenta mientras La Mulánima arrastra sus cadenas detrás de ti.',
    targetZone: 'puesto',
    requiredAction: 'reach_puesto',
  },
  {
    number: 5,
    title: 'Capítulo 5: El Duende del Galpón',
    subtitle: 'Viento fuerte — 02:30 hs',
    weather: 'viento_fuerte',
    startHour: 2.5,
    activeCreatures: ['duende', 'familiar'],
    objectiveTitle: 'Recuperar las escrituras y diarios familiares',
    objectiveDescription:
      'El Duende ocultó los documentos del pacto entre el Galpón y el Sótano Secreto. Recupéralos antes de que corte las luces.',
    targetZone: 'sotano',
    requiredAction: 'recover_documents',
  },
  {
    number: 6,
    title: 'Capítulo 6: El Secreto de la Finca',
    subtitle: 'Lluvia intensa — 03:20 hs',
    weather: 'lluvia_intensa',
    startHour: 3.33,
    activeCreatures: ['alma_mula', 'familiar', 'lobizon'],
    objectiveTitle: 'Descubrir la verdad en el Cementerio y la Capilla',
    objectiveDescription:
      'Investiga la Capilla Antigua y las tumbas familiares para obtener la Cruz de Plata y la Sal Gruesa Consagrada.',
    targetZone: 'capilla',
    requiredAction: 'investigate_chapel',
  },
  {
    number: 7,
    title: 'Capítulo 7: La Última Noche',
    subtitle: 'Tormenta total — 04:15 hs',
    weather: 'tormenta_total',
    startHour: 4.25,
    activeCreatures: ['lobizon', 'ocumar', 'mulanima', 'familiar'],
    objectiveTitle: 'Romper o sellar el pacto en el Árbol del Ritual',
    objectiveDescription:
      'Todas las entidades convergen. Dirígete al Árbol del Ritual al norte del monte y decide el destino de La Finca.',
    targetZone: 'arbol_ritual',
    requiredAction: 'perform_ritual',
  },
];

export const CREATURE_CODEX: Record<CreatureId, CreatureEntry> = {
  lobizon: {
    id: 'lobizon',
    name: 'El Lobizón',
    subtitle: 'Séptimo hijo varón · Maldición de luna llena',
    region: 'Monte y alrededores de los corrales',
    portraitUrl: '/src/assets/images/creature_lobizon_1795029177676.jpg',
    description:
      'Criatura humanoide corpulenta, de pelaje oscuro y extremidades desproporcionadas. Alterna entre acechar agazapado y lanzarse en carrera cuadrúpeda con mandíbulas y garras capaces de destrozar madera vieja.',
    behavior:
      'Rastrea sonidos fuertes y sigue el olor del miedo. Bajo luna llena su velocidad, olfato y agresividad se multiplican. Anuncia su caza con aullidos graves desde el monte.',
    weakness:
      'Los disparos de escopeta lo aturden y obligan a retroceder; las luces eléctricas encendidas y puertas reforzadas frenan su avance.',
    dangerLevel: 'Extremo',
  },
  ocumar: {
    id: 'ocumar',
    name: 'El Ocumar',
    subtitle: 'Bestia simiesca de los quebrachos',
    region: 'Copas de árboles, cañaverales y techos de galpones',
    portraitUrl: '/src/assets/images/creature_ocumar_1795029178064.jpg',
    description:
      'Híbrido inquietante entre simio y humano antiguo. Su rostro pálido y mirada fija contrastan con sus largos brazos nervudos adaptados para trepar en silencio.',
    behavior:
      'Permanece inmóvil entre el follaje oscuro observando desde arriba. Imita voces humanas o silbidos para atraer al peón incauto y arroja piedras para desorientar.',
    weakness:
      'Enfocarlo directamente con la linterna potente interrumpe su emboscada. El fuego y los golpes de machete lo obligan a huir.',
    dangerLevel: 'Muy Alto',
  },
  mulanima: {
    id: 'mulanima',
    name: 'La Mulánima',
    subtitle: 'Espectro de la mula encadenada',
    region: 'Caminos rurales, tranqueras y ruinas',
    portraitUrl: '/src/assets/images/creature_mulanima_1795029178848.jpg',
    description:
      'Aparición espectral de una mula negra envuelta en bruma cenicienta. De sus ojos brotan brasas incandescentes y arrastra pesados eslabones de hierro que chispean fuego azulado contra el barro.',
    behavior:
      'Se anuncia con relinchos desgarradores y ruido metálico de cadenas. Embiste a gran velocidad por los caminos de tierra y se desvanece en la neblina.',
    weakness:
      'Es inmune al plomo común; solo se la repele saliendo de la huella del camino, cruzando tranqueras o usando Sal Consagrada.',
    dangerLevel: 'Extremo',
  },
  duende: {
    id: 'duende',
    name: 'El Duende del Monte',
    subtitle: 'Espíritu burlón de sombrero aludo',
    region: 'Ventanas, depósitos y galpones oscuros',
    portraitUrl: '/src/assets/images/creature_duende_1795029178276.jpg',
    description:
      'Ser diminuto de rostro arrugado y sonrisa perturbadora. Viste un poncho raído y un enorme sombrero de fieltro viejo que oculta sus ojos en penumbra.',
    behavior:
      'No busca el choque frontal. Espía tras los vidrios, ríe entre las chapas, apaga interruptores, esconde llaves y atrae al protagonista hacia las zonas de caza de otras bestias.',
    weakness:
      'No tolera la luz directa ni el sonido metálico seco. Mantener el generador encendido limita sus travesuras en la casa.',
    dangerLevel: 'Alto',
  },
  familiar: {
    id: 'familiar',
    name: 'El Familiar',
    subtitle: 'Perro negro del antiguo pacto de los ingenios',
    region: 'Sótano, capilla y galpón de máquinas',
    portraitUrl: '/src/assets/images/creature_lobizon_1795029177676.jpg',
    description:
      'Entidad ligada a los antiguos terratenientes e ingenios azucareros del norte. Toma forma de mastín gigantesco de sombra densa con collares oxidados y ojos carmesí.',
    behavior:
      'Custodia los secretos familiares y el sótano. Aparece cuando el protagonista descubre la verdad del pacto de tierras de 1924.',
    weakness:
      'Solo retrocede ante la Cruz de Plata o disparos cargados con sal gruesa bendecida.',
    dangerLevel: 'Crítico',
  },
  alma_mula: {
    id: 'alma_mula',
    name: 'El Alma Mula',
    subtitle: 'Lamento errante de la capilla abandonada',
    region: 'Cementerio rural y sendero del ritual',
    portraitUrl: '/src/assets/images/creature_mulanima_1795029178848.jpg',
    description:
      'Variante espectral del espíritu condenado que vaga entre cruces de hierro forjado exhalando chispas frías y lamentos que hielan la sangre.',
    behavior:
      'Ronda el cementerio y el Árbol del Ritual; su cercanía drena rápidamente la calma y apaga la linterna.',
    weakness:
      'La luz de la capilla y el talismán de sal y plata debilitan su presencia.',
    dangerLevel: 'Extremo',
  },
};

export const DOCUMENTS_CATALOG: DocumentEntry[] = [
  {
    id: 'doc_llamada',
    title: 'Nota del Capataz Don Rufino',
    author: 'Rufino Salvatierra',
    date: '14 de noviembre',
    location: 'Mesa de la Cocina — Casa Principal',
    content:
      'Patrón: le dejé el mensaje en la radio porque el teléfono fijo se cortó después de la tormenta. Ayer amanecieron tres ovejas destrozadas junto al aljibe y los caballos rompieron la tranquera sur. El perro ladra toda la noche mirando al cañaveral. Yo me fui al pueblo con mi familia antes que caiga la luna llena. Cuide el generador y no baje al sótano sin la llave de su abuelo.',
  },
  {
    id: 'doc_abuelo_1924',
    title: 'Escritura del Pacto de 1924',
    author: 'Evaristo Mendoza (Bisabuelo)',
    date: '23 de junio de 1924',
    location: 'Sótano Secreto',
    content:
      'En General Güemes, bajo el quebracho viejo del lindero norte, sellé trato para que la caña rinda el doble y las heladas respeten nuestras tierras. A cambio, cada generación entregará una vida o mantendrá encendidas las velas del Familiar en la capilla. Si algún descendiente olvida el tributo, el monte reclamará lo que es suyo en una sola noche de tormenta.',
  },
  {
    id: 'doc_cura',
    title: 'Carta del Padre Anselmo',
    author: 'Pbro. Anselmo Quiroga',
    date: '8 de agosto de 1968',
    location: 'Capilla Antigua',
    content:
      'No pude convencer a su padre de desenterrar el fierro bajo el Árbol del Ritual. Le dejo la Cruz de Plata en el altar y un frasco de sal gruesa bendecida. Si alguna vez escucha cadenas en la huella o ve ojos brillando entre los cañaverales, sepa que el pacto puede romperse quemando la escritura sobre la raíz del árbol… o sellarse de nuevo con sangre.',
  },
  {
    id: 'doc_peon',
    title: 'Bitácora del Puesto de Vigilancia',
    author: 'Mateo Díaz (Peón nocturno)',
    date: '10 de noviembre',
    location: 'Antiguo Puesto de Vigilancia',
    content:
      '01:15 hs — Algo camina arriba de las chapas del galpón como un mono grande, pero me llama por mi nombre con la voz de mi hermano. 02:40 hs — Un duende de sombrero ancho tiró mis cartuchos al barro y apagó el farol. Mañana renuncio.',
  },
];

export const ITEM_CATALOG: Record<string, Omit<InventoryItem, 'quantity'>> = {
  escopeta: {
    id: 'escopeta',
    name: 'Escopeta Calibre 12',
    category: 'armas',
    description: 'Escopeta rural de dos caños. Detiene al Lobizón a corta distancia.',
    maxStack: 1,
    condition: 90,
    weight: 3.4,
  },
  revolver: {
    id: 'revolver',
    name: 'Revólver .38 Viejo',
    category: 'armas',
    description: 'Arma de puño de tu abuelo. Precisa contra amenazas medianas.',
    maxStack: 1,
    condition: 85,
    weight: 1.1,
  },
  machete: {
    id: 'machete',
    name: 'Machete de Monte',
    category: 'armas',
    description: 'Hoja ancha para abrir paso en el cañaveral y defenderse cuerpo a cuerpo.',
    maxStack: 1,
    condition: 95,
    weight: 0.9,
  },
  cuchillo: {
    id: 'cuchillo',
    name: 'Faca Criolla',
    category: 'armas',
    description: 'Cuchillo gaucho de acero al carbono. Rápido y silencioso.',
    maxStack: 1,
    condition: 100,
    weight: 0.4,
  },
  cartuchos_12: {
    id: 'cartuchos_12',
    name: 'Cartuchos Cal. 12',
    category: 'municiones',
    description: 'Munición de posta gruesa para escopeta.',
    maxStack: 24,
    weight: 0.1,
  },
  balas_38: {
    id: 'balas_38',
    name: 'Balas .38',
    category: 'municiones',
    description: 'Munición para revólver.',
    maxStack: 36,
    weight: 0.05,
  },
  pilas: {
    id: 'pilas',
    name: 'Pilas Alcalinas',
    category: 'herramientas',
    description: 'Recargan la batería de la linterna de mano.',
    maxStack: 6,
    weight: 0.2,
    usable: true,
  },
  bidon_nafta: {
    id: 'bidon_nafta',
    name: 'Bidón de Nafta',
    category: 'herramientas',
    description: 'Combustible necesario para poner en marcha el generador eléctrico.',
    maxStack: 3,
    weight: 2.5,
    combinableWith: ['llave_inglesa'],
  },
  llave_inglesa: {
    id: 'llave_inglesa',
    name: 'Llave Inglesa y Alambre',
    category: 'herramientas',
    description: 'Herramientas rurales para reparar el generador, puertas y alambrados.',
    maxStack: 2,
    weight: 1.2,
    combinableWith: ['bidon_nafta'],
  },
  botiquin: {
    id: 'botiquin',
    name: 'Botiquín de Campo',
    category: 'medicina',
    description: 'Vendas, alcohol y desinfectante. Restaura 55 puntos de salud.',
    maxStack: 5,
    weight: 0.6,
    usable: true,
  },
  yuyos_curativos: {
    id: 'yuyos_curativos',
    name: 'Cataplasma de Yuyos',
    category: 'medicina',
    description: 'Hierbas serranas de Salta. Restaura 25 de salud y calma el pulso.',
    maxStack: 6,
    weight: 0.2,
    usable: true,
  },
  yerba_mate: {
    id: 'yerba_mate',
    name: 'Mate Cebado / Termo',
    category: 'alimentos',
    description: 'Devuelve energía física y reduce el miedo en la oscuridad.',
    maxStack: 4,
    weight: 0.5,
    usable: true,
    combinableWith: ['agua_aljibe'],
  },
  agua_aljibe: {
    id: 'agua_aljibe',
    name: 'Cantimplora del Aljibe',
    category: 'alimentos',
    description: 'Agua fresca de pozo. Hidrata y recupera resistencia.',
    maxStack: 4,
    weight: 0.6,
    usable: true,
    combinableWith: ['yerba_mate'],
  },
  empanada_charqui: {
    id: 'empanada_charqui',
    name: 'Charqui y Tortilla',
    category: 'alimentos',
    description: 'Provisión rural duradera. Restaura energía y algo de salud.',
    maxStack: 5,
    weight: 0.3,
    usable: true,
  },
  llave_sotano: {
    id: 'llave_sotano',
    name: 'Llave del Sótano',
    category: 'llaves',
    description: 'Llave antigua de bronce que abre la trampilla oculta en la casa.',
    maxStack: 1,
    weight: 0.1,
  },
  llave_capilla: {
    id: 'llave_capilla',
    name: 'Llave de la Capilla',
    category: 'llaves',
    description: 'Abre el portón de hierro de la capilla abandonada.',
    maxStack: 1,
    weight: 0.1,
  },
  brujula_abuelo: {
    id: 'brujula_abuelo',
    name: 'Brújula de Vigilancia',
    category: 'especiales',
    description: 'Instrumento antiguo hallado en el monte; apunta al Árbol del Ritual.',
    maxStack: 1,
    weight: 0.3,
  },
  cruz_plata: {
    id: 'cruz_plata',
    name: 'Cruz de Plata Antigua',
    category: 'especiales',
    description: 'Reliquia del Padre Anselmo. Puede combinarse con sal consagrada.',
    maxStack: 1,
    weight: 0.3,
    combinableWith: ['sal_gruesa'],
  },
  sal_gruesa: {
    id: 'sal_gruesa',
    name: 'Sal Gruesa Consagrada',
    category: 'especiales',
    description: 'Protección tradicional contra espectros y pactos oscuros.',
    maxStack: 3,
    weight: 0.4,
    usable: true,
    combinableWith: ['cruz_plata'],
  },
  amuleto_proteccion: {
    id: 'amuleto_proteccion',
    name: 'Talismán de Plata y Sal',
    category: 'especiales',
    description: 'Sello completo del Padre Anselmo. Indispensable para romper el pacto sin morir.',
    maxStack: 1,
    weight: 0.5,
    usable: true,
  },
  kit_generador: {
    id: 'kit_generador',
    name: 'Kit de Arranque del Generador',
    category: 'herramientas',
    description: 'Combustible y herramientas listos para encender la usina del galpón.',
    maxStack: 1,
    weight: 3.0,
  },
  mate_energizante: {
    id: 'mate_energizante',
    name: 'Mate Amargo Cargado',
    category: 'alimentos',
    description: 'Infusión caliente que recupera toda la energía y disipa el pánico.',
    maxStack: 3,
    weight: 0.7,
    usable: true,
  },
};

export const CRAFT_RECIPES: CraftRecipe[] = [
  {
    id: 'recipe_generador',
    ingredients: ['bidon_nafta', 'llave_inglesa'],
    resultId: 'kit_generador',
    resultName: 'Kit de Arranque del Generador',
    description: 'Prepara el combustible y la llave inglesa para reparar el generador del galpón.',
  },
  {
    id: 'recipe_mate',
    ingredients: ['yerba_mate', 'agua_aljibe'],
    resultId: 'mate_energizante',
    resultName: 'Mate Amargo Cargado',
    description: 'Ceba un mate fuerte que restaura energía y reduce drásticamente el miedo.',
  },
  {
    id: 'recipe_talisman',
    ingredients: ['cruz_plata', 'sal_gruesa'],
    resultId: 'amuleto_proteccion',
    resultName: 'Talismán de Plata y Sal',
    description: 'Consagra la cruz de plata con sal gruesa para enfrentar a El Familiar y romper el pacto.',
  },
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  { ...ITEM_CATALOG.cuchillo, quantity: 1 },
  { ...ITEM_CATALOG.pilas, quantity: 2 },
  { ...ITEM_CATALOG.yuyos_curativos, quantity: 1 },
  { ...ITEM_CATALOG.yerba_mate, quantity: 1 },
];

export const CHALLENGES_LIST = [
  {
    id: 'luna_sangre',
    title: 'Luna Roja en los Corrales',
    description: 'Sobrevive 3 minutos con el Lobizón al máximo nivel de agresividad y sin armas de fuego.',
  },
  {
    id: 'apagon_total',
    title: 'Apagón en el Monte',
    description: 'Repara el generador y vuelve a la Casa Principal con la batería de linterna al 35%.',
  },
  {
    id: 'cadenas_niebla',
    title: 'Carrera entre Cadenas',
    description: 'Cruza desde el Cementerio hasta la Casa Principal perseguido por La Mulánima.',
  },
];
