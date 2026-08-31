import React, { useState } from 'react';
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
  ChevronUp
} from 'lucide-react';
import { NumberSelector } from './NumberSelector';
import { 
  COLOR_PRESETS, 
  SECTION_TYPES_LIST, 
  DEFAULT_DISPLAY_SETTINGS,
  getSectionColor 
} from '../utils/displayDefaults';
import { SectionColors, SongTypographySettings } from '../types';

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

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-[#0A0A0B] text-white overflow-hidden">
      
      {/* Top Header Bar */}
      <div className="border-b border-[#222224] bg-[#111112]/90 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between shrink-0 z-30">
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
                Réglages d'affichage & Typographie
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Theme Switcher */}
          <div className="hidden sm:flex items-center gap-1 bg-[#18181A] p-1 rounded-lg border border-[#262629]">
            {(['dark', 'oled', 'sepia', 'light'] as const).map((thm) => (
              <button
                key={thm}
                onClick={() => updateStageSettings({ theme: thm })}
                className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider transition-all ${
                  stageSettings.theme === thm
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {thm}
              </button>
            ))}
          </div>

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
        
        {/* MOBILE PINNED TOP PREVIEW / DESKTOP RIGHT STICKY PREVIEW */}
        <div className="w-full lg:w-5/12 shrink-0 lg:shrink lg:order-last border-b lg:border-b-0 lg:border-l border-[#222224] bg-[#111112] z-20 flex flex-col">
          <div className="p-3 sm:p-4 bg-[#141416] border-b border-[#222224] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-green-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Aperçu en Direct
              </span>
            </div>
            <div className="flex items-center gap-1.5">
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

              {/* Mobile collapse / expand toggle */}
              <button
                onClick={() => setIsMobilePreviewCollapsed(!isMobilePreviewCollapsed)}
                className="lg:hidden p-1 rounded bg-[#222226] text-gray-300 hover:text-white border border-[#333]"
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
              className="p-4 overflow-y-auto max-h-[34vh] sm:max-h-[38vh] lg:max-h-[calc(100vh-190px)] lg:flex-1 space-y-4 bg-[#0E0E10]"
              style={{ lineHeight: typography.lineSpacing }}
            >
              {/* Song Header Preview */}
              <div className="border-b border-[#222224] pb-2.5 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 
                    className="font-bold tracking-tight text-white leading-tight break-words"
                    style={{ fontSize: `${typography.titleSize}px` }}
                  >
                    {selectedSong ? selectedSong.title : 'Grâce Infinie'}
                  </h3>
                  <div 
                    className="text-gray-300 font-medium break-words mt-0.5"
                    style={{ fontSize: `${typography.metadataSize}px` }}
                  >
                    {selectedSong?.artist || 'John Newton'}
                  </div>
                </div>

                <div 
                  className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto bg-[#141416] border border-[#242428] px-2.5 py-1 rounded-lg font-mono text-gray-300 shadow-sm"
                  style={{ fontSize: `${typography.metadataSize}px` }}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">Tonalité :</span>
                    <strong className="text-blue-400">G</strong>
                  </div>
                  <span className="text-gray-600">•</span>
                  <strong>72 BPM</strong>
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
                <div className="mb-1.5">
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
                </div>

                <div className="space-y-1 font-mono">
                  <div className="inline-flex flex-col mr-2">
                    {stageSettings.showChords && (
                      <span 
                        className="font-mono font-bold text-blue-400 leading-none mb-1"
                        style={{ fontSize: `${typography.chordSize}px` }}
                      >
                        G
                      </span>
                    )}
                    <span 
                      className="text-[#E0E0E0] font-sans"
                      style={{ fontSize: `${typography.lyricsSize}px` }}
                    >
                      Grâce infinie, au son si doux
                    </span>
                  </div>

                  <div className="inline-flex flex-col">
                    {stageSettings.showChords && (
                      <span 
                        className="font-mono font-bold text-blue-400 leading-none mb-1"
                        style={{ fontSize: `${typography.chordSize}px` }}
                      >
                        C&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;G
                      </span>
                    )}
                    <span 
                      className="text-[#E0E0E0] font-sans"
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
                <div className="mb-1.5">
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
                </div>

                <div className="space-y-1 font-mono">
                  <div className="inline-flex flex-col mr-2">
                    {stageSettings.showChords && (
                      <span 
                        className="font-mono font-bold text-blue-400 leading-none mb-1"
                        style={{ fontSize: `${typography.chordSize}px` }}
                      >
                        Em&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;D
                      </span>
                    )}
                    <span 
                      className="text-[#E0E0E0] font-sans"
                      style={{ fontSize: `${typography.lyricsSize}px` }}
                    >
                      J'étais perdu mais je suis retrouvé,
                    </span>
                  </div>

                  <div className="inline-flex flex-col">
                    {stageSettings.showChords && (
                      <span 
                        className="font-mono font-bold text-blue-400 leading-none mb-1"
                        style={{ fontSize: `${typography.chordSize}px` }}
                      >
                        G&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;D7&nbsp;&nbsp;&nbsp;G
                      </span>
                    )}
                    <span 
                      className="text-[#E0E0E0] font-sans"
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
                <div className="mb-1.5">
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
                </div>

                <div className="space-y-1 font-mono">
                  <div className="inline-flex flex-col">
                    {stageSettings.showChords && (
                      <span 
                        className="font-mono font-bold text-blue-400 leading-none mb-1"
                        style={{ fontSize: `${typography.chordSize}px` }}
                      >
                        C&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;G/B
                      </span>
                    )}
                    <span 
                      className="text-[#E0E0E0] font-sans"
                      style={{ fontSize: `${typography.lyricsSize}px` }}
                    >
                      Quand nous serons là-haut depuis dix mille ans,
                    </span>
                  </div>
                </div>
              </div>

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

        {/* SCROLLABLE SETTINGS PANEL (BELOW ON MOBILE, LEFT ON DESKTOP) */}
        <div className="flex-1 w-full lg:w-7/12 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24">
          
          {/* 1. TYPOGRAPHY / FONT SIZES SECTION */}
          <div className="bg-[#111112] border border-[#222224] rounded-xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-[#222224]">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Type className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  Tailles de Police & Typographie
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
                  Couleurs par Type de Section
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
                        className="cursor-pointer flex items-center gap-1 px-2 py-0.5 rounded bg-[#222225] hover:bg-[#2C2C30] text-[10px] font-mono text-gray-300 border border-[#3A3A3E]"
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

    </div>
  );
};
