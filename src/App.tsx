import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import {
  DocumentModal,
  EndScreen,
  InventoryModal,
  MapModal,
  PauseModal,
  RitualModal,
} from './components/GameModals';
import { MainMenu } from './components/MainMenu';
import { CREATURE_CODEX, INITIAL_INVENTORY } from './game/data';
import { GameEngine } from './game/engine/GameEngine';
import { SaveManager } from './game/systems/SaveManager';
import {
  CreatureId,
  EndingType,
  GameMode,
  GameScreen,
  GameSettings,
  InventoryItem,
  PlayerHudState,
  SaveSlotData,
} from './game/types';

const INITIAL_HUD: PlayerHudState = {
  health: 100,
  maxHealth: 100,
  stamina: 100,
  maxStamina: 100,
  energy: 100,
  fear: 10,
  battery: 100,
  flashlightOn: true,
  crouching: false,
  sprinting: false,
  cameraMode: 'third_person',
  equippedWeapon: 'cuchillo',
  ammoInClip: { escopeta: 2, revolver: 6 },
  ammoReserve: { escopeta: 0, revolver: 0 },
  xp: 0,
  level: 1,
  skills: { sigilo: 1, resistencia: 1, punteria: 1 },
  currentZone: 'Casa Principal',
  compassDegrees: 0,
  gameHour: 21.5,
  weather: 'nublado',
  generatorOn: false,
  houseProtected: false,
  nightsSurvived: 0,
  chapter: 1,
  objectiveTitle: 'Restablecer la electricidad de la finca',
  objectiveDescription:
    'Revisa la Casa Principal y repara el generador en los Galpones.',
  objectiveProgress: 0,
  objectiveTotal: 1,
  interactionPrompt: null,
  subtitleText: null,
  activeThreatLevel: 0,
  nearestCreatureLabel: null,
  playerPos: { x: 0, z: 12 },
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [screen, setScreen] = useState<GameScreen>('menu');
  const [settings, setSettings] = useState<GameSettings>(() =>
    SaveManager.loadSettings()
  );
  const [hud, setHud] = useState<PlayerHudState>(INITIAL_HUD);
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [unlockedDocs, setUnlockedDocs] = useState<string[]>([]);

  const [showInventory, setShowInventory] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [ritualPrompt, setRitualPrompt] = useState<{ hasAmulet: boolean } | null>(
    null
  );
  const [endResult, setEndResult] = useState<{
    type: 'victory' | 'defeat';
    title: string;
    description: string;
  } | null>(null);
  const [unlockedToast, setUnlockedToast] = useState<string | null>(null);

  const lastSessionRef = useRef<{
    mode: GameMode;
    chapter: number;
    challengeId?: string;
  }>({ mode: 'campaign', chapter: 1 });

  // Sync engine pause state whenever a modal or menu is open
  const isModalOpen =
    screen !== 'playing' ||
    showInventory ||
    showMap ||
    Boolean(activeDocId) ||
    Boolean(ritualPrompt);

  useEffect(() => {
    engineRef.current?.setPaused(isModalOpen);
  }, [isModalOpen]);

  // Mount Three.js WebGL Engine once in isolated ref container
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new GameEngine(mount, settings, {
      onHudUpdate: (nextHud) => setHud(nextHud),
      onInventoryUpdate: (nextInv) => setInventory(nextInv),
      onDocumentOpened: (docId) => {
        setUnlockedDocs((prev) =>
          prev.includes(docId) ? prev : [...prev, docId]
        );
        setActiveDocId(docId);
      },
      onCreatureUnlocked: (cid: CreatureId) => {
        setUnlockedToast(
          `Nuevo registro en la Galería: ${CREATURE_CODEX[cid].name}`
        );
        setTimeout(() => setUnlockedToast(null), 4000);
      },
      onRitualChoicePrompt: (hasAmulet) => {
        setRitualPrompt({ hasAmulet });
      },
      onVictory: (ending: EndingType, summary: string) => {
        const titles: Record<EndingType, string> = {
          verdad_revelada: 'Final Verdadero: La Maldición Rota',
          pacto_roto: 'Final: Amanecer en General Güemes',
          sacrificio_monte: 'Final Oscuro: El Nuevo Guardián',
        };
        setEndResult({
          type: 'victory',
          title: titles[ending],
          description: summary,
        });
        setScreen('victory');
      },
      onDefeat: (cause: string) => {
        setEndResult({
          type: 'defeat',
          title: 'La Oscuridad te Alcanzó',
          description: cause,
        });
        setScreen('defeat');
      },
      onToggleInventory: () => {
        setShowMap(false);
        setShowInventory((v) => !v);
      },
      onToggleMap: () => {
        setShowInventory(false);
        setShowMap((v) => !v);
      },
      onTogglePause: () => {
        setShowInventory(false);
        setShowMap(false);
        setActiveDocId(null);
        setScreen((prev) =>
          prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev
        );
      },
    });

    engine.setPaused(true);
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateSettings = useCallback((next: GameSettings) => {
    setSettings(next);
    SaveManager.saveSettings(next);
    engineRef.current?.updateSettings(next);
  }, []);

  const handleStartGame = useCallback(
    (
      mode: GameMode,
      chapter = 1,
      challengeId?: string,
      loadData?: SaveSlotData
    ) => {
      lastSessionRef.current = { mode, chapter, challengeId };
      setShowInventory(false);
      setShowMap(false);
      setActiveDocId(null);
      setRitualPrompt(null);
      setEndResult(null);
      if (loadData) {
        setUnlockedDocs(loadData.unlockedDocuments);
      } else {
        setUnlockedDocs([]);
      }
      engineRef.current?.startNewSession(mode, chapter, challengeId, loadData);
      setScreen('playing');
    },
    []
  );

  const handleRetry = useCallback(() => {
    const latest = SaveManager.getLatestSave();
    if (latest) {
      handleStartGame(latest.mode, latest.chapter, undefined, latest);
    } else {
      handleStartGame(
        lastSessionRef.current.mode,
        lastSessionRef.current.chapter,
        lastSessionRef.current.challengeId
      );
    }
  }, [handleStartGame]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#07090c]">
      {/* Dedicated WebGL Mount Container */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full"
        aria-label="Escenario 3D de La Finca"
      />

      {/* Main Menu */}
      {screen === 'menu' && (
        <div className="relative z-30 w-full h-full">
          <MainMenu
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onStartGame={handleStartGame}
          />
        </div>
      )}

      {/* Active Gameplay HUD */}
      {(screen === 'playing' || screen === 'paused') && (
        <GameHud
          hud={hud}
          onEquipWeapon={(w) => engineRef.current?.equipWeapon(w)}
          onToggleInventory={() => {
            setShowMap(false);
            setShowInventory((v) => !v);
          }}
          onToggleMap={() => {
            setShowInventory(false);
            setShowMap((v) => !v);
          }}
          onTogglePause={() =>
            setScreen((p) => (p === 'playing' ? 'paused' : 'playing'))
          }
          onToggleCamera={() => engineRef.current?.toggleCameraMode()}
          onLockPointer={() => engineRef.current?.requestPointerLock()}
        />
      )}

      {/* Codex Unlock Notification */}
      {unlockedToast && screen === 'playing' && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 bg-[#0d1118]/95 border border-amber-500/40 text-amber-200 px-4 py-2 rounded text-xs">
          {unlockedToast}
        </div>
      )}

      {/* Modals */}
      {showInventory && (
        <InventoryModal
          inventory={inventory}
          unlockedDocs={unlockedDocs}
          onUseItem={(id) => engineRef.current?.useInventoryItem(id)}
          onCombine={(a, b) => engineRef.current?.combineItems(a, b) ?? null}
          onClose={() => setShowInventory(false)}
        />
      )}

      {showMap && (
        <MapModal hud={hud} onClose={() => setShowMap(false)} />
      )}

      {activeDocId && (
        <DocumentModal
          docId={activeDocId}
          onClose={() => setActiveDocId(null)}
        />
      )}

      {screen === 'paused' && (
        <PauseModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onSaveSlot={(id, label) => engineRef.current?.saveGame(id, label)}
          onLoadSlot={(slot) =>
            handleStartGame(slot.mode, slot.chapter, undefined, slot)
          }
          onResume={() => setScreen('playing')}
          onReturnMenu={() => setScreen('menu')}
        />
      )}

      {ritualPrompt && (
        <RitualModal
          hasAmulet={ritualPrompt.hasAmulet}
          onSelectEnding={(ending) => {
            setRitualPrompt(null);
            engineRef.current?.resolveFinalRitual(ending);
          }}
          onCancel={() => setRitualPrompt(null)}
        />
      )}

      {(screen === 'victory' || screen === 'defeat') && endResult && (
        <EndScreen
          type={endResult.type}
          title={endResult.title}
          description={endResult.description}
          onRetry={handleRetry}
          onMainMenu={() => setScreen('menu')}
        />
      )}
    </div>
  );
}
