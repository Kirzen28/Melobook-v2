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
  Footprints,
  Zap,
  RefreshCw,
  LayoutGrid,
  Gauge,
  Clock,
  Tag,
  Square,
  Heading1,
  FileText,
  Bookmark,
  AlignLeft,
  MoveVertical
} from 'lucide-react';
import { useMidi } from '../context/MidiContext';
import { MidiSettingsModal } from './MidiSettingsModal';
import { NumberSelector } from './NumberSelector';
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

interface QuickStepperProps {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
}

const QuickStepper: React.FC<QuickStepperProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = 'px',
  onChange
}) => {
  return (
    <div className="inline-flex items-center gap-1 bg-[#1A1A1E]/95 border border-[#383840] px-1.5 py-0.5 rounded-lg shadow-sm font-mono text-xs select-none shrink-0">
      {label && <span className="text-[10px] text-gray-400 font-sans font-medium mr-0.5">{label}</span>}
      <button
        type="button"
        onClick={() => onChange(Math.max(min, Number((value - step).toFixed(1))))}
        disabled={value <= min}
        className="w-5 h-5 flex items-center justify-center rounded bg-[#2A2A30] hover:bg-blue-600 disabled:opacity-30 text-gray-200 hover:text-white transition-colors active:scale-90 text-xs font-bold"
        title="Diminuer"
      >
        -
      </button>
      <span className="min-w-[32px] text-center text-[11px] font-bold text-white">
        {step < 1 ? value.toFixed(1) : value}{unit}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, Number((value + step).toFixed(1))))}
        disabled={value >= max}
        className="w-5 h-5 flex items-center justify-center rounded bg-[#2A2A30] hover:bg-blue-600 disabled:opacity-30 text-gray-200 hover:text-white transition-colors active:scale-90 text-xs font-bold"
        title="Augmenter"
      >
        +
      </button>
    </div>
  );
};

interface QuickSectionColorPickerProps {
  currentColor: string;
  onChange: (color: string) => void;
}

const QuickSectionColorPicker: React.FC<QuickSectionColorPickerProps> = ({
  currentColor,
  onChange
}) => {
  const quickColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#06B6D4'];
  return (
    <div className="inline-flex items-center gap-1.5 bg-[#1A1A1E]/95 border border-[#383840] px-2 py-0.5 rounded-lg shadow-sm shrink-0">
      <div className="flex items-center gap-1">
        {quickColors.map((hex) => {
          const isSelected = currentColor.toLowerCase() === hex.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              onClick={() => onChange(hex)}
              className={`w-4 h-4 rounded-full transition-transform active:scale-90 ${
                isSelected ? 'ring-2 ring-white scale-110 shadow-sm' : 'hover:scale-110 opacity-80 hover:opacity-100'
              }`}
              style={{ backgroundColor: hex }}
              title={hex}
            />
          );
        })}
      </div>
      <label 
        className="relative cursor-pointer ml-0.5 w-4 h-4 rounded-full border border-gray-400/50 flex items-center justify-center bg-gradient-to-tr from-pink-500 via-amber-400 to-blue-500 overflow-hidden shadow-xs hover:scale-110 transition-transform" 
        title="Couleur personnalisée"
      >
        <input
          type="color"
          value={currentColor}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
      </label>
    </div>
  );
};

interface ColorPickerPopoverProps {
  title: string;
  currentColor: string;
  defaultColor: string;
  onChange: (color: string) => void;
  onClose: () => void;
}

