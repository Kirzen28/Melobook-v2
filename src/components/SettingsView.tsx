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
  ChevronDown,
  ChevronUp,
  Music,
  Sun,
  Moon,
  Monitor,
  Maximize2,
  Minimize2,
  X
} from 'lucide-react';
import { NumberSelector } from './NumberSelector';
import { 
  COLOR_PRESETS, 
  SECTION_TYPES_LIST, 
  DEFAULT_DISPLAY_SETTINGS,
  getSectionColor 
} from '../utils/displayDefaults';
import { SectionColors, SongTypographySettings } from '../types';
import { transposeChord } from '../utils/chordUtils';

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

export const SettingsView: React.FC = () => {
  const { 
    displaySettings, 
    updateDisplaySettings, 
    resetDisplaySettings,
    setActiveTab,
    selectedSong,
    stageSettings,
    updateStageSettings
  } = useApp();

  const { typography, sectionColors } = displaySettings;
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const [isMobilePreviewCollapsed, setIsMobilePreviewCollapsed] = useState(false);
  const [isMobilePreviewFullscreen, setIsMobilePreviewFullscreen] = useState(false);

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

      {/* Section 1: Couplet */}
      <div 
        className="rounded-lg p-3 transition-all"
        style={{
          borderLeftWidth: '3.5px',
          borderLeftStyle: 'solid',
          borderLeftColor: sectionColors.verse,
          backgroundColor: `${sectionColors.verse}0D`
        }}
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
                className="font-mono font-bold text-blue-500 leading-none mb-1"
                style={{ fontSize: `${typography.chordSize}px` }}
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
                className="font-mono font-bold text-blue-500 leading-none mb-1"
                style={{ fontSize: `${typography.chordSize}px` }}
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
        style={{
          borderLeftWidth: '3.5px',
          borderLeftStyle: 'solid',
          borderLeftColor: sectionColors.chorus,
          backgroundColor: `${sectionColors.chorus}0D`
        }}
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
                className="font-mono font-bold text-blue-500 leading-none mb-1"
                style={{ fontSize: `${typography.chordSize}px` }}
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
                className="font-mono font-bold text-blue-500 leading-none mb-1"
                style={{ fontSize: `${typography.chordSize}px` }}
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
        style={{
          borderLeftWidth: '3.5px',
          borderLeftStyle: 'solid',
          borderLeftColor: sectionColors.bridge,
          backgroundColor: `${sectionColors.bridge}0D`
        }}
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
                className="font-mono font-bold text-blue-500 leading-none mb-1"
                style={{ fontSize: `${typography.chordSize}px` }}
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
        style={{
          borderLeftWidth: '3.5px',
          borderLeftStyle: 'solid',
          borderLeftColor: sectionColors.outro,
          backgroundColor: `${sectionColors.outro}0D`
        }}
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
                className="font-mono font-bold text-blue-500 leading-none mb-1"
                style={{ fontSize: `${typography.chordSize}px` }}
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
            onClick={handleReset}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 hover:text-white border border-[#333] text-xs font-semibold transition-all active:scale-95"
            title="Rétablir les polices et couleurs par défaut"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Réinitialiser</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {showNotification && (
        <div className="absolute top-16 right-6 z-50 px-4 py-2 rounded-lg bg-green-600/90 border border-green-500 text-white text-xs font-medium flex items-center gap-2 shadow-2xl animate-in fade-in slide-in-from-top-2">
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
        <div className="flex-1 w-full lg:w-7/12 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24">
          
          {/* 1. STAGE DISPLAY & NOTATION SETTINGS */}
          <div className="bg-[#111112] border border-[#222224] rounded-xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-[#222224]">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Music className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  Affichage
                </h2>
              </div>
            </div>

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
              <div className="hidden lg:flex p-3 rounded-lg bg-[#18181A] border border-[#262629] flex-col justify-between gap-2.5">
                <div>
                  <span className="text-xs font-bold text-gray-200 block">Colonnes</span>
                  <span className="text-[11px] text-gray-400">Colonnes en mode scène</span>
                </div>
                <div className="theme-toggle-group flex items-center gap-1 bg-[#121214] p-0.5 rounded-lg border border-[#2B2B30]">
                  <button
                    type="button"
                    onClick={() => updateStageSettings({ columns: 1 })}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      stageSettings.columns === 1
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'theme-toggle-inactive text-gray-400 hover:text-white'
                    }`}
                  >
                    1 Col
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStageSettings({ columns: 2 })}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      stageSettings.columns === 2
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'theme-toggle-inactive text-gray-400 hover:text-white'
                    }`}
                  >
                    2 Col
                  </button>
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

          {/* 2. TYPOGRAPHY / FONT SIZES SECTION */}
          <div className="bg-[#111112] border border-[#222224] rounded-xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-[#222224]">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Type className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  Tailles de Police
                </h2>
              </div>
            </div>

            <div className="space-y-4">
              
              {/* Title Size Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-200">Titre de la Chanson</span>
                  <NumberSelector
                    value={typography.titleSize}
                    min={16}
                    max={48}
                    step={1}
                    onChange={(val) => updateTypography('titleSize', val)}
                  />
                </div>
              </div>

              {/* Metadata Size Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-200">Méta-données</span>
                  <NumberSelector
                    value={typography.metadataSize}
                    min={10}
                    max={20}
                    step={1}
                    onChange={(val) => updateTypography('metadataSize', val)}
                  />
                </div>
              </div>

              {/* Section Headers Size Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-200">En-têtes de Sections</span>
                  <NumberSelector
                    value={typography.headerSize}
                    min={10}
                    max={24}
                    step={1}
                    onChange={(val) => updateTypography('headerSize', val)}
                  />
                </div>
              </div>

              {/* Lyrics Size Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-200">Paroles</span>
                  <NumberSelector
                    value={typography.lyricsSize}
                    min={12}
                    max={36}
                    step={1}
                    onChange={(val) => updateTypography('lyricsSize', val)}
                  />
                </div>
              </div>

              {/* Chord Size Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-200">Accords</span>
                  <NumberSelector
                    value={typography.chordSize}
                    min={11}
                    max={32}
                    step={1}
                    onChange={(val) => updateTypography('chordSize', val)}
                  />
                </div>
              </div>

              {/* Line Height / Spacing */}
              <div className="space-y-1.5 pt-2 border-t border-[#222224]">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-200">Interligne des Paroles</span>
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

          {/* 2. SECTION COLORS SECTION */}
          <div className="bg-[#111112] border border-[#222224] rounded-xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-[#222224]">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  Couleurs
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SECTION_TYPES_LIST.map((sec) => {
                const currentColor = sectionColors[sec.key] || '#64748b';

                return (
                  <div 
                    key={sec.key}
                    className="p-3 rounded-lg bg-[#18181A] border border-[#262629] flex flex-col justify-between gap-2.5 relative"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                          style={{ backgroundColor: currentColor }}
                        />
                        <span className="text-xs font-bold text-gray-200">
                          {sec.label}
                        </span>
                      </div>
                      <span 
                        className="text-[10px] font-mono px-2 py-0.5 rounded border"
                        style={{ 
                          color: currentColor, 
                          borderColor: `${currentColor}40`,
                          backgroundColor: `${currentColor}15`
                        }}
                      >
                        {sec.defaultBadge}
                      </span>
                    </div>

                    {/* Presets color swatches */}
                    <div className="flex items-center justify-between gap-1 pt-2 border-t border-[#2A2A2E]">
                      <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
                        {COLOR_PRESETS.slice(0, 10).map((preset) => (
                          <button
                            key={preset.value}
                            onClick={() => updateSectionColor(sec.key, preset.value)}
                            className={`w-4 h-4 rounded-full transition-transform hover:scale-125 border ${
                              currentColor.toLowerCase() === preset.value.toLowerCase()
                                ? 'border-white ring-2 ring-blue-500 scale-110'
                                : 'border-transparent'
                            }`}
                            style={{ backgroundColor: preset.value }}
                            title={preset.name}
                          />
                        ))}
                      </div>

                      {/* Custom Color Picker input */}
                      <label 
                        className="color-hex-badge cursor-pointer flex items-center gap-1 px-2 py-0.5 rounded bg-[#222225] hover:bg-[#2C2C30] text-[10px] font-mono text-gray-300 border border-[#3A3A3E] transition-colors"
                        title="Choisir une couleur hexadécimale personnalisée"
                      >
                        <input
                          type="color"
                          value={currentColor}
                          onChange={(e) => updateSectionColor(sec.key, e.target.value)}
                          className="sr-only"
                        />
                        <span>{currentColor}</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
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

    </div>
  );
};
