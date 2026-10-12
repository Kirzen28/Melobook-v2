import React, { useState, useEffect, useMemo } from 'react';
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
  MousePointerClick,
  Globe,
  Mic,
  FileEdit,
  FileDown,
  Settings2,
  ArrowUpDown,
  SlidersHorizontal,
  Shield,
  Copyright
} from 'lucide-react';
import { useMidi } from '../context/MidiContext';
import { MidiSettingsModal } from './MidiSettingsModal';
import { 
  COLOR_PRESETS, 
  SECTION_TYPES_LIST, 
  DEFAULT_DISPLAY_SETTINGS, 
  DEFAULT_SECTION_BORDERS,
  DEFAULT_CHORD_COLOR,
  DEFAULT_SONG_METADATA_VISIBILITY,
  DEFAULT_PREVIEW_METADATA,
  getSectionBorderStyles,
  getSectionColor 
} from '../utils/displayDefaults';
import { SectionColors, SongTypographySettings, SectionBorders, SongMetadataVisibility, PreviewMetadataVisibility } from '../types';
import { transposeChord, stripParentheses, LATIN_NOTES } from '../utils/chordUtils';
import { getLanguageMeta } from '../utils/languageUtils';
import { DuplicateCleanerSection } from './DuplicateCleanerSection';

