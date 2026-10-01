import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ArrowLeft, 
  RotateCcw, 
  Check, 
  Sliders, 
  Type, 
  Palette, 
  Eye, 
  EyeOff, 
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Music,
  Sun,
  Moon,
  Monitor,
  Maximize2,
  Minimize2,
  X,
  Radio,
  Zap,
  RefreshCw,
  LayoutGrid,
  Gauge,
  Clock,
  Tag,
  Heading1,
  Bookmark,
  MoveVertical,
  Layers,
  Database,
  HardDrive,
  FolderDown,
  Download,
  Trash2,
  MousePointerClick
} from 'lucide-react';
import { useMidi } from '../context/MidiContext';
import { MidiSettingsModal } from './MidiSettingsModal';
import { 
  COLOR_PRESETS, 
  SECTION_TYPES_LIST, 
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_SECTION_BORDERS,
  DEFAULT_CHORD_COLOR,
  getSectionBorderStyles,
  getSectionColor 
} from '../utils/displayDefaults';
import { SectionColors, SongTypographySettings, SectionBorders } from '../types';
import { transposeChord } from '../utils/chordUtils';
import { DuplicateCleanerSection } from './DuplicateCleanerSection';

export type PointNClickTargetType = 
  | 'title' 
  | 'metadata' 
  | 'chord' 
  | 'lyrics' 
  | 'sectionHeader' 
  | 'sectionCard';

export interface PointNClickSelection {
  type: PointNClickTargetType;
  label: string;
  sectionType?: keyof SectionColors;
}

interface PointNClickInspectorProps {
  selection: PointNClickSelection;
  typography: SongTypographySettings;
  chordColor: string;
  sectionColors: SectionColors;
  sectionBorders: SectionBorders;
  updateTypography: (key: keyof SongTypographySettings, value: number) => void;
  updateChordColor: (color: string) => void;
  updateSectionColor: (key: keyof SectionColors, color: string) => void;
  applyBorderPreset: (borders: SectionBorders) => void;
  onClose: () => void;
}

