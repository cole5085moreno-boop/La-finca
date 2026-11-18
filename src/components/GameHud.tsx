import React, { useState } from 'react';
import {
  Backpack,
  Camera,
  ChevronDown,
  ChevronUp,
  Compass,
  Flashlight,
  Map as MapIcon,
  Pause,
} from 'lucide-react';
import { WEATHER_LABELS } from '../game/data';
import { PlayerHudState, WeaponId } from '../game/types';

interface GameHudProps {
  hud: PlayerHudState;
  onEquipWeapon: (w: WeaponId) => void;
  onToggleInventory: () => void;
  onToggleMap: () => void;
  onTogglePause: () => void;
  onToggleCamera: () => void;
  onLockPointer: () => void;
}

function formatHour(h: number): string {
  const hrs = Math.floor(h) % 24;
  const mins = Math.floor((h - Math.floor(h)) * 60);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')} hs`;
}

function cardinalFromDeg(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  return dirs[Math.round(deg / 45) % 8];
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  onEquipWeapon,
  onToggleInventory,
  onToggleMap,
  onTogglePause,
  onToggleCamera,
  onLockPointer,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);

  const weaponLabels: Record<WeaponId, string> = {
    ninguna: 'Sin arma',
    escopeta: 'Escopeta Cal. 12',
    revolver: 'Revólver .38',
    machete: 'Machete de Monte',
    cuchillo: 'Faca Criolla',
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 md:p-5">
      {/* Fear & Low-Health Vignette */}
      {(hud.fear > 45 || hud.health < 35) && (
        <div
          className="fixed inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background:
              hud.health < 35
                ? 'radial-gradient(circle, transparent 52%, rgba(125, 18, 18, 0.52) 100%)'
                : 'radial-gradient(circle, transparent 58%, rgba(6, 9, 14, 0.72) 100%)',
          }}
        />
      )}

      {/* Top Row: Left Objective / Right Compass & Time */}
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="bg-[#080b10]/88 border border-white/10 rounded px-3.5 py-2.5 max-w-sm">
          <div className="flex items-center gap-2 text-[11px] text-amber-400/90 font-medium">
            <span>{hud.currentZone}</span>
            {hud.houseProtected && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-400">Refugio Iluminado</span>
              </>
            )}
          </div>
          <div className="text-xs font-semibold text-stone-100 mt-0.5">
            {hud.objectiveTitle}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5 leading-snug line-clamp-2">
            {hud.objectiveDescription}
          </div>
        </div>

        <div className="bg-[#080b10]/88 border border-white/10 rounded px-3.5 py-2 text-right">
          <div className="flex items-center justify-end gap-2 text-xs text-stone-200 font-mono-tabular">
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {cardinalFromDeg(hud.compassDegrees)} ({hud.compassDegrees}°)
            </span>
            <span aria-hidden="true">·</span>
            <span>{formatHour(hud.gameHour)}</span>
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">
            {WEATHER_LABELS[hud.weather]} · Gen. {hud.generatorOn ? 'Encendido' : 'Apagado'}
          </div>
        </div>
      </div>

      {/* Center Crosshair & Interaction Prompt */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-3">
        {/* Subtle click-to-look hint or crosshair dot */}
        <div
          onClick={onLockPointer}
          className="pointer-events-auto cursor-crosshair w-2 h-2 rounded-full border border-stone-200/70 bg-stone-100/20"
          title="Haz clic en la pantalla para fijar la cámara"
        />

        {hud.interactionPrompt && (
          <div className="bg-[#090d13]/92 border border-amber-500/45 text-amber-100 px-3.5 py-1.5 rounded text-xs font-medium">
            {hud.interactionPrompt}
          </div>
        )}

        {hud.subtitleText && (
          <div className="bg-[#07090c]/90 border border-white/10 text-stone-100 px-4 py-2 rounded text-xs max-w-lg text-center">
            {hud.subtitleText}
          </div>
        )}
      </div>

      {/* Bottom Area: Vitals + Collapsible Quick Dock */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <button
          onClick={() => setDockCollapsed((v) => !v)}
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-1 bg-[#080b10]/85 border border-white/10 rounded text-[11px] text-stone-300 hover:text-white cursor-pointer"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" /> Mostrar barra
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" /> Ocultar barra
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="pointer-events-auto w-full max-w-[940px] bg-[#080b10]/90 border border-white/12 rounded-lg px-4 py-2.5 flex flex-wrap items-center justify-between gap-4">
            {/* Vitals */}
            <div className="flex items-center gap-4">
              <div className="w-28 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-stone-400">Salud</span>
                  <span className="font-mono-tabular text-stone-100">
                    {hud.health}/{hud.maxHealth}
                  </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      hud.health < 35 ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${(hud.health / hud.maxHealth) * 100}%` }}
                  />
                </div>
              </div>

              <div className="w-24 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-stone-400">Resistencia</span>
                  <span className="font-mono-tabular text-stone-100">
                    {hud.stamina}%
                  </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{ width: `${(hud.stamina / hud.maxStamina) * 100}%` }}
                  />
                </div>
              </div>

              <div className="w-20 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-stone-400 flex items-center gap-1">
                    <Flashlight className="w-3 h-3 text-amber-300" />
                    Luz
                  </span>
                  <span className="font-mono-tabular text-stone-100">
                    {hud.battery}%
                  </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded overflow-hidden">
                  <div
                    className="h-full bg-sky-400 transition-all"
                    style={{ width: `${hud.battery}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Weapon & Quick Slots */}
            <div className="flex items-center gap-2">
              <div className="text-right mr-2">
                <div className="text-xs font-medium text-stone-100">
                  {weaponLabels[hud.equippedWeapon]}
                </div>
                <div className="text-[11px] font-mono-tabular text-stone-400">
                  {hud.equippedWeapon === 'escopeta'
                    ? `${hud.ammoInClip.escopeta} / ${hud.ammoReserve.escopeta}`
                    : hud.equippedWeapon === 'revolver'
                    ? `${hud.ammoInClip.revolver} / ${hud.ammoReserve.revolver}`
                    : hud.crouching
                    ? 'Sigilo activo'
                    : 'Cuerpo a cuerpo'}
                </div>
              </div>

              {(
                [
                  ['1', 'escopeta', 'Escop.'],
                  ['2', 'revolver', 'Rev.'],
                  ['3', 'machete', 'Mach.'],
                  ['4', 'cuchillo', 'Faca'],
                ] as const
              ).map(([num, id, short]) => (
                <button
                  key={id}
                  onClick={() => onEquipWeapon(id)}
                  className={`px-2 py-1 text-[11px] rounded border cursor-pointer whitespace-nowrap ${
                    hud.equippedWeapon === id
                      ? 'bg-amber-600/25 border-amber-400 text-amber-200'
                      : 'bg-white/[0.04] border-white/10 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {num}·{short}
                </button>
              ))}
            </div>

            {/* Functional Modals */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={onToggleCamera}
                title="Cambiar cámara (V)"
                className="p-2 bg-white/[0.04] hover:bg-white/10 border border-white/10 rounded text-stone-300 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                onClick={onToggleInventory}
                title="Inventario (I)"
                className="p-2 bg-white/[0.04] hover:bg-white/10 border border-white/10 rounded text-stone-300 cursor-pointer"
              >
                <Backpack className="w-4 h-4" />
              </button>
              <button
                onClick={onToggleMap}
                title="Mapa de la Finca (M)"
                className="p-2 bg-white/[0.04] hover:bg-white/10 border border-white/10 rounded text-stone-300 cursor-pointer"
              >
                <MapIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onTogglePause}
                title="Pausa (Esc)"
                className="p-2 bg-white/[0.04] hover:bg-white/10 border border-white/10 rounded text-stone-300 cursor-pointer"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
