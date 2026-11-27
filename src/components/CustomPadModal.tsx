import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Music, 
  Trash2, 
  Play, 
  Square, 
  Check, 
  Sparkles, 
  Volume2, 
  AlertCircle,
  FileAudio,
  Radio,
  Layers,
  Zap,
  Database,
  Clock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CustomPad } from '../types';
import { CHROMATIC_NOTES, padAudio, PAD_PRESETS } from '../utils/padAudio';
import { optimizePadAudio, OptimizationProgress } from '../utils/audioOptimizer';
import { resolveDynamicBitrate } from '../utils/ffmpegCompressor';
import { saveAudioBlobToIndexedDB, deleteAudioBlobFromIndexedDB } from '../utils/indexedDB';
import { AudioPreviewPlayer } from './AudioPreviewPlayer';

interface CustomPadModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSongKey?: string;
}

export const CustomPadModal: React.FC<CustomPadModalProps> = ({
  isOpen,
  onClose,
  activeSongKey
}) => {
  const { 
    customPads, 
    createCustomPad, 
    deleteCustomPad, 
    uploadPadAudio, 
    showNotification,
    currentGroup,
    currentUser,
    canManageSongs,
    isGuest,
    isViewer
  } = useApp();
  const canCreatePad = !isGuest && !isViewer;

  const [padName, setPadName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rootSemitone, setRootSemitone] = useState<number>(0); // 0 = C (Do)
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<OptimizationProgress | null>(null);
  const [previewPadId, setPreviewPadId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    if (!file) return;
    // Check audio extension / type
    const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/x-m4a', 'audio/ogg', 'audio/webm', 'audio/aac'];
    const isAudio = validTypes.includes(file.type) || /\.(mp3|wav|m4a|ogg|webm|aac)$/i.test(file.name);
    if (!isAudio) {
      showNotification('Format non supporté. Veuillez importer un fichier MP3, WAV ou M4A.', 'error');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      showNotification('Le fichier source dépasse 100 Mo.', 'error');
      return;
    }

    setSelectedFile(file);
    if (!padName) {
      // Derive clean name from filename
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setPadName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      showNotification('Sélectionnez un fichier audio MP3 ou WAV', 'error');
      return;
    }
    if (!padName.trim()) {
      showNotification('Donnez un nom à votre pad', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress({ stage: 'decoding', percent: 10, message: 'Démarrage de l\'optimisation...' });

    try {
      // Convert to 256 kbps MP3, truncate to 1min if needed with crossfade, enforce <= 5MB
      const optResult = await optimizePadAudio(selectedFile, (p) => {
        setUploadProgress(p);
      });

      setUploadProgress({ stage: 'encoding', percent: 96, message: 'Téléversement sur le Cloud...' });

      const audioUrl = await uploadPadAudio(optResult.file);
      const rootNoteObj = CHROMATIC_NOTES.find(n => n.semitone === rootSemitone) || CHROMATIC_NOTES[0];

      const newPadId = await createCustomPad({
        name: padName.trim(),
        rootSemitone,
        rootKey: rootNoteObj.label,
        audioUrl,
        fileSize: optResult.finalSize
      });

      const newPadObj: CustomPad = {
        id: newPadId,
        groupId: currentGroup?.id || 'default-group',
        name: padName.trim(),
        rootSemitone,
        rootKey: rootNoteObj.label,
        audioUrl,
        fileSize: optResult.finalSize
      };

      // Persist in IndexedDB cache for instant zero-network playback in future sessions
      saveAudioBlobToIndexedDB(audioUrl, optResult.file, { fileName: `${padName.trim()}.mp3`, mimeType: 'audio/mp3' }).catch(console.warn);
      saveAudioBlobToIndexedDB(newPadId, optResult.file, { fileName: `${padName.trim()}.mp3`, mimeType: 'audio/mp3' }).catch(console.warn);

      padAudio.selectCustomPad(newPadObj);

      const origMb = (optResult.originalSize / (1024 * 1024)).toFixed(1);
      const finalMb = (optResult.finalSize / (1024 * 1024)).toFixed(1);
      const savedPct = optResult.originalSize > 0 
        ? Math.round(((optResult.originalSize - optResult.finalSize) / optResult.originalSize) * 100)
        : 0;

      const bitrateLabel = optResult.bitrateKbps ? ` à ${optResult.bitrateKbps} kbps` : '';
      const normLabel = optResult.gainApplied && Math.abs(optResult.gainApplied - 1.0) >= 0.04
        ? ` • normalisé ${optResult.gainApplied > 1 ? '+' : ''}${(20 * Math.log10(optResult.gainApplied)).toFixed(1)} dB`
        : '';

      const methodLabel = optResult.compressionMethod === 'passthrough' 
        ? ' (import direct instantané)'
        : optResult.compressionMethod === 'ffmpeg-wasm'
          ? ` compressé avec FFmpeg.wasm${bitrateLabel}`
          : ' optimisé Web Audio';

      const successMsg = savedPct > 0
        ? `Pad "${padName}"${methodLabel}${normLabel} (${origMb} Mo ➔ ${finalMb} Mo, -${savedPct}% bande passante) et synchronisé !`
        : `Pad "${padName}"${methodLabel}${normLabel} (${finalMb} Mo) synchronisé dans le Cloud !`;

      showNotification(successMsg, 'success');
      setSelectedFile(null);
      setPadName('');
      setRootSemitone(0);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error('Erreur import pad:', err);
      showNotification(err?.message || 'Erreur lors du traitement du pad audio', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleSelectAndActivate = (pad: CustomPad) => {
    padAudio.selectCustomPad(pad);
    showNotification(`Pad "${pad.name}" activé`, 'success');
    onClose();
  };

  const handleTogglePreview = (pad: CustomPad) => {
    if (previewPadId === pad.id && padAudio.getIsRunning()) {
      padAudio.stop();
      setPreviewPadId(null);
    } else {
      padAudio.selectCustomPad(pad);
      padAudio.start(pad.rootSemitone);
      setPreviewPadId(pad.id);
    }
  };

  const activePad = padAudio.getActiveCustomPad();
  const isCustomMode = padAudio.getActiveMode() === 'custom';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-slate-50 dark:bg-[#11141B] border border-slate-300 dark:border-[#232938] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-300 dark:border-[#1E2536] flex items-center justify-between shrink-0 bg-slate-50 dark:bg-[#141822]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-700 dark:text-sky-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Pads d'Accompagnement Audio</h2>
              <p className="text-xs text-slate-600 dark:text-gray-400">
                Bibliothèque <span className="text-slate-800 dark:text-gray-200 font-medium">{currentGroup?.name || 'Principale'}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#EDF1F5] dark:bg-[#181D29] hover:bg-slate-200 dark:hover:bg-[#22283A] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-6 overflow-y-auto">
          
          {/* Pitch-Shift Info Banner */}
          <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-500/20 text-xs text-sky-700 dark:text-sky-300/90 leading-relaxed flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-sky-700 dark:text-sky-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-sky-700 dark:text-sky-200">Transposition automatique activée :</strong> Vous n'avez besoin que d'<strong>un seul fichier audio par nappe</strong> (ex. enregistré en Do). Le moteur Web Audio transpose automatiquement la nappe vers les 12 tonalités chromatiques en direct sans latence.
            </div>
          </div>

          {/* Section 1: Formulaire d'importation */}
          {canCreatePad && (
            <form onSubmit={handleSubmit} className="bg-[#EDF1F5] dark:bg-[#151923] border border-slate-300 dark:border-[#242C3D] rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400" />
                Importer un nouveau Pad MP3 / WAV
              </h3>
              {selectedFile && (
                <span className="text-[11px] font-mono text-slate-600 dark:text-gray-400">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} Mo
                </span>
              )}
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                dragOver 
                  ? 'border-sky-400 bg-sky-500/10' 
                  : selectedFile 
                    ? 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/10' 
                    : 'border-slate-300 dark:border-[#2D374D] hover:border-gray-500 bg-slate-50 dark:bg-[#12151D]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.m4a,.ogg,audio/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />

              <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                {selectedFile ? (
                  <>
                    <FileAudio className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 truncate max-w-sm">
                      {selectedFile.name}
                    </span>
                    <span className="text-[10px] text-slate-600 dark:text-gray-400">
                      Cliquer pour remplacer le fichier
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-slate-600 dark:text-gray-400" />
                    <span className="text-xs font-medium text-slate-800 dark:text-gray-200">
                      Glissez votre fichier audio ici, ou <span className="text-sky-700 dark:text-sky-400 underline">parcourir</span>
                    </span>
                    <span className="text-[10px] text-gray-500">
                      MP3, WAV ou M4A (1 seule note de référence, ex. nappe de drone en C)
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Lightweight Audio Preview Player with Waveform Visualizer */}
            {selectedFile && (
              <AudioPreviewPlayer 
                file={selectedFile} 
                rootKeyName={CHROMATIC_NOTES.find(n => n.semitone === rootSemitone)?.label} 
              />
            )}

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Pad Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-gray-300 mb-1">
                  Nom du Pad
                </label>
                <input
                  type="text"
                  value={padName}
                  onChange={(e) => setPadName(e.target.value)}
                  placeholder="ex. Ambient Warmth, Cello Drone..."
                  className="w-full bg-slate-50 dark:bg-[#10131B] border border-slate-300 dark:border-[#273042] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-sky-400 transition-colors"
                />
              </div>

              {/* Root Key Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-gray-300 mb-1">
                  Tonalité d'origine du fichier (Note de base)
                </label>
                <select
                  value={rootSemitone}
                  onChange={(e) => setRootSemitone(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-[#10131B] border border-slate-300 dark:border-[#273042] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-400 transition-colors cursor-pointer"
                >
                  {CHROMATIC_NOTES.map(n => (
                    <option key={n.semitone} value={n.semitone}>
                      {n.label} ({n.alt}) — Référence
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* Optimization specs badge */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-600 dark:text-gray-400">
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-mono flex items-center gap-1 font-semibold">
                <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                FFmpeg.wasm Client-Side
              </span>
              <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 border border-purple-500/40 text-purple-700 dark:text-purple-300 font-mono flex items-center gap-1 font-semibold">
                <Database className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                Cache IndexedDB actif
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#EDF1F5] dark:bg-[#1B2232] border border-slate-300 dark:border-[#27324B] text-sky-700 dark:text-sky-300 font-mono">
                {selectedFile 
                  ? `Bitrate dynamique : ${resolveDynamicBitrate(selectedFile.size)} kbps` 
                  : 'Bitrate dynamique (64 / 96 / 128 kbps)'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#EDF1F5] dark:bg-[#1B2232] border border-slate-300 dark:border-[#27324B] text-sky-700 dark:text-sky-300 font-mono">
                Max 1 min (boucle worship)
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#EDF1F5] dark:bg-[#1B2232] border border-slate-300 dark:border-[#27324B] text-sky-700 dark:text-sky-300 font-mono">
                Max 5 Mo
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-500/40 text-amber-700 dark:text-amber-300 font-mono flex items-center gap-1 font-semibold">
                <Volume2 className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                Auto-normalisation (-0.7 dB)
              </span>
            </div>

            {/* Warning & Tip for heavy files with dynamic bitrate indication */}
            {selectedFile && selectedFile.size > 8 * 1024 * 1024 && (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-500/30 text-amber-700 dark:text-amber-200/90 text-[11px] flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <span>Fichier volumineux ({(selectedFile.size / (1024 * 1024)).toFixed(1)} Mo) détecté</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-200 font-mono text-[10px]">
                      Sélection automatique : {resolveDynamicBitrate(selectedFile.size)} kbps
                    </span>
                  </div>
                  <p className="text-amber-700 dark:text-amber-200/80 leading-normal">
                    Pour maximiser la vitesse de compression dans le navigateur tout en préservant l'amplitude des nappes d'ambiance, FFmpeg.wasm encode automatiquement à <strong>{resolveDynamicBitrate(selectedFile.size)} kbps</strong> avec découpage à 1 min.
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 font-medium">
                    ⚡ Vitesse multipliée par ~2 et réduction de plus de 95% de la bande passante vers Firebase Storage.
                  </p>
                </div>
              </div>
            )}

            {/* Detailed Progress Bar when optimizing & uploading */}
            {isUploading && uploadProgress && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0F131D] border border-sky-500/40 space-y-2.5 animate-in fade-in shadow-lg">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                    </span>
                    <span className="text-sky-700 dark:text-sky-200 font-semibold truncate text-[11px]">
                      {uploadProgress.message}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                    <span className="px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-400/30 text-sky-700 dark:text-sky-300 font-bold">
                      {uploadProgress.percent}%
                    </span>
                  </div>
                </div>

                {/* Progress bar line */}
                <div className="w-full bg-[#EDF1F5] dark:bg-[#1A2234] h-2 rounded-full overflow-hidden p-[1px]">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-indigo-500 transition-all duration-200 shadow-sm shadow-sky-400/50"
                    style={{ width: `${Math.max(4, uploadProgress.percent)}%` }}
                  />
                </div>

                {/* Time & ETA Metrics */}
                <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-gray-400 font-mono pt-0.5 border-t border-slate-300 dark:border-[#1C2538]">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-600 dark:text-gray-400" />
                    <span>
                      Écoulé : <strong className="text-slate-800 dark:text-gray-200">{uploadProgress.elapsedSeconds !== undefined ? `${uploadProgress.elapsedSeconds}s` : 'En cours...'}</strong>
                    </span>
                  </div>

                  {uploadProgress.etaSeconds !== undefined && uploadProgress.etaSeconds > 0 ? (
                    <span className="text-sky-700 dark:text-sky-300 font-medium">
                      Temps restant : <strong className="text-slate-900 dark:text-white">~{uploadProgress.etaSeconds}s</strong>
                    </span>
                  ) : uploadProgress.percent >= 95 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Finalisation imminente...</span>
                  ) : (
                    <span className="text-gray-500">Calcul estimation...</span>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isUploading || !selectedFile || !padName.trim()}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                {isUploading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Traitement et Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Convertir & Enregistrer pour l'équipe</span>
                  </>
                )}
              </button>
            </div>
          </form>
          )}

          {/* Section 2: Liste des Pads Audio de l'équipe */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400" />
                Pads de votre équipe ({customPads.length})
              </h3>
              <span className="text-[11px] text-gray-500">
                Synchronisé sur le Cloud
              </span>
            </div>

            {customPads.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-50 dark:bg-[#141822] border border-slate-300 dark:border-[#202735] text-center text-slate-600 dark:text-gray-400 text-xs">
                Aucun pad audio personnalisé pour le moment.
                <p className="text-[11px] text-gray-500 mt-1">
                  Importez un fichier MP3 ci-dessus pour l'utiliser lors de vos louanges et répétitions.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {customPads.map((pad) => {
                  const isCurrentActive = isCustomMode && activePad?.id === pad.id;
                  const isPreviewing = previewPadId === pad.id && padAudio.getIsRunning();

                  return (
                    <div
                      key={pad.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isCurrentActive 
                          ? 'bg-sky-50 dark:bg-sky-950/20 border-sky-400/40 ring-1 ring-sky-400/30' 
                          : 'bg-[#EDF1F5] dark:bg-[#151923] border-slate-300 dark:border-[#222A3A] hover:border-slate-400 dark:hover:border-[#2C374B]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Play/Preview Button */}
                        <button
                          type="button"
                          onClick={() => handleTogglePreview(pad)}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                            isPreviewing
                              ? 'bg-sky-400 text-black shadow-xs'
                              : 'bg-[#EDF1F5] dark:bg-[#1B212E] hover:bg-slate-200 dark:hover:bg-[#252E40] text-slate-700 dark:text-gray-300 border border-slate-300 dark:border-[#2B3547]'
                          }`}
                          title={isPreviewing ? "Arrêter l'écoute" : "Pré-écouter"}
                        >
                          {isPreviewing ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{pad.name}</span>
                            {isCurrentActive && (
                              <span className="text-[9px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border border-sky-400/40 px-1.5 py-0.2 rounded">
                                Actif
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-600 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                            <span>Base : <strong className="text-sky-700 dark:text-sky-300">{pad.rootKey}</strong></span>
                            <span>•</span>
                            <span>{pad.fileSize ? `${(pad.fileSize / (1024 * 1024)).toFixed(1)} Mo` : 'MP3 Cloud'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSelectAndActivate(pad)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isCurrentActive
                              ? 'bg-sky-400 text-black shadow-sky-400/20'
                              : 'bg-[#EDF1F5] dark:bg-[#1E2535] hover:bg-slate-200 dark:hover:bg-[#293247] text-slate-800 dark:text-gray-200 border border-slate-300 dark:border-[#2F3A4E]'
                          }`}
                        >
                          {isCurrentActive ? 'Sélectionné' : 'Activer'}
                        </button>

                        {!isGuest && (canManageSongs || (currentUser?.uid && pad.createdBy === currentUser.uid)) && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (window.confirm(`Supprimer le pad "${pad.name}" pour toute l'équipe ?`)) {
                                if (isCurrentActive) padAudio.stop();
                                await deleteCustomPad(pad.id);
                                // Cleanup cached audio blob in IndexedDB
                                deleteAudioBlobFromIndexedDB(pad.id).catch(console.warn);
                                if (pad.audioUrl) deleteAudioBlobFromIndexedDB(pad.audioUrl).catch(console.warn);
                                showNotification(`Pad "${pad.name}" supprimé`, 'info');
                              }
                            }}
                            className="w-8 h-8 rounded-lg bg-[#EDF1F5] dark:bg-[#1B212E] hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-600 dark:text-gray-400 hover:text-rose-800 dark:hover:text-rose-400 border border-slate-300 dark:border-[#283143] flex items-center justify-center transition-colors cursor-pointer"
                            title="Supprimer ce pad"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: Presets de Synthèse Intégrés */}
          <div className="pt-2 border-t border-slate-200 dark:border-[#1C2230]">
            <div className="text-[11px] font-semibold text-slate-600 dark:text-gray-400 mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-600 dark:text-gray-400" />
              <span>Synthétiseurs intégrés permanents ({PAD_PRESETS.length}) :</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {PAD_PRESETS.map(p => {
                const isPresetActive = !isCustomMode && padAudio.getCurrentPreset() === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      padAudio.selectSynthPreset(p.id);
                      showNotification(`Synthé "${p.name}" sélectionné`, 'info');
                    }}
                    className={`text-left p-2 rounded-lg text-xs transition-colors cursor-pointer border ${
                      isPresetActive
                        ? 'bg-sky-500/15 border-sky-400/40 text-sky-700 dark:text-sky-300 font-semibold'
                        : 'bg-slate-50 dark:bg-[#13161F] hover:bg-slate-200/70 dark:hover:bg-[#1A1F2B] border-slate-300 dark:border-[#202735] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="text-[9px] text-gray-500 truncate">{p.category}</div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-300 dark:border-[#1E2536] bg-slate-50 dark:bg-[#141822] flex items-center justify-between text-xs text-slate-600 dark:text-gray-400">
          <span>{customPads.length} pad(s) personnalisés</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#EDF1F5] dark:bg-[#1C2230] hover:bg-slate-200 dark:hover:bg-[#252E40] text-slate-900 dark:text-white rounded-lg transition-colors cursor-pointer font-medium"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