const METADATA_TOGGLE_ITEMS: Array<{
  key: keyof PreviewMetadataVisibility;
  label: string;
  iconName: string;
  description: string;
}> = [
  { key: 'sectionHeaders', label: 'Noms des sections', iconName: 'Layers', description: 'Titres des sections (Couplet, Refrain, Pont...)' },
  { key: 'title', label: 'Titre du chant', iconName: 'Heading1', description: 'Nom et titre principal du chant' },
  { key: 'language', label: 'Langue', iconName: 'Globe', description: 'Badge langue (ex: FR, EN)' },
  { key: 'duration', label: 'Durée', iconName: 'Clock', description: 'Badge durée (ex: 04:30)' },
  { key: 'artist', label: 'Artiste', iconName: 'Type', description: 'Nom de l\'artiste ou groupe' },
  { key: 'tags', label: 'Catégories', iconName: 'Tag', description: 'Badges de catégories et thèmes' },
  { key: 'ccli', label: 'CCLI', iconName: 'Shield', description: 'Numéro CCLI SongSelect' },
  { key: 'copyright', label: 'Copyright', iconName: 'Copyright', description: 'Droits d\'auteur et mentions légales' },
  { key: 'controlsBar', label: 'Tonalité & Tempo', iconName: 'Music', description: 'Barre de contrôles (Tonalité, Transpose, BPM)' },
  { key: 'notes', label: 'Note du chant', iconName: 'Bookmark', description: 'Bannière d\'instructions et directives' },
  { key: 'actions', label: 'Actions rapides', iconName: 'Maximize2', description: 'Boutons plein écran, éditer, PDF, options' },
  { key: 'vocalArrangement', label: 'Voix +', iconName: 'Mic', description: 'Badge arrangement vocal sur les sections' },
];

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
            <span className="text-xs font-bold text-white tracking-wide">
              {selection.label}
            </span>
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
            <span className="text-gray-300 font-medium">Taille des métadonnées (artiste, catégories, CCLI, copyright...) :</span>
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

  // Visibilité des métadonnées synchronisée en temps réel (aperçu et mode scène des chants)
  const previewMetadata: SongMetadataVisibility = displaySettings.metadataVisibility || DEFAULT_SONG_METADATA_VISIBILITY;

  const togglePreviewMetadata = (key: keyof SongMetadataVisibility) => {
    const current = displaySettings.metadataVisibility || DEFAULT_SONG_METADATA_VISIBILITY;
    updateDisplaySettings({
      metadataVisibility: {
        ...current,
        [key]: !current[key]
      }
    });
  };

  const handleShowAllPreviewMetadata = () => {
    const allOn: SongMetadataVisibility = {
      title: true,
      artist: true,
      language: true,
      duration: true,
      tags: true,
      ccli: true,
      copyright: true,
      controlsBar: true,
      notes: true,
      actions: true,
      vocalArrangement: true,
      sectionHeaders: true,
    };
    updateDisplaySettings({ metadataVisibility: allOn });
    notify('Toutes les métadonnées sont affichées (aperçu & mode scène)');
  };

  const handleHideAllPreviewMetadata = () => {
    const allOff: SongMetadataVisibility = {
      title: false,
      artist: false,
      language: false,
      duration: false,
      tags: false,
      ccli: false,
      copyright: false,
      controlsBar: false,
      notes: false,
      actions: false,
      vocalArrangement: false,
      sectionHeaders: false,
    };
    updateDisplaySettings({ metadataVisibility: allOff });
    notify('Toutes les métadonnées sont masquées (aperçu & mode scène)');
  };

  const activeMetadataCount = Object.values(previewMetadata).filter(Boolean).length;

  // Données du chant témoin Lorem Ipsum enrichi avec métadonnées variées et complètes
  const activeSongData = useMemo(() => {
    return {
      title: 'Lorem Ipsum Dolor Sit Amet',
      artist: 'Consectetur Adipiscing & Band',
      language: 'Latin',
      duration: '04:45',
      tags: ['Lorem Ipsum', 'Adoration', 'Praise & Worship', 'Exemple Multisection'],
      key: 'G',
      tempo: 118,
      ccli: '4829105',
      copyright: '© 2026 Lorem Ipsum Publishing / Dolor Sit Records (Admin. Praise Rights)',
      notes: 'Intro douce au piano arpégé. Montée en puissance sur le Pré-refrain, tutti puissant au Refrain, envolée sur l\'Instrumental et fin délicate sur le Tag.',
    };
  }, []);

  const langMeta = getLanguageMeta(activeSongData.language);

  // Définition complète des 9 sections du chant témoin Lorem Ipsum (Intro, Couplet, Pré-refrain, Refrain, Pont, Instrumental, Tag, Outro, Spécial)
  interface LoremSectionItem {
    pairs: Array<{ chord?: string; lyrics: string }>;
  }

  interface LoremSection {
    key: keyof SectionColors;
    badge: string;
    vocalArrangement?: string;
    items: LoremSectionItem[];
  }

  const LOREM_SECTIONS: LoremSection[] = [
    {
      key: 'intro',
      badge: 'INTRO',
      vocalArrangement: 'Piano seul',
      items: [
        {
          pairs: [
            { chord: 'G', lyrics: '(Arpège doux ' },
            { chord: 'C/G', lyrics: 'au piano et ' },
            { chord: 'G', lyrics: 'nappe atmosphérique ' },
            { chord: 'D/F#', lyrics: 'de synthétiseur)' }
          ]
        }
      ]
    },
    {
      key: 'verse',
      badge: 'COUPLET 1',
      vocalArrangement: 'Voix unisson',
      items: [
        {
          pairs: [
            { chord: 'G', lyrics: 'Lorem ipsum dolor sit ' },
            { chord: 'Em7', lyrics: 'amet, consectetur adipiscing elit,' }
          ]
        },
        {
          pairs: [
            { chord: 'Cadd9', lyrics: 'Sed do eiusmod tempor incididunt ' },
            { chord: 'D', lyrics: 'ut labore et dolore magna.' }
          ]
        }
      ]
    },
    {
      key: 'preChorus',
      badge: 'PRÉ-REFRAIN',
      vocalArrangement: 'Harmonies',
      items: [
        {
          pairs: [
            { chord: 'Am7', lyrics: 'Quis autem vel eum iure ' },
            { chord: 'C', lyrics: 'reprehenderit in ea voluptate,' }
          ]
        },
        {
          pairs: [
            { chord: 'Em7', lyrics: 'Velit esse quam ' },
            { chord: 'Dsus4', lyrics: 'nihil molestiae ' },
            { chord: 'D', lyrics: 'consequatur!' }
          ]
        }
      ]
    },
    {
      key: 'chorus',
      badge: 'REFRAIN',
      vocalArrangement: 'Tutti (Chœur)',
      items: [
        {
          pairs: [
            { chord: 'G', lyrics: 'Duis aute irure dolor in ' },
            { chord: 'D/F#', lyrics: 'reprehenderit in voluptate,' }
          ]
        },
        {
          pairs: [
            { chord: 'Em7', lyrics: 'Cillum dolore eu fugiat nulla ' },
            { chord: 'Cadd9', lyrics: 'pariatur excepteur sint!' }
          ]
        }
      ]
    },
    {
      key: 'bridge',
      badge: 'PONT',
      vocalArrangement: 'Lead + Écho',
      items: [
        {
          pairs: [
            { chord: 'Em', lyrics: 'Nemo enim ipsam voluptatem ' },
            { chord: 'C', lyrics: 'quia voluptas sit aspernatur,' }
          ]
        },
        {
          pairs: [
            { chord: 'G', lyrics: 'Neque porro quisquam est qui ' },
            { chord: 'D/F#', lyrics: 'dolorem ipsum quia dolor.' }
          ]
        }
      ]
    },
    {
      key: 'instrumental',
      badge: 'INSTRUMENTAL',
      vocalArrangement: 'Solo Guitare',
      items: [
        {
          pairs: [
            { chord: 'Cadd9', lyrics: '(Solo de guitare ' },
            { chord: 'Em7', lyrics: 'électrique ou ' },
            { chord: 'Dsus4', lyrics: 'envolée orchestrale ' },
            { chord: 'G', lyrics: 'tutti)' }
          ]
        }
      ]
    },
    {
      key: 'tag',
      badge: 'TAG / CODA',
      vocalArrangement: 'A cappella',
      items: [
        {
          pairs: [
            { chord: 'C', lyrics: 'In aeternum ' },
            { chord: 'D', lyrics: 'et in saecula saeculorum, ' },
            { chord: 'G', lyrics: 'amen.' }
          ]
        }
      ]
    },
    {
      key: 'outro',
      badge: 'OUTRO',
      vocalArrangement: 'Tenu',
      items: [
        {
          pairs: [
            { chord: 'G', lyrics: 'Pellentesque ' },
            { chord: 'C', lyrics: 'habitant morbi ' },
            { chord: 'G/B', lyrics: 'tristique senectus, ' },
            { chord: 'D', lyrics: 'decrescendo ' },
            { chord: 'G', lyrics: 'pianissimo.' }
          ]
        }
      ]
    },
    {
      key: 'general',
      badge: 'SPÉCIAL / INTERLUDE',
      vocalArrangement: 'Spontané',
      items: [
        {
          pairs: [
            { chord: 'Em7', lyrics: 'Ad libitum ' },
            { chord: 'D/F#', lyrics: '— transition libre ' },
            { chord: 'G', lyrics: 'et prière ' },
            { chord: 'C', lyrics: 'spontanée.' }
          ]
        }
      ]
    }
  ];

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
        {selectedPreviewElement && (
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
        )}

        {/* Panneau de sélection interactive des métadonnées de l'aperçu */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-[#16161B]/95 border border-[#282834] space-y-2.5 shadow-md">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-xs font-bold text-white">
                Métadonnées affichées (Aperçu & Mode Scène) :
              </span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-1.5 py-0.5 rounded-full bg-blue-950/70 text-blue-300 border border-blue-500/30 font-mono text-[10px] font-bold">
                  {activeMetadataCount}/{METADATA_TOGGLE_ITEMS.length}
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-[10px] font-medium" title="Tout changement est sauvegardé automatiquement et appliqué immédiatement dans le lecteur de chants / mode scène">
                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                  <span>Enregistré auto</span>
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs pl-0 sm:pl-2 sm:border-l sm:border-[#2C2C38]">
                <button
                  type="button"
                  onClick={handleShowAllPreviewMetadata}
                  className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                  title="Afficher toutes les métadonnées dans l'aperçu et le mode scène"
                >
                  Tout afficher
                </button>
                <span className="text-gray-600">•</span>
                <button
                  type="button"
                  onClick={handleHideAllPreviewMetadata}
                  className="text-[11px] font-semibold text-gray-400 hover:text-gray-300 transition-colors cursor-pointer"
                  title="Masquer toutes les métadonnées dans l'aperçu et le mode scène"
                >
                  Tout masquer
                </button>
              </div>
            </div>
          </div>

          {/* Boutons Pills de filtre métadonnées */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {METADATA_TOGGLE_ITEMS.map((item) => {
              const isVisible = previewMetadata[item.key] !== false;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => togglePreviewMetadata(item.key)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border active:scale-95 ${
                    isVisible
                      ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 hover:bg-blue-600/30 shadow-xs ring-1 ring-blue-500/20'
                      : 'bg-[#121216] text-gray-500 border-[#25252D] hover:text-gray-300 hover:border-gray-600 line-through opacity-70'
                  }`}
                  title={`${isVisible ? 'Cliquer pour masquer' : 'Cliquer pour afficher'} ${item.label} (sauvegardé automatiquement pour l'aperçu & le mode scène)`}
                >
                  {item.key === 'sectionHeaders' && <Layers className="w-3 h-3 text-blue-400" />}
                  {item.key === 'title' && <Heading1 className="w-3 h-3 text-blue-400" />}
                  {item.key === 'language' && <Globe className="w-3 h-3 text-blue-400" />}
                  {item.key === 'duration' && <Clock className="w-3 h-3 text-cyan-400" />}
                  {item.key === 'artist' && <Type className="w-3 h-3 text-gray-300" />}
                  {item.key === 'tags' && <Tag className="w-3 h-3 text-blue-400" />}
                  {item.key === 'ccli' && <Shield className="w-3 h-3 text-blue-400" />}
                  {item.key === 'copyright' && <Copyright className="w-3 h-3 text-emerald-400" />}
                  {item.key === 'controlsBar' && <Music className="w-3 h-3 text-amber-400" />}
                  {item.key === 'notes' && <Bookmark className="w-3 h-3 text-emerald-400" />}
                  {item.key === 'actions' && <Maximize2 className="w-3 h-3 text-purple-400" />}
                  {item.key === 'vocalArrangement' && <Mic className="w-3 h-3 text-purple-400" />}
                  <span>{item.label}</span>
                  {isVisible ? (
                    <Check className="w-2.5 h-2.5 text-blue-400 ml-0.5 stroke-[3]" />
                  ) : (
                    <EyeOff className="w-2.5 h-2.5 text-gray-500 ml-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Palette d'accès direct aux couleurs des 9 sections */}
          <div className="pt-2 border-t border-[#252530] flex flex-col gap-2">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <Palette className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-xs font-bold text-white">Couleurs des sections :</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {SECTION_TYPES_LIST.map((secMeta) => {
                const color = sectionColors[secMeta.key] || '#3b82f6';
                const isSelected = selectedPreviewElement?.type === 'sectionHeader' && selectedPreviewElement.sectionType === secMeta.key;
                return (
                  <button
                    key={secMeta.key}
                    type="button"
                    onClick={() => {
                      setSelectedPreviewElement({
                        type: 'sectionHeader',
                        sectionType: secMeta.key,
                        label: `Badge : ${secMeta.label}`
                      });
                    }}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all border cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-blue-500 scale-105 shadow-md'
                        : 'hover:scale-105 hover:border-gray-500'
                    }`}
                    style={{
                      color: color,
                      borderColor: `${color}60`,
                      backgroundColor: `${color}18`
                    }}
                    title={`Personnaliser la couleur de : ${secMeta.label} (${color})`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: color }} />
                    <span>{secMeta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* En-tête du chant reproduisant fidèlement SongReader */}
        <div className="border-b border-[#222224] pb-2.5 flex flex-col gap-2">
          {/* Ligne 1: Titre, Langue, Durée & Boutons d'action */}
          <div className="flex items-start justify-between gap-2 sm:gap-3 mb-0.5">
            <div className="flex-1 min-w-0 pr-1 sm:pr-2">
              <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mb-0.5">
                {previewMetadata.title !== false && (
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
                    style={{ fontSize: `clamp(17px, 3.8vw, ${typography.titleSize}px)` }}
                    title="Cliquer pour modifier la taille du titre"
                  >
                    {stripParentheses(activeSongData.title)}
                  </h3>
                )}

                {/* Badge Langue */}
                {previewMetadata.language && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPreviewElement({ type: 'metadata', label: 'Badge Langue' });
                    }}
                    className={`inline-flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-bold transition-all shadow-xs cursor-pointer ${
                      selectedPreviewElement?.type === 'metadata' ? 'ring-2 ring-blue-500' : 'hover:scale-105'
                    } ${langMeta.badgeClass}`}
                    title={`Langue : ${langMeta.name} (${langMeta.code}) - Cliquer pour ajuster la taille`}
                  >
                    <Globe className="w-3.5 h-3.5 shrink-0" />
                    <span className="leading-none text-[11px] font-bold tracking-tight">{langMeta.code}</span>
                  </div>
                )}

                {/* Badge Durée */}
                {previewMetadata.duration && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPreviewElement({ type: 'metadata', label: 'Badge Durée' });
                    }}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-gray-300 shadow-xs cursor-pointer transition-all ${
                      selectedPreviewElement?.type === 'metadata' ? 'ring-2 ring-blue-500' : 'hover:scale-105'
                    } ${
                      effectivePreviewTheme === 'light'
                        ? 'bg-gray-100 border-gray-300 text-gray-700'
                        : 'bg-[#18181C] border-[#2A2A30]'
                    }`}
                    style={{ fontSize: `${typography.metadataSize}px` }}
                    title={`Durée estimée : ${activeSongData.duration} - Cliquer pour ajuster la taille`}
                  >
                    <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="text-cyan-300 font-bold font-mono text-xs">
                      {activeSongData.duration}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Boutons d'action rapides (Plein écran, Éditer, PDF, Options) */}
            {previewMetadata.actions && (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPreviewElement({ type: 'metadata', label: 'Boutons d\'action du lecteur' });
                }}
                className={`flex items-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer rounded-lg p-0.5 transition-all ${
                  selectedPreviewElement?.type === 'metadata' && selectedPreviewElement.label.includes('action')
                    ? 'ring-2 ring-blue-500 bg-blue-500/10'
                    : 'hover:bg-white/5'
                }`}
                title="Boutons d'action du lecteur de scène"
              >
                <div className="p-1.5 rounded-lg border text-xs font-medium flex items-center justify-center bg-[#1C1C1E] text-gray-300 border-[#333]">
                  <Maximize2 className="w-3.5 h-3.5" />
                </div>
                <div className="p-1.5 rounded-lg bg-[#1C1C1E] border border-[#333] text-gray-200 flex items-center justify-center">
                  <Settings2 className="w-3.5 h-3.5" />
                </div>
              </div>
            )}
          </div>

          {/* Ligne 2: Artiste, Catégories, CCLI & Copyright */}
          {(previewMetadata.artist || (previewMetadata.tags && activeSongData.tags.length > 0) || (previewMetadata.ccli && activeSongData.ccli) || (previewMetadata.copyright && activeSongData.copyright)) && (
            <div className="w-full flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1 text-xs">
              {previewMetadata.artist && (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPreviewElement({ type: 'metadata', label: 'Artiste' });
                  }}
                  className={`font-medium break-words shrink-0 cursor-pointer transition-all rounded px-1.5 py-0.5 -mx-1.5 ${
                    selectedPreviewElement?.type === 'metadata'
                      ? 'ring-2 ring-blue-500 bg-blue-500/20 text-blue-200'
                      : 'hover:ring-1 hover:ring-blue-400/50 hover:bg-blue-500/5'
                  } ${
                    effectivePreviewTheme === 'light' ? 'text-gray-600' : 'text-gray-300'
                  }`}
                  style={{ fontSize: `${typography.metadataSize}px` }}
                  title="Cliquer pour modifier la taille des métadonnées"
                >
                  {activeSongData.artist}
                </div>
              )}

              {previewMetadata.tags && activeSongData.tags.length > 0 && (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPreviewElement({ type: 'metadata', label: 'Catégories / Tags' });
                  }}
                  className={`w-full sm:w-auto flex items-center gap-1 sm:gap-1.5 flex-wrap cursor-pointer ${
                    previewMetadata.artist ? 'sm:border-l sm:border-[#2A2A2E] sm:pl-2' : ''
                  }`}
                  style={{ fontSize: `${typography.metadataSize}px` }}
                  title="Catégories du chant - Cliquer pour ajuster la taille"
                >
                  {activeSongData.tags.map((cat, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-gray-300 font-medium shadow-xs transition-all ${
                        selectedPreviewElement?.type === 'metadata' ? 'ring-1 ring-blue-500' : ''
                      } ${
                        effectivePreviewTheme === 'light'
                          ? 'bg-gray-100 border-gray-300 text-gray-700'
                          : 'bg-[#18181C] border-[#2A2A30]'
                      }`}
                      style={{ fontSize: `${typography.metadataSize}px` }}
                    >
                      <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-400" />
                      <span>{cat}</span>
                    </span>
                  ))}
                </div>
              )}

              {previewMetadata.ccli && activeSongData.ccli && (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPreviewElement({ type: 'metadata', label: 'CCLI' });
                  }}
                  className={`flex items-center gap-1 cursor-pointer ${
                    (previewMetadata.artist || (previewMetadata.tags && activeSongData.tags.length > 0)) ? 'sm:border-l sm:border-[#2A2A2E] sm:pl-2' : ''
                  }`}
                  style={{ fontSize: `${typography.metadataSize}px` }}
                  title="Numéro CCLI SongSelect"
                >
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border font-semibold shadow-xs ${
                      effectivePreviewTheme === 'light'
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-[#18181C] border-[#2A2A30] text-blue-300 font-mono'
                    }`}
                    style={{ fontSize: `${typography.metadataSize}px` }}
                  >
                    <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-400 shrink-0" />
                    <span>CCLI #{activeSongData.ccli}</span>
                  </span>
                </div>
              )}

              {previewMetadata.copyright && activeSongData.copyright && (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPreviewElement({ type: 'metadata', label: 'Copyright' });
                  }}
                  className={`flex items-center gap-1 cursor-pointer ${
                    ((previewMetadata.artist || (previewMetadata.tags && activeSongData.tags.length > 0) || (previewMetadata.ccli && activeSongData.ccli))) ? 'sm:border-l sm:border-[#2A2A2E] sm:pl-2' : ''
                  }`}
                  style={{ fontSize: `${typography.metadataSize}px` }}
                  title={`Copyright : ${activeSongData.copyright}`}
                >
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border shadow-xs max-w-[220px] truncate ${
                      effectivePreviewTheme === 'light'
                        ? 'bg-gray-100 border-gray-300 text-gray-700'
                        : 'bg-[#18181C] border-[#2A2A30] text-gray-400'
                    }`}
                    style={{ fontSize: `${typography.metadataSize}px` }}
                  >
                    <Copyright className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-500 shrink-0" />
                    <span className="truncate">{activeSongData.copyright}</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Ligne 3: Barre de contrôles (Tonalité, Transposition, BPM) */}
          {previewMetadata.controlsBar && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPreviewElement({ type: 'metadata', label: 'Barre Tonalité & Tempo' });
              }}
              className={`flex items-center gap-2 flex-wrap cursor-pointer rounded-lg p-0.5 transition-all ${
                selectedPreviewElement?.type === 'metadata' && selectedPreviewElement.label.includes('Tonalité')
                  ? 'ring-2 ring-blue-500 bg-blue-500/10'
                  : ''
              }`}
              style={{ fontSize: `${typography.metadataSize}px` }}
              title="Barre de contrôles de tonalité et tempo - Cliquer pour ajuster la taille"
            >
              {/* Tonalité */}
              <div 
                className={`min-h-[32px] py-1 inline-flex items-center gap-1.5 px-2.5 rounded-lg border font-mono shadow-xs ${
                  effectivePreviewTheme === 'light'
                    ? 'bg-gray-100 border-gray-300 text-gray-700'
                    : 'bg-[#141416] border-[#242428] text-gray-300'
                }`}
                style={{ fontSize: `${typography.metadataSize}px` }}
              >
                <Music className="w-3.5 h-3.5 text-blue-400 shrink-0" style={{ width: `${Math.max(12, Math.round(typography.metadataSize * 0.9))}px`, height: `${Math.max(12, Math.round(typography.metadataSize * 0.9))}px` }} />
                <span className="text-gray-400 font-sans hidden sm:inline" style={{ fontSize: `${typography.metadataSize}px` }}>Tonalité :</span>
                <span className="text-blue-400 font-bold font-mono" style={{ fontSize: `${typography.metadataSize}px` }}>
                  {stageSettings.notation === 'latin' ? (LATIN_NOTES[activeSongData.key] || activeSongData.key) : activeSongData.key}
                </span>
                <ChevronDown className="w-3 h-3 text-blue-400/80" style={{ width: `${Math.max(11, Math.round(typography.metadataSize * 0.8))}px`, height: `${Math.max(11, Math.round(typography.metadataSize * 0.8))}px` }} />
              </div>

              {/* Transpose */}
              <div 
                className={`min-h-[32px] py-1 inline-flex items-center gap-1.5 px-2.5 rounded-lg border font-mono shadow-xs ${
                  effectivePreviewTheme === 'light'
                    ? 'bg-gray-100 border-gray-300 text-gray-700'
                    : 'bg-[#141416] border-[#242428] text-gray-300'
                }`}
                style={{ fontSize: `${typography.metadataSize}px` }}
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-amber-400 shrink-0" style={{ width: `${Math.max(12, Math.round(typography.metadataSize * 0.9))}px`, height: `${Math.max(12, Math.round(typography.metadataSize * 0.9))}px` }} />
                <span className="text-amber-400/90 font-sans shrink-0 hidden sm:inline" style={{ fontSize: `${typography.metadataSize}px` }}>Transpose :</span>
                <span className={`px-1.5 py-0.5 rounded font-mono font-bold ${
                  stageSettings.transposeOffset !== 0
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : effectivePreviewTheme === 'light' ? 'bg-gray-200 text-gray-700' : 'bg-[#18181C] text-gray-300 border border-[#242428]'
                }`}
                style={{ fontSize: `${typography.metadataSize}px` }}
                >
                  {stageSettings.transposeOffset === 0 ? '0' : (stageSettings.transposeOffset > 0 ? `+${stageSettings.transposeOffset}` : `${stageSettings.transposeOffset}`)}
                </span>
                <ChevronDown className="w-3 h-3 text-amber-400/80" style={{ width: `${Math.max(11, Math.round(typography.metadataSize * 0.8))}px`, height: `${Math.max(11, Math.round(typography.metadataSize * 0.8))}px` }} />
              </div>

              {/* Tempo */}
              <div 
                className={`min-h-[32px] py-1 inline-flex items-center gap-1.5 px-2.5 rounded-lg border font-mono shadow-xs ${
                  effectivePreviewTheme === 'light'
                    ? 'bg-gray-100 border-gray-300 text-gray-700'
                    : 'bg-[#141416] border-[#242428] text-gray-300'
                }`}
                style={{ fontSize: `${typography.metadataSize}px` }}
              >
                <Gauge className="w-3.5 h-3.5 text-emerald-400 shrink-0" style={{ width: `${Math.max(12, Math.round(typography.metadataSize * 0.9))}px`, height: `${Math.max(12, Math.round(typography.metadataSize * 0.9))}px` }} />
                <span className="text-gray-400 font-sans hidden sm:inline" style={{ fontSize: `${typography.metadataSize}px` }}>Tempo :</span>
                <span className="text-emerald-400 font-bold font-mono" style={{ fontSize: `${typography.metadataSize}px` }}>{activeSongData.tempo}</span>
                <span className="text-gray-400 font-mono" style={{ fontSize: `${Math.max(10, Math.round(typography.metadataSize * 0.9))}px` }}>BPM</span>
                <ChevronDown className="w-3 h-3 text-emerald-400/80" style={{ width: `${Math.max(11, Math.round(typography.metadataSize * 0.8))}px`, height: `${Math.max(11, Math.round(typography.metadataSize * 0.8))}px` }} />
              </div>
            </div>
          )}

          {/* Ligne 4: Note / Remarques */}
          {previewMetadata.notes && activeSongData.notes && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPreviewElement({ type: 'metadata', label: 'Note du chant' });
              }}
              className={`mt-1 p-2 rounded-lg border flex items-start gap-2.5 transition-all text-xs cursor-pointer ${
                selectedPreviewElement?.type === 'metadata' && selectedPreviewElement.label.includes('Note')
                  ? 'ring-2 ring-blue-500'
                  : ''
              } ${
                effectivePreviewTheme === 'light'
                  ? 'bg-amber-50/60 border-amber-200/80'
                  : 'bg-[#111112] border-[#222224]'
              }`}
              style={{ fontSize: `${Math.max(11, typography.metadataSize)}px` }}
              title="Note du chant - Cliquer pour ajuster la taille"
            >
              <div className="text-gray-300 font-sans italic flex-1">
                <span className="text-amber-400/90 font-semibold not-italic mr-1.5">Note :</span>
                <span className={effectivePreviewTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}>
                  {activeSongData.notes}
                </span>
              </div>
            </div>
          )}
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
          {LOREM_SECTIONS.map((sec) => {
            const isCardSelected = selectedPreviewElement?.type === 'sectionCard' && selectedPreviewElement.sectionType === sec.key;
            const isHeaderSelected = selectedPreviewElement?.type === 'sectionHeader' && selectedPreviewElement.sectionType === sec.key;
            const currentSecColor = sectionColors[sec.key] || '#3b82f6';

            return (
              <div 
                key={sec.key}
                onClick={() => {
                  setSelectedPreviewElement({
                    type: 'sectionCard',
                    sectionType: sec.key,
                    label: `Cadre & Espacement : ${sec.badge}`
                  });
                }}
                className={`rounded-lg ${previewPadding} transition-all cursor-pointer ${
                  isCardSelected
                    ? 'ring-2 ring-blue-500 bg-blue-500/10 shadow-sm'
                    : 'hover:ring-2 hover:ring-blue-400/50 hover:bg-blue-500/5'
                }`}
                style={getSectionBorderStyles(currentSecColor, sectionBorders)}
                title={`Section ${sec.badge} - Cliquer pour ajuster la bordure et l'espacement`}
              >
                {(previewMetadata.sectionHeaders !== false || previewMetadata.vocalArrangement) && (
                  <div className={`${previewHeaderMb} flex items-center justify-between gap-2 flex-wrap`}>
                    {previewMetadata.sectionHeaders !== false && (
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPreviewElement({
                            type: 'sectionHeader',
                            sectionType: sec.key,
                            label: `Badge : ${sec.badge}`
                          });
                        }}
                        className={`inline-block font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border shadow-xs select-none cursor-pointer transition-all ${
                          isHeaderSelected
                            ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0E0E10] scale-105'
                            : 'hover:scale-105 hover:ring-1 hover:ring-blue-400/60'
                        }`}
                        style={{
                          fontSize: `${typography.headerSize}px`,
                          color: currentSecColor,
                          borderColor: `${currentSecColor}50`,
                          backgroundColor: `${currentSecColor}1C`
                        }}
                        title={`Cliquer pour modifier la couleur et la taille du badge ${sec.badge}`}
                      >
                        {sec.badge}
                      </span>
                    )}

                    {previewMetadata.vocalArrangement && sec.vocalArrangement && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPreviewElement({
                            type: 'metadata',
                            label: `Arrangement vocal (${sec.vocalArrangement})`
                          });
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1B1626] border border-purple-500/30 text-purple-300 text-[11px] font-medium shadow-xs hover:bg-purple-950/60 transition-colors"
                        title="Arrangement vocal de la section"
                      >
                        <Mic className="w-3 h-3 text-purple-400 shrink-0" />
                        <span>{sec.vocalArrangement}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  {sec.items.map((line, lIdx) => (
                    <div key={lIdx} className="flex flex-wrap items-end">
                      {line.pairs.map((pair, pIdx) => {
                        const displayedChord = pair.chord
                          ? transposeChord(pair.chord, stageSettings.transposeOffset, stageSettings.notation)
                          : '';

                        return (
                          <div key={pIdx} className="inline-flex flex-col items-start">
                            {stageSettings.showChords && (
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPreviewElement({ type: 'chord', label: 'Accords' });
                                }}
                                className={`font-mono font-bold leading-none mb-1 cursor-pointer transition-all rounded px-0.5 select-none ${
                                  selectedPreviewElement?.type === 'chord'
                                    ? 'ring-2 ring-blue-500 bg-blue-500/20'
                                    : 'hover:ring-1 hover:ring-blue-400/60 hover:bg-blue-500/10'
                                } ${displayedChord ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                                style={{ fontSize: `${typography.chordSize}px`, color: chordColor }}
                                title="Cliquer pour modifier la taille et la couleur des accords"
                              >
                                {displayedChord || '\u00A0'}
                              </span>
                            )}
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPreviewElement({ type: 'lyrics', label: 'Paroles' });
                              }}
                              className={`font-sans cursor-pointer transition-all rounded whitespace-pre ${
                                selectedPreviewElement?.type === 'lyrics'
                                  ? 'ring-2 ring-blue-500 bg-blue-500/15'
                                  : 'hover:ring-1 hover:ring-blue-400/50 hover:bg-blue-500/5'
                              } ${effectivePreviewTheme === 'light' ? 'text-[#18181B]' : 'text-[#E0E0E0]'}`}
                              style={{ fontSize: `${typography.lyricsSize}px` }}
                              title="Cliquer pour modifier la taille et l'interligne des paroles"
                            >
                              {pair.lyrics || (pair.chord ? '\u00A0' : '')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Song Sheet Legal Footer: CCLI & Copyright */}
        {((previewMetadata.ccli && activeSongData.ccli) || (previewMetadata.copyright && activeSongData.copyright)) && (
          <div className="mt-6 pt-3 border-t border-[#222226] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-gray-400">
            {previewMetadata.copyright && activeSongData.copyright && (
              <div className="flex items-center gap-1.5 text-gray-400 min-w-0">
                <Copyright className="w-3 h-3 text-gray-500 shrink-0" />
                <span className="truncate">{activeSongData.copyright}</span>
              </div>
            )}
            {previewMetadata.ccli && activeSongData.ccli && (
              <div className="flex items-center gap-1.5 shrink-0 sm:ml-auto">
                <Shield className="w-3 h-3 text-blue-400 shrink-0" />
                <span>
                  Chant CCLI N°{' '}
                  <span className="font-mono font-bold text-blue-400">
                    {activeSongData.ccli}
                  </span>
                </span>
              </div>
            )}
          </div>
        )}
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
                <div>
                  <span className="text-xs font-bold text-gray-200 block">Disposition</span>
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

          {/* 2. PERSONNALISATION VISUELLE INTERACTIVE */}
          <div className="bg-[#111112] border border-[#222224] rounded-xl overflow-hidden shadow-sm transition-colors hover:border-[#303036]">
            {/* Header / Trigger */}
            <div 
              onClick={() => {
                setIsMobilePreviewFullscreen(true);
                setIsMobilePreviewCollapsed(false);
              }}
              className="w-full text-left p-3.5 sm:p-4.5 flex items-center justify-between gap-3 cursor-pointer transition-colors hover:bg-[#151518]/50 select-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <MousePointerClick className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-white truncate">
                  Personnalisation Visuelle Interactive
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMobilePreviewFullscreen(true);
                    setIsMobilePreviewCollapsed(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all active:scale-95 shadow-sm cursor-pointer"
                  title="Ouvrir l'aperçu interactif en plein écran"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Ouvrir en Plein Écran</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. CARTES DE CHANTS - VISIBILITE DES METADONNEES DANS LA BIBLIOTHEQUE */}
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

              {/* N° CCLI */}
              <div className="p-3 rounded-lg bg-[#18181A] border border-[#262629] flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                    <Shield className="w-3 h-3 text-blue-400" />
                  </span>
                  <span className="text-xs font-bold text-gray-200">Numéro CCLI</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !songCardMetadata?.showCcli;
                    updateSongCardMetadata({ showCcli: next });
                    notify(next ? 'N° CCLI activé sur les cartes' : 'N° CCLI masqué sur les cartes');
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    songCardMetadata?.showCcli
                      ? 'bg-blue-600 text-white border-blue-500 shadow-xs hover:bg-blue-500'
                      : 'metadata-toggle-btn-inactive bg-[#121214] text-gray-400 border-[#2B2B30] hover:text-white'
                  }`}
                  title={songCardMetadata?.showCcli ? 'Cliquer pour masquer le CCLI' : 'Cliquer pour afficher le CCLI'}
                >
                  {songCardMetadata?.showCcli ? (
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

              {/* Copyright */}
              <div className="p-3 rounded-lg bg-[#18181A] border border-[#262629] flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                    <Copyright className="w-3 h-3 text-emerald-400" />
                  </span>
                  <span className="text-xs font-bold text-gray-200">Copyright & Droits</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !songCardMetadata?.showCopyright;
                    updateSongCardMetadata({ showCopyright: next });
                    notify(next ? 'Copyright activé sur les cartes' : 'Copyright masqué sur les cartes');
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    songCardMetadata?.showCopyright
                      ? 'bg-blue-600 text-white border-blue-500 shadow-xs hover:bg-blue-500'
                      : 'metadata-toggle-btn-inactive bg-[#121214] text-gray-400 border-[#2B2B30] hover:text-white'
                  }`}
                  title={songCardMetadata?.showCopyright ? 'Cliquer pour masquer le copyright' : 'Cliquer pour afficher le copyright'}
                >
                  {songCardMetadata?.showCopyright ? (
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
            </div>

            {/* Apercu en direct de la vignette de chant */}
            <div className="mt-4 pt-3 border-t border-[#222224]">
              <div className="text-[11px] text-gray-400 mb-2 font-medium flex items-center justify-between">
                <span>Aperçu de la vignette de chant</span>
                <span className="text-[10px] text-gray-500">
                  {!songCardMetadata?.showKey && !songCardMetadata?.showTempo && !songCardMetadata?.showDuration && !songCardMetadata?.showCategories && !songCardMetadata?.showCcli && !songCardMetadata?.showCopyright
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

                {((songCardMetadata?.showKey) || (songCardMetadata?.showTempo) || (songCardMetadata?.showDuration) || (songCardMetadata?.showCcli) || (songCardMetadata?.showCopyright)) && (
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
                    {songCardMetadata?.showCcli && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-950/50 border border-blue-500/30 text-blue-300 text-[9px] font-medium flex items-center gap-1 font-mono">
                        <Shield className="w-2.5 h-2.5 text-blue-400" />
                        #7117726
                      </span>
                    )}
                    {songCardMetadata?.showCopyright && (
                      <span className="px-1.5 py-0.5 rounded bg-[#1C1C1E] border border-[#222224] text-gray-400 text-[9px] font-medium flex items-center gap-1 truncate max-w-[130px]">
                        <Copyright className="w-2.5 h-2.5 text-gray-500 shrink-0" />
                        <span className="truncate">© Bethel</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>

          {/* 4. MIDI DEVICES & FOOT PEDAL CONTROLS */}
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
