import React, { useState } from 'react';
import {
  BookOpen,
  Combine,
  FileText,
  Flame,
  RotateCcw,
  Save,
  ShieldCheck,
  Skull,
  X,
} from 'lucide-react';
import { CRAFT_RECIPES, DOCUMENTS_CATALOG } from '../game/data';
import { SaveManager } from '../game/systems/SaveManager';
import {
  EndingType,
  GameSettings,
  InventoryItem,
  ItemCategory,
  PlayerHudState,
  SaveSlotData,
} from '../game/types';

export const InventoryModal: React.FC<{
  inventory: InventoryItem[];
  unlockedDocs: string[];
  onUseItem: (id: string) => void;
  onCombine: (a: string, b: string) => string | null;
  onClose: () => void;
}> = ({ inventory, unlockedDocs, onUseItem, onCombine, onClose }) => {
  const [cat, setCat] = useState<'todas' | ItemCategory>('todas');
  const [selectedId, setSelectedId] = useState<string | null>(
    inventory[0]?.id ?? null
  );
  const [combineFirst, setCombineFirst] = useState<string | null>(null);
  const [combineFeedback, setCombineFeedback] = useState<string | null>(null);
  const [viewDocs, setViewDocs] = useState(false);

  const filtered =
    cat === 'todas'
      ? inventory
      : inventory.filter((i) => i.category === cat);
  const selected = inventory.find((i) => i.id === selectedId) ?? filtered[0] ?? null;
  const docs = DOCUMENTS_CATALOG.filter((d) => unlockedDocs.includes(d.id));

  const handleItemClick = (item: InventoryItem) => {
    if (combineFirst) {
      if (combineFirst === item.id) {
        setCombineFirst(null);
        return;
      }
      const res = onCombine(combineFirst, item.id);
      setCombineFeedback(
        res
          ? `Combinado con éxito: ${res}`
          : 'Esos dos objetos no pueden combinarse.'
      );
      setCombineFirst(null);
      return;
    }
    setSelectedId(item.id);
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[#0c1017] border border-white/15 rounded-lg p-6 space-y-5 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-4">
            <h2 className="font-display text-xl font-bold text-stone-100">
              Mochila y Documentos
            </h2>
            <div className="flex gap-1 bg-white/[0.04] p-1 rounded">
              <button
                onClick={() => setViewDocs(false)}
                className={`px-3 py-1 text-xs rounded cursor-pointer ${
                  !viewDocs ? 'bg-amber-600 text-stone-950 font-semibold' : 'text-stone-300'
                }`}
              >
                Inventario
              </button>
              <button
                onClick={() => setViewDocs(true)}
                className={`px-3 py-1 text-xs rounded cursor-pointer ${
                  viewDocs ? 'bg-amber-600 text-stone-950 font-semibold' : 'text-stone-300'
                }`}
              >
                Documentos ({docs.length})
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!viewDocs ? (
          <div className="flex-1 min-h-0 flex flex-col gap-4">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['todas', 'Todo'],
                  ['armas', 'Armas'],
                  ['herramientas', 'Herramientas'],
                  ['medicina', 'Medicina'],
                  ['alimentos', 'Alimentos'],
                  ['municiones', 'Munición'],
                  ['llaves', 'Llaves'],
                  ['especiales', 'Especiales'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setCat(id)}
                  className={`px-2.5 py-1 text-xs rounded border cursor-pointer ${
                    cat === id
                      ? 'bg-amber-600/25 border-amber-500 text-amber-200'
                      : 'bg-white/[0.03] border-white/10 text-stone-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {combineFirst && (
              <div className="text-xs bg-amber-500/15 border border-amber-500/40 text-amber-200 px-3 py-2 rounded">
                Selecciona un segundo objeto para combinarlo con{' '}
                <strong>
                  {inventory.find((i) => i.id === combineFirst)?.name}
                </strong>{' '}
                (o haz clic en el mismo para cancelar).
              </div>
            )}
            {combineFeedback && (
              <div className="text-xs bg-white/5 border border-white/15 text-stone-200 px-3 py-2 rounded">
                {combineFeedback}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-0 overflow-y-auto">
              <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2 content-start">
                {filtered.length === 0 ? (
                  <div className="text-xs text-stone-400 col-span-2 py-8 text-center">
                    No hay objetos en esta categoría.
                  </div>
                ) : (
                  filtered.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={`text-left p-3 rounded border transition-colors cursor-pointer ${
                        combineFirst === item.id
                          ? 'bg-amber-500/25 border-amber-400'
                          : selected?.id === item.id
                          ? 'bg-white/10 border-white/30'
                          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-stone-100 truncate">
                          {item.name}
                        </span>
                        <span className="font-mono-tabular text-xs text-amber-300 shrink-0">
                          x{item.quantity}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-400 mt-1">
                        {item.category} · {item.weight} kg
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="md:col-span-5 bg-black/35 border border-white/10 rounded p-4 flex flex-col justify-between gap-4">
                {selected ? (
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-display text-lg font-bold text-amber-300">
                        {selected.name}
                      </h3>
                      <p className="text-xs text-stone-400">
                        Cantidad: {selected.quantity} · Peso: {selected.weight} kg
                        {selected.condition !== undefined
                          ? ` · Estado: ${selected.condition}%`
                          : ''}
                      </p>
                    </div>
                    <p className="text-xs text-stone-200 leading-relaxed">
                      {selected.description}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {(selected.usable || selected.category === 'armas') && (
                        <button
                          onClick={() => onUseItem(selected.id)}
                          className="px-4 py-2 text-xs bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold rounded cursor-pointer"
                        >
                          {selected.category === 'armas' ? 'Equipar' : 'Usar'}
                        </button>
                      )}
                      {selected.combinableWith && (
                        <button
                          onClick={() => {
                            setCombineFirst(selected.id);
                            setCombineFeedback(null);
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs bg-white/10 hover:bg-white/15 border border-white/15 rounded cursor-pointer"
                        >
                          <Combine className="w-3.5 h-3.5" />
                          Combinar
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-stone-400">
                    Selecciona un objeto para inspeccionarlo.
                  </div>
                )}

                <div className="border-t border-white/10 pt-3 space-y-1.5">
                  <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                    Combinaciones posibles
                  </div>
                  {CRAFT_RECIPES.map((r) => (
                    <div key={r.id} className="text-[11px] text-stone-400">
                      <span className="text-stone-200">{r.resultName}:</span>{' '}
                      {r.description}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3">
            {docs.length === 0 ? (
              <div className="text-xs text-stone-400 py-10 text-center">
                Aún no has recogido documentos o cartas en la finca.
              </div>
            ) : (
              docs.map((d) => (
                <div
                  key={d.id}
                  className="bg-black/35 border border-white/10 rounded p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
                      <FileText className="w-4 h-4" />
                      {d.title}
                    </div>
                    <span className="text-xs text-stone-400">
                      {d.author} · {d.date}
                    </span>
                  </div>
                  <p className="text-xs text-stone-200 leading-relaxed">
                    {d.content}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const MapModal: React.FC<{
  hud: PlayerHudState;
  onClose: () => void;
}> = ({ hud, onClose }) => {
  const landmarks = [
    { name: 'Casa Principal', x: 0, z: 0, color: '#f59e0b' },
    { name: 'Aljibe', x: -11.5, z: 10.5, color: '#93c5fd' },
    { name: 'Galpones y Generador', x: -34, z: -16, color: '#fbbf24' },
    { name: 'Corrales y Establos', x: 34, z: -12, color: '#a3e635' },
    { name: 'El Monte / Cañaverales', x: 26, z: -52, color: '#4ade80' },
    { name: 'Árbol del Ritual', x: 8, z: -78, color: '#ef4444' },
    { name: 'Puesto de Vigilancia', x: 54, z: 48, color: '#cbd5e1' },
    { name: 'Cementerio Rural', x: -52, z: 54, color: '#94a3b8' },
    { name: 'Capilla Antigua', x: -66, z: 38, color: '#e2e8f0' },
  ];

  // Map [-110, 110] -> [0, 100]%
  const toPct = (val: number) => ((val + 110) / 220) * 100;

  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0c1017] border border-white/15 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h2 className="font-display text-xl font-bold text-stone-100">
              Plano de La Finca — General Güemes
            </h2>
            <p className="text-xs text-stone-400">
              Ubicación actual: {hud.currentZone}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative w-full aspect-square max-h-[60vh] bg-[#131814] border border-amber-900/40 rounded overflow-hidden">
          {/* Roads */}
          <div
            className="absolute bg-[#3b2e21]"
            style={{ left: '49%', top: '12%', width: '2%', height: '78%' }}
          />
          <div
            className="absolute bg-[#3b2e21]"
            style={{ left: '16%', top: '56%', width: '68%', height: '2%' }}
          />
          {/* Creek */}
          <div
            className="absolute bg-[#1b3342]"
            style={{ left: '0%', top: '60%', width: '100%', height: '3%' }}
          />

          {/* Landmarks */}
          {landmarks.map((lm) => (
            <div
              key={lm.name}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{ left: `${toPct(lm.x)}%`, top: `${toPct(lm.z)}%` }}
            >
              <div
                className="w-2.5 h-2.5 rounded-sm border border-black"
                style={{ backgroundColor: lm.color }}
              />
              <span className="text-[10px] text-stone-200 bg-black/75 px-1 rounded mt-0.5 whitespace-nowrap">
                {lm.name}
              </span>
            </div>
          ))}

          {/* Player live marker */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{
              left: `${toPct(hud.playerPos.x)}%`,
              top: `${toPct(hud.playerPos.z)}%`,
            }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-white" />
            <span className="text-[10px] font-semibold text-amber-300 bg-black/85 px-1 rounded mt-0.5">
              Tú
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DocumentModal: React.FC<{
  docId: string;
  onClose: () => void;
}> = ({ docId, onClose }) => {
  const doc = DOCUMENTS_CATALOG.find((d) => d.id === docId);
  if (!doc) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#16130f] border border-amber-700/40 rounded-lg p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 border-b border-amber-900/30 pb-3">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs">
              <BookOpen className="w-4 h-4" />
              <span>Documento hallado</span>
            </div>
            <h3 className="font-display text-xl font-bold text-amber-100 mt-1">
              {doc.title}
            </h3>
            <p className="text-xs text-stone-400">
              {doc.author} · {doc.date}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-stone-200 leading-relaxed whitespace-pre-line">
          {doc.content}
        </p>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-xs rounded cursor-pointer"
          >
            Guardar en la mochila
          </button>
        </div>
      </div>
    </div>
  );
};

export const PauseModal: React.FC<{
  settings: GameSettings;
  onUpdateSettings: (s: GameSettings) => void;
  onSaveSlot: (slotId: string, label: string) => void;
  onLoadSlot: (slot: SaveSlotData) => void;
  onResume: () => void;
  onReturnMenu: () => void;
}> = ({
  settings,
  onUpdateSettings,
  onSaveSlot,
  onLoadSlot,
  onResume,
  onReturnMenu,
}) => {
  const [saves, setSaves] = useState<SaveSlotData[]>(() => SaveManager.listSaves());

  const handleSave = (slotId: string, label: string) => {
    onSaveSlot(slotId, label);
    setSaves(SaveManager.listSaves());
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0c1017] border border-white/15 rounded-lg p-6 space-y-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="font-display text-2xl font-bold text-stone-100">
            Juego en Pausa
          </h2>
          <button
            onClick={onResume}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-xs rounded cursor-pointer"
          >
            Reanudar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Guardar y Cargar
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleSave('slot_1', 'Ranura Manual 1')}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-amber-400" />
                Guardar Ranura 1
              </button>
              <button
                onClick={() => handleSave('slot_2', 'Ranura Manual 2')}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-amber-400" />
                Guardar Ranura 2
              </button>
            </div>

            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {saves.map((s) => (
                <button
                  key={s.slotId}
                  onClick={() => onLoadSlot(s)}
                  className="w-full text-left px-3 py-2 bg-black/35 hover:bg-white/10 border border-white/10 rounded text-xs flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <div className="font-medium text-stone-200">{s.label}</div>
                    <div className="text-[11px] text-stone-400">
                      Cap. {s.chapter} · Salud {s.health}%
                    </div>
                  </div>
                  <span className="text-[11px] text-amber-400">Cargar</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <h3 className="font-semibold uppercase tracking-wider text-stone-400">
              Ajustes Rápidos
            </h3>
            <label className="block space-y-1">
              <span>Sensibilidad: {settings.mouseSensitivity.toFixed(1)}x</span>
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
            <label className="block space-y-1">
              <span>Volumen: {Math.round(settings.masterVolume * 100)}%</span>
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
            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.subtitles}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, subtitles: e.target.checked })
                }
                className="accent-amber-500"
              />
              <span>Subtítulos</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
          <button
            onClick={onReturnMenu}
            className="px-4 py-2 bg-red-950/60 hover:bg-red-900/70 border border-red-800/50 text-red-200 text-xs rounded cursor-pointer"
          >
            Volver al Menú Principal
          </button>
        </div>
      </div>
    </div>
  );
};

export const RitualModal: React.FC<{
  hasAmulet: boolean;
  onSelectEnding: (ending: EndingType) => void;
  onCancel: () => void;
}> = ({ hasAmulet, onSelectEnding, onCancel }) => (
  <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
    <div className="w-full max-w-xl bg-[#100d0b] border border-amber-700/45 rounded-lg p-6 space-y-5">
      <div className="flex items-center gap-2.5 text-amber-400">
        <Flame className="w-5 h-5" />
        <h2 className="font-display text-2xl font-bold text-stone-100">
          El Árbol del Ritual
        </h2>
      </div>
      <p className="text-xs text-stone-300 leading-relaxed">
        Frente a las raíces del quebracho antiguo arden las velas del pacto de 1924.
        Las criaturas aguardan en el borde del claro. Tu decisión sellará el destino
        de La Finca para siempre.
      </p>

      <div className="space-y-2.5">
        {hasAmulet && (
          <button
            onClick={() => onSelectEnding('verdad_revelada')}
            className="w-full text-left p-3.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500 rounded cursor-pointer"
          >
            <div className="text-sm font-semibold text-amber-300">
              Quemar la escritura con la Cruz de Plata y Sal (Final Verdadero)
            </div>
            <div className="text-xs text-stone-300 mt-1">
              Purifica la tierra y libera a General Güemes de la maldición familiar.
            </div>
          </button>
        )}

        <button
          onClick={() => onSelectEnding('pacto_roto')}
          className="w-full text-left p-3.5 bg-white/[0.04] hover:bg-white/10 border border-white/15 rounded cursor-pointer"
        >
          <div className="text-sm font-semibold text-stone-100">
            Destruir el altar a la fuerza
          </div>
          <div className="text-xs text-stone-400 mt-1">
            Rompe el tributo por las armas y sobrevive hasta el alba.
          </div>
        </button>

        <button
          onClick={() => onSelectEnding('sacrificio_monte')}
          className="w-full text-left p-3.5 bg-red-950/30 hover:bg-red-950/50 border border-red-800/40 rounded cursor-pointer"
        >
          <div className="text-sm font-semibold text-red-300">
            Renovar el antiguo pacto del abuelo
          </div>
          <div className="text-xs text-stone-400 mt-1">
            Calma a las bestias de inmediato, pero ata tu alma a las sombras del monte.
          </div>
        </button>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-xs text-stone-400 hover:text-white cursor-pointer"
        >
          Alejarse del altar
        </button>
      </div>
    </div>
  </div>
);

export const EndScreen: React.FC<{
  type: 'victory' | 'defeat';
  title: string;
  description: string;
  onRetry: () => void;
  onMainMenu: () => void;
}> = ({ type, title, description, onRetry, onMainMenu }) => (
  <div className="fixed inset-0 z-50 bg-[#06080b]/95 flex items-center justify-center p-6">
    <div className="w-full max-w-lg bg-[#0d1117] border border-white/15 rounded-lg p-8 text-center space-y-5">
      <div className="flex justify-center">
        {type === 'victory' ? (
          <ShieldCheck className="w-12 h-12 text-amber-400" />
        ) : (
          <Skull className="w-12 h-12 text-red-500" />
        )}
      </div>
      <h2 className="font-display text-3xl font-bold text-stone-100">
        {title}
      </h2>
      <p className="text-sm text-stone-300 leading-relaxed">{description}</p>
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-xs rounded cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Reintentar
        </button>
        <button
          onClick={onMainMenu}
          className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/15 text-stone-200 text-xs rounded cursor-pointer"
        >
          Menú Principal
        </button>
      </div>
    </div>
  </div>
);
