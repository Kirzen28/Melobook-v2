import React, { useState } from 'react';
import { useMidi } from '../context/MidiContext';
import { 
  MidiAction, 
  MidiMessageType, 
  MIDI_ACTION_LABELS 
} from '../types/midi';
import { 
  X, 
  Radio, 
  RefreshCw, 
  Check, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Sliders, 
  SlidersHorizontal,
  Activity, 
  AlertCircle, 
  HelpCircle,
  Footprints,
  Music,
  ArrowRight,
  Zap,
  Info
} from 'lucide-react';

interface MidiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MidiSettingsModal: React.FC<MidiSettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    isSupported,
    isEnabled,
    setIsEnabled,
    devices,
    selectedInputId,
    setSelectedInputId,
    mappings,
    updateMapping,
    addMapping,
    deleteMapping,
    resetMappings,
    applyPreset,
    learningMappingId,
    startLearning,
    stopLearning,
    lastMidiEvent,
    refreshDevices,
    hasConnectedDevices
  } = useMidi();

  const [activeTab, setActiveTab] = useState<'mappings' | 'devices' | 'presets'>('mappings');
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);
  const [newActionSelect, setNewActionSelect] = useState<MidiAction>('next_song');
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isOpen) return null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshDevices();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const navigationMappings = mappings.filter(m => 
    MIDI_ACTION_LABELS[m.action]?.category === 'navigation'
  );

  const autoscrollMappings = mappings.filter(m => 
    MIDI_ACTION_LABELS[m.action]?.category === 'autoscroll'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div 
        className="w-full max-w-2xl bg-[#121214] border border-[#2A2A2E] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-[#E0E0E0] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#18181C] border-b border-[#26262B] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white">
                  Contrôle MIDI & Pédaliers
                </h2>
                {hasConnectedDevices ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {devices.filter(d => d.state === 'connected').length} connecté(s)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#242428] text-gray-400 border border-[#333]">
                    Aucun détecté
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400">
                Pédales Bluetooth, contrôleurs au pied (USB/MIDI) et claviers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#202024] hover:bg-[#2C2C32] text-gray-400 hover:text-white border border-[#333] transition-colors"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Support Warning if Web MIDI not supported */}
        {!isSupported && (
          <div className="p-3 mx-4 mt-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block text-amber-300">Web MIDI non supporté par ce navigateur</strong>
              <span>
                Le contrôle MIDI matériel nécessite Google Chrome, Microsoft Edge, Opera, Brave ou un navigateur compatible sur Android. Sur Safari / iOS, privilégiez un pédalier Bluetooth en mode clavier (touches fléchées / PageUp / PageDown) ou l'application WebMIDI Browser.
              </span>
            </div>
          </div>
        )}

        {/* Master Control & Live Monitor Bar */}
        <div className="p-4 bg-[#141416] border-b border-[#242428] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          
          {/* Active Switch */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsEnabled(!isEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                isEnabled ? 'bg-blue-600' : 'bg-[#2E2E34]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <div>
              <span className="text-xs font-bold text-white block">
                {isEnabled ? 'Réception MIDI active' : 'Réception MIDI en pause'}
              </span>
              <span className="text-[10px] text-gray-400">
                {isEnabled ? 'Écoute les pédales et contrôleurs' : 'Les signaux entrants sont ignorés'}
              </span>
            </div>
          </div>

          {/* Real-time MIDI Activity Monitor */}
          <div className="flex items-center gap-2 bg-[#0E0E10] border border-[#2A2A2E] px-3 py-1.5 rounded-lg font-mono text-xs">
            <Activity className={`w-3.5 h-3.5 ${lastMidiEvent ? 'text-emerald-400 animate-ping' : 'text-gray-500'}`} />
            <div className="flex items-center gap-1.5 min-w-[160px] text-[11px] truncate">
              {lastMidiEvent ? (
                <>
                  <span className="text-gray-400 uppercase">{lastMidiEvent.type}</span>
                  <span className="text-blue-400 font-bold">#{lastMidiEvent.number}</span>
                  <span className="text-gray-500">val:</span>
                  <span className="text-amber-400">{lastMidiEvent.value}</span>
                  <span className="text-gray-500">ch:</span>
                  <span className="text-purple-400">{lastMidiEvent.channel}</span>
                </>
              ) : (
                <span className="text-gray-500 italic">En attente de signal...</span>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1 rounded hover:bg-[#202024] text-gray-400 hover:text-white transition-colors"
              title="Actualiser les périphériques"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>

        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 bg-[#141416] border-b border-[#242428] flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('mappings')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'mappings'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Assignations ({mappings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('devices')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'devices'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Périphériques ({devices.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'presets'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Préréglages rapides</span>
          </button>
        </div>

        {/* Tab 1: Mappings List with MIDI Learn */}
        {activeTab === 'mappings' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            
            {/* MIDI Learn Banner when learning */}
            {learningMappingId && (
              <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 flex items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-2.5">
                  <Footprints className="w-5 h-5 text-amber-400" />
                  <div>
                    <strong className="text-xs font-bold block text-amber-300">
                      Mode Apprentissage actif !
                    </strong>
                    <span className="text-[11px] text-amber-200/90">
                      Appuyez sur la pédale ou la touche souhaitée sur votre contrôleur MIDI...
                    </span>
                  </div>
                </div>
                <button
                  onClick={stopLearning}
                  className="px-3 py-1.5 rounded-lg bg-[#1C1C20] hover:bg-[#28282E] text-white text-xs font-semibold border border-[#3A3A40] transition-colors"
                >
                  Annuler
                </button>
              </div>
            )}

            {/* Category 1: Navigation des Morceaux */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-blue-400" />
                  Navigation des Chants en Mode Live
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  {navigationMappings.length} assignation(s)
                </span>
              </div>

              <div className="space-y-2">
                {navigationMappings.map((mapping) => (
                  <MappingRow
                    key={mapping.id}
                    mapping={mapping}
                    isLearning={learningMappingId === mapping.id}
                    onStartLearn={() => startLearning(mapping.id)}
                    onUpdate={(updates) => updateMapping(mapping.id, updates)}
                    onDelete={() => deleteMapping(mapping.id)}
                  />
                ))}
              </div>
            </div>

            {/* Category 2: Défilement Automatique */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                  Défilement Automatique (Auto-scroll) & Défilement
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  {autoscrollMappings.length} assignation(s)
                </span>
              </div>

              <div className="space-y-2">
                {autoscrollMappings.map((mapping) => (
                  <MappingRow
                    key={mapping.id}
                    mapping={mapping}
                    isLearning={learningMappingId === mapping.id}
                    onStartLearn={() => startLearning(mapping.id)}
                    onUpdate={(updates) => updateMapping(mapping.id, updates)}
                    onDelete={() => deleteMapping(mapping.id)}
                  />
                ))}
              </div>
            </div>

            {/* Add Custom Action Row */}
            <div className="pt-2 border-t border-[#242428] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <select
                  value={newActionSelect}
                  onChange={(e) => setNewActionSelect(e.target.value as MidiAction)}
                  className="bg-[#1A1A1E] border border-[#333] text-gray-200 text-xs rounded-lg px-2.5 py-1.5 focus:border-blue-500 outline-hidden"
                >
                  {Object.entries(MIDI_ACTION_LABELS).map(([actionKey, info]) => (
                    <option key={actionKey} value={actionKey}>
                      {info.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const info = MIDI_ACTION_LABELS[newActionSelect];
                    addMapping({
                      action: newActionSelect,
                      label: info.label,
                      type: 'cc',
                      number: 64,
                      channel: 0,
                      name: `Nouvelle commande (${info.label})`,
                      enabled: true
                    });
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all active:scale-95 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter une commande</span>
                </button>
              </div>

              <button
                type="button"
                onClick={resetMappings}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-white transition-colors"
                title="Rétablir les raccourcis MIDI par défaut"
              >
                <RotateCcw className="w-3 h-3 text-amber-400" />
                <span>Rétablir les valeurs par défaut</span>
              </button>
            </div>

          </div>
        )}

        {/* Tab 2: Devices List */}
        {activeTab === 'devices' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            
            {/* Filter by device */}
            <div className="p-3 bg-[#18181C] border border-[#28282D] rounded-xl flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-white block">
                  Filtrer les messages MIDI entrants
                </span>
                <span className="text-[11px] text-gray-400">
                  Choisissez d'écouter toutes les entrées ou un contrôleur spécifique
                </span>
              </div>

              <select
                value={selectedInputId}
                onChange={(e) => setSelectedInputId(e.target.value)}
                className="bg-[#202024] border border-[#3A3A40] text-gray-200 text-xs rounded-lg px-2.5 py-1.5 focus:border-blue-500 outline-hidden"
              >
                <option value="all">Toutes les entrées MIDI</option>
                {devices.map(device => (
                  <option key={device.id} value={device.id}>
                    {device.name}
                  </option>
                ))}
              </select>
            </div>

            {/* List of Detected Devices */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Périphériques détectés ({devices.length})
                </span>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Rechercher</span>
                </button>
              </div>

              {devices.length === 0 ? (
                <div className="p-8 rounded-xl bg-[#161618] border border-[#26262B] text-center text-gray-400 space-y-2">
                  <Radio className="w-10 h-10 mx-auto text-gray-600 mb-2" />
                  <p className="text-xs font-bold text-gray-300">
                    Aucun périphérique MIDI détecté
                  </p>
                  <p className="text-[11px] text-gray-500 max-w-md mx-auto">
                    Branchez votre pédale au pied USB ou connectez votre pédalier Bluetooth (AirTurn, PageFlip, Boss FS-1-WL, Donner, Behringer, etc.), puis cliquez sur « Rechercher ».
                  </p>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-[#202024] hover:bg-[#2C2C32] text-white text-xs font-semibold border border-[#333] transition-colors"
                  >
                    Actualiser la détection
                  </button>
                </div>
              ) : (
                devices.map(device => (
                  <div
                    key={device.id}
                    className="p-3 bg-[#18181C] border border-[#28282D] rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#222226] border border-[#333] flex items-center justify-center text-blue-400">
                        <Footprints className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {device.name}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          Fabricant : {device.manufacturer || 'Standard'} • ID : {device.id}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        device.state === 'connected'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {device.state === 'connected' ? 'Connecté' : 'Déconnecté'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bluetooth Pedal Advice Card */}
            <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-900/40 text-blue-200 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="font-semibold block text-blue-300">Astuce pour les pédaliers Bluetooth</strong>
                <p className="text-[11px] text-blue-200/90 leading-relaxed">
                  De nombreux pédaliers (AirTurn, Donner, PageFlip, Moukey) possèdent un mode <strong>MIDI</strong> et un mode <strong>Clavier (HID)</strong>. 
                  En mode Clavier, Melobook répond déjà directement aux touches Flèche Droite / Flèche Gauche, PageDown / PageUp et Espace. 
                  En mode MIDI, vous pouvez personnaliser chaque switch avec le bouton « Apprendre » !
                </p>
              </div>
            </div>

          </div>
        )}

        {/* Tab 3: Presets */}
        {activeTab === 'presets' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                Configurations Rapides en 1 Clic
              </h3>
              <p className="text-[11px] text-gray-400">
                Chargez une configuration prédéfinie adaptée à votre matériel
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* Preset 1: Standard Footswitch */}
              <div className="p-4 rounded-xl bg-[#18181C] border border-[#28282D] hover:border-blue-500/40 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Footprints className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-white">Pédalier Standard (CC 64, 66, 67)</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30">Recommandé</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Pédale Droite = Chant suivant (CC 64), Pédale Gauche = Chant précédent (CC 66), Pédale Centrale = Play/Pause auto-scroll (CC 67).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    applyPreset('standard_pedal');
                    setActiveTab('mappings');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all active:scale-95 shrink-0"
                >
                  Appliquer ce preset
                </button>
              </div>

              {/* Preset 2: Keyboard Notes */}
              <div className="p-4 rounded-xl bg-[#18181C] border border-[#28282D] hover:border-blue-500/40 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Clavier Maître / Synthétiseur (Notes)</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Do 4 (Note 60) = Auto-scroll, Ré 4 (Note 62) = Suivant, Si 3 (Note 59) = Précédent, Mi 4 (Note 64) = +Vitesse.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    applyPreset('keyboard');
                    setActiveTab('mappings');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#24242A] hover:bg-[#303038] text-gray-200 hover:text-white text-xs font-semibold border border-[#3A3A40] transition-all active:scale-95 shrink-0"
                >
                  Appliquer ce preset
                </button>
              </div>

              {/* Preset 3: Program Change */}
              <div className="p-4 rounded-xl bg-[#18181C] border border-[#28282D] hover:border-blue-500/40 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-white">Pédaliers Program Change (PC 1, 2, 3)</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Patch 1 = Chant suivant, Patch 2 = Chant précédent, Patch 3 = Défilement auto. Idéal pour Line6, Behringer FCB1010.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    applyPreset('program_change');
                    setActiveTab('mappings');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#24242A] hover:bg-[#303038] text-gray-200 hover:text-white text-xs font-semibold border border-[#3A3A40] transition-all active:scale-95 shrink-0"
                >
                  Appliquer ce preset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#18181C] border-t border-[#26262B] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Paramètres sauvegardés automatiquement</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all active:scale-95 shadow-sm"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};

// Row component for an action mapping
interface MappingRowProps {
  mapping: any;
  isLearning: boolean;
  onStartLearn: () => void;
  onUpdate: (updates: any) => void;
  onDelete: () => void;
}

const MappingRow: React.FC<MappingRowProps> = ({
  mapping,
  isLearning,
  onStartLearn,
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const typeDisplay = mapping.type === 'cc' 
    ? 'Control Change (CC)' 
    : mapping.type === 'note' 
      ? 'Note MIDI' 
      : 'Program Change (PC)';

  const channelDisplay = mapping.channel === 0 ? 'Tous les canaux' : `Canal ${mapping.channel}`;

  return (
    <div className={`p-3 rounded-xl border transition-all ${
      isLearning 
        ? 'bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/30' 
        : mapping.enabled 
          ? 'bg-[#18181C] border-[#28282D] hover:border-[#383840]' 
          : 'bg-[#141416] border-[#222226] opacity-60'
    }`}>
      <div className="flex items-center justify-between gap-3">
        
        {/* Left: Action description & status */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={mapping.enabled}
              onChange={(e) => onUpdate({ enabled: e.target.checked })}
              className="accent-blue-500 rounded cursor-pointer w-3.5 h-3.5"
              title="Activer ou désactiver cette commande"
            />
            <span className="text-xs font-bold text-white truncate">
              {mapping.label}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1 ml-5 text-[11px] text-gray-400">
            <span className="px-1.5 py-0.2 rounded font-mono font-bold bg-[#222226] text-blue-300 border border-[#333]">
              {mapping.type.toUpperCase()} #{mapping.number}
            </span>
            <span className="text-gray-500">•</span>
            <span className="truncate">{channelDisplay}</span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-300 truncate">{mapping.name}</span>
          </div>
        </div>

        {/* Right: Actions (Learn button, edit, delete) */}
        <div className="flex items-center gap-1.5 shrink-0">
          
          {/* MIDI Learn Button */}
          <button
            type="button"
            onClick={onStartLearn}
            disabled={isLearning}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
              isLearning
                ? 'bg-amber-500 text-black animate-pulse shadow-sm'
                : 'bg-[#222226] hover:bg-blue-600/20 text-gray-300 hover:text-blue-300 border border-[#333] hover:border-blue-500/30'
            }`}
            title="Apprendre automatiquement le signal en appuyant sur votre pédale"
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>{isLearning ? 'Écoute...' : 'Apprendre'}</span>
          </button>

          {/* Quick Manual Edit Toggle */}
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="p-1.5 rounded-lg bg-[#222226] hover:bg-[#2C2C32] text-gray-400 hover:text-white border border-[#333] transition-colors"
            title="Modifier manuellement le numéro de signal"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg bg-[#222226] hover:bg-rose-950/40 text-gray-400 hover:text-rose-400 border border-[#333] transition-colors"
            title="Supprimer cette assignation"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

        </div>

      </div>

      {/* Manual Configuration Dropdown */}
      {isEditing && (
        <div className="mt-3 pt-3 border-t border-[#28282D] grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Type de message</label>
            <select
              value={mapping.type}
              onChange={(e) => onUpdate({ type: e.target.value as MidiMessageType })}
              className="w-full bg-[#141416] border border-[#333] rounded px-2 py-1 text-gray-200 outline-hidden"
            >
              <option value="cc">Control Change (CC)</option>
              <option value="note">Note MIDI</option>
              <option value="pc">Program Change (PC)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Numéro (0 - 127)</label>
            <input
              type="number"
              min={0}
              max={127}
              value={mapping.number}
              onChange={(e) => onUpdate({ number: parseInt(e.target.value, 10) || 0 })}
              className="w-full bg-[#141416] border border-[#333] rounded px-2 py-1 text-gray-200 font-mono outline-hidden"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Canal MIDI</label>
            <select
              value={mapping.channel}
              onChange={(e) => onUpdate({ channel: parseInt(e.target.value, 10) || 0 })}
              className="w-full bg-[#141416] border border-[#333] rounded px-2 py-1 text-gray-200 outline-hidden"
            >
              <option value={0}>Tous (Omni)</option>
              {Array.from({ length: 16 }, (_, i) => i + 1).map(ch => (
                <option key={ch} value={ch}>Canal {ch}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Nom / Pédale</label>
            <input
              type="text"
              value={mapping.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="w-full bg-[#141416] border border-[#333] rounded px-2 py-1 text-gray-200 outline-hidden"
              placeholder="ex: Switch 1"
            />
          </div>
        </div>
      )}

    </div>
  );
};
