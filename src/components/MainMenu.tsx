import React, { useRef, useState } from 'react';
import {
  BookOpen,
  Compass,
  Play,
  RotateCcw,
  Settings,
  ShieldAlert,
  Skull,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  CHALLENGES_LIST,
  CHAPTERS,
  CREATURE_CODEX,
} from '../game/data';
import { SaveManager } from '../game/systems/SaveManager';
import {
  CreatureId,
  Difficulty,
  GameMode,
  GameSettings,
  SaveSlotData,
} from '../game/types';

interface MainMenuProps {
  settings: GameSettings;
  onUpdateSettings: (s: GameSettings) => void;
  onStartGame: (
    mode: GameMode,
    chapter?: number,
    challengeId?: string,
    loadData?: SaveSlotData
  ) => void;
}

type MenuTab =
  | 'home'
  | 'new_game'
  | 'chapters'
  | 'codex'
  | 'settings'
  | 'credits'
  | 'exit';

export const MainMenu: React.FC<MainMenuProps> = ({
  settings,
  onUpdateSettings,
  onStartGame,
}) => {
  const [tab, setTab] = useState<MenuTab>('home');
  const [selectedMode, setSelectedMode] = useState<GameMode>('campaign');
  const [selectedChallenge, setSelectedChallenge] = useState<string>(
    CHALLENGES_LIST[0].id
  );
  const [selectedCreature, setSelectedCreature] = useState<CreatureId>('lobizon');
  const [imgError, setImgError] = useState<Record<string, boolean>>({});
  const [videoError, setVideoError] = useState(false);
  const [videoMuted, setVideoMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const latestSave = SaveManager.getLatestSave();
  const unlockedCodex = new Set(SaveManager.getUnlockedCodex());
  const allCreatures = Object.values(CREATURE_CODEX);

  const handleDifficultyChange = (diff: Difficulty) => {
    const next = { ...settings, difficulty: diff };
    onUpdateSettings(next);
  };

  const toggleVideoAudio = () => {
    const nextMuted = !videoMuted;
    setVideoMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
      if (!nextMuted && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#07090c] text-[#e7e5e0] select-none">
      {/* Presentation Video Backdrop */}
      {!videoError ? (
        <video
          ref={videoRef}
          src="https://res.cloudinary.com/v7vzdizx/video/upload/v1795032566/fincavideo.mp4"
          poster="/src/assets/images/menu_finca_storm_1795029178123.jpg"
          autoPlay
          loop
          muted={videoMuted}
          playsInline
          onError={() => setVideoError(true)}
          className="absolute inset-0 w-full h-full object-cover opacity-85"
        />
      ) : !imgError.menu ? (
        <img
          src="/src/assets/images/menu_finca_storm_1795029178123.jpg"
          alt="La Finca en General Güemes durante una noche de tormenta"
          referrerPolicy="no-referrer"
          onError={() => setImgError((p) => ({ ...p, menu: true }))}
          className="absolute inset-0 w-full h-full object-cover opacity-70 scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1017] via-[#12161d] to-[#08090c]" />
      )}

      {/* Atmospheric Contrast Scrims for Legibility over Video */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#07090c]/90 via-[#07090c]/55 to-[#07090c]/20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#07090c]/95 via-transparent to-[#07090c]/55 pointer-events-none" />

      {/* Main Layout */}
      <div className="relative z-10 h-full max-w-[1360px] mx-auto px-6 md:px-12 py-8 flex flex-col justify-between">
        {/* Top Brand Emblem Header */}
        <header className="flex items-center justify-between gap-8 border-b border-white/10 pb-5">
          <div className="flex items-center gap-4">
            {/* Custom SVG Logo: Rural Farmhouse + Wire Fence + Shadowy Silhouette */}
            <svg
              viewBox="0 0 64 48"
              className="w-12 h-9 text-amber-500/90 shrink-0"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 30 L20 18 L34 30 V42 H6 Z"
                stroke="currentColor"
                strokeWidth="2"
                fill="rgba(217, 155, 67, 0.12)"
              />
              <path d="M16 42 V32 H24 V42" stroke="currentColor" strokeWidth="1.6" />
              <path d="M2 39 H62 M2 34 H62" stroke="rgba(231,229,224,0.45)" strokeWidth="1.2" />
              <path
                d="M12 31 V44 M38 31 V44 M56 31 V44"
                stroke="rgba(231,229,224,0.6)"
                strokeWidth="1.8"
              />
              <circle cx="48" cy="21" r="3.5" fill="rgba(231,229,224,0.8)" />
              <path
                d="M43 37 C43 27, 53 27, 53 37"
                fill="rgba(231,229,224,0.75)"
              />
            </svg>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-[0.16em] text-[#f2eee6] whitespace-nowrap">
                LA FINCA
              </h1>
              <p className="text-xs text-stone-400 tracking-wide">
                General Güemes, Salta · Mitología del Norte Argentino
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-xs text-stone-400">
            <span>Terror y Supervivencia 3D</span>
            <span aria-hidden="true">·</span>
            <span>Español Argentino</span>
          </div>
        </header>

        {/* Center Content Area */}
        <main className="flex-1 flex items-center py-6 min-h-0">
          {tab === 'home' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 w-full items-center">
              <div className="lg:col-span-6 space-y-6">
                <div className="space-y-3">
                  <h2 className="font-display text-5xl md:text-7xl font-bold tracking-[0.14em] text-stone-100 leading-tight [text-wrap:balance]">
                    LA FINCA
                  </h2>
                  <p className="font-display text-base md:text-xl tracking-wide text-amber-300/95 italic max-w-xl [text-wrap:balance]">
                    «No todas las leyendas son cuentos. Algunas viven en el monte».
                  </p>
                  <p className="text-sm md:text-base text-stone-300/90 max-w-xl leading-relaxed pt-1">
                    Eres el dueño de una antigua finca salteña rodeada de montes y
                    cañaverales. Cuando la tormenta corta los caminos y los perros ladran
                    hacia la oscuridad, deberás defender tu tierra del Lobizón, el
                    Ocumar, la Mulánima y el Duende.
                  </p>
                </div>

                <nav
                  aria-label="Menú principal"
                  className="flex flex-col gap-2 max-w-sm pt-2"
                >
                  {latestSave && (
                    <button
                      onClick={() =>
                        onStartGame(
                          latestSave.mode,
                          latestSave.chapter,
                          undefined,
                          latestSave
                        )
                      }
                      className="flex items-center justify-between px-5 py-3 bg-amber-600/90 hover:bg-amber-500 text-stone-950 font-semibold text-sm rounded transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5 whitespace-nowrap">
                        <RotateCcw className="w-4 h-4" />
                        Continuar ({latestSave.label})
                      </span>
                      <span className="font-mono-tabular text-xs opacity-80">
                        Cap. {latestSave.chapter}
                      </span>
                    </button>
                  )}

                  <button
                    onClick={() => setTab('new_game')}
                    className="flex items-center justify-between px-5 py-3 bg-[#151a22] hover:bg-[#1e2631] border border-white/15 text-stone-100 font-semibold text-sm rounded transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5 whitespace-nowrap">
                      <Play className="w-4 h-4 text-amber-400" />
                      Nueva Partida
                    </span>
                    <span className="text-xs text-stone-400">5 Modos</span>
                  </button>

                  <button
                    onClick={() => setTab('chapters')}
                    className="flex items-center justify-between px-5 py-2.5 bg-[#0e1218]/90 hover:bg-[#181f29] border border-white/10 text-stone-200 text-sm rounded transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5 whitespace-nowrap">
                      <Compass className="w-4 h-4 text-stone-400" />
                      Seleccionar Capítulo
                    </span>
                    <span className="text-xs text-stone-400">7 Capítulos</span>
                  </button>

                  <button
                    onClick={() => setTab('codex')}
                    className="flex items-center justify-between px-5 py-2.5 bg-[#0e1218]/90 hover:bg-[#181f29] border border-white/10 text-stone-200 text-sm rounded transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5 whitespace-nowrap">
                      <BookOpen className="w-4 h-4 text-stone-400" />
                      Galería de Criaturas
                    </span>
                    <span className="font-mono-tabular text-xs text-stone-400">
                      {unlockedCodex.size}/{allCreatures.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setTab('settings')}
                    className="flex items-center justify-between px-5 py-2.5 bg-[#0e1218]/90 hover:bg-[#181f29] border border-white/10 text-stone-200 text-sm rounded transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5 whitespace-nowrap">
                      <Settings className="w-4 h-4 text-stone-400" />
                      Configuración
                    </span>
                  </button>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => setTab('credits')}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-[#0b0e13]/85 hover:bg-[#161c24] border border-white/10 text-stone-300 text-xs rounded transition-colors cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      Créditos
                    </button>
                    <button
                      onClick={() => setTab('exit')}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-[#0b0e13]/85 hover:bg-red-950/50 border border-white/10 text-stone-300 text-xs rounded transition-colors cursor-pointer"
                    >
                      <Skull className="w-3.5 h-3.5" />
                      Salir
                    </button>
                  </div>
                </nav>
              </div>

              {/* Controls Quick Reference */}
              <div className="lg:col-span-6 hidden lg:flex justify-end">
                <div className="w-full max-w-md bg-[#0b0f15]/90 border border-white/10 rounded-lg p-6 space-y-4">
                  <h3 className="font-display text-sm tracking-widest text-amber-400 uppercase">
                    Controles de Campo
                  </h3>
                  <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs text-stone-300">
                    <div>
                      <span className="font-mono-tabular text-stone-100">WASD</span> · Moverse
                    </div>
                    <div>
                      <span className="font-mono-tabular text-stone-100">Shift</span> · Correr
                    </div>
                    <div>
                      <span className="font-mono-tabular text-stone-100">Ctrl / C</span> · Agacharse
                    </div>
                    <div>
                      <span className="font-mono-tabular text-stone-100">E</span> · Interactuar
                    </div>
                    <div>
                      <span className="font-mono-tabular text-stone-100">F</span> · Linterna
                    </div>
                    <div>
                      <span className="font-mono-tabular text-stone-100">I / M</span> · Mochila / Mapa
                    </div>
                    <div>
                      <span className="font-mono-tabular text-stone-100">Clic Izq.</span> · Atacar / Disparar
                    </div>
                    <div>
                      <span className="font-mono-tabular text-stone-100">Clic Der.</span> · Apuntar
                    </div>
                    <div>
                      <span className="font-mono-tabular text-stone-100">R</span> · Recargar
                    </div>
                    <div>
                      <span className="font-mono-tabular text-stone-100">V</span> · 1ra / 3ra Persona
                    </div>
                  </div>
                  <p className="text-xs text-stone-400 pt-2 border-t border-white/10 leading-relaxed">
                    Haz clic en el escenario durante la partida para fijar la cámara con el
                    mouse o arrastra manteniendo presionado.
                  </p>
                </div>
              </div>
            </div>
          )}

          {tab === 'new_game' && (
            <div className="w-full max-w-4xl bg-[#0b0f15]/95 border border-white/12 rounded-lg p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-stone-100">
                    Nueva Partida
                  </h2>
                  <p className="text-xs text-stone-400">
                    Elige el modo de juego y el nivel de dificultad
                  </p>
                </div>
                <button
                  onClick={() => setTab('home')}
                  className="px-4 py-2 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded cursor-pointer"
                >
                  Volver
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
                {(
                  [
                    {
                      id: 'campaign',
                      title: 'Campaña',
                      desc: 'Historia completa en 7 capítulos y múltiples finales.',
                    },
                    {
                      id: 'survival',
                      title: 'Supervivencia',
                      desc: 'Resiste 3 noches completas administrando recursos.',
                    },
                    {
                      id: 'infinite_night',
                      title: 'Noche Infinita',
                      desc: 'Amenazas crecientes sin amanecer definitivo.',
                    },
                    {
                      id: 'exploration',
                      title: 'Exploración',
                      desc: 'Recorre la finca y sus secretos sin criaturas.',
                    },
                    {
                      id: 'challenges',
                      title: 'Desafíos',
                      desc: 'Escenarios extremos con condiciones especiales.',
                    },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMode(m.id)}
                    className={`text-left p-3.5 rounded border transition-colors cursor-pointer ${
                      selectedMode === m.id
                        ? 'bg-amber-600/20 border-amber-500 text-stone-100'
                        : 'bg-white/[0.03] border-white/10 text-stone-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="text-sm font-semibold">{m.title}</div>
                    <div className="text-xs text-stone-400 mt-1 leading-snug">
                      {m.desc}
                    </div>
                  </button>
                ))}
              </div>

              {selectedMode === 'challenges' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {CHALLENGES_LIST.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => setSelectedChallenge(ch.id)}
                      className={`text-left p-3.5 rounded border cursor-pointer ${
                        selectedChallenge === ch.id
                          ? 'bg-amber-500/15 border-amber-400'
                          : 'bg-black/30 border-white/10'
                      }`}
                    >
                      <div className="text-xs font-semibold text-amber-300">
                        {ch.title}
                      </div>
                      <div className="text-xs text-stone-400 mt-1">{ch.description}</div>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400 mr-2">Dificultad:</span>
                  {(['historia', 'normal', 'pesadilla'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => handleDifficultyChange(d)}
                      className={`px-3 py-1.5 text-xs rounded border capitalize cursor-pointer ${
                        settings.difficulty === d
                          ? 'bg-amber-600 text-stone-950 border-amber-500 font-semibold'
                          : 'bg-white/5 border-white/10 text-stone-300'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() =>
                    onStartGame(
                      selectedMode,
                      1,
                      selectedMode === 'challenges' ? selectedChallenge : undefined
                    )
                  }
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-sm rounded transition-colors cursor-pointer"
                >
                  Comenzar Partida
                </button>
              </div>
            </div>
          )}

          {tab === 'chapters' && (
            <div className="w-full max-w-4xl bg-[#0b0f15]/95 border border-white/12 rounded-lg p-6 md:p-8 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="font-display text-2xl font-bold">
                  Seleccionar Capítulo
                </h2>
                <button
                  onClick={() => setTab('home')}
                  className="px-4 py-2 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded cursor-pointer"
                >
                  Volver
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {CHAPTERS.map((c) => (
                  <button
                    key={c.number}
                    onClick={() => onStartGame('campaign', c.number)}
                    className="text-left p-4 rounded bg-white/[0.03] hover:bg-amber-500/10 border border-white/10 hover:border-amber-500/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-amber-300">
                        {c.title}
                      </span>
                      <span className="text-xs text-stone-400 font-mono-tabular">
                        {c.subtitle.split('—')[1] ?? ''}
                      </span>
                    </div>
                    <p className="text-xs text-stone-300 mt-1.5">
                      {c.objectiveTitle}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'codex' && (
            <div className="w-full max-w-5xl bg-[#0b0f15]/95 border border-white/12 rounded-lg p-6 md:p-8 space-y-5 max-h-[78vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h2 className="font-display text-2xl font-bold">
                    Galería de Criaturas del Norte
                  </h2>
                  <p className="text-xs text-stone-400">
                    Las entidades se desbloquean al avistarlas en la finca
                  </p>
                </div>
                <button
                  onClick={() => setTab('home')}
                  className="px-4 py-2 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded cursor-pointer"
                >
                  Volver
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 space-y-2">
                  {allCreatures.map((cr) => {
                    const isUnlocked =
                      unlockedCodex.has(cr.id) ||
                      cr.id === 'lobizon' ||
                      cr.id === 'duende';
                    return (
                      <button
                        key={cr.id}
                        onClick={() => setSelectedCreature(cr.id)}
                        className={`w-full text-left px-4 py-3 rounded border transition-colors cursor-pointer ${
                          selectedCreature === cr.id
                            ? 'bg-amber-600/20 border-amber-500 text-stone-100'
                            : 'bg-white/[0.03] border-white/10 text-stone-300 hover:bg-white/[0.06]'
                        }`}
                      >
                        <div className="text-sm font-semibold">
                          {isUnlocked ? cr.name : `${cr.name} (Por descubrir)`}
                        </div>
                        <div className="text-xs text-stone-400">{cr.region}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-12 gap-5 bg-black/35 border border-white/10 rounded p-4">
                  {(() => {
                    const entry = CREATURE_CODEX[selectedCreature];
                    return (
                      <>
                        <div className="sm:col-span-5">
                          {!imgError[entry.id] ? (
                            <img
                              src={entry.portraitUrl}
                              alt={entry.name}
                              referrerPolicy="no-referrer"
                              onError={() =>
                                setImgError((p) => ({ ...p, [entry.id]: true }))
                              }
                              className="w-full aspect-[3/4] object-cover rounded border border-white/15"
                            />
                          ) : (
                            <div className="w-full aspect-[3/4] rounded bg-stone-900 border border-white/15 flex items-center justify-center text-xs text-stone-400">
                              {entry.name}
                            </div>
                          )}
                        </div>
                        <div className="sm:col-span-7 space-y-3 text-xs leading-relaxed">
                          <div>
                            <h3 className="font-display text-xl font-bold text-amber-300">
                              {entry.name}
                            </h3>
                            <p className="text-stone-400">{entry.subtitle}</p>
                          </div>
                          <div className="text-stone-300">
                            <span className="text-stone-400">Peligro:</span>{' '}
                            {entry.dangerLevel} ·{' '}
                            <span className="text-stone-400">Zona:</span> {entry.region}
                          </div>
                          <p className="text-stone-200">{entry.description}</p>
                          <div>
                            <div className="text-amber-400/90 font-semibold">
                              Comportamiento
                            </div>
                            <p className="text-stone-300 mt-0.5">{entry.behavior}</p>
                          </div>
                          <div>
                            <div className="text-emerald-400/90 font-semibold">
                              Debilidad y Supervivencia
                            </div>
                            <p className="text-stone-300 mt-0.5">{entry.weakness}</p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {tab === 'settings' && (
            <div className="w-full max-w-3xl bg-[#0b0f15]/95 border border-white/12 rounded-lg p-6 md:p-8 space-y-5 max-h-[78vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="font-display text-2xl font-bold">
                  Configuración y Accesibilidad
                </h2>
                <button
                  onClick={() => setTab('home')}
                  className="px-4 py-2 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded cursor-pointer"
                >
                  Guardar y Volver
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                <label className="space-y-1.5">
                  <span className="text-stone-300 block">
                    Calidad Gráfica: {settings.graphicsQuality}
                  </span>
                  <select
                    value={settings.graphicsQuality}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        graphicsQuality: e.target.value as GameSettings['graphicsQuality'],
                      })
                    }
                    className="w-full bg-[#121822] border border-white/15 rounded px-3 py-2 text-stone-100"
                  >
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-stone-300 block">
                    Campo de Visión (FOV): {settings.fov}°
                  </span>
                  <input
                    type="range"
                    min={55}
                    max={90}
                    value={settings.fov}
                    onChange={(e) =>
                      onUpdateSettings({ ...settings, fov: Number(e.target.value) })
                    }
                    className="w-full accent-amber-500"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-stone-300 block">
                    Sensibilidad del Mouse: {settings.mouseSensitivity.toFixed(1)}x
                  </span>
                  <input
                    type="range"
                    min={0.4}
                    max={2.2}
                    step={0.1}
                    value={settings.mouseSensitivity}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        mouseSensitivity: Number(e.target.value),
                      })
                    }
                    className="w-full accent-amber-500"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-stone-300 block">
                    Volumen General: {Math.round(settings.masterVolume * 100)}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.masterVolume}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        masterVolume: Number(e.target.value),
                      })
                    }
                    className="w-full accent-amber-500"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-stone-300 block">
                    Música Ambiental: {Math.round(settings.musicVolume * 100)}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.musicVolume}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        musicVolume: Number(e.target.value),
                      })
                    }
                    className="w-full accent-amber-500"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-stone-300 block">
                    Efectos 3D: {Math.round(settings.sfxVolume * 100)}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.sfxVolume}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        sfxVolume: Number(e.target.value),
                      })
                    }
                    className="w-full accent-amber-500"
                  />
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={settings.shadows}
                    onChange={(e) =>
                      onUpdateSettings({ ...settings, shadows: e.target.checked })
                    }
                    className="accent-amber-500"
                  />
                  <span>Sombras dinámicas</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={settings.subtitles}
                    onChange={(e) =>
                      onUpdateSettings({ ...settings, subtitles: e.target.checked })
                    }
                    className="accent-amber-500"
                  />
                  <span>Subtítulos y avisos sonoros</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.reduceCameraShake}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        reduceCameraShake: e.target.checked,
                      })
                    }
                    className="accent-amber-500"
                  />
                  <span>Reducir sacudidas de cámara (Accesibilidad)</span>
                </label>
              </div>
            </div>
          )}

          {tab === 'credits' && (
            <div className="w-full max-w-2xl bg-[#0b0f15]/95 border border-white/12 rounded-lg p-6 md:p-8 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="font-display text-2xl font-bold">Créditos</h2>
                <button
                  onClick={() => setTab('home')}
                  className="px-4 py-2 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded cursor-pointer"
                >
                  Volver
                </button>
              </div>
              <p className="text-sm text-stone-300 leading-relaxed">
                <strong>LA FINCA</strong> rinde homenaje a las leyendas rurales y relatos
                orales del norte argentino (General Güemes, Salta): El Lobizón, El Ocumar,
                La Mulánima, El Duende del Monte, El Familiar y El Alma Mula.
              </p>
              <div className="text-xs text-stone-400 space-y-1.5 pt-2">
                <div>Motor 3D en tiempo real: Three.js WebGL PBR + Iluminación Dinámica</div>
                <div>Audio Espacial: Síntesis procedural Web Audio API 3D</div>
                <div>Ambientación: Finca rural salteña, cañaverales y monte chaqueño</div>
              </div>
            </div>
          )}

          {tab === 'exit' && (
            <div className="w-full max-w-md bg-[#0b0f15]/95 border border-white/12 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-amber-400">
                <ShieldAlert className="w-5 h-5" />
                <h2 className="font-display text-lg font-bold">Salir de La Finca</h2>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed">
                Tu progreso guardado localmente se conservará para tu próxima visita a
                General Güemes. ¿Deseas volver al menú principal?
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setTab('home')}
                  className="flex-1 px-4 py-2 text-xs bg-amber-600 text-stone-950 font-semibold rounded cursor-pointer"
                >
                  Volver al Menú
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Subtle Footer */}
        <footer className="flex items-center justify-between gap-4 text-xs text-stone-400 border-t border-white/10 pt-4">
          <span>LA FINCA · General Güemes, Salta</span>
          <div className="flex items-center gap-4">
            {!videoError && (
              <button
                onClick={toggleVideoAudio}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-stone-300 transition-colors cursor-pointer"
              >
                {videoMuted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-stone-400" />
                    Activar sonido del video
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    Silenciar video
                  </>
                )}
              </button>
            )}
            <span className="hidden sm:flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500/70" />
              Usa auriculares para el audio espacial 3D
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};