const PointNClickInspector: React.FC<PointNClickInspectorProps> = ({
  selection,
  typography,
  chordColor,
  sectionColors,
  sectionBorders,
  updateTypography,
  updateChordColor,
  updateSectionColor,
  applyBorderPreset,
  onClose
}) => {
  const currentSectionColor = selection.sectionType ? sectionColors[selection.sectionType] : '#3B82F6';

  return (
    <div className="sticky top-0 z-30 mb-3 p-3 sm:p-4 rounded-xl bg-[#16161B]/95 backdrop-blur-md border border-blue-500/50 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
      {/* Top title bar */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#2A2A34]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            {selection.type === 'title' && <Heading1 className="w-3.5 h-3.5" />}
            {selection.type === 'metadata' && <Tag className="w-3.5 h-3.5" />}
            {selection.type === 'chord' && <Music className="w-3.5 h-3.5 text-amber-400" />}
            {selection.type === 'lyrics' && <Type className="w-3.5 h-3.5 text-cyan-400" />}
            {selection.type === 'sectionHeader' && <Bookmark className="w-3.5 h-3.5 text-emerald-400" />}
            {selection.type === 'sectionCard' && <Layers className="w-3.5 h-3.5 text-purple-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">
                {selection.label}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Point-n-Click
              </span>
            </div>
            <p className="text-[10px] text-gray-400">
              Modifiez la taille ou la couleur directement
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg bg-[#222228] hover:bg-[#2E2E38] text-gray-400 hover:text-white transition-colors cursor-pointer"
          title="Fermer l'inspecteur"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Control fields depending on target */}
      {/* 1. TITLE */}
      {selection.type === 'title' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300 font-medium">Taille du titre :</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateTypography('titleSize', Math.max(16, typography.titleSize - 1))}
                className="w-7 h-7 rounded-lg bg-[#222228] hover:bg-blue-600 text-white font-bold flex items-center justify-center transition-colors active:scale-95 cursor-pointer text-sm"
                title="Diminuer"
              >
                -
              </button>
              <span className="font-mono font-bold text-white text-xs px-2 py-0.5 rounded bg-[#101014] border border-[#2B2B32] min-w-[54px] text-center">
                {typography.titleSize} px
              </span>
              <button
                type="button"
                onClick={() => updateTypography('titleSize', Math.min(48, typography.titleSize + 1))}
                className="w-7 h-7 rounded-lg bg-[#222228] hover:bg-blue-600 text-white font-bold flex items-center justify-center transition-colors active:scale-95 cursor-pointer text-sm"
                title="Augmenter"
              >
                +
              </button>
            </div>
          </div>
          <input
            type="range"
            min={16}
            max={48}
            step={1}
            value={typography.titleSize}
            onChange={(e) => updateTypography('titleSize', Number(e.target.value))}
            className="w-full h-1.5 bg-[#25252C] rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      )}

      {/* 2. METADATA */}
      {selection.type === 'metadata' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300 font-medium">Taille des métadonnées (artiste, tempo, tonalité) :</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateTypography('metadataSize', Math.max(10, typography.metadataSize - 1))}
                className="w-7 h-7 rounded-lg bg-[#222228] hover:bg-blue-600 text-white font-bold flex items-center justify-center transition-colors active:scale-95 cursor-pointer text-sm"
                title="Diminuer"
              >
                -
              </button>
              <span className="font-mono font-bold text-white text-xs px-2 py-0.5 rounded bg-[#101014] border border-[#2B2B32] min-w-[54px] text-center">
                {typography.metadataSize} px
              </span>
              <button
                type="button"
                onClick={() => updateTypography('metadataSize', Math.min(22, typography.metadataSize + 1))}
                className="w-7 h-7 rounded-lg bg-[#222228] hover:bg-blue-600 text-white font-bold flex items-center justify-center transition-colors active:scale-95 cursor-pointer text-sm"
                title="Augmenter"
              >
                +
              </button>
            </div>
          </div>
          <input
            type="range"
            min={10}
            max={22}
            step={1}
            value={typography.metadataSize}
            onChange={(e) => updateTypography('metadataSize', Number(e.target.value))}
            className="w-full h-1.5 bg-[#25252C] rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      )}

      {/* 3. CHORDS */}
      {selection.type === 'chord' && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300 font-medium">Taille des accords :</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateTypography('chordSize', Math.max(11, typography.chordSize - 1))}
                  className="w-7 h-7 rounded-lg bg-[#222228] hover:bg-blue-600 text-white font-bold flex items-center justify-center transition-colors active:scale-95 cursor-pointer text-sm"
                  title="Diminuer"
                >
                  -
                </button>
                <span className="font-mono font-bold text-amber-300 text-xs px-2 py-0.5 rounded bg-[#101014] border border-[#2B2B32] min-w-[54px] text-center">
                  {typography.chordSize} px
                </span>
                <button
                  type="button"
                  onClick={() => updateTypography('chordSize', Math.min(36, typography.chordSize + 1))}
                  className="w-7 h-7 rounded-lg bg-[#222228] hover:bg-blue-600 text-white font-bold flex items-center justify-center transition-colors active:scale-95 cursor-pointer text-sm"
                  title="Augmenter"
                >
                  +
                </button>
              </div>
            </div>
            <input
              type="range"
              min={11}
              max={36}
              step={1}
              value={typography.chordSize}
              onChange={(e) => updateTypography('chordSize', Number(e.target.value))}
              className="w-full h-1.5 bg-[#25252C] rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-[#25252E]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300 font-medium flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                Couleur des accords
              </span>
              <span className="text-[11px] font-mono font-bold" style={{ color: chordColor }}>
                {chordColor.toUpperCase()}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {COLOR_PRESETS.map((p) => {
                const isAct = chordColor.toLowerCase() === p.value.toLowerCase();
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => updateChordColor(p.value)}
                    className={`w-6 h-6 rounded-full transition-transform active:scale-90 flex items-center justify-center cursor-pointer ${
                      isAct ? 'ring-2 ring-white scale-110 shadow-sm' : 'hover:scale-110 opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: p.value }}
                    title={p.name}
                  >
                    {isAct && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                  </button>
                );
              })}
              <label 
                className="relative cursor-pointer w-6 h-6 rounded-full border border-gray-400/50 flex items-center justify-center bg-gradient-to-tr from-pink-500 via-amber-400 to-blue-500 overflow-hidden shadow-xs hover:scale-110 transition-transform" 
                title="Couleur personnalisée"
              >
                <input
                  type="color"
                  value={chordColor}
                  onChange={(e) => updateChordColor(e.target.value)}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 4. LYRICS */}
      {selection.type === 'lyrics' && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300 font-medium">Taille des paroles :</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateTypography('lyricsSize', Math.max(12, typography.lyricsSize - 1))}
                  className="w-7 h-7 rounded-lg bg-[#222228] hover:bg-blue-600 text-white font-bold flex items-center justify-center transition-colors active:scale-95 cursor-pointer text-sm"
                  title="Diminuer"
                >
                  -
                </button>
                <span className="font-mono font-bold text-cyan-300 text-xs px-2 py-0.5 rounded bg-[#101014] border border-[#2B2B32] min-w-[54px] text-center">
                  {typography.lyricsSize} px
                </span>
                <button
                  type="button"
                  onClick={() => updateTypography('lyricsSize', Math.min(38, typography.lyricsSize + 1))}
                  className="w-7 h-7 rounded-lg bg-[#222228] hover:bg-blue-600 text-white font-bold flex items-center justify-center transition-colors active:scale-95 cursor-pointer text-sm"
                  title="Augmenter"
                >
                  +
                </button>
              </div>
            </div>
            <input
              type="range"
              min={12}
              max={38}
              step={1}
              value={typography.lyricsSize}
              onChange={(e) => updateTypography('lyricsSize', Number(e.target.value))}
              className="w-full h-1.5 bg-[#25252C] rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[#25252E]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300 font-medium flex items-center gap-1.5">
                <MoveVertical className="w-3.5 h-3.5 text-blue-400" />
                Interligne (hauteur de ligne) :
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateTypography('lineSpacing', Math.max(1.1, Number((typography.lineSpacing - 0.1).toFixed(1))))}
                  className="w-7 h-7 rounded-lg bg-[#222228] hover:bg-blue-600 text-white font-bold flex items-center justify-center transition-colors active:scale-95 cursor-pointer text-sm"
                  title="Diminuer"
                >
                  -
                </button>
                <span className="font-mono font-bold text-white text-xs px-2 py-0.5 rounded bg-[#101014] border border-[#2B2B32] min-w-[54px] text-center">
                  {typography.lineSpacing.toFixed(1)}x
                </span>
                <button
                  type="button"
                  onClick={() => updateTypography('lineSpacing', Math.min(2.2, Number((typography.lineSpacing + 0.1).toFixed(1))))}
                  className="w-7 h-7 rounded-lg bg-[#222228] hover:bg-blue-600 text-white font-bold flex items-center justify-center transition-colors active:scale-95 cursor-pointer text-sm"
                  title="Augmenter"
                >
                  +
                </button>
              </div>
            </div>
            <input
              type="range"
              min={1.1}
              max={2.2}
              step={0.1}
              value={typography.lineSpacing}
              onChange={(e) => updateTypography('lineSpacing', Number(e.target.value))}
              className="w-full h-1.5 bg-[#25252C] rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>
      )}

      {/* 5. SECTION HEADER BADGE */}
      {selection.type === 'sectionHeader' && selection.sectionType && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300 font-medium">Taille du badge :</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateTypography('headerSize', Math.max(10, typography.headerSize - 1))}
                  className="w-7 h-7 rounded-lg bg-[#222228] hover:bg-blue-600 text-white font-bold flex items-center justify-center transition-colors active:scale-95 cursor-pointer text-sm"
                  title="Diminuer"
                >
                  -
                </button>
                <span className="font-mono font-bold text-emerald-300 text-xs px-2 py-0.5 rounded bg-[#101014] border border-[#2B2B32] min-w-[54px] text-center">
                  {typography.headerSize} px
                </span>
                <button
                  type="button"
                  onClick={() => updateTypography('headerSize', Math.min(24, typography.headerSize + 1))}
                  className="w-7 h-7 rounded-lg bg-[#222228] hover:bg-blue-600 text-white font-bold flex items-center justify-center transition-colors active:scale-95 cursor-pointer text-sm"
                  title="Augmenter"
                >
                  +
                </button>
              </div>
            </div>
            <input
              type="range"
              min={10}
              max={24}
              step={1}
              value={typography.headerSize}
              onChange={(e) => updateTypography('headerSize', Number(e.target.value))}
              className="w-full h-1.5 bg-[#25252C] rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-[#25252E]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300 font-medium flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" style={{ color: currentSectionColor }} />
                Couleur de la section ({selection.label})
              </span>
              <span className="text-[11px] font-mono font-bold" style={{ color: currentSectionColor }}>
                {currentSectionColor.toUpperCase()}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {COLOR_PRESETS.map((p) => {
                const isAct = currentSectionColor.toLowerCase() === p.value.toLowerCase();
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => updateSectionColor(selection.sectionType!, p.value)}
                    className={`w-6 h-6 rounded-full transition-transform active:scale-90 flex items-center justify-center cursor-pointer ${
                      isAct ? 'ring-2 ring-white scale-110 shadow-sm' : 'hover:scale-110 opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: p.value }}
                    title={p.name}
                  >
                    {isAct && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                  </button>
                );
              })}
              <label 
                className="relative cursor-pointer w-6 h-6 rounded-full border border-gray-400/50 flex items-center justify-center bg-gradient-to-tr from-pink-500 via-amber-400 to-blue-500 overflow-hidden shadow-xs hover:scale-110 transition-transform" 
                title="Couleur personnalisée"
              >
                <input
                  type="color"
                  value={currentSectionColor}
                  onChange={(e) => updateSectionColor(selection.sectionType!, e.target.value)}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 6. SECTION CARD / SPACING */}
      {selection.type === 'sectionCard' && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300 font-medium">Espacement entre sections :</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateTypography('sectionSpacing', Math.max(0, (typography.sectionSpacing ?? 4) - 2))}
                  className="w-7 h-7 rounded-lg bg-[#222228] hover:bg-blue-600 text-white font-bold flex items-center justify-center transition-colors active:scale-95 cursor-pointer text-sm"
                  title="Diminuer"
                >
                  -
                </button>
                <span className="font-mono font-bold text-purple-300 text-xs px-2 py-0.5 rounded bg-[#101014] border border-[#2B2B32] min-w-[54px] text-center">
                  {(typography.sectionSpacing ?? 4)} px
                </span>
                <button
                  type="button"
                  onClick={() => updateTypography('sectionSpacing', Math.min(32, (typography.sectionSpacing ?? 4) + 2))}
                  className="w-7 h-7 rounded-lg bg-[#222228] hover:bg-blue-600 text-white font-bold flex items-center justify-center transition-colors active:scale-95 cursor-pointer text-sm"
                  title="Augmenter"
                >
                  +
                </button>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={32}
              step={2}
              value={typography.sectionSpacing ?? 4}
              onChange={(e) => updateTypography('sectionSpacing', Number(e.target.value))}
              className="w-full h-1.5 bg-[#25252C] rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[#25252E]">
            <span className="text-xs text-gray-300 font-medium">Style de bordure des sections :</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { label: 'Bordure Gauche', borders: { left: true, right: false, top: false, bottom: false } },
                { label: 'Encadré', borders: { left: true, right: true, top: true, bottom: true } },
                { label: 'Gauche + Droite', borders: { left: true, right: true, top: false, bottom: false } },
                { label: 'Aucune', borders: { left: false, right: false, top: false, bottom: false } },
              ].map((b) => (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => applyBorderPreset(b.borders)}
                  className="py-1 px-2 rounded-lg bg-[#202026] hover:bg-[#2A2A34] text-[11px] font-medium text-gray-300 hover:text-white transition-colors cursor-pointer border border-[#333]"
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const SettingsView: React.FC = () => {
  const { 
    displaySettings, 
    updateDisplaySettings, 
    resetDisplaySettings,
    setActiveTab,
    selectedSong,
    stageSettings,
    updateStageSettings,
    songCardMetadata,
    updateSongCardMetadata,
    currentUser,
    songs,
    setlists,
    isOffline,
    offlineStats,
    refreshOfflineStats,
    cacheAllSongsOffline,
    clearOfflineStorage,
    isInstallable,
    promptInstall
  } = useApp();

  const { 
    typography, 
    sectionColors, 
    sectionBorders = DEFAULT_SECTION_BORDERS,
    chordColor = DEFAULT_CHORD_COLOR
  } = displaySettings;
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const [isMobilePreviewCollapsed, setIsMobilePreviewCollapsed] = useState(false);
  const [isMobilePreviewFullscreen, setIsMobilePreviewFullscreen] = useState(false);
  const [selectedPreviewElement, setSelectedPreviewElement] = useState<PointNClickSelection | null>(null);

  // État des catégories pliables / dépliables sur tous les appareils (plié par défaut)
  type SettingsCategory = 
    | 'display'
    | 'song_cards'
    | 'midi'
    | 'duplicates'
    | 'offline';

  const [openCategories, setOpenCategories] = useState<Record<SettingsCategory, boolean>>({
    display: false,      // Plié par défaut sur tous les appareils
    song_cards: false,
    midi: false,
    duplicates: false,
    offline: false,
  });

  const toggleCategory = (cat: SettingsCategory) => {
    setOpenCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  const allCollapsed = Object.values(openCategories).every(v => !v);
  const toggleAllCategories = () => {
    const nextState = allCollapsed;
    setOpenCategories({
      display: nextState,
      song_cards: nextState,
      midi: nextState,
      duplicates: nextState,
      offline: nextState,
    });
  };

  const {
    isSupported: isMidiSupported,
    isEnabled: isMidiEnabled,
    setIsEnabled: setIsMidiEnabled,
    devices: midiDevices,
    hasConnectedDevices,
    mappings: midiMappings,
    applyPreset: applyMidiPreset,
    lastMidiEvent,
    refreshDevices: refreshMidiDevices,
    isMidiModalOpen,
    setIsMidiModalOpen
  } = useMidi();

  // Close fullscreen preview with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobilePreviewFullscreen) {
        setIsMobilePreviewFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobilePreviewFullscreen]);

  // Lock body scroll while fullscreen preview is open
  useEffect(() => {
    if (isMobilePreviewFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobilePreviewFullscreen]);

  const notify = (msg: string) => {
    setShowNotification(msg);
    setTimeout(() => setShowNotification(null), 2500);
  };

  const handleReset = () => {
    if (window.confirm('Voulez-vous réinitialiser toutes les polices et couleurs aux valeurs d\'origine ?')) {
      resetDisplaySettings();
      notify('Paramètres réinitialisés avec succès');
    }
  };

  const updateTypography = (key: keyof SongTypographySettings, value: number) => {
    updateDisplaySettings({
      typography: { [key]: value }
    });
  };

  const updateSectionColor = (key: keyof SectionColors, color: string) => {
    updateDisplaySettings({
      sectionColors: { [key]: color }
    });
  };

  const updateChordColor = (color: string) => {
    updateDisplaySettings({
      chordColor: color
    });
  };

  const applyBorderPreset = (borders: SectionBorders) => {
    updateDisplaySettings({
      sectionBorders: borders
    });
  };

  const isSystemLight = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  const effectivePreviewTheme = stageSettings.theme === 'system'
    ? (isSystemLight ? 'light' : 'dark')
    : (stageSettings.theme || 'dark');

  const renderSongPreviewBody = (isFullscreen = false) => {
    const currentSpacing = typography.sectionSpacing !== undefined ? typography.sectionSpacing : 4;
    const isPreviewCompact = currentSpacing <= 6;
    const isPreviewUltraCompact = currentSpacing <= 2;
    const previewPadding = isPreviewUltraCompact 
      ? 'py-1.5 px-2.5 sm:py-2 sm:px-3'
      : isPreviewCompact
      ? 'py-2 px-3 sm:py-2.5 sm:px-3.5'
      : 'p-3';
    const previewHeaderMb = isPreviewUltraCompact ? 'mb-1' : isPreviewCompact ? 'mb-1.5' : 'mb-2';

    return (
      <div className={`space-y-4 ${isFullscreen ? 'max-w-3xl mx-auto' : ''}`}>
        {/* Sticky Point-n-Click Inspector if an item is selected */}
        {selectedPreviewElement ? (
          <PointNClickInspector
            selection={selectedPreviewElement}
            typography={typography}
            chordColor={chordColor}
            sectionColors={sectionColors}
            sectionBorders={sectionBorders}
            updateTypography={updateTypography}
            updateChordColor={updateChordColor}
            updateSectionColor={updateSectionColor}
            applyBorderPreset={applyBorderPreset}
            onClose={() => setSelectedPreviewElement(null)}
          />
        ) : (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-blue-950/30 border border-blue-500/30 text-xs text-blue-200 select-none shadow-sm">
            <div className="flex items-center gap-2">
              <MousePointerClick className="w-4 h-4 text-blue-400 animate-pulse shrink-0" />
              <span className="text-[11px] font-medium leading-tight">
                <strong>Mode Point-n-Click :</strong> Cliquez directement sur le titre, les accords, les paroles ou les badges pour ajuster leur taille ou couleur.
              </span>
            </div>
          </div>
        )}

        {/* Song Header Preview (Pure Live Display) */}
        <div className="border-b border-[#222224] pb-2.5 flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPreviewElement({ type: 'title', label: 'Titre du chant' });
                }}
                className={`font-bold tracking-tight leading-tight break-words cursor-pointer transition-all rounded px-1.5 py-0.5 -mx-1.5 ${
                  selectedPreviewElement?.type === 'title'
                    ? 'ring-2 ring-blue-500 bg-blue-500/20 text-white'
                    : 'hover:ring-1 hover:ring-blue-400/50 hover:bg-blue-500/5'
                } ${
                  effectivePreviewTheme === 'light' ? 'text-[#18181B]' : 'text-white'
                }`}
                style={{ fontSize: `${typography.titleSize}px` }}
                title="Cliquer pour modifier la taille du titre"
              >
                {selectedSong ? selectedSong.title : 'Grâce Infinie'}
              </h3>
            </div>

            <div 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPreviewElement({ type: 'metadata', label: 'Artiste & Métadonnées' });
              }}
              className={`flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto px-2.5 py-1 rounded-lg font-mono shadow-sm cursor-pointer transition-all ${
                selectedPreviewElement?.type === 'metadata'
                  ? 'ring-2 ring-blue-500 bg-blue-500/20'
                  : 'hover:ring-1 hover:ring-blue-400/50 hover:bg-blue-500/5'
              } ${
                effectivePreviewTheme === 'light'
                  ? 'bg-gray-100 border border-gray-300 text-gray-700'
                  : 'bg-[#141416] border border-[#242428] text-gray-300'
              }`}
              style={{ fontSize: `${typography.metadataSize}px` }}
              title="Cliquer pour modifier la taille des métadonnées"
            >
              <div className="flex items-center gap-1">
                <span className="text-gray-400">Tonalité :</span>
                <strong className="text-blue-500">G</strong>
              </div>
              <span className="text-gray-400">•</span>
              <strong>72 BPM</strong>
            </div>
          </div>

          <div 
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPreviewElement({ type: 'metadata', label: 'Artiste & Métadonnées' });
            }}
            className={`font-medium break-words cursor-pointer transition-all rounded px-1.5 py-0.5 -mx-1.5 ${
              selectedPreviewElement?.type === 'metadata'
                ? 'ring-2 ring-blue-500 bg-blue-500/20 text-blue-200'
                : 'hover:ring-1 hover:ring-blue-400/50 hover:bg-blue-500/5'
            } ${
              effectivePreviewTheme === 'light' ? 'text-gray-600' : 'text-gray-300'
            }`}
            style={{ fontSize: `${typography.metadataSize}px` }}
            title="Cliquer pour modifier la taille des métadonnées"
          >
            {selectedSong?.artist || 'John Newton'}
          </div>
        </div>

        {/* Sections Container (1 to 5 columns preview) */}
        <div 
          className={
            stageSettings.columns === 2
              ? 'grid grid-cols-1 sm:grid-cols-2 items-start'
              : stageSettings.columns === 3
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-start'
              : stageSettings.columns === 4
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-start'
              : stageSettings.columns === 5
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 items-start'
              : 'flex flex-col'
          }
          style={{
            gap: `${currentSpacing}px`,
            rowGap: `${currentSpacing}px`,
          }}
        >
          {/* Section 1: Couplet */}
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedPreviewElement({
                  type: 'sectionCard',
                  sectionType: 'verse',
                  label: 'Cadre & Espacement : Couplet'
                });
              }
            }}
            className={`rounded-lg ${previewPadding} transition-all cursor-pointer ${
              selectedPreviewElement?.type === 'sectionCard' && selectedPreviewElement.sectionType === 'verse'
                ? 'ring-2 ring-blue-500 bg-blue-500/5'
                : ''
            }`}
            style={getSectionBorderStyles(sectionColors.verse, sectionBorders)}
            title="Cliquer pour modifier l'espacement et les bordures de cette section"
          >
            <div className={`${previewHeaderMb} flex items-center justify-between gap-2 flex-wrap`}>
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPreviewElement({
                    type: 'sectionHeader',
                    sectionType: 'verse',
                    label: 'Badge : Couplet'
                  });
                }}
                className={`inline-block font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border shadow-xs select-none cursor-pointer transition-all ${
                  selectedPreviewElement?.type === 'sectionHeader' && selectedPreviewElement.sectionType === 'verse'
                    ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0E0E10]'
                    : 'hover:scale-105 hover:ring-1 hover:ring-blue-400/60'
                }`}
                style={{
                  fontSize: `${typography.headerSize}px`,
                  color: sectionColors.verse,
                  borderColor: `${sectionColors.verse}50`,
                  backgroundColor: `${sectionColors.verse}1C`
                }}
                title="Cliquer pour modifier la taille et la couleur du badge Couplet"
              >
                Couplet 1
              </span>
            </div>

            <div className="space-y-1 font-mono">
              <div className="inline-flex flex-col mr-2">
                {stageSettings.showChords && (
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPreviewElement({ type: 'chord', label: 'Accords' });
                    }}
                    className={`font-mono font-bold leading-none mb-1 cursor-pointer transition-all rounded px-1 -mx-1 select-none ${
                      selectedPreviewElement?.type === 'chord'
                        ? 'ring-2 ring-blue-500 bg-blue-500/20'
                        : 'hover:ring-1 hover:ring-blue-400/60 hover:bg-blue-500/10'
                    }`}
                    style={{ fontSize: `${typography.chordSize}px`, color: chordColor }}
                    title="Cliquer pour modifier la taille et la couleur des accords"
                  >
                    {transposeChord('G', 0, stageSettings.notation)}
                  </span>
                )}
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPreviewElement({ type: 'lyrics', label: 'Paroles' });
                  }}
                  className={`font-sans cursor-pointer transition-all rounded px-1 -mx-1 ${
                    selectedPreviewElement?.type === 'lyrics'
                      ? 'ring-2 ring-blue-500 bg-blue-500/15'
                      : 'hover:ring-1 hover:ring-blue-400/50 hover:bg-blue-500/5'
                  } ${effectivePreviewTheme === 'light' ? 'text-[#18181B]' : 'text-[#E0E0E0]'}`}
                  style={{ fontSize: `${typography.lyricsSize}px` }}
                  title="Cliquer pour modifier la taille et l'interligne des paroles"
                >
                  Grâce infinie, au son si doux
                </span>
              </div>

              <div className="inline-flex flex-col">
                {stageSettings.showChords && (
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPreviewElement({ type: 'chord', label: 'Accords' });
                    }}
                    className={`font-mono font-bold leading-none mb-1 cursor-pointer transition-all rounded px-1 -mx-1 select-none ${
                      selectedPreviewElement?.type === 'chord'
                        ? 'ring-2 ring-blue-500 bg-blue-500/20'
                        : 'hover:ring-1 hover:ring-blue-400/60 hover:bg-blue-500/10'
                    }`}
                    style={{ fontSize: `${typography.chordSize}px`, color: chordColor }}
                    title="Cliquer pour modifier la taille et la couleur des accords"
                  >
                    {transposeChord('C', 0, stageSettings.notation)}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{transposeChord('G', 0, stageSettings.notation)}
                  </span>
                )}
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPreviewElement({ type: 'lyrics', label: 'Paroles' });
                  }}
                  className={`font-sans cursor-pointer transition-all rounded px-1 -mx-1 ${
                    selectedPreviewElement?.type === 'lyrics'
                      ? 'ring-2 ring-blue-500 bg-blue-500/15'
                      : 'hover:ring-1 hover:ring-blue-400/50 hover:bg-blue-500/5'
                  } ${effectivePreviewTheme === 'light' ? 'text-[#18181B]' : 'text-[#E0E0E0]'}`}
                  style={{ fontSize: `${typography.lyricsSize}px` }}
                  title="Cliquer pour modifier la taille et l'interligne des paroles"
                >
                  qui sauva un rebelle comme moi !
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Refrain */}
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedPreviewElement({
                  type: 'sectionCard',
                  sectionType: 'chorus',
                  label: 'Cadre & Espacement : Refrain'
                });
              }
            }}
            className={`rounded-lg ${previewPadding} transition-all cursor-pointer ${
              selectedPreviewElement?.type === 'sectionCard' && selectedPreviewElement.sectionType === 'chorus'
                ? 'ring-2 ring-blue-500 bg-blue-500/5'
                : ''
            }`}
            style={getSectionBorderStyles(sectionColors.chorus, sectionBorders)}
            title="Cliquer pour modifier l'espacement et les bordures de cette section"
          >
            <div className={`${previewHeaderMb} flex items-center justify-between gap-2 flex-wrap`}>
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPreviewElement({
                    type: 'sectionHeader',
                    sectionType: 'chorus',
                    label: 'Badge : Refrain'
                  });
                }}
                className={`inline-block font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border shadow-xs select-none cursor-pointer transition-all ${
                  selectedPreviewElement?.type === 'sectionHeader' && selectedPreviewElement.sectionType === 'chorus'
                    ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0E0E10]'
                    : 'hover:scale-105 hover:ring-1 hover:ring-blue-400/60'
                }`}
                style={{
                  fontSize: `${typography.headerSize}px`,
                  color: sectionColors.chorus,
                  borderColor: `${sectionColors.chorus}50`,
                  backgroundColor: `${sectionColors.chorus}1C`
                }}
                title="Cliquer pour modifier la taille et la couleur du badge Refrain"
              >
                Refrain
              </span>
            </div>

            <div className="space-y-1 font-mono">
              <div className="inline-flex flex-col mr-2">
                {stageSettings.showChords && (
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPreviewElement({ type: 'chord', label: 'Accords' });
                    }}
                    className={`font-mono font-bold leading-none mb-1 cursor-pointer transition-all rounded px-1 -mx-1 select-none ${
                      selectedPreviewElement?.type === 'chord'
                        ? 'ring-2 ring-blue-500 bg-blue-500/20'
                        : 'hover:ring-1 hover:ring-blue-400/60 hover:bg-blue-500/10'
                    }`}
                    style={{ fontSize: `${typography.chordSize}px`, color: chordColor }}
                    title="Cliquer pour modifier la taille et la couleur des accords"
                  >
                    {transposeChord('Em', 0, stageSettings.notation)}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{transposeChord('D', 0, stageSettings.notation)}
                  </span>
                )}
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPreviewElement({ type: 'lyrics', label: 'Paroles' });
                  }}
                  className={`font-sans cursor-pointer transition-all rounded px-1 -mx-1 ${
                    selectedPreviewElement?.type === 'lyrics'
                      ? 'ring-2 ring-blue-500 bg-blue-500/15'
                      : 'hover:ring-1 hover:ring-blue-400/50 hover:bg-blue-500/5'
                  } ${effectivePreviewTheme === 'light' ? 'text-[#18181B]' : 'text-[#E0E0E0]'}`}
                  style={{ fontSize: `${typography.lyricsSize}px` }}
                  title="Cliquer pour modifier la taille et l'interligne des paroles"
                >
                  J'étais perdu mais je suis retrouvé,
                </span>
              </div>

              <div className="inline-flex flex-col">
                {stageSettings.showChords && (
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPreviewElement({ type: 'chord', label: 'Accords' });
                    }}
                    className={`font-mono font-bold leading-none mb-1 cursor-pointer transition-all rounded px-1 -mx-1 select-none ${
                      selectedPreviewElement?.type === 'chord'
                        ? 'ring-2 ring-blue-500 bg-blue-500/20'
                        : 'hover:ring-1 hover:ring-blue-400/60 hover:bg-blue-500/10'
                    }`}
                    style={{ fontSize: `${typography.chordSize}px`, color: chordColor }}
                    title="Cliquer pour modifier la taille et la couleur des accords"
                  >
                    {transposeChord('G', 0, stageSettings.notation)}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{transposeChord('D7', 0, stageSettings.notation)}&nbsp;&nbsp;&nbsp;{transposeChord('G', 0, stageSettings.notation)}
                  </span>
                )}
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPreviewElement({ type: 'lyrics', label: 'Paroles' });
                  }}
                  className={`font-sans cursor-pointer transition-all rounded px-1 -mx-1 ${
                    selectedPreviewElement?.type === 'lyrics'
                      ? 'ring-2 ring-blue-500 bg-blue-500/15'
                      : 'hover:ring-1 hover:ring-blue-400/50 hover:bg-blue-500/5'
                  } ${effectivePreviewTheme === 'light' ? 'text-[#18181B]' : 'text-[#E0E0E0]'}`}
                  style={{ fontSize: `${typography.lyricsSize}px` }}
                  title="Cliquer pour modifier la taille et l'interligne des paroles"
                >
                  Aveugle et maintenant je vois.
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Pont */}
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedPreviewElement({
                  type: 'sectionCard',
                  sectionType: 'bridge',
                  label: 'Cadre & Espacement : Pont'
                });
              }
            }}
            className={`rounded-lg ${previewPadding} transition-all cursor-pointer ${
              selectedPreviewElement?.type === 'sectionCard' && selectedPreviewElement.sectionType === 'bridge'
                ? 'ring-2 ring-blue-500 bg-blue-500/5'
                : ''
            }`}
            style={getSectionBorderStyles(sectionColors.bridge, sectionBorders)}
            title="Cliquer pour modifier l'espacement et les bordures de cette section"
          >
            <div className={`${previewHeaderMb} flex items-center justify-between gap-2 flex-wrap`}>
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPreviewElement({
                    type: 'sectionHeader',
                    sectionType: 'bridge',
                    label: 'Badge : Pont'
                  });
                }}
                className={`inline-block font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border shadow-xs select-none cursor-pointer transition-all ${
                  selectedPreviewElement?.type === 'sectionHeader' && selectedPreviewElement.sectionType === 'bridge'
                    ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0E0E10]'
                    : 'hover:scale-105 hover:ring-1 hover:ring-blue-400/60'
                }`}
                style={{
                  fontSize: `${typography.headerSize}px`,
                  color: sectionColors.bridge,
                  borderColor: `${sectionColors.bridge}50`,
                  backgroundColor: `${sectionColors.bridge}1C`
                }}
                title="Cliquer pour modifier la taille et la couleur du badge Pont"
              >
                Pont
              </span>
            </div>

            <div className="space-y-1 font-mono">
              <div className="inline-flex flex-col">
                {stageSettings.showChords && (
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPreviewElement({ type: 'chord', label: 'Accords' });
                    }}
                    className={`font-mono font-bold leading-none mb-1 cursor-pointer transition-all rounded px-1 -mx-1 select-none ${
                      selectedPreviewElement?.type === 'chord'
                        ? 'ring-2 ring-blue-500 bg-blue-500/20'
                        : 'hover:ring-1 hover:ring-blue-400/60 hover:bg-blue-500/10'
                    }`}
                    style={{ fontSize: `${typography.chordSize}px`, color: chordColor }}
                    title="Cliquer pour modifier la taille et la couleur des accords"
                  >
                    {transposeChord('C', 0, stageSettings.notation)}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{transposeChord('G/B', 0, stageSettings.notation)}
                  </span>
                )}
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPreviewElement({ type: 'lyrics', label: 'Paroles' });
                  }}
                  className={`font-sans cursor-pointer transition-all rounded px-1 -mx-1 ${
                    selectedPreviewElement?.type === 'lyrics'
                      ? 'ring-2 ring-blue-500 bg-blue-500/15'
                      : 'hover:ring-1 hover:ring-blue-400/50 hover:bg-blue-500/5'
                  } ${effectivePreviewTheme === 'light' ? 'text-[#18181B]' : 'text-[#E0E0E0]'}`}
                  style={{ fontSize: `${typography.lyricsSize}px` }}
                  title="Cliquer pour modifier la taille et l'interligne des paroles"
                >
                  Quand nous serons là-haut depuis dix mille ans,
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Outro */}
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedPreviewElement({
                  type: 'sectionCard',
                  sectionType: 'outro',
                  label: 'Cadre & Espacement : Outro'
                });
              }
            }}
            className={`rounded-lg ${previewPadding} transition-all cursor-pointer ${
              selectedPreviewElement?.type === 'sectionCard' && selectedPreviewElement.sectionType === 'outro'
                ? 'ring-2 ring-blue-500 bg-blue-500/5'
                : ''
            }`}
            style={getSectionBorderStyles(sectionColors.outro, sectionBorders)}
            title="Cliquer pour modifier l'espacement et les bordures de cette section"
          >
            <div className={`${previewHeaderMb} flex items-center justify-between gap-2 flex-wrap`}>
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPreviewElement({
                    type: 'sectionHeader',
                    sectionType: 'outro',
                    label: 'Badge : Outro'
                  });
                }}
                className={`inline-block font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border shadow-xs select-none cursor-pointer transition-all ${
                  selectedPreviewElement?.type === 'sectionHeader' && selectedPreviewElement.sectionType === 'outro'
                    ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0E0E10]'
                    : 'hover:scale-105 hover:ring-1 hover:ring-blue-400/60'
                }`}
                style={{
                  fontSize: `${typography.headerSize}px`,
                  color: sectionColors.outro,
                  borderColor: `${sectionColors.outro}50`,
                  backgroundColor: `${sectionColors.outro}1C`
                }}
                title="Cliquer pour modifier la taille et la couleur du badge Outro"
              >
                Outro
              </span>
            </div>

            <div className="space-y-1 font-mono">
              <div className="inline-flex flex-col">
                {stageSettings.showChords && (
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPreviewElement({ type: 'chord', label: 'Accords' });
                    }}
                    className={`font-mono font-bold leading-none mb-1 cursor-pointer transition-all rounded px-1 -mx-1 select-none ${
                      selectedPreviewElement?.type === 'chord'
                        ? 'ring-2 ring-blue-500 bg-blue-500/20'
                        : 'hover:ring-1 hover:ring-blue-400/60 hover:bg-blue-500/10'
                    }`}
                    style={{ fontSize: `${typography.chordSize}px`, color: chordColor }}
                    title="Cliquer pour modifier la taille et la couleur des accords"
                  >
                    {transposeChord('C', 0, stageSettings.notation)}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{transposeChord('G', 0, stageSettings.notation)}
                  </span>
                )}
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPreviewElement({ type: 'lyrics', label: 'Paroles' });
                  }}
                  className={`font-sans cursor-pointer transition-all rounded px-1 -mx-1 ${
                    selectedPreviewElement?.type === 'lyrics'
                      ? 'ring-2 ring-blue-500 bg-blue-500/15'
                      : 'hover:ring-1 hover:ring-blue-400/50 hover:bg-blue-500/5'
                  } ${effectivePreviewTheme === 'light' ? 'text-[#18181B]' : 'text-[#E0E0E0]'}`}
                  style={{ fontSize: `${typography.lyricsSize}px` }}
                  title="Cliquer pour modifier la taille et l'interligne des paroles"
                >
                  À Dieu soit toute la gloire.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-[#0A0A0B] text-white overflow-hidden">
      
      {/* Top Header Bar */}
      <div className="settings-header-bar border-b border-[#222224] bg-[#111112]/90 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('repertoire')}
            className="p-1.5 rounded-lg hover:bg-[#222224] text-gray-400 hover:text-white transition-colors"
            title="Retour au Répertoire"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-purple-400" />
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Réglages
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleAllCategories}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 hover:text-white border border-[#333] text-xs font-semibold transition-all active:scale-95 cursor-pointer"
            title={allCollapsed ? "Tout déplier (toutes les sections)" : "Tout plier (toutes les sections)"}
          >
            {allCollapsed ? (
              <>
                <ChevronsDown className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Tout déplier</span>
              </>
            ) : (
              <>
                <ChevronsUp className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Tout plier</span>
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 hover:text-white border border-[#333] text-xs font-semibold transition-all active:scale-95 cursor-pointer"
            title="Rétablir les polices et couleurs par défaut"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Réinitialiser</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {showNotification && (
        <div className="absolute top-16 left-6 z-50 px-4 py-2 rounded-lg bg-green-600/90 border border-green-500 text-white text-xs font-medium flex items-center gap-2 shadow-2xl animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4" />
          <span>{showNotification}</span>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* DESKTOP RIGHT STICKY PREVIEW (HIDDEN ON MOBILE) */}
        <div className="hidden lg:flex lg:w-5/12 shrink-0 lg:shrink lg:order-last lg:border-l border-[#222224] bg-[#111112] z-20 flex-col">
          <div className="p-3 sm:p-4 bg-[#141416] border-b border-[#222224] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-green-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Aperçu en Direct
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                <MousePointerClick className="w-3 h-3 text-blue-400" />
                Point-n-Click
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Fullscreen Preview button */}
              <button
                id="btn-preview-fullscreen"
                type="button"
                onClick={() => {
                  setIsMobilePreviewFullscreen(true);
                  setIsMobilePreviewCollapsed(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border-blue-500/40 active:scale-95 shadow-sm cursor-pointer"
                title="Afficher l'aperçu interactif en plein écran"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Plein écran</span>
              </button>

              <button
                type="button"
                onClick={() => updateStageSettings({ showChords: !stageSettings.showChords })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  stageSettings.showChords
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-[#222228] text-gray-400 border-[#383842] hover:text-white'
                }`}
                title="Afficher ou masquer les accords dans l'aperçu"
              >
                {stageSettings.showChords ? 'Accords : Oui' : 'Accords : Non'}
              </button>

              {/* Collapse / expand toggle */}
              <button
                type="button"
                onClick={() => setIsMobilePreviewCollapsed(!isMobilePreviewCollapsed)}
                className="p-1.5 rounded-lg bg-[#222226] hover:bg-[#2E2E34] text-gray-300 hover:text-white border border-[#383842] transition-colors cursor-pointer"
                title={isMobilePreviewCollapsed ? "Déplier l'aperçu" : "Replier l'aperçu"}
              >
                {isMobilePreviewCollapsed ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Song Preview Content Box */}
          {!isMobilePreviewCollapsed && (
            <div 
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setSelectedPreviewElement(null);
                }
              }}
              className={`p-4 overflow-y-auto max-h-[34vh] sm:max-h-[38vh] lg:max-h-[calc(100vh-190px)] lg:flex-1 space-y-4 transition-colors relative ${
                effectivePreviewTheme === 'light' ? 'bg-[#FFFFFF] text-[#18181B]' : 'bg-[#0E0E10] text-gray-100'
              }`}
              style={{ lineHeight: typography.lineSpacing }}
            >
              {renderSongPreviewBody(false)}
            </div>
          )}

          {/* Bottom live stats */}
          {!isMobilePreviewCollapsed && (
            <div className="p-2.5 bg-[#141416] border-t border-[#222224] flex items-center justify-between text-[11px] text-gray-400 font-mono shrink-0">
              <span>Interligne : {typography.lineSpacing.toFixed(1)}x</span>
              <span>Paroles : {typography.lyricsSize}px</span>
              <span>Accords : {typography.chordSize}px</span>
            </div>
          )}
        </div>

        {/* SCROLLABLE SETTINGS PANEL (FULL WIDTH ON MOBILE, LEFT ON DESKTOP) */}
        <div className="flex-1 w-full lg:w-7/12 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-5 pb-24">
          
          {/* 1. STAGE DISPLAY & NOTATION SETTINGS */}
          <div className="bg-[#111112] border border-[#222224] rounded-xl overflow-hidden shadow-sm transition-colors hover:border-[#303036]">
            {/* Header / Trigger */}
            <div 
              onClick={() => toggleCategory('display')}
              className="w-full text-left p-3.5 sm:p-4.5 flex items-center justify-between gap-3 cursor-pointer transition-colors hover:bg-[#151518]/50 select-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <Music className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-white truncate">
                  Affichage & Thème
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className={`p-1.5 rounded-lg bg-[#18181C] border border-[#2B2B30] text-gray-400 transition-transform duration-200 ${openCategories.display ? 'rotate-180 text-blue-400 border-blue-500/30' : ''}`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Content (Collapsible on all devices) */}
            <div className={`p-4 sm:p-5 pt-0 sm:pt-0 ${openCategories.display ? 'block' : 'hidden'}`}>
              <div className="border-t border-[#222224] mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Notation Selection */}
              <div className="p-3 rounded-lg bg-[#18181A] border border-[#262629] flex flex-col justify-between gap-2.5">
                <div>
                  <span className="text-xs font-bold text-gray-200 block">Notation</span>
                  <span className="text-[11px] text-gray-400">Accords latins ou internationaux</span>
                </div>
                <div className="theme-toggle-group flex items-center gap-1 bg-[#121214] p-0.5 rounded-lg border border-[#2B2B30]">
                  <button
                    type="button"
                    onClick={() => updateStageSettings({ notation: 'latin' })}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      stageSettings.notation === 'latin'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'theme-toggle-inactive text-gray-400 hover:text-white'
                    }`}
                  >
                    Do Ré Mi
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStageSettings({ notation: 'standard' })}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      stageSettings.notation === 'standard'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'theme-toggle-inactive text-gray-400 hover:text-white'
                    }`}
                  >
                    A B C
                  </button>
                </div>
              </div>

              {/* Columns Toggle */}
              <div className="p-3 rounded-lg bg-[#18181A] border border-[#262629] flex flex-col justify-between gap-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-gray-200 block">Disposition</span>
                    <span className="text-[11px] text-gray-400">Colonnes d'affichage du chant (1 à 5)</span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#121214] text-blue-400 border border-[#2B2B30]">
                    {(typeof stageSettings.columns === 'number' && stageSettings.columns >= 1 && stageSettings.columns <= 5 ? stageSettings.columns : 1)} {stageSettings.columns === 1 ? 'colonne' : 'colonnes'}
                  </span>
                </div>
                <div className="theme-toggle-group flex items-center gap-1 bg-[#121214] p-0.5 rounded-lg border border-[#2B2B30]">
                  {([1, 2, 3, 4, 5] as const).map((cols) => {
                    const activeCols = typeof stageSettings.columns === 'number' && stageSettings.columns >= 1 && stageSettings.columns <= 5
                      ? stageSettings.columns
                      : 1;
                    return (
                      <button
                        key={cols}
                        type="button"
                        onClick={() => updateStageSettings({ columns: cols })}
                        className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                          activeCols === cols
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'theme-toggle-inactive text-gray-400 hover:text-white'
                        }`}
                        title={`Afficher sur ${cols} colonne${cols > 1 ? 's' : ''}`}
                      >
                        {cols} {cols === 1 ? 'col' : 'cols'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Theme Mode Toggle */}
              <div className="p-3 rounded-lg bg-[#18181A] border border-[#262629] flex flex-col justify-between gap-2.5">
                <div>
                  <span className="text-xs font-bold text-gray-200 block">Thème</span>
                  <span className="text-[11px] text-gray-400">Sombre, clair ou système</span>
                </div>
                <div className="theme-toggle-group flex items-center gap-1 bg-[#121214] p-0.5 rounded-lg border border-[#2B2B30]">
                  <button
                    type="button"
                    onClick={() => updateStageSettings({ theme: 'dark' })}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                      stageSettings.theme === 'dark'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'theme-toggle-inactive text-gray-400 hover:text-white'
                    }`}
                    title="Mode sombre"
                  >
                    <Moon className="w-3.5 h-3.5 shrink-0" />
                    <span>Sombre</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStageSettings({ theme: 'light' })}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                      stageSettings.theme === 'light'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'theme-toggle-inactive text-gray-400 hover:text-white'
                    }`}
                    title="Mode clair"
                  >
                    <Sun className="w-3.5 h-3.5 shrink-0" />
                    <span>Clair</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStageSettings({ theme: 'system' })}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                      stageSettings.theme === 'system'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'theme-toggle-inactive text-gray-400 hover:text-white'
                    }`}
                    title="Synchronisé avec le système"
                  >
                    <Monitor className="w-3.5 h-3.5 shrink-0" />
                    <span>Système</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

          {/* 2. CARTES DE CHANTS - VISIBILITE DES METADONNEES DANS LA BIBLIOTHEQUE */}
          <div className="bg-[#111112] border border-[#222224] rounded-xl overflow-hidden shadow-sm transition-colors hover:border-[#303036]">
            {/* Header / Trigger */}
            <div 
              onClick={() => toggleCategory('song_cards')}
              className="w-full text-left p-3.5 sm:p-4.5 flex items-center justify-between gap-3 cursor-pointer transition-colors hover:bg-[#151518]/50 select-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-white truncate">
                  Cartes des Chants
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className={`p-1.5 rounded-lg bg-[#18181C] border border-[#2B2B30] text-gray-400 transition-transform duration-200 ${openCategories.song_cards ? 'rotate-180 text-blue-400 border-blue-500/30' : ''}`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Content (Collapsible on all devices) */}
            <div className={`p-4 sm:p-5 pt-0 sm:pt-0 ${openCategories.song_cards ? 'block' : 'hidden'}`}>
              <div className="border-t border-[#222224] mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Tonalite */}
              <div className="p-3 rounded-lg bg-[#18181A] border border-[#262629] flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                    C
                  </span>
                  <span className="text-xs font-bold text-gray-200">Tonalité</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !songCardMetadata?.showKey;
                    updateSongCardMetadata({ showKey: next });
                    notify(next ? 'Tonalité activée sur les cartes' : 'Tonalité masquée sur les cartes');
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    songCardMetadata?.showKey
                      ? 'bg-blue-600 text-white border-blue-500 shadow-xs hover:bg-blue-500'
                      : 'metadata-toggle-btn-inactive bg-[#121214] text-gray-400 border-[#2B2B30] hover:text-white'
                  }`}
                  title={songCardMetadata?.showKey ? 'Cliquer pour masquer la tonalité' : 'Cliquer pour afficher la tonalité'}
                >
                  {songCardMetadata?.showKey ? (
                    <>
                      <Eye className="w-3.5 h-3.5 shrink-0" />
                      <span>Visible</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 shrink-0" />
                      <span>Masquée</span>
                    </>
                  )}
                </button>
              </div>

              {/* BPM et Tempo */}
              <div className="p-3 rounded-lg bg-[#18181A] border border-[#262629] flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                    <Gauge className="w-3 h-3 text-blue-400" />
                  </span>
                  <span className="text-xs font-bold text-gray-200">BPM et Tempo</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !songCardMetadata?.showTempo;
                    updateSongCardMetadata({ showTempo: next });
                    notify(next ? 'BPM activé sur les cartes' : 'BPM masqué sur les cartes');
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    songCardMetadata?.showTempo
                      ? 'bg-blue-600 text-white border-blue-500 shadow-xs hover:bg-blue-500'
                      : 'metadata-toggle-btn-inactive bg-[#121214] text-gray-400 border-[#2B2B30] hover:text-white'
                  }`}
                  title={songCardMetadata?.showTempo ? 'Cliquer pour masquer le BPM' : 'Cliquer pour afficher le BPM'}
                >
                  {songCardMetadata?.showTempo ? (
                    <>
                      <Eye className="w-3.5 h-3.5 shrink-0" />
                      <span>Visible</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 shrink-0" />
                      <span>Masqué</span>
                    </>
                  )}
                </button>
              </div>

              {/* Duree */}
              <div className="p-3 rounded-lg bg-[#18181A] border border-[#262629] flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                    <Clock className="w-3 h-3 text-cyan-400" />
                  </span>
                  <span className="text-xs font-bold text-gray-200">Durée</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !songCardMetadata?.showDuration;
                    updateSongCardMetadata({ showDuration: next });
                    notify(next ? 'Durée activée sur les cartes' : 'Durée masquée sur les cartes');
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    songCardMetadata?.showDuration
                      ? 'bg-blue-600 text-white border-blue-500 shadow-xs hover:bg-blue-500'
                      : 'metadata-toggle-btn-inactive bg-[#121214] text-gray-400 border-[#2B2B30] hover:text-white'
                  }`}
                  title={songCardMetadata?.showDuration ? 'Cliquer pour masquer la durée' : 'Cliquer pour afficher la durée'}
                >
                  {songCardMetadata?.showDuration ? (
                    <>
                      <Eye className="w-3.5 h-3.5 shrink-0" />
                      <span>Visible</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 shrink-0" />
                      <span>Masquée</span>
                    </>
                  )}
                </button>
              </div>

              {/* Categories */}
              <div className="p-3 rounded-lg bg-[#18181A] border border-[#262629] flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                    <Tag className="w-3 h-3 text-blue-400" />
                  </span>
                  <span className="text-xs font-bold text-gray-200">Catégories</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !songCardMetadata?.showCategories;
                    updateSongCardMetadata({ showCategories: next });
                    notify(next ? 'Catégories activées sur les cartes' : 'Catégories masquées sur les cartes');
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    songCardMetadata?.showCategories
                      ? 'bg-blue-600 text-white border-blue-500 shadow-xs hover:bg-blue-500'
                      : 'metadata-toggle-btn-inactive bg-[#121214] text-gray-400 border-[#2B2B30] hover:text-white'
                  }`}
                  title={songCardMetadata?.showCategories ? 'Cliquer pour masquer les catégories' : 'Cliquer pour afficher les catégories'}
                >
                  {songCardMetadata?.showCategories ? (
                    <>
                      <Eye className="w-3.5 h-3.5 shrink-0" />
                      <span>Visible</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 shrink-0" />
                      <span>Masquée</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Apercu en direct de la vignette de chant */}
            <div className="mt-4 pt-3 border-t border-[#222224]">
              <div className="text-[11px] text-gray-400 mb-2 font-medium flex items-center justify-between">
                <span>Aperçu de la vignette de chant</span>
                <span className="text-[10px] text-gray-500">
                  {!songCardMetadata?.showKey && !songCardMetadata?.showTempo && !songCardMetadata?.showDuration && !songCardMetadata?.showCategories
                    ? 'Métadonnées masquées par défaut'
                    : 'Métadonnées actives'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#151518] border border-[#2A2A2E] max-w-xs">
                <div>
                  <div className="flex items-start gap-2 mb-1">
                    <span className="w-5 h-5 rounded border border-[#444] bg-[#1C1C1E] flex items-center justify-center text-[10px] text-gray-400 shrink-0 mt-0.5">
                      ✓
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">Chant exemple</div>
                      <div className="text-[11px] text-gray-400 truncate">Artiste de louange</div>
                    </div>
                  </div>
                  {songCardMetadata?.showCategories && (
                    <div className="flex items-center gap-1 mt-1.5 pl-7">
                      <span className="text-[9px] px-1.5 py-0.5 rounded border border-[#333] bg-[#1C1C1E] text-gray-400 flex items-center gap-1">
                        <Tag className="w-2 h-2 text-blue-400" />
                        Adoration
                      </span>
                    </div>
                  )}
                </div>

                {((songCardMetadata?.showKey) || (songCardMetadata?.showTempo) || (songCardMetadata?.showDuration)) && (
                  <div className="flex items-center gap-1 flex-wrap mt-2 pt-1.5 border-t border-[#1C1C1F]">
                    {songCardMetadata?.showKey && (
                      <span className="px-1.5 py-0.5 rounded border border-amber-500/50 bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                        C
                      </span>
                    )}
                    {songCardMetadata?.showTempo && (
                      <span className="px-1.5 py-0.5 rounded bg-[#1C1C1E] border border-[#222224] text-gray-400 text-[9px] font-medium flex items-center gap-1">
                        <Gauge className="w-2.5 h-2.5 text-blue-400" />
                        128
                      </span>
                    )}
                    {songCardMetadata?.showDuration && (
                      <span className="px-1.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 text-[9px] font-medium flex items-center gap-1 font-mono">
                        <Clock className="w-2.5 h-2.5 text-cyan-400" />
                        03:45
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>

          {/* 3. PERSONNALISATION VISUELLE INTERACTIVE (POINT-N-CLICK) */}
          <div className="rounded-2xl bg-gradient-to-b from-[#181820] to-[#121215] border border-blue-500/30 p-4 sm:p-6 shadow-xl shadow-black/40 space-y-4 sm:space-y-5 transition-all">
            {/* Header with Title, Badge, Description & Primary Action Button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
                  <MousePointerClick className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Personnalisation Visuelle Interactive
                    </h2>
                    <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-xs">
                      Point-n-Click
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-300 mt-1 leading-relaxed">
                    Cliquez sur un élément ci-dessous ou directement sur la partition dans l'aperçu pour ajuster ses polices, couleurs ou bordures en direct.
                  </p>
                </div>
              </div>

              {/* Big, highly legible CTA button */}
              <button
                type="button"
                onClick={() => {
                  setIsMobilePreviewFullscreen(true);
                  setIsMobilePreviewCollapsed(false);
                }}
                className="w-full md:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all active:scale-95 shadow-lg shadow-blue-950/60 hover:shadow-blue-600/40 border border-blue-400/40 cursor-pointer shrink-0"
                title="Ouvrir l'aperçu interactif en plein écran"
              >
                <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-200" />
                <span>Ouvrir l'Aperçu Plein Écran</span>
              </button>
            </div>

            {/* Quick-access interactive action chips */}
            <div>
              <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-2.5 uppercase tracking-wider">
                <span>Raccourcis de réglages rapides :</span>
                <span className="text-[11px] text-blue-400 font-normal normal-case hidden sm:inline">
                  Cliquez pour ouvrir l'inspecteur
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* 1. Titre & Infos */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPreviewElement({ type: 'title', label: 'Titre du Chant' });
                    setIsMobilePreviewCollapsed(false);
                    if (window.innerWidth < 1024) setIsMobilePreviewFullscreen(true);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    selectedPreviewElement?.type === 'title' || selectedPreviewElement?.type === 'metadata'
                      ? 'bg-blue-600/25 border-blue-500 ring-2 ring-blue-500/40 shadow-sm'
                      : 'bg-[#1A1A22] hover:bg-[#22222D] border-[#2E2E38] hover:border-blue-500/40'
                  }`}
                  title="Cliquer pour ajuster la taille du titre et des métadonnées"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center">
                      <Heading1 className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[11px] font-mono font-bold text-gray-300 px-1.5 py-0.5 rounded bg-black/40 border border-white/10">
                      {typography.titleSize}px
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Titre & Artiste</span>
                    <span className="text-[10px] text-gray-400 block">Taille et visibilité</span>
                  </div>
                </button>

                {/* 2. Accords */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPreviewElement({ type: 'chord', label: 'Accords' });
                    setIsMobilePreviewCollapsed(false);
                    if (window.innerWidth < 1024) setIsMobilePreviewFullscreen(true);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    selectedPreviewElement?.type === 'chord'
                      ? 'bg-blue-600/25 border-blue-500 ring-2 ring-blue-500/40 shadow-sm'
                      : 'bg-[#1A1A22] hover:bg-[#22222D] border-[#2E2E38] hover:border-blue-500/40'
                  }`}
                  title="Cliquer pour ajuster la taille et la couleur des accords"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center">
                      <Music className="w-3.5 h-3.5" />
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span 
                        className="w-3 h-3 rounded-full border border-white/40 shadow-xs" 
                        style={{ backgroundColor: chordColor }} 
                        title={`Couleur : ${chordColor}`}
                      />
                      <span className="text-[11px] font-mono font-bold text-amber-300 px-1.5 py-0.5 rounded bg-black/40 border border-white/10">
                        {typography.chordSize}px
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Accords</span>
                    <span className="text-[10px] text-gray-400 block">Taille et teinte</span>
                  </div>
                </button>

                {/* 3. Paroles */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPreviewElement({ type: 'lyrics', label: 'Paroles' });
                    setIsMobilePreviewCollapsed(false);
                    if (window.innerWidth < 1024) setIsMobilePreviewFullscreen(true);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    selectedPreviewElement?.type === 'lyrics'
                      ? 'bg-blue-600/25 border-blue-500 ring-2 ring-blue-500/40 shadow-sm'
                      : 'bg-[#1A1A22] hover:bg-[#22222D] border-[#2E2E38] hover:border-blue-500/40'
                  }`}
                  title="Cliquer pour ajuster la taille et l'interligne des paroles"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center">
                      <Type className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[11px] font-mono font-bold text-cyan-300 px-1.5 py-0.5 rounded bg-black/40 border border-white/10">
                      {typography.lyricsSize}px
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Paroles</span>
                    <span className="text-[10px] text-gray-400 block">Taille et interligne</span>
                  </div>
                </button>

                {/* 4. Sections & Bordures */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPreviewElement({ type: 'sectionHeader', sectionType: 'chorus', label: 'Badge : Refrain' });
                    setIsMobilePreviewCollapsed(false);
                    if (window.innerWidth < 1024) setIsMobilePreviewFullscreen(true);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    selectedPreviewElement?.type === 'sectionHeader' || selectedPreviewElement?.type === 'sectionCard'
                      ? 'bg-blue-600/25 border-blue-500 ring-2 ring-blue-500/40 shadow-sm'
                      : 'bg-[#1A1A22] hover:bg-[#22222D] border-[#2E2E38] hover:border-blue-500/40'
                  }`}
                  title="Cliquer pour ajuster les badges de sections et les styles d'encadrés"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center">
                      <Bookmark className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[11px] font-mono font-bold text-emerald-300 px-1.5 py-0.5 rounded bg-black/40 border border-white/10">
                      {typography.headerSize}px
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Sections & Badges</span>
                    <span className="text-[10px] text-gray-400 block">Bordures et couleurs</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Desktop right panel hint */}
            <div className="hidden lg:flex items-center justify-between pt-3 border-t border-[#252530] text-xs text-gray-400">
              <span className="flex items-center gap-1.5 text-gray-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                L'aperçu en direct est toujours actif à droite de votre écran.
              </span>
              <span className="text-blue-400 font-medium">
                Pointez et cliquez sur n'importe quel élément pour le modifier ↗
              </span>
            </div>
          </div>





          {/* 6. MIDI DEVICES & FOOT PEDAL CONTROLS */}
          <div className="bg-[#111112] border border-[#222224] rounded-xl overflow-hidden shadow-sm transition-colors hover:border-[#303036]">
            {/* Header / Trigger */}
            <div 
              onClick={() => toggleCategory('midi')}
              className="w-full text-left p-3.5 sm:p-4.5 flex items-center justify-between gap-3 cursor-pointer transition-colors hover:bg-[#151518]/50 select-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <Radio className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-white truncate">
                  Contrôle MIDI & Pédaliers
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMidiModalOpen(true);
                  }}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all active:scale-95 shadow-sm cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Configurer</span>
                </button>

                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg bg-[#18181C] border border-[#2B2B30] text-gray-400 transition-transform duration-200 ${openCategories.midi ? 'rotate-180 text-blue-400 border-blue-500/30' : ''}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Content (Collapsible on all devices) */}
            <div className={`p-4 sm:p-5 pt-0 sm:pt-0 ${openCategories.midi ? 'block' : 'hidden'}`}>
              <div className="border-t border-[#222224] mb-4" />

            {/* Quick status & master toggle */}
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-[#18181A] border border-[#262629] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsMidiEnabled(!isMidiEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      isMidiEnabled ? 'bg-blue-600' : 'bg-[#2E2E34]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isMidiEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <div>
                    <span className="text-xs font-bold text-gray-200 block">
                      {isMidiEnabled ? 'Écoute MIDI active' : 'Écoute MIDI désactivée'}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {isMidiEnabled 
                        ? 'Les commandes de votre pédalier sont traitées en direct' 
                        : 'Mise en veille du récepteur MIDI'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={refreshMidiDevices}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#202024] hover:bg-[#28282E] text-gray-300 hover:text-white border border-[#333] text-xs font-medium transition-colors"
                    title="Actualiser la liste des périphériques connectés"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                    <span>Détecter</span>
                  </button>
                </div>
              </div>

              {/* Connected Devices summary */}
              <div className="p-3 rounded-lg bg-[#141416] border border-[#242428] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-medium">Périphériques détectés :</span>
                  <span className="font-mono text-gray-300">
                    {midiDevices.length > 0 
                      ? midiDevices.map(d => d.name).join(', ') 
                      : 'Aucun périphérique MIDI branché'}
                  </span>
                </div>

                {/* Real-time MIDI Monitor */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-[#222226]">
                  <span className="text-gray-400 font-medium">Dernier signal reçu :</span>
                  <span className="font-mono text-[11px] text-blue-400">
                    {lastMidiEvent 
                      ? `${lastMidiEvent.type.toUpperCase()} #${lastMidiEvent.number} (val: ${lastMidiEvent.value}, ch: ${lastMidiEvent.channel})` 
                      : 'En attente...'}
                  </span>
                </div>
              </div>

              {/* Quick Mappings Grid Preview */}
              <div>
                <span className="text-xs font-bold text-gray-300 block mb-2">
                  Commandes assignées par défaut :
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {midiMappings.slice(0, 4).map(mapping => (
                    <div 
                      key={mapping.id}
                      className="p-2.5 rounded-lg bg-[#18181A] border border-[#262629] flex items-center justify-between"
                    >
                      <div className="truncate mr-2">
                        <span className="text-gray-200 font-semibold block truncate">
                          {mapping.label}
                        </span>
                        <span className="text-[10px] text-gray-400 truncate block">
                          {mapping.name}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-[#222226] text-blue-300 border border-[#333] shrink-0">
                        {mapping.type.toUpperCase()} #{mapping.number}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Presets Bar */}
              <div className="pt-2 border-t border-[#242428] flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-gray-400 font-medium">Préréglages rapides :</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      applyMidiPreset('standard_pedal');
                      setShowNotification('Preset Pédalier Standard appliqué');
                      setTimeout(() => setShowNotification(null), 2500);
                    }}
                    className="px-2.5 py-1 rounded bg-[#1C1C20] hover:bg-[#28282E] text-gray-300 hover:text-white border border-[#333] text-xs font-medium transition-colors"
                  >
                    Pédalier Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      applyMidiPreset('keyboard');
                      setShowNotification('Preset Clavier MIDI appliqué');
                      setTimeout(() => setShowNotification(null), 2500);
                    }}
                    className="px-2.5 py-1 rounded bg-[#1C1C20] hover:bg-[#28282E] text-gray-300 hover:text-white border border-[#333] text-xs font-medium transition-colors"
                  >
                    Clavier MIDI
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      applyMidiPreset('program_change');
                      setShowNotification('Preset Program Change appliqué');
                      setTimeout(() => setShowNotification(null), 2500);
                    }}
                    className="px-2.5 py-1 rounded bg-[#1C1C20] hover:bg-[#28282E] text-gray-300 hover:text-white border border-[#333] text-xs font-medium transition-colors"
                  >
                    Program Change
                  </button>
                </div>
              </div>

            </div>
            </div>
          </div>

          {/* 7. NETTOYAGE & GESTION DES DOUBLONS */}
          <DuplicateCleanerSection 
            isOpen={openCategories.duplicates}
            onToggle={() => toggleCategory('duplicates')}
          />

          {/* 8. STOCKAGE HORS-LIGNE & INDEXEDDB */}
          <div className="bg-[#121214] border border-[#242428] rounded-xl overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => toggleCategory('offline')}
              className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between hover:bg-[#161619] transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      Accès Hors-Ligne & Cache Local (IndexedDB & PWA)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {offlineStats.songCount || songs.length} chants en cache
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Stockage local haute performance dans IndexedDB et Service Worker pour les répétitions sans réseau
                  </p>
                </div>
              </div>
              <div className="text-gray-400">
                {openCategories.offline ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {openCategories.offline && (
              <div className="p-4 sm:p-5 border-t border-[#222226] bg-[#0E0E10] space-y-4">
                {/* Status overview cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-[#141416] border border-[#242428]">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                      <Database className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Base locale IndexedDB</span>
                    </div>
                    <p className="text-base font-bold text-white">
                      {offlineStats.songCount || songs.length} chants
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {offlineStats.setlistCount || setlists.length} setlists stockées
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#141416] border border-[#242428]">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                      <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                      <span>Service Worker & Cache</span>
                    </div>
                    <p className="text-base font-bold text-blue-300">
                      Prêt hors-ligne
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      PWA installable & assets mis en cache
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#141416] border border-[#242428]">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                      <Zap className="w-3.5 h-3.5 text-purple-400" />
                      <span>Espace de stockage</span>
                    </div>
                    <p className="text-base font-bold text-white">
                      {offlineStats.usageBytes > 0 
                        ? `${(offlineStats.usageBytes / (1024 * 1024)).toFixed(1)} Mo`
                        : 'Léger (< 5 Mo)'}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Quota alloué par le navigateur
                    </p>
                  </div>
                </div>

                {/* Information banner */}
                <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1" />
                  <div className="space-y-1">
                    <p className="font-semibold text-white">Fonctionnement hors connexion garanti</p>
                    <p className="text-gray-300 leading-relaxed text-[11px]">
                      Tous les chants et setlists sont automatiquement persistés dans la base de données <strong>IndexedDB</strong> de votre navigateur et sécurisés par le <strong>Service Worker</strong>. Lors d'une répétition, d'un culte ou d'un concert sans connexion Internet ou en mode avion, l'intégralité de vos partitions reste immédiatement accessible et navigable.
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-[#222226]">
                  <button
                    type="button"
                    onClick={async () => {
                      await cacheAllSongsOffline();
                    }}
                    className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
                  >
                    <FolderDown className="w-4 h-4" />
                    <span>Mettre en cache tous les chants maintenant</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await refreshOfflineStats();
                      notify('État du stockage vérifié avec succès');
                    }}
                    className="px-3.5 py-2 rounded-lg bg-[#1C1C20] hover:bg-[#25252A] text-gray-200 hover:text-white border border-[#333] font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                    <span>Vérifier le stockage</span>
                  </button>

                  {isInstallable && (
                    <button
                      type="button"
                      onClick={() => promptInstall()}
                      className="px-3.5 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Installer l'application (PWA)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm('Voulez-vous vider le cache local ? Les chants seront re-téléchargés depuis Firestore.')) {
                        await clearOfflineStorage();
                      }
                    }}
                    className="px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
                    title="Vider le cache hors-ligne"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Vider le cache local</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Floating Action Button for Mobile Preview Toggle (Always at bottom-6 right-6) */}
      <button
        id="btn-mobile-floating-preview"
        type="button"
        onClick={() => setIsMobilePreviewFullscreen(!isMobilePreviewFullscreen)}
        className={`lg:hidden fixed bottom-6 right-6 z-[120] flex items-center gap-2 px-4 py-3 rounded-full font-bold text-sm shadow-xl active:scale-95 transition-all ${
          isMobilePreviewFullscreen
            ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/60 border border-amber-400/40'
            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/60 border border-blue-400/30'
        }`}
        title={isMobilePreviewFullscreen ? "Désactiver l'aperçu" : "Ouvrir l'aperçu"}
      >
        {isMobilePreviewFullscreen ? (
          <>
            <Minimize2 className="w-4 h-4" />
            <span>Fermer l'aperçu</span>
          </>
        ) : (
          <>
            <MousePointerClick className="w-4 h-4 text-blue-200" />
            <span>Aperçu Interactif</span>
          </>
        )}
      </button>

      {/* FULLSCREEN PREVIEW OVERLAY */}
      {isMobilePreviewFullscreen && (
        <div 
          id="fullscreen-preview-modal"
          className="fixed inset-0 z-[100] flex flex-col bg-[#0A0A0B] text-white animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Aperçu plein écran"
        >
          {/* Fullscreen Top Header Bar */}
          <div className="h-14 px-3 sm:px-6 bg-[#121214] border-b border-[#242428] flex items-center justify-between shrink-0 z-20 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setIsMobilePreviewFullscreen(false)}
                className="p-1.5 rounded-lg bg-[#1E1E22] hover:bg-[#2A2A2E] text-gray-300 hover:text-white border border-[#333] transition-colors"
                title="Quitter le plein écran"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 truncate">
                <Eye className="w-4 h-4 text-green-400 shrink-0" />
                <span className="text-sm font-bold text-white tracking-tight truncate">
                  Aperçu Plein Écran
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                  Mode Scène
                </span>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Theme switcher */}
              <div className="flex items-center bg-[#1A1A1E] border border-[#2B2B30] rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => updateStageSettings({ theme: 'dark' })}
                  className={`p-1.5 rounded-md transition-all ${
                    effectivePreviewTheme === 'dark' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  title="Thème sombre"
                >
                  <Moon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateStageSettings({ theme: 'light' })}
                  className={`p-1.5 rounded-md transition-all ${
                    effectivePreviewTheme === 'light' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  title="Thème clair"
                >
                  <Sun className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Accords on/off */}
              <button
                type="button"
                onClick={() => updateStageSettings({ showChords: !stageSettings.showChords })}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  stageSettings.showChords
                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                    : 'bg-[#1E1E22] text-gray-400 border-[#333]'
                }`}
                title="Afficher ou masquer les accords"
              >
                {stageSettings.showChords ? 'Accords On' : 'Accords Off'}
              </button>

              {/* Exit Fullscreen button */}
              <button
                id="btn-close-fullscreen-preview"
                type="button"
                onClick={() => setIsMobilePreviewFullscreen(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all active:scale-95"
                title="Quitter le plein écran"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Quitter</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Scrollable Body */}
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedPreviewElement(null);
              }
            }}
            className={`flex-1 overflow-y-auto p-4 sm:p-8 transition-colors relative ${
              effectivePreviewTheme === 'light' ? 'bg-[#FFFFFF] text-[#18181B]' : 'bg-[#0E0E10] text-gray-100'
            }`}
            style={{ lineHeight: typography.lineSpacing }}
          >
            <div className="max-w-3xl mx-auto space-y-4 pb-24">
              {renderSongPreviewBody(true)}
            </div>
          </div>

          {/* Fullscreen Bottom Footer Bar */}
          <div className="bg-[#121214]/95 backdrop-blur-md border-t border-[#242428] px-4 py-2.5 flex items-center justify-between gap-2 shrink-0 z-20">
            <div className="flex items-center gap-3 text-xs font-mono text-gray-400 overflow-x-auto py-0.5 scrollbar-none">
              <span>Paroles : <strong className="text-white">{typography.lyricsSize}px</strong></span>
              <span>Accords : <strong className="text-white">{typography.chordSize}px</strong></span>
              <span>Interligne : <strong className="text-white">{typography.lineSpacing.toFixed(1)}x</strong></span>
              <span className="hidden sm:inline">En-têtes : <strong className="text-white">{typography.headerSize}px</strong></span>
            </div>
            <button
              type="button"
              onClick={() => setIsMobilePreviewFullscreen(false)}
              className="hidden sm:flex shrink-0 items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all active:scale-95"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Quitter le plein écran</span>
            </button>
          </div>
        </div>
      )}

      {/* MIDI Controller Modal */}
      <MidiSettingsModal
        isOpen={isMidiModalOpen}
        onClose={() => setIsMidiModalOpen(false)}
      />

    </div>
  );
};
