import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Sparkles, 
  X, 
  ExternalLink, 
  AlertCircle,
  Headphones,
  CheckCircle2
} from 'lucide-react';
import { Song } from '../types';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { parseVoiceCommand, VoiceCommandResult } from '../utils/voiceCommandMatcher';

interface VoiceSearchControlProps {
  songs: Song[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectSong?: (song: Song) => void;
  onToggleFavorites?: () => void;
  onClearFilters?: () => void;
  className?: string;
}

// Chime audio subtil avec Web Audio API pour un retour sonore direct sur scène
function playChime(type: 'start' | 'success' | 'stop') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'start') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'success') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'stop') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    }
  } catch {
    // Les navigateurs peuvent restreindre Web Audio sans interaction utilisateur préalable
  }
}

export const VoiceSearchControl: React.FC<VoiceSearchControlProps> = ({
  songs,
  searchQuery,
  onSearchChange,
  onSelectSong,
  onToggleFavorites,
  onClearFilters,
  className = ''
}) => {
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [lastCommandResult, setLastCommandResult] = useState<VoiceCommandResult | null>(null);
  const [showVoiceHUD, setShowVoiceHUD] = useState<boolean>(false);
  const [soundFeedbackEnabled, setSoundFeedbackEnabled] = useState<boolean>(true);
  const feedbackTimeoutRef = useRef<number | null>(null);

  const handleCommandRecognized = (transcript: string) => {
    if (!transcript.trim()) return;

    const result = parseVoiceCommand(transcript, songs);
    setLastCommandResult(result);
    setLastFeedback(result.feedback);

    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setLastFeedback(null);
    }, 4500);

    if (soundFeedbackEnabled) {
      playChime('success');
    }

    switch (result.type) {
      case 'clear':
        onSearchChange('');
        onClearFilters?.();
        break;

      case 'favorites':
        onToggleFavorites?.();
        break;

      case 'open':
        if (result.songMatch && onSelectSong) {
          onSearchChange('');
          onSelectSong(result.songMatch);
        } else if (result.query) {
          onSearchChange(result.query);
        }
        break;

      case 'search':
        onSearchChange(result.query);
        break;

      case 'stop':
        stopListening();
        setShowVoiceHUD(false);
        break;

      default:
        if (result.query) {
          onSearchChange(result.query);
        }
        break;
    }
  };

  const {
    isSupported,
    isListening,
    isHandsFree,
    isSoundDetected,
    interimTranscript,
    errorMessage,
    activeLanguage,
    startListening,
    stopListening,
    toggleHandsFree,
    changeLanguage
  } = useVoiceRecognition({
    language: 'fr-FR',
    onCommand: handleCommandRecognized
  });

  const handleToggleVoice = () => {
    if (!isSupported) {
      setShowVoiceHUD(true);
      return;
    }

    if (isListening) {
      if (soundFeedbackEnabled) playChime('stop');
      stopListening();
      setShowVoiceHUD(false);
    } else {
      if (soundFeedbackEnabled) playChime('start');
      startListening(isHandsFree);
      setShowVoiceHUD(true);
    }
  };

  // Fermer le HUD si on désactive l'écoute manuellement
  useEffect(() => {
    if (!isListening && !errorMessage) {
      const timer = window.setTimeout(() => {
        if (!isListening) {
          setShowVoiceHUD(false);
        }
      }, 4000);
      return () => window.clearTimeout(timer);
    }
  }, [isListening, errorMessage]);

  return (
    <div className={`relative ${className}`}>
      {/* Bouton Microphone intégré */}
      <button
        type="button"
        id="voice-search-mic-btn"
        onClick={handleToggleVoice}
        className={`relative flex items-center justify-center w-7 h-7 rounded-md transition-all cursor-pointer ${
          isListening
            ? isHandsFree
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40 ring-2 ring-emerald-400/50 scale-105'
              : 'bg-blue-600 text-white shadow-md shadow-blue-900/40 ring-2 ring-blue-400/50 scale-105 animate-pulse'
            : 'text-gray-400 hover:text-blue-400 hover:bg-[#252528]'
        }`}
        title={
          !isSupported
            ? 'Reconnaissance vocale non disponible sur ce navigateur'
            : isListening
              ? isHandsFree
                ? 'Mode mains libres actif (cliquez pour couper)'
                : 'Écoute vocale active (cliquez pour arrêter)'
              : 'Recherche vocale mains libres (dites un titre ou une commande)'
        }
      >
        {isListening ? (
          <Mic className="w-4 h-4 text-white animate-bounce" />
        ) : (
          <Mic className="w-4 h-4" />
        )}

        {/* Petit point indicateur mode mains libres continu */}
        {isHandsFree && !isListening && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#111112]" />
        )}
      </button>

      {/* Bannière / Panneau HUD de commande vocale mains libres */}
      {(showVoiceHUD || isListening || errorMessage) && (
        <div
          id="voice-command-hud"
          className="absolute right-0 top-full mt-2 z-40 w-80 sm:w-96 bg-[#18181B] border border-[#2D2D32] rounded-xl p-3 shadow-2xl backdrop-blur-lg animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Header du panneau vocal */}
          <div className="flex items-center justify-between pb-2 border-b border-[#28282D]">
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isListening
                    ? isSoundDetected
                      ? 'bg-emerald-400 ring-4 ring-emerald-500/30 animate-ping'
                      : 'bg-emerald-500 animate-pulse'
                    : 'bg-gray-500'
                }`}
              />
              <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>Commande vocale</span>
                {isHandsFree && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 flex items-center gap-1">
                    <Headphones className="w-2.5 h-2.5" />
                    Mains libres
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Sélecteur de langue */}
              <div className="flex items-center bg-[#101012] border border-[#2B2B30] rounded p-0.5 text-[10px]">
                {(['fr-FR', 'en-US', 'es-ES'] as const).map(langCode => {
                  const label = langCode === 'fr-FR' ? 'FR' : langCode === 'en-US' ? 'EN' : 'ES';
                  const active = activeLanguage === langCode;
                  return (
                    <button
                      key={langCode}
                      type="button"
                      onClick={() => changeLanguage(langCode)}
                      className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                        active
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Bouton fermer le HUD */}
              <button
                type="button"
                onClick={() => {
                  stopListening();
                  setShowVoiceHUD(false);
                }}
                className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#252528] transition-colors"
                title="Fermer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Corps de la reconnaissance */}
          <div className="py-2.5 space-y-2">
            {!isSupported ? (
              <div className="flex items-start gap-2 bg-amber-950/40 border border-amber-800/50 rounded-lg p-2.5 text-xs text-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  L'API Web Speech n'est pas activée sur ce navigateur. Pour utiliser la recherche vocale mains libres, privilégiez Google Chrome, Microsoft Edge ou Safari.
                </p>
              </div>
            ) : errorMessage ? (
              <div className="flex items-start gap-2 bg-rose-950/40 border border-rose-800/50 rounded-lg p-2.5 text-xs text-rose-200">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p>{errorMessage}</p>
                  <button
                    type="button"
                    onClick={() => startListening(isHandsFree)}
                    className="text-[11px] font-semibold text-rose-300 underline hover:text-white"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Visualiseur d'ondes audio simples */}
                {isListening && (
                  <div className="flex items-center justify-center gap-1 py-1 h-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                      <span
                        key={i}
                        className={`w-1 rounded-full bg-blue-500 transition-all duration-150 ${
                          isSoundDetected
                            ? 'animate-pulse'
                            : 'opacity-40'
                        }`}
                        style={{
                          height: isSoundDetected ? `${8 + ((i * 7) % 16)}px` : '4px'
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Transcription en direct ou retour de commande */}
                <div className="bg-[#101012] border border-[#232327] rounded-lg p-2.5 min-h-[48px] flex flex-col justify-center">
                  {interimTranscript ? (
                    <p className="text-xs text-blue-300 italic flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping inline-block" />
                      « {interimTranscript} »
                    </p>
                  ) : lastFeedback ? (
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>{lastFeedback}</span>
                    </div>
                  ) : isListening ? (
                    <p className="text-xs text-gray-400 text-center">
                      {isHandsFree
                        ? 'Parlez naturellement (ex: "Cherche Amazing Grace", "Ouvre 10000 raisons")'
                        : 'Dites un titre, des paroles ou une commande vocale...'}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 text-center">
                      Cliquez sur le micro pour démarrer
                    </p>
                  )}
                </div>

                {/* Carte de chant trouvé avec action directe */}
                {lastCommandResult?.songMatch && onSelectSong && (
                  <div className="flex items-center justify-between bg-blue-950/40 border border-blue-800/40 rounded-lg p-2 text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-white truncate">{lastCommandResult.songMatch.title}</p>
                      <p className="text-[10px] text-gray-400 truncate">{lastCommandResult.songMatch.artist || 'Artiste inconnu'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (lastCommandResult.songMatch) {
                          onSelectSong(lastCommandResult.songMatch);
                        }
                      }}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Ouvrir
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Pied du panneau : Bascule Mode Mains Libres + Suggestions */}
          <div className="pt-2 border-t border-[#28282D] space-y-2">
            <div className="flex items-center justify-between">
              {/* Toggle Mode Mains Libres */}
              <button
                type="button"
                id="voice-toggle-handsfree-btn"
                onClick={toggleHandsFree}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-semibold border transition-all cursor-pointer ${
                  isHandsFree
                    ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                    : 'bg-[#1C1C1F] border-[#333] text-gray-300 hover:text-white'
                }`}
                title="Garde le micro toujours à l'écoute pour les musiciens sur scène"
              >
                <Headphones className="w-3 h-3" />
                <span>Mains libres {isHandsFree ? 'activé' : 'désactivé'}</span>
              </button>

              {/* Bouton Marche/Arrêt de l'écoute */}
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  isListening
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-xs'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-3 h-3" />
                    <span>Arrêter</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3 h-3" />
                    <span>Démarrer</span>
                  </>
                )}
              </button>
            </div>

            {/* Suggestions rapides de commandes */}
            <div className="flex flex-wrap gap-1 text-[10px]">
              <span className="text-gray-500 self-center mr-0.5">Exemples :</span>
              <button
                type="button"
                onClick={() => handleCommandRecognized('cherche grâce')}
                className="px-1.5 py-0.5 bg-[#1F1F23] hover:bg-[#2A2A30] text-gray-300 rounded border border-[#2D2D32] transition-colors"
              >
                « Cherche grâce »
              </button>
              <button
                type="button"
                onClick={() => handleCommandRecognized('ouvre')}
                className="px-1.5 py-0.5 bg-[#1F1F23] hover:bg-[#2A2A30] text-gray-300 rounded border border-[#2D2D32] transition-colors"
              >
                « Ouvre [titre] »
              </button>
              <button
                type="button"
                onClick={() => handleCommandRecognized('favoris')}
                className="px-1.5 py-0.5 bg-[#1F1F23] hover:bg-[#2A2A30] text-gray-300 rounded border border-[#2D2D32] transition-colors"
              >
                « Favoris »
              </button>
              <button
                type="button"
                onClick={() => handleCommandRecognized('effacer')}
                className="px-1.5 py-0.5 bg-[#1F1F23] hover:bg-[#2A2A30] text-gray-300 rounded border border-[#2D2D32] transition-colors"
              >
                « Effacer »
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
