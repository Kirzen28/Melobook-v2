import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Square, 
  Power, 
  Volume2, 
  VolumeX, 
  Repeat, 
  Sliders, 
  Upload, 
  Music, 
  Layers, 
  Sparkles, 
  Trash2, 
  Check, 
  Clock, 
  ChevronDown, 
  RotateCcw,
  ArrowUp,
  ArrowDown,
  FileAudio,
  Radio,
  X
} from 'lucide-react';
import { 
  padAudio, 
  PAD_PRESETS, 
  CHROMATIC_NOTES, 
  PadPresetId, 
  parseKeyToSemitone 
} from '../utils/padAudio';
import { useApp } from '../context/AppContext';
import { CustomPad } from '../types';
import { optimizePadAudio, OptimizationProgress } from '../utils/audioOptimizer';

interface AudioPadsProps {
  songKey?: string;
  transposeOffset?: number;
  className?: string;
  compact?: boolean;
  onClose?: () => void;
}

export const AudioPads: React.FC<AudioPadsProps> = ({
  songKey,
  transposeOffset = 0,
  className = '',
  compact = false,
  onClose
}) => {
  const { 
    customPads, 
    createCustomPad, 
    deleteCustomPad, 
    uploadPadAudio, 
    showNotification,
    currentGroup,
    isGuest,
    isViewer
  } = useApp();
  const canEditPads = !isGuest && !isViewer;

  // Engine state subscriptions
  const [isPlaying, setIsPlaying] = useState<boolean>(() => padAudio.getIsRunning());
  const [activeSemitone, setActiveSemitone] = useState<number>(() => {
    return padAudio.getIsRunning() 
      ? padAudio.getCurrentSemitone() 
      : (parseKeyToSemitone(songKey) + transposeOffset + 12) % 12;
  });
  const [currentPreset, setCurrentPreset] = useState<PadPresetId>(() => padAudio.getCurrentPreset());
  const [activeMode, setActiveMode] = useState<'synth' | 'custom'>(() => padAudio.getActiveMode());
  const [activeCustomPad, setActiveCustomPad] = useState<CustomPad | null>(() => padAudio.getActiveCustomPad());
  const [volume, setVolume] = useState<number>(() => Math.round(padAudio.getCurrentVolume() * 100));
  const [isMuted, setIsMuted] = useState<boolean>(() => padAudio.getIsMuted());
  const [isLooping, setIsLooping] = useState<boolean>(() => padAudio.getIsLooping());
  const [crossfadeDuration, setCrossfadeDuration] = useState<number>(() => padAudio.getCrossfadeDuration());
  const [octaveShift, setOctaveShift] = useState<number>(() => padAudio.getOctaveShift());

  // Local UI state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showTrackDropdown, setShowTrackDropdown] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [padName, setPadName] = useState('');
  const [rootSemitone, setRootSemitone] = useState<number>(0); // Default C
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<OptimizationProgress | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with engine
  useEffect(() => {
    return padAudio.subscribe(() => {
      setIsPlaying(padAudio.getIsRunning());
      setActiveSemitone(padAudio.getCurrentSemitone());
      setCurrentPreset(padAudio.getCurrentPreset());
      setActiveMode(padAudio.getActiveMode());
      setActiveCustomPad(padAudio.getActiveCustomPad());
      setVolume(Math.round(padAudio.getCurrentVolume() * 100));
      setIsMuted(padAudio.getIsMuted());
      setIsLooping(padAudio.getIsLooping());
      setCrossfadeDuration(padAudio.getCrossfadeDuration());
      setOctaveShift(padAudio.getOctaveShift());
    });
  }, []);

  // Preload custom pad audio buffers
  useEffect(() => {
    customPads.forEach(pad => {
      padAudio.preloadCustomPad(pad);
    });
  }, [customPads]);

  // Target song semitone
  const songTargetSemitone = (parseKeyToSemitone(songKey) + transposeOffset + 12) % 12;

  // Sync to song key on mount or key change
  useEffect(() => {
    if (!isPlaying) {
      setActiveSemitone(songTargetSemitone);
    }
  }, [songKey, transposeOffset, isPlaying, songTargetSemitone]);

  // Toggle power
  const handleTogglePlay = () => {
    if (isPlaying) {
      padAudio.stop();
    } else {
      padAudio.start(activeSemitone, currentPreset);
    }
  };

  // Change key
  const handleSelectKey = (semitone: number) => {
    setActiveSemitone(semitone);
    if (isPlaying) {
      padAudio.changeNote(semitone);
    } else {
      padAudio.start(semitone, currentPreset);
    }
  };

  // Crossfade duration change
  const handleCrossfadeChange = (sec: number) => {
    setCrossfadeDuration(sec);
    padAudio.setCrossfadeDuration(sec);
  };

  // Looping toggle
  const handleToggleLoop = () => {
    const next = !isLooping;
    setIsLooping(next);
    padAudio.setIsLooping(next);
    showNotification(next ? 'Boucle infinie activée' : 'Lecture unique désactivée en boucle', 'info', 1500);
  };

  // Octave shift change
  const handleOctaveChange = (shift: number) => {
    setOctaveShift(shift);
    padAudio.setOctaveShift(shift);
  };

  // Volume slider
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    padAudio.setVolume(newVol / 100);
    if (isMuted && newVol > 0) setIsMuted(false);
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const muted = padAudio.toggleMute();
    setIsMuted(muted);
  };

  // Upload handler
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    if (!file) return;
    const valid = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/x-m4a', 'audio/ogg', 'audio/webm', 'audio/aac'];
    if (!valid.includes(file.type) && !/\.(mp3|wav|m4a|ogg|webm|aac)$/i.test(file.name)) {
      showNotification('Veuillez sélectionner un fichier MP3, WAV ou M4A', 'error');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      showNotification('Le fichier source dépasse 100 Mo', 'error');
      return;
    }
    setSelectedFile(file);
    if (!padName) {
      const derived = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setPadName(derived.charAt(0).toUpperCase() + derived.slice(1));
    }
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !padName.trim()) return;

    setIsUploading(true);
    setUploadProgress({ stage: 'decoding', percent: 10, message: 'Démarrage de l\'optimisation...' });

    try {
      // Convert to 256 kbps MP3, truncate to 1min with loop crossfade, max 5MB
      const optResult = await optimizePadAudio(selectedFile, (p) => {
        setUploadProgress(p);
      });

      setUploadProgress({ stage: 'encoding', percent: 96, message: 'Téléversement sur le Cloud...' });

      const audioUrl = await uploadPadAudio(optResult.file);
      const rootObj = CHROMATIC_NOTES.find(n => n.semitone === rootSemitone) || CHROMATIC_NOTES[0];
      const newPadId = await createCustomPad({
        name: padName.trim(),
        rootSemitone,
        rootKey: rootObj.label,
        audioUrl,
        fileSize: optResult.finalSize
      });

      // Automatically select newly uploaded pad
      const createdPad: CustomPad = {
        id: newPadId,
        groupId: currentGroup?.id || 'default-group',
        name: padName.trim(),
        rootSemitone,
        rootKey: rootObj.label,
        audioUrl,
        fileSize: optResult.finalSize
      };
      padAudio.selectCustomPad(createdPad);
      setActiveMode('custom');
      setActiveCustomPad(createdPad);

      const mbSize = (optResult.finalSize / (1024 * 1024)).toFixed(1);
      const successMsg = optResult.wasTruncated
        ? `Nappe "${padName}" optimisée (1 min, MP3 256 kbps, ${mbSize} Mo) et prête !`
        : `Nappe "${padName}" (MP3 256 kbps, ${mbSize} Mo) enregistrée et sélectionnée !`;

      showNotification(successMsg, 'success');
      setSelectedFile(null);
      setPadName('');
      setShowUploadForm(false);
      setUploadProgress(null);
    } catch (err: any) {
      console.error(err);
      showNotification(err?.message || 'Échec du traitement du pad audio', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Pitch shift calculations
  const currentKeyObj = CHROMATIC_NOTES[activeSemitone] || CHROMATIC_NOTES[0];
  const songKeyObj = CHROMATIC_NOTES[songTargetSemitone] || CHROMATIC_NOTES[0];
  
  let pitchShiftRatio = 1.0;
  let semitonesShifted = 0;
  if (activeMode === 'custom' && activeCustomPad) {
    semitonesShifted = (activeSemitone - activeCustomPad.rootSemitone) + (octaveShift * 12);
    pitchShiftRatio = Math.pow(2, semitonesShifted / 12);
  } else {
    semitonesShifted = activeSemitone + (octaveShift * 12);
  }

  const selectedPresetObj = PAD_PRESETS.find(p => p.id === currentPreset) || PAD_PRESETS[0];

  return (
    <div className={`w-full bg-[#11141B] border border-[#212735] rounded-2xl p-4 text-white shadow-2xl select-none ${className}`}>
      
      {/* Header bar: Title & Track selector */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#1E2536]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
            isPlaying 
              ? 'bg-sky-400 text-black border-sky-300 shadow-md shadow-sky-400/30' 
              : 'bg-[#181D29] text-gray-400 border-[#283144]'
          }`}>
            <Radio className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Atmospheric Audio Pads</h3>
            <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
              <span>{activeMode === 'custom' && activeCustomPad ? activeCustomPad.name : selectedPresetObj.name}</span>
              {activeMode === 'custom' && activeCustomPad && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-950/60 text-sky-400 border border-sky-500/30">
                  Base: {activeCustomPad.rootKey}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Top actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Track selector dropdown trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTrackDropdown(!showTrackDropdown)}
              className="px-3 py-1.5 rounded-xl bg-[#171C26] hover:bg-[#202736] border border-[#2A3344] text-xs font-semibold text-gray-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Changer de nappe</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTrackDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showTrackDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowTrackDropdown(false)} />
                <div className="absolute right-0 top-full mt-1.5 z-50 w-72 bg-[#141822] border border-[#2B3547] rounded-xl shadow-2xl p-2 space-y-2 animate-in fade-in zoom-in-95 duration-100 max-h-80 overflow-y-auto">
                  
                  {/* Upload button inside dropdown */}
                  {canEditPads && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowTrackDropdown(false);
                        setShowUploadForm(true);
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 flex items-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-sky-400" />
                      <span>Téléverser un nouveau Pad (MP3/WAV)</span>
                    </button>
                  )}

                  {/* Team audio pads */}
                  {customPads.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 pt-1">
                        Pads de l'équipe ({customPads.length})
                      </div>
                      {customPads.map(pad => (
                        <div 
                          key={pad.id}
                          className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer ${
                            activeMode === 'custom' && activeCustomPad?.id === pad.id
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold'
                              : 'hover:bg-[#1C2333] text-gray-300'
                          }`}
                          onClick={() => {
                            padAudio.selectCustomPad(pad);
                            setShowTrackDropdown(false);
                          }}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="truncate font-semibold">{pad.name}</div>
                            <div className="text-[10px] text-gray-500">Note de référence : {pad.rootKey}</div>
                          </div>
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#10141C] text-sky-400 border border-[#232B3C]">
                            {pad.rootKey}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Synth Presets */}
                  <div className="space-y-1 border-t border-[#1F2636] pt-1">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2">
                      Synthétiseurs intégrés
                    </div>
                    {PAD_PRESETS.map(preset => (
                      <div
                        key={preset.id}
                        className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer ${
                          activeMode === 'synth' && currentPreset === preset.id
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold'
                            : 'hover:bg-[#1C2333] text-gray-300'
                        }`}
                        onClick={() => {
                          padAudio.selectSynthPreset(preset.id);
                          setShowTrackDropdown(false);
                        }}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="truncate font-semibold">{preset.name}</div>
                          <div className="text-[10px] text-gray-500">{preset.description}</div>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#10141C] text-gray-400 border border-[#202735]">
                          {preset.category}
                        </span>
                      </div>
                    ))}
                  </div>

                </div>
              </>
            )}
          </div>

          {/* Quick upload button */}
          {canEditPads && (
            <button
              type="button"
              onClick={() => setShowUploadForm(!showUploadForm)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                showUploadForm 
                  ? 'bg-sky-500/20 text-sky-300 border-sky-400/50' 
                  : 'bg-[#171C26] hover:bg-[#202736] border-[#2A3344] text-gray-300 hover:text-white'
              }`}
              title="Téléverser un pad audio MP3 ou WAV"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Importer</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-[#171C26] hover:bg-[#222A3B] text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Upload Form Drawer (if opened) */}
      {canEditPads && showUploadForm && (
        <form onSubmit={handleSubmitUpload} className="mt-3 p-3.5 rounded-xl bg-[#151923] border border-[#232B3C] space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between text-xs font-bold text-gray-300">
            <span className="flex items-center gap-1.5">
              <FileAudio className="w-4 h-4 text-sky-400" />
              Téléverser une nappe atmosphérique
            </span>
            <button
              type="button"
              onClick={() => setShowUploadForm(false)}
              className="text-gray-500 hover:text-gray-300 text-xs"
            >
              Annuler
            </button>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${
              dragOver ? 'border-sky-400 bg-sky-500/10' : 'border-[#2D374D] hover:border-gray-500 bg-[#10131B]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.m4a,.ogg,audio/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) handleFileSelected(e.target.files[0]);
              }}
            />
            {selectedFile ? (
              <div className="text-xs text-emerald-400 font-semibold truncate">
                {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)} Mo)
              </div>
            ) : (
              <div className="text-xs text-gray-400">
                Glissez votre fichier MP3/WAV ici ou <span className="text-sky-400 underline">parcourir</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1">Nom du Pad</label>
              <input
                type="text"
                value={padName}
                onChange={(e) => setPadName(e.target.value)}
                placeholder="ex: Deep Cosmic Ambient"
                className="w-full bg-[#10131B] border border-[#273042] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1">Tonalité d'origine du fichier</label>
              <select
                value={rootSemitone}
                onChange={(e) => setRootSemitone(Number(e.target.value))}
                className="w-full bg-[#10131B] border border-[#273042] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-400 cursor-pointer"
              >
                {CHROMATIC_NOTES.map(n => (
                  <option key={n.semitone} value={n.semitone}>
                    {n.label} ({n.alt}) — Référence audio
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-gray-400">
            <span className="px-2 py-0.5 rounded bg-[#10141D] border border-[#27324B] text-sky-300 font-mono">
              MP3 256 kbps
            </span>
            <span className="px-2 py-0.5 rounded bg-[#10141D] border border-[#27324B] text-sky-300 font-mono">
              Max 1 min (boucle worship)
            </span>
            <span className="px-2 py-0.5 rounded bg-[#10141D] border border-[#27324B] text-sky-300 font-mono">
              ≤ 5 Mo
            </span>
          </div>

          {isUploading && uploadProgress && (
            <div className="p-2.5 rounded-lg bg-[#10141D] border border-sky-500/30 space-y-1 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="text-sky-300 text-[11px] font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                  {uploadProgress.message}
                </span>
                <span className="font-mono text-sky-400 text-[10px] font-bold">
                  {uploadProgress.percent}%
                </span>
              </div>
              <div className="w-full bg-[#1A202C] h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-150"
                  style={{ width: `${uploadProgress.percent}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isUploading || !selectedFile || !padName.trim()}
              className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-md flex items-center gap-1.5"
            >
              {isUploading ? (
                <>
                  <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Traitement & Upload...</span>
                </>
              ) : (
                'Ajouter et synchroniser'
              )}
            </button>
          </div>
        </form>
      )}

      {/* Main Controls Grid */}
      <div className="mt-3.5 space-y-3">
        
        {/* Row 1: Chromatic Notes Grid (12 keys) */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-gray-300">
              Tonalité du Pad : <strong className="text-white text-xs">{currentKeyObj.label} ({currentKeyObj.alt})</strong>
            </span>
            {activeSemitone !== songTargetSemitone && (
              <button
                type="button"
                onClick={() => handleSelectKey(songTargetSemitone)}
                className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title={`Recaler sur la tonalité du chant (${songKeyObj.label})`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>Caler sur le chant ({songKeyObj.label})</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
            {CHROMATIC_NOTES.map(note => {
              const isActive = activeSemitone === note.semitone;
              const isSongKey = songTargetSemitone === note.semitone;

              return (
                <button
                  key={note.semitone}
                  type="button"
                  onClick={() => handleSelectKey(note.semitone)}
                  className={`h-11 sm:h-12 rounded-xl flex flex-col items-center justify-center font-bold transition-all cursor-pointer relative shadow-xs active:scale-95 ${
                    isActive
                      ? 'bg-sky-400 text-black shadow-sky-400/30 scale-102 ring-2 ring-sky-300 z-10'
                      : 'bg-[#181D27] hover:bg-[#222836] text-gray-200 border border-[#273041]'
                  }`}
                >
                  <span className={`text-sm sm:text-base tracking-tight ${isActive ? 'font-black' : 'font-bold'}`}>
                    {note.label}
                  </span>
                  <span className={`text-[9px] -mt-0.5 ${isActive ? 'text-black/70 font-semibold' : 'text-gray-500'}`}>
                    {note.alt}
                  </span>
                  {isSongKey && (
                    <span 
                      className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                        isActive ? 'bg-black' : 'bg-sky-400 ring-1 ring-sky-300'
                      }`}
                      title="Tonalité du chant"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Playback & Web Audio Controls Strip */}
        <div className="space-y-2.5 p-3 rounded-xl bg-[#141822] border border-[#222A3A]">
          
          {/* Tier 1: Main Transport (Play/Stop), Boucle, Octave */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-[#1E2536]">
            {/* Play/Stop Main Button */}
            <button
              type="button"
              onClick={handleTogglePlay}
              className={`h-10 px-5 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer shadow-md shrink-0 ${
                isPlaying 
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30 ring-1 ring-rose-400' 
                  : 'bg-sky-400 hover:bg-sky-300 text-black shadow-sky-400/30 ring-1 ring-sky-300'
              }`}
            >
              {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? 'Arrêter' : 'Démarrer'}</span>
            </button>

            <div className="flex items-center gap-2 shrink-0">
              {/* Loop Toggle Button */}
              <button
                type="button"
                onClick={handleToggleLoop}
                className={`h-10 px-3 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  isLooping 
                    ? 'bg-sky-500/20 text-sky-300 border-sky-400/50 font-bold' 
                    : 'bg-[#181D29] text-gray-400 border-[#263042] hover:text-gray-200'
                }`}
                title={isLooping ? 'Boucle active (lecture infinie)' : 'Boucle inactive'}
              >
                <Repeat className={`w-3.5 h-3.5 ${isLooping ? 'text-sky-400' : ''}`} />
                <span>Boucle</span>
              </button>

              {/* Octave Shift Control */}
              <div className="flex items-center bg-[#181D29] border border-[#263042] rounded-xl p-0.5 text-xs font-mono font-bold">
                <span className="text-[10px] text-gray-400 font-sans px-1.5 hidden sm:inline">Octave</span>
                <button
                  type="button"
                  onClick={() => handleOctaveChange(Math.max(-1, octaveShift - 1))}
                  className={`w-7 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                    octaveShift === -1 ? 'bg-sky-500/30 text-sky-300' : 'text-gray-400 hover:text-white'
                  }`}
                  title="Descendre d'une octave (-12 demi-tons)"
                >
                  -1
                </button>
                <button
                  type="button"
                  onClick={() => handleOctaveChange(0)}
                  className={`w-7 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                    octaveShift === 0 ? 'bg-sky-500/30 text-sky-300' : 'text-gray-400 hover:text-white'
                  }`}
                  title="Octave normale"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => handleOctaveChange(Math.min(1, octaveShift + 1))}
                  className={`w-7 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                    octaveShift === 1 ? 'bg-sky-500/30 text-sky-300' : 'text-gray-400 hover:text-white'
                  }`}
                  title="Monter d'une octave (+12 demi-tons)"
                >
                  +1
                </button>
              </div>
            </div>
          </div>

          {/* Tier 2: Two dedicated control cards (Crossfade presets & Volume) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            
            {/* Card A: Crossfade duration controls */}
            <div className="bg-[#10131B] border border-[#1E2536] rounded-xl p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span className="flex items-center gap-1 font-semibold text-gray-300">
                  <Sliders className="w-3 h-3 text-sky-400" />
                  Fondu enchaîné (Crossfade)
                </span>
                <span className="font-mono text-sky-300 tabular-nums font-bold">
                  {crossfadeDuration.toFixed(1)} s
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                {[0.5, 1.0, 1.5, 2.0, 3.0].map(sec => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => handleCrossfadeChange(sec)}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer border ${
                      Math.abs(crossfadeDuration - sec) < 0.05
                        ? 'bg-sky-400 text-black border-sky-300 shadow-xs'
                        : 'bg-[#181D29] hover:bg-[#222938] text-gray-400 border-[#252E3E]'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            {/* Card B: Master Volume & Mute */}
            <div className="bg-[#10131B] border border-[#1E2536] rounded-xl p-2.5 flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleToggleMute}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0 border ${
                  isMuted 
                    ? 'bg-rose-600 border-rose-500 text-white' 
                    : 'bg-[#181D29] hover:bg-[#222938] border-[#263042] text-gray-300'
                }`}
                title={isMuted ? "Rétablir le son" : "Muter"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                  <span className="font-semibold text-gray-300">Volume</span>
                  <span className="font-mono text-sky-300 tabular-nums font-bold">{isMuted ? 'MUTE' : `${volume}%`}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-full accent-sky-400 h-1.5 bg-[#1E2535] rounded-lg cursor-pointer"
                />
              </div>
            </div>

          </div>

        </div>

        {/* Real-time Pitch-Shift Status Banner */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#131620] border border-[#1E2536] text-[11px] text-gray-400">
          <div className="flex items-center gap-2 truncate">
            <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">
              {activeMode === 'custom' && activeCustomPad ? (
                <>
                  Pitch-Shift Web Audio : <strong className="text-sky-300">{activeCustomPad.rootKey} → {currentKeyObj.label}</strong>
                  <span className="text-gray-500 ml-1.5 font-mono">
                    ({semitonesShifted >= 0 ? `+${semitonesShifted}` : semitonesShifted} demi-tons • Ratio: {pitchShiftRatio.toFixed(3)}x)
                  </span>
                </>
              ) : (
                <>
                  Synthèse harmonique active en <strong className="text-sky-300">{currentKeyObj.label}</strong> ({selectedPresetObj.name})
                </>
              )}
            </span>
          </div>

          <span className="text-gray-500 font-mono text-[10px] shrink-0 ml-2">
            {isPlaying ? 'EN LECTURE CONTINUE' : 'EN PAUSE'}
          </span>
        </div>

      </div>

    </div>
  );
};