const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({
  title,
  currentColor,
  defaultColor,
  onChange,
  onClose
}) => {
  return (
    <>
      {/* Invisible backdrop for dismiss on outside click */}
      <div 
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]" 
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }} 
      />

      {/* Popover Card */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="color-picker-popover absolute right-0 top-full mt-2 z-50 p-3 rounded-xl bg-[#1C1C20] border border-[#333338] shadow-2xl w-64 max-w-[calc(100vw-2rem)] select-none animate-in fade-in zoom-in-95 duration-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2A2A30]">
          <div className="flex items-center gap-2 min-w-0">
            <span 
              className="w-3.5 h-3.5 rounded-full border border-white/30 shadow-xs shrink-0" 
              style={{ backgroundColor: currentColor }} 
            />
            <span className="text-xs font-bold text-white truncate">{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 16 Presets grid */}
        <div className="text-[10px] text-gray-400 font-semibold mb-1.5 flex items-center justify-between">
          <span>Nuancier rapide</span>
          <span className="text-[9px] text-gray-500 font-mono">16 teintes</span>
        </div>
        <div className="grid grid-cols-8 gap-1.5 mb-2.5">
          {COLOR_PRESETS.map((preset) => {
            const isSelected = currentColor.toLowerCase() === preset.value.toLowerCase();
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => onChange(preset.value)}
                className={`w-5 h-5 rounded-full transition-transform hover:scale-125 border cursor-pointer ${
                  isSelected ? 'border-white ring-2 ring-blue-500 scale-110 shadow-xs' : 'border-transparent'
                }`}
                style={{ backgroundColor: preset.value }}
                title={preset.name}
              />
            );
          })}
        </div>

        {/* Custom hex picker & default reset button */}
        <div className="pt-2 border-t border-[#2A2A30] flex items-center justify-between gap-2">
          <label 
            className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#24242A] hover:bg-[#2C2C32] text-xs font-mono text-gray-200 border border-[#3A3A40] transition-colors"
            title="Choisir une couleur personnalisée"
          >
            <span 
              className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
              style={{ backgroundColor: currentColor }}
            />
            <input
              type="color"
              value={currentColor}
              onChange={(e) => onChange(e.target.value)}
              className="sr-only"
            />
            <span className="uppercase text-[11px] font-semibold tracking-wider">{currentColor}</span>
          </label>

          {currentColor.toLowerCase() !== defaultColor.toLowerCase() && (
            <button
              type="button"
              onClick={() => onChange(defaultColor)}
              className="px-2 py-1 rounded-lg bg-[#24242A] hover:bg-[#2C2C32] text-gray-300 hover:text-white text-xs font-medium transition-colors cursor-pointer border border-[#3A3A40]"
              title={`Rétablir la couleur par défaut (${defaultColor})`}
            >
              Défaut
            </button>
          )}
        </div>
      </div>
    </>
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
    updateSongCardMetadata
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
  const [activeColorTarget, setActiveColorTarget] = useState<string | null>(null);

  // État des catégories pliables / dépliables sur tous les appareils (plié par défaut)
  type SettingsCategory = 
    | 'display'
    | 'song_cards'
    | 'typography'
    | 'borders'
    | 'colors'
    | 'midi'
    | 'duplicates';

  const [openCategories, setOpenCategories] = useState<Record<SettingsCategory, boolean>>({
    display: false,      // Plié par défaut sur tous les appareils
    song_cards: false,
    typography: false,
    borders: false,
    colors: false,
    midi: false,
    duplicates: false,
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
      typography: nextState,
      borders: nextState,
      colors: nextState,
      midi: nextState,
      duplicates: nextState,
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

  const toggleSectionBorder = (side: keyof SectionBorders) => {
    updateDisplaySettings({
      sectionBorders: {
        [side]: !sectionBorders[side]
      }
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

  const renderSongPreviewBody = (isFullscreen = false) => (
    <div className={`space-y-4 ${isFullscreen ? 'max-w-3xl mx-auto' : ''}`}>
      {/* Song Header Preview */}
      <div className="border-b border-[#222224] pb-2.5 flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex-1 min-w-0 flex items-center gap-2.5 flex-wrap">
            <h3 
              className={`font-bold tracking-tight leading-tight break-words ${
                effectivePreviewTheme === 'light' ? 'text-[#18181B]' : 'text-white'
              }`}
              style={{ fontSize: `${typography.titleSize}px` }}
            >
              {selectedSong ? selectedSong.title : 'Grâce Infinie'}
            </h3>
            <QuickStepper
              label="Titre"
              value={typography.titleSize}
              min={16}
              max={48}
              onChange={(val) => updateTypography('titleSize', val)}
            />
          </div>

          <div 
            className={`flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto px-2.5 py-1 rounded-lg font-mono shadow-sm ${
              effectivePreviewTheme === 'light'
                ? 'bg-gray-100 border border-gray-300 text-gray-700'
                : 'bg-[#141416] border border-[#242428] text-gray-300'
            }`}
            style={{ fontSize: `${typography.metadataSize}px` }}
          >
            <div className="flex items-center gap-1">
              <span className="text-gray-400">Tonalité :</span>
              <strong className="text-blue-500">G</strong>
            </div>
            <span className="text-gray-400">•</span>
            <strong>72 BPM</strong>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div 
            className={`font-medium break-words ${
              effectivePreviewTheme === 'light' ? 'text-gray-600' : 'text-gray-300'
            }`}
            style={{ fontSize: `${typography.metadataSize}px` }}
          >
            {selectedSong?.artist || 'John Newton'}
          </div>

          <QuickStepper
            label="Méta"
            value={typography.metadataSize}
            min={10}
            max={20}
            onChange={(val) => updateTypography('metadataSize', val)}
          />
        </div>
      </div>

      {/* Sections Container (1 to 5 columns preview) */}
      <div className={
        stageSettings.columns === 2
          ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 items-start'
          : stageSettings.columns === 3
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start'
          : stageSettings.columns === 4
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 items-start'
          : stageSettings.columns === 5
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 items-start'
          : 'space-y-4'
      }>
        {/* Section 1: Couplet */}
      <div 
        className="rounded-lg p-3 transition-all"
        style={getSectionBorderStyles(sectionColors.verse, sectionBorders)}
      >
        <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span 
              className="inline-block font-bold uppercase tracking-wider px-2 py-0.5 rounded border shadow-sm"
              style={{
                fontSize: `${typography.headerSize}px`,
                color: sectionColors.verse,
                borderColor: `${sectionColors.verse}50`,
                backgroundColor: `${sectionColors.verse}1C`
              }}
            >
              Couplet 1
            </span>

            <QuickStepper
              label="Badge"
              value={typography.headerSize}
              min={10}
              max={24}
              onChange={(val) => updateTypography('headerSize', val)}
            />
          </div>

          <QuickSectionColorPicker
            currentColor={sectionColors.verse}
            onChange={(color) => updateSectionColor('verse', color)}
          />
        </div>

        {/* Quick controls for Chords, Lyrics & Line Spacing */}
        <div className="flex items-center justify-between gap-2 flex-wrap py-1.5 px-2 mb-2 rounded-lg bg-black/20 border border-white/5 text-xs">
          <div className="flex items-center gap-2">
            <QuickStepper
              label="Accords"
              value={typography.chordSize}
              min={11}
              max={32}
              onChange={(val) => updateTypography('chordSize', val)}
            />
            <label
              className="w-5 h-5 rounded-md border border-white/20 shadow-xs cursor-pointer flex items-center justify-center transition-transform hover:scale-110 shrink-0"
              style={{ backgroundColor: chordColor }}
              title="Couleur des accords"
            >
              <input
                type="color"
                value={chordColor}
                onChange={(e) => updateChordColor(e.target.value)}
                className="sr-only"
              />
            </label>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <QuickStepper
              label="Paroles"
              value={typography.lyricsSize}
              min={12}
              max={36}
              onChange={(val) => updateTypography('lyricsSize', val)}
            />
            <QuickStepper
              label="Interligne"
              value={typography.lineSpacing}
              min={1.1}
              max={2.2}
              step={0.1}
              unit="x"
              onChange={(val) => updateTypography('lineSpacing', val)}
            />
          </div>
        </div>

        <div className="space-y-1 font-mono">
          <div className="inline-flex flex-col mr-2">
            {stageSettings.showChords && (
              <span 
                className="font-mono font-bold leading-none mb-1"
                style={{ fontSize: `${typography.chordSize}px`, color: chordColor }}
              >
                {transposeChord('G', 0, stageSettings.notation)}
              </span>
            )}
            <span 
              className={`font-sans ${effectivePreviewTheme === 'light' ? 'text-[#18181B]' : 'text-[#E0E0E0]'}`}
              style={{ fontSize: `${typography.lyricsSize}px` }}
            >
              Grâce infinie, au son si doux
            </span>
          </div>

          <div className="inline-flex flex-col">
            {stageSettings.showChords && (
              <span 
                className="font-mono font-bold leading-none mb-1"
                style={{ fontSize: `${typography.chordSize}px`, color: chordColor }}
              >
                {transposeChord('C', 0, stageSettings.notation)}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{transposeChord('G', 0, stageSettings.notation)}
              </span>
            )}
            <span 
              className={`font-sans ${effectivePreviewTheme === 'light' ? 'text-[#18181B]' : 'text-[#E0E0E0]'}`}
              style={{ fontSize: `${typography.lyricsSize}px` }}
            >
              qui sauva un rebelle comme moi !
            </span>
          </div>
        </div>
      </div>

      {/* Section 2: Refrain */}
      <div 
        className="rounded-lg p-3 transition-all"
        style={getSectionBorderStyles(sectionColors.chorus, sectionBorders)}
      >
        <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
          <span 
            className="inline-block font-bold uppercase tracking-wider px-2 py-0.5 rounded border shadow-sm"
            style={{
              fontSize: `${typography.headerSize}px`,
              color: sectionColors.chorus,
              borderColor: `${sectionColors.chorus}50`,
              backgroundColor: `${sectionColors.chorus}1C`
            }}
          >
            Refrain
          </span>

          <QuickSectionColorPicker
            currentColor={sectionColors.chorus}
            onChange={(color) => updateSectionColor('chorus', color)}
          />
        </div>

        <div className="space-y-1 font-mono">
          <div className="inline-flex flex-col mr-2">
            {stageSettings.showChords && (
              <span 
                className="font-mono font-bold leading-none mb-1"
                style={{ fontSize: `${typography.chordSize}px`, color: chordColor }}
              >
                {transposeChord('Em', 0, stageSettings.notation)}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{transposeChord('D', 0, stageSettings.notation)}
              </span>
            )}
            <span 
              className={`font-sans ${effectivePreviewTheme === 'light' ? 'text-[#18181B]' : 'text-[#E0E0E0]'}`}
              style={{ fontSize: `${typography.lyricsSize}px` }}
            >
              J'étais perdu mais je suis retrouvé,
            </span>
          </div>

          <div className="inline-flex flex-col">
            {stageSettings.showChords && (
              <span 
                className="font-mono font-bold leading-none mb-1"
                style={{ fontSize: `${typography.chordSize}px`, color: chordColor }}
              >
                {transposeChord('G', 0, stageSettings.notation)}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{transposeChord('D7', 0, stageSettings.notation)}&nbsp;&nbsp;&nbsp;{transposeChord('G', 0, stageSettings.notation)}
              </span>
            )}
            <span 
              className={`font-sans ${effectivePreviewTheme === 'light' ? 'text-[#18181B]' : 'text-[#E0E0E0]'}`}
              style={{ fontSize: `${typography.lyricsSize}px` }}
            >
              Aveugle et maintenant je vois.
            </span>
          </div>
        </div>
      </div>

      {/* Section 3: Pont */}
      <div 
        className="rounded-lg p-3 transition-all"
        style={getSectionBorderStyles(sectionColors.bridge, sectionBorders)}
      >
        <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
          <span 
            className="inline-block font-bold uppercase tracking-wider px-2 py-0.5 rounded border shadow-sm"
            style={{
              fontSize: `${typography.headerSize}px`,
              color: sectionColors.bridge,
              borderColor: `${sectionColors.bridge}50`,
              backgroundColor: `${sectionColors.bridge}1C`
            }}
          >
            Pont
          </span>

          <QuickSectionColorPicker
            currentColor={sectionColors.bridge}
            onChange={(color) => updateSectionColor('bridge', color)}
          />
        </div>

        <div className="space-y-1 font-mono">
          <div className="inline-flex flex-col">
            {stageSettings.showChords && (
              <span 
                className="font-mono font-bold leading-none mb-1"
                style={{ fontSize: `${typography.chordSize}px`, color: chordColor }}
              >
                {transposeChord('C', 0, stageSettings.notation)}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{transposeChord('G/B', 0, stageSettings.notation)}
              </span>
            )}
            <span 
              className={`font-sans ${effectivePreviewTheme === 'light' ? 'text-[#18181B]' : 'text-[#E0E0E0]'}`}
              style={{ fontSize: `${typography.lyricsSize}px` }}
            >
              Quand nous serons là-haut depuis dix mille ans,
            </span>
          </div>
        </div>
      </div>

      {/* Section 4: Outro */}
      <div 
        className="rounded-lg p-3 transition-all"
        style={getSectionBorderStyles(sectionColors.outro, sectionBorders)}
      >
        <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
          <span 
            className="inline-block font-bold uppercase tracking-wider px-2 py-0.5 rounded border shadow-sm"
            style={{
              fontSize: `${typography.headerSize}px`,
              color: sectionColors.outro,
              borderColor: `${sectionColors.outro}50`,
              backgroundColor: `${sectionColors.outro}1C`
            }}
          >
            Outro
          </span>

          <QuickSectionColorPicker
            currentColor={sectionColors.outro}
            onChange={(color) => updateSectionColor('outro', color)}
          />
        </div>

        <div className="space-y-1 font-mono">
          <div className="inline-flex flex-col">
            {stageSettings.showChords && (
              <span 
                className="font-mono font-bold leading-none mb-1"
                style={{ fontSize: `${typography.chordSize}px`, color: chordColor }}
              >
                {transposeChord('C', 0, stageSettings.notation)}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{transposeChord('G', 0, stageSettings.notation)}
              </span>
            )}
            <span 
              className={`font-sans ${effectivePreviewTheme === 'light' ? 'text-[#18181B]' : 'text-[#E0E0E0]'}`}
              style={{ fontSize: `${typography.lyricsSize}px` }}
            >
              À Dieu soit toute la gloire.
            </span>
          </div>
        </div>
      </div>
      </div>
    </div>
  );

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
            <div className="flex items-center gap-1.5">
              {/* Fullscreen Preview button */}
              <button
                id="btn-preview-fullscreen"
                type="button"
                onClick={() => {
                  setIsMobilePreviewFullscreen(true);
                  setIsMobilePreviewCollapsed(false);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold border transition-all bg-[#1E1E22] hover:bg-blue-600/20 text-blue-400 border-blue-500/30 active:scale-95 shadow-xs"
                title="Afficher l'aperçu en plein écran"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Plein écran</span>
              </button>

              <button
                onClick={() => updateStageSettings({ showChords: !stageSettings.showChords })}
                className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                  stageSettings.showChords
                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                    : 'bg-[#222] text-gray-400 border-[#333]'
                }`}
                title="Afficher ou masquer les accords dans l'aperçu"
              >
                {stageSettings.showChords ? 'Accords On' : 'Accords Off'}
              </button>

              {/* Collapse / expand toggle */}
              <button
                onClick={() => setIsMobilePreviewCollapsed(!isMobilePreviewCollapsed)}
                className="p-1 rounded bg-[#222226] text-gray-300 hover:text-white border border-[#333]"
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
              className={`p-4 overflow-y-auto max-h-[34vh] sm:max-h-[38vh] lg:max-h-[calc(100vh-190px)] lg:flex-1 space-y-4 transition-colors ${
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

          {/* 3. TYPOGRAPHY / FONT SIZES SECTION */}
          <div className="bg-[#111112] border border-[#222224] rounded-xl overflow-hidden shadow-sm transition-colors hover:border-[#303036]">
            {/* Header / Trigger */}
            <div 
              onClick={() => toggleCategory('typography')}
              className="w-full text-left p-3.5 sm:p-4.5 flex items-center justify-between gap-3 cursor-pointer transition-colors hover:bg-[#151518]/50 select-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                  <Type className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-white truncate">
                  Tailles de Police
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className={`p-1.5 rounded-lg bg-[#18181C] border border-[#2B2B30] text-gray-400 transition-transform duration-200 ${openCategories.typography ? 'rotate-180 text-purple-400 border-purple-500/30' : ''}`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Content (Collapsible on all devices) */}
            <div className={`p-4 sm:p-5 pt-0 sm:pt-0 ${openCategories.typography ? 'block' : 'hidden'}`}>
              <div className="border-t border-[#222224] mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              
                {/* Title Size */}
                <div className="p-3 rounded-lg bg-[#18181A] border border-[#262629] flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                      <Heading1 className="w-3 h-3 text-purple-400" />
                    </span>
                    <span className="text-xs font-bold text-gray-200 truncate" title="Titre de la Chanson">Titre de la Chanson</span>
                  </div>
                  <NumberSelector
                    value={typography.titleSize}
                    min={16}
                    max={48}
                    step={1}
                    onChange={(val) => updateTypography('titleSize', val)}
                  />
                </div>

                {/* Metadata Size */}
                <div className="p-3 rounded-lg bg-[#18181A] border border-[#262629] flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                      <FileText className="w-3 h-3 text-blue-400" />
                    </span>
                    <span className="text-xs font-bold text-gray-200 truncate" title="Méta-données">Méta-données</span>
                  </div>
                  <NumberSelector
                    value={typography.metadataSize}
                    min={10}
                    max={20}
                    step={1}
                    onChange={(val) => updateTypography('metadataSize', val)}
                  />
                </div>

                {/* Section Headers Size */}
                <div className="p-3 rounded-lg bg-[#18181A] border border-[#262629] flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                      <Bookmark className="w-3 h-3 text-emerald-400" />
                    </span>
                    <span className="text-xs font-bold text-gray-200 truncate" title="En-têtes de Sections">En-têtes de Sections</span>
                  </div>
                  <NumberSelector
                    value={typography.headerSize}
                    min={10}
                    max={24}
                    step={1}
                    onChange={(val) => updateTypography('headerSize', val)}
                  />
                </div>

                {/* Lyrics Size */}
                <div className="p-3 rounded-lg bg-[#18181A] border border-[#262629] flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                      <AlignLeft className="w-3 h-3 text-amber-400" />
                    </span>
                    <span className="text-xs font-bold text-gray-200 truncate" title="Paroles">Paroles</span>
                  </div>
                  <NumberSelector
                    value={typography.lyricsSize}
                    min={12}
                    max={36}
                    step={1}
                    onChange={(val) => updateTypography('lyricsSize', val)}
                  />
                </div>

                {/* Chord Size & Color */}
                <div className="p-3 rounded-lg bg-[#18181A] border border-[#262629] flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded bg-pink-500/20 border border-pink-500/40 text-pink-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                      <Music className="w-3 h-3 text-pink-400" />
                    </span>
                    <span className="text-xs font-bold text-gray-200 truncate">Accords</span>
                    <label 
                      className="w-3.5 h-3.5 rounded-full border border-white/30 cursor-pointer transition-transform hover:scale-110 shrink-0 shadow-xs block"
                      style={{ backgroundColor: chordColor }}
                      title="Couleur des accords (cliquer pour changer)"
                    >
                      <input
                        type="color"
                        value={chordColor}
                        onChange={(e) => updateChordColor(e.target.value)}
                        className="sr-only"
                      />
                    </label>
                  </div>
                  <NumberSelector
                    value={typography.chordSize}
                    min={11}
                    max={32}
                    step={1}
                    onChange={(val) => updateTypography('chordSize', val)}
                  />
                </div>

                {/* Line Height / Spacing */}
                <div className="p-3 rounded-lg bg-[#18181A] border border-[#262629] flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                      <MoveVertical className="w-3 h-3 text-cyan-400" />
                    </span>
                    <span className="text-xs font-bold text-gray-200 truncate" title="Interligne des Paroles">Interligne Paroles</span>
                  </div>
                  <NumberSelector
                    value={typography.lineSpacing}
                    min={1.1}
                    max={2.2}
                    step={0.1}
                    onChange={(val) => updateTypography('lineSpacing', val)}
                  />
                </div>

              </div>
            </div>
          </div>

          {/* 4. SECTION BORDERS SECTION */}
          <div className="bg-[#111112] border border-[#222224] rounded-xl overflow-hidden shadow-sm transition-colors hover:border-[#303036]">
            {/* Header / Trigger */}
            <div 
              onClick={() => toggleCategory('borders')}
              className="w-full text-left p-3.5 sm:p-4.5 flex items-center justify-between gap-3 cursor-pointer transition-colors hover:bg-[#151518]/50 select-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <Square className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-white truncate">
                  Bordures des Sections
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className={`p-1.5 rounded-lg bg-[#18181C] border border-[#2B2B30] text-gray-400 transition-transform duration-200 ${openCategories.borders ? 'rotate-180 text-blue-400 border-blue-500/30' : ''}`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Content (Collapsible on all devices) */}
            <div className={`p-4 sm:p-5 pt-0 sm:pt-0 ${openCategories.borders ? 'block' : 'hidden'}`}>
              <div className="border-t border-[#222224] mb-4" />

            <div className="space-y-4">
              {/* Multi-selection toggle buttons */}
              <div>
                <div className="text-xs font-semibold text-gray-300 mb-2">
                  Côtés actifs :
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Gauche */}
                  <button
                    type="button"
                    onClick={() => toggleSectionBorder('left')}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      sectionBorders.left
                        ? 'bg-blue-500/15 border-blue-500/60 text-blue-300 shadow-xs font-semibold'
                        : 'bg-[#18181A] border-[#262629] text-gray-400 hover:text-gray-200 hover:border-[#3A3A3E]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-xs border border-gray-500 relative flex items-center">
                        <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xs ${sectionBorders.left ? 'bg-blue-400' : 'bg-transparent'}`} />
                      </span>
                      <span>Gauche</span>
                    </div>
                    {sectionBorders.left && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </button>

                  {/* Droite */}
                  <button
                    type="button"
                    onClick={() => toggleSectionBorder('right')}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      sectionBorders.right
                        ? 'bg-blue-500/15 border-blue-500/60 text-blue-300 shadow-xs font-semibold'
                        : 'bg-[#18181A] border-[#262629] text-gray-400 hover:text-gray-200 hover:border-[#3A3A3E]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-xs border border-gray-500 relative flex items-center">
                        <span className={`absolute right-0 top-0 bottom-0 w-1 rounded-r-xs ${sectionBorders.right ? 'bg-blue-400' : 'bg-transparent'}`} />
                      </span>
                      <span>Droite</span>
                    </div>
                    {sectionBorders.right && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </button>

                  {/* Haut */}
                  <button
                    type="button"
                    onClick={() => toggleSectionBorder('top')}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      sectionBorders.top
                        ? 'bg-blue-500/15 border-blue-500/60 text-blue-300 shadow-xs font-semibold'
                        : 'bg-[#18181A] border-[#262629] text-gray-400 hover:text-gray-200 hover:border-[#3A3A3E]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-xs border border-gray-500 relative flex items-center">
                        <span className={`absolute top-0 left-0 right-0 h-1 rounded-t-xs ${sectionBorders.top ? 'bg-blue-400' : 'bg-transparent'}`} />
                      </span>
                      <span>Haut</span>
                    </div>
                    {sectionBorders.top && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </button>

                  {/* Bas */}
                  <button
                    type="button"
                    onClick={() => toggleSectionBorder('bottom')}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      sectionBorders.bottom
                        ? 'bg-blue-500/15 border-blue-500/60 text-blue-300 shadow-xs font-semibold'
                        : 'bg-[#18181A] border-[#262629] text-gray-400 hover:text-gray-200 hover:border-[#3A3A3E]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-xs border border-gray-500 relative flex items-center">
                        <span className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-xs ${sectionBorders.bottom ? 'bg-blue-400' : 'bg-transparent'}`} />
                      </span>
                      <span>Bas</span>
                    </div>
                    {sectionBorders.bottom && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </button>
                </div>
              </div>

              {/* Interactive Visual Box & Presets */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-3 border-t border-[#222224]">
                {/* Visual interactive diagram where clicking edges toggles them */}
                <div className="relative w-40 h-28 rounded-lg bg-[#18181A] border border-[#2B2B30] flex items-center justify-center p-3 select-none shrink-0">
                  {/* Top edge button */}
                  <button
                    type="button"
                    onClick={() => toggleSectionBorder('top')}
                    title="Bordure du haut"
                    className={`absolute top-1.5 left-5 right-5 h-2 rounded-full transition-all cursor-pointer ${
                      sectionBorders.top ? 'bg-blue-500 ring-2 ring-blue-400/50 shadow-sm' : 'bg-gray-700/60 hover:bg-gray-600'
                    }`}
                  />
                  {/* Bottom edge button */}
                  <button
                    type="button"
                    onClick={() => toggleSectionBorder('bottom')}
                    title="Bordure du bas"
                    className={`absolute bottom-1.5 left-5 right-5 h-2 rounded-full transition-all cursor-pointer ${
                      sectionBorders.bottom ? 'bg-blue-500 ring-2 ring-blue-400/50 shadow-sm' : 'bg-gray-700/60 hover:bg-gray-600'
                    }`}
                  />
                  {/* Left edge button */}
                  <button
                    type="button"
                    onClick={() => toggleSectionBorder('left')}
                    title="Bordure gauche"
                    className={`absolute left-1.5 top-5 bottom-5 w-2 rounded-full transition-all cursor-pointer ${
                      sectionBorders.left ? 'bg-blue-500 ring-2 ring-blue-400/50 shadow-sm' : 'bg-gray-700/60 hover:bg-gray-600'
                    }`}
                  />
                  {/* Right edge button */}
                  <button
                    type="button"
                    onClick={() => toggleSectionBorder('right')}
                    title="Bordure droite"
                    className={`absolute right-1.5 top-5 bottom-5 w-2 rounded-full transition-all cursor-pointer ${
                      sectionBorders.right ? 'bg-blue-500 ring-2 ring-blue-400/50 shadow-sm' : 'bg-gray-700/60 hover:bg-gray-600'
                    }`}
                  />
                  <div className="text-center pointer-events-none">
                    <span className="text-[10px] font-bold text-blue-400 block uppercase tracking-wider">Aperçu</span>
                    <span className="text-[9px] text-gray-400">Cliquez un bord</span>
                  </div>
                </div>

                {/* Presets */}
                <div className="flex-1 w-full flex flex-col gap-2">
                  <span className="text-[11px] font-semibold text-gray-400">Préréglages rapides :</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyBorderPreset({ left: true, right: false, top: false, bottom: false })}
                      className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                        sectionBorders.left && !sectionBorders.right && !sectionBorders.top && !sectionBorders.bottom
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                          : 'bg-[#18181A] hover:bg-[#222226] text-gray-300 border-[#2E2E32]'
                      }`}
                    >
                      Gauche seule
                    </button>
                    <button
                      type="button"
                      onClick={() => applyBorderPreset({ left: true, right: true, top: true, bottom: true })}
                      className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                        sectionBorders.left && sectionBorders.right && sectionBorders.top && sectionBorders.bottom
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                          : 'bg-[#18181A] hover:bg-[#222226] text-gray-300 border-[#2E2E32]'
                      }`}
                    >
                      Encadré complet
                    </button>
                    <button
                      type="button"
                      onClick={() => applyBorderPreset({ left: false, right: false, top: true, bottom: true })}
                      className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                        !sectionBorders.left && !sectionBorders.right && sectionBorders.top && sectionBorders.bottom
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                          : 'bg-[#18181A] hover:bg-[#222226] text-gray-300 border-[#2E2E32]'
                      }`}
                    >
                      Haut et bas
                    </button>
                    <button
                      type="button"
                      onClick={() => applyBorderPreset({ left: false, right: false, top: false, bottom: false })}
                      className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                        !sectionBorders.left && !sectionBorders.right && !sectionBorders.top && !sectionBorders.bottom
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                          : 'bg-[#18181A] hover:bg-[#222226] text-gray-300 border-[#2E2E32]'
                      }`}
                    >
                      Aucune bordure
                    </button>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* 5. SECTION & CHORD COLORS SECTION */}
          <div className={`bg-[#111112] border border-[#222224] rounded-xl shadow-sm transition-colors hover:border-[#303036] ${openCategories.colors ? 'overflow-visible' : 'overflow-hidden'}`}>
            {/* Header / Trigger */}
            <div 
              onClick={() => toggleCategory('colors')}
              className="w-full text-left p-3.5 sm:p-4.5 flex items-center justify-between gap-3 cursor-pointer transition-colors hover:bg-[#151518]/50 select-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white truncate">
                    Couleurs des Sections et Accords
                  </h2>
                  <p className="text-[11px] text-gray-400 hidden sm:block">
                    Personnalisez les teintes des accords et des 9 sections musicales
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className={`p-1.5 rounded-lg bg-[#18181C] border border-[#2B2B30] text-gray-400 transition-transform duration-200 ${openCategories.colors ? 'rotate-180 text-emerald-400 border-emerald-500/30' : ''}`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Content (Collapsible on all devices) */}
            <div className={`p-4 sm:p-5 pt-0 sm:pt-0 ${openCategories.colors ? 'block' : 'hidden'}`}>
              <div className="border-t border-[#222224] mb-3.5" />

              {/* Option Couleur des accords - Compact Bar */}
              <div className="relative p-3 rounded-xl bg-[#16161A] border border-blue-500/30 mb-3.5 shadow-sm flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span 
                    className="w-4 h-4 rounded-full border border-white/20 shadow-xs shrink-0"
                    style={{ backgroundColor: chordColor }}
                  />
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                      <span>Couleur des Accords</span>
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Appliquée à l'ensemble des grilles d'accords dans le lecteur
                    </p>
                  </div>
                </div>

                {/* Chords direct preview and color button */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="hidden xs:flex items-center gap-1.5">
                    <span 
                      className="px-2 py-0.5 rounded-md font-mono font-bold text-xs border bg-black/40 border-white/10 shadow-xs"
                      style={{ color: chordColor }}
                    >
                      Do#m7
                    </span>
                    <span 
                      className="px-2 py-0.5 rounded-md font-mono font-bold text-xs border bg-black/40 border-white/10 shadow-xs"
                      style={{ color: chordColor }}
                    >
                      Sol/Si
                    </span>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveColorTarget(activeColorTarget === 'chord' ? null : 'chord')}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                        activeColorTarget === 'chord'
                          ? 'bg-blue-600/25 border-blue-500 text-blue-300 ring-1 ring-blue-500/40 font-semibold'
                          : 'color-hex-badge bg-[#202025] hover:bg-[#2A2A30] text-gray-200 border-[#3A3A40]'
                      }`}
                      title="Modifier la couleur des accords"
                    >
                      <span 
                        className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0"
                        style={{ backgroundColor: chordColor }}
                      />
                      <span className="uppercase font-semibold tracking-wider">{chordColor}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${activeColorTarget === 'chord' ? 'rotate-180 text-blue-400' : ''}`} />
                    </button>

                    {activeColorTarget === 'chord' && (
                      <ColorPickerPopover
                        title="Couleur des Accords"
                        currentColor={chordColor}
                        defaultColor={DEFAULT_CHORD_COLOR}
                        onChange={(col) => updateChordColor(col)}
                        onClose={() => setActiveColorTarget(null)}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Titre de section pour les sections */}
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Couleurs des Sections
                </div>
                <span className="text-[11px] text-gray-500 font-medium">
                  {SECTION_TYPES_LIST.length} sections configurables
                </span>
              </div>

              {/* Responsive Compact Grid for Section Colors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {SECTION_TYPES_LIST.map((sec) => {
                  const currentColor = sectionColors[sec.key] || '#64748b';
                  const isEditing = activeColorTarget === sec.key;

                  return (
                    <div 
                      key={sec.key}
                      className={`relative p-2.5 rounded-lg bg-[#18181A] border transition-all flex items-center justify-between gap-2 ${
                        isEditing 
                          ? 'border-emerald-500/60 bg-[#1C1C20] ring-1 ring-emerald-500/30' 
                          : 'border-[#262629] hover:border-[#38383D]'
                      }`}
                    >
                      {/* Left: Section Indicator & Label */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span 
                          className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs shrink-0"
                          style={{ backgroundColor: currentColor }}
                        />
                        <span className="text-xs font-bold text-gray-200 truncate" title={sec.label}>
                          {sec.label}
                        </span>
                      </div>

                      {/* Right: Badge Preview & Popover Trigger */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span 
                          className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border hidden xs:inline-block"
                          style={{ 
                            color: currentColor, 
                            borderColor: `${currentColor}40`,
                            backgroundColor: `${currentColor}15`
                          }}
                        >
                          {sec.defaultBadge}
                        </span>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setActiveColorTarget(isEditing ? null : sec.key)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono border transition-all cursor-pointer ${
                              isEditing
                                ? 'bg-emerald-600/25 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40 font-semibold'
                                : 'color-hex-badge bg-[#222225] hover:bg-[#2C2C30] text-gray-300 border-[#3A3A3E]'
                            }`}
                            title={`Modifier la couleur (${sec.label})`}
                          >
                            <span 
                              className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0"
                              style={{ backgroundColor: currentColor }}
                            />
                            <span className="uppercase font-medium">{currentColor}</span>
                            <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isEditing ? 'rotate-180 text-emerald-400' : ''}`} />
                          </button>

                          {isEditing && (
                            <ColorPickerPopover
                              title={`Couleur : ${sec.label}`}
                              currentColor={currentColor}
                              defaultColor={DEFAULT_DISPLAY_SETTINGS.sectionColors[sec.key]}
                              onChange={(col) => updateSectionColor(sec.key, col)}
                              onClose={() => setActiveColorTarget(null)}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
            <Eye className="w-4 h-4" />
            <span>Aperçu</span>
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
            className={`flex-1 overflow-y-auto p-4 sm:p-8 transition-colors ${
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
