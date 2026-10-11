import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  PresentationState, 
  getSavedPresentationState, 
  subscribeToPresentation, 
  requestPresentationSync, 
  buildPresentationSlides,
  fetchPresentationStateFromServer,
  getSavedFontScale,
  getSavedBackgroundImage,
  getSavedBackgroundOverlay,
  FONT_SCALE_KEY,
  BACKGROUND_IMAGE_KEY,
  BACKGROUND_OVERLAY_KEY
} from '../utils/presentationUtils';
import { stripParentheses } from '../utils/chordUtils';
import { useApp } from '../context/AppContext';
import { requestFullscreenSafe, exitFullscreenSafe, getIsNativeFullscreen } from '../utils/fullscreen';
import { Maximize2, Minimize2, EyeOff } from 'lucide-react';

export const PresentationDisplay: React.FC = () => {
  const { songs, selectedSong } = useApp();
  
  // 1. État unique de projection avec horodatage strict pour éliminer les race conditions
  const [displayState, setDisplayState] = useState<PresentationState | null>(() => getSavedPresentationState());
  const lastTimestampRef = useRef<number>(displayState?.updatedAt || 0);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControlsHint, setShowControlsHint] = useState<boolean>(true);

  // Échelle de police synchronisée depuis l'onglet présentation
  const [fontScale, setFontScale] = useState<number>(() => {
    const savedState = getSavedPresentationState();
    if (typeof savedState?.fontScale === 'number') return savedState.fontScale;
    return getSavedFontScale();
  });

  // Image d'arrière-plan personnalisée et filtre sombre automatique
  const [backgroundImage, setBackgroundImage] = useState<string>(() => {
    const savedState = getSavedPresentationState();
    if (typeof savedState?.backgroundImage === 'string') return savedState.backgroundImage;
    return getSavedBackgroundImage();
  });

  const [backgroundOverlay, setBackgroundOverlay] = useState<number>(() => {
    const savedState = getSavedPresentationState();
    if (typeof savedState?.backgroundOverlay === 'number') return savedState.backgroundOverlay;
    return getSavedBackgroundOverlay();
  });

  const [isControlsActive, setIsControlsActive] = useState<boolean>(false);
  const userActivityTimerRef = useRef<number | null>(null);

  // Écoute des changements de paramètres dans le localStorage
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === FONT_SCALE_KEY && e.newValue) {
        const val = parseFloat(e.newValue);
        if (!isNaN(val) && val >= 0.5 && val <= 2.5) {
          setFontScale(val);
        }
      } else if (e.key === BACKGROUND_IMAGE_KEY) {
        setBackgroundImage(e.newValue || '');
      } else if (e.key === BACKGROUND_OVERLAY_KEY && e.newValue) {
        const val = parseFloat(e.newValue);
        if (!isNaN(val) && val >= 0.1 && val <= 0.95) {
          setBackgroundOverlay(val);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Activité souris / tactile pour afficher brièvement les contrôles (plein écran)
  const handleUserActivity = useCallback(() => {
    setIsControlsActive(true);
    if (userActivityTimerRef.current) clearTimeout(userActivityTimerRef.current);
    userActivityTimerRef.current = window.setTimeout(() => setIsControlsActive(false), 3000);
  }, []);

  // 2. Initial fallback si aucun état n'est sauvegardé à l'ouverture
  const urlSongId = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('songId');
  }, []);

  useEffect(() => {
    if (!displayState && songs.length > 0) {
      const target = (urlSongId ? songs.find(s => s.id === urlSongId) : null) || selectedSong || songs[0];
      if (target) {
        const slides = buildPresentationSlides(target.contentChordPro || target.content || '', target.title);
        const initial: PresentationState = {
          songTitle: stripParentheses(target.title),
          sectionTitle: slides[0]?.sectionTitle || '',
          lines: slides[0]?.lines || [],
          slideIndex: 0,
          totalSlides: slides.length,
          isBlackout: false,
          updatedAt: Date.now()
        };
        lastTimestampRef.current = initial.updatedAt;
        setDisplayState(initial);
      }
    }
  }, [displayState, songs, urlSongId, selectedSong]);

  // 3. Fonction unique de mise à jour protégée contre les flashs et race conditions
  const updateStateIfNewer = useCallback((incoming: PresentationState | null) => {
    if (!incoming || typeof incoming.updatedAt !== 'number') return;
    // Si le message entrant est plus ancien que l'état courant, on l'ignore (évite tout flash arrière)
    if (incoming.updatedAt < lastTimestampRef.current) return;

    lastTimestampRef.current = incoming.updatedAt;
    if (typeof incoming.fontScale === 'number' && !isNaN(incoming.fontScale)) {
      setFontScale(incoming.fontScale);
    }
    if (typeof incoming.backgroundImage === 'string') {
      setBackgroundImage(incoming.backgroundImage);
    }
    if (typeof incoming.backgroundOverlay === 'number' && !isNaN(incoming.backgroundOverlay)) {
      setBackgroundOverlay(incoming.backgroundOverlay);
    }
    setDisplayState(prev => {
      // Éviter tout re-render si le contenu visible est identique
      if (
        prev &&
        prev.slideIndex === incoming.slideIndex &&
        prev.songTitle === incoming.songTitle &&
        prev.isBlackout === incoming.isBlackout &&
        prev.lines.length === incoming.lines.length &&
        prev.lines.every((l, i) => l === incoming.lines[i]) &&
        prev.fontScale === incoming.fontScale &&
        prev.backgroundImage === incoming.backgroundImage &&
        prev.backgroundOverlay === incoming.backgroundOverlay
      ) {
        return prev;
      }
      return incoming;
    });
  }, []);

  // 4. Écoute postMessage direct (depuis la fenêtre régie)
  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      if (e.data?.type === 'MELOBOOK_PRESENTATION_UPDATE' && e.data.state) {
        updateStateIfNewer(e.data.state);
      }
    };

    window.addEventListener('message', handleMsg);

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'MELOBOOK_PRESENTATION_READY' }, '*');
      }
    } catch {}

    return () => window.removeEventListener('message', handleMsg);
  }, [updateStateIfNewer]);

  // 5. Écoute BroadcastChannel & Storage Event
  useEffect(() => {
    requestPresentationSync();
    const unsub = subscribeToPresentation((newState) => {
      updateStateIfNewer(newState);
    });
    return () => unsub();
  }, [updateStateIfNewer]);

  // 6. Polling serveur HTTP de secours (toutes les 800ms, filtré par timestamp)
  useEffect(() => {
    let active = true;
    const poll = async () => {
      const serverState = await fetchPresentationStateFromServer();
      if (active && serverState) {
        updateStateIfNewer(serverState);
      }
    };

    const interval = setInterval(poll, 800);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [updateStateIfNewer]);

  // 7. Navigation locale directe depuis l'écran de projection
  const handleLocalNav = useCallback((newIndex: number) => {
    if (!displayState) return;
    const now = Date.now();
    lastTimestampRef.current = now;

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ 
          type: 'MELOBOOK_PRESENTATION_NAV', 
          slideIndex: newIndex, 
          isBlackout: displayState.isBlackout 
        }, '*');
      }
    } catch {}
  }, [displayState]);

  const handleNext = useCallback(() => {
    if (displayState && displayState.slideIndex < displayState.totalSlides - 1) {
      handleLocalNav(displayState.slideIndex + 1);
    }
  }, [displayState, handleLocalNav]);

  const handlePrev = useCallback(() => {
    if (displayState && displayState.slideIndex > 0) {
      handleLocalNav(displayState.slideIndex - 1);
    }
  }, [displayState, handleLocalNav]);

  const handleToggleBlackout = useCallback(() => {
    if (!displayState) return;
    const nextBlackout = !displayState.isBlackout;
    const now = Date.now();
    lastTimestampRef.current = now;
    setDisplayState(prev => prev ? { ...prev, isBlackout: nextBlackout, updatedAt: now } : null);

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ 
          type: 'MELOBOOK_PRESENTATION_NAV', 
          slideIndex: displayState.slideIndex, 
          isBlackout: nextBlackout 
        }, '*');
      }
    } catch {}
  }, [displayState]);

  // Plein écran
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(getIsNativeFullscreen());
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (getIsNativeFullscreen()) {
      exitFullscreenSafe();
    } else {
      requestFullscreenSafe(document.documentElement);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowControlsHint(false), 4500);
    return () => clearTimeout(timer);
  }, []);

  // Clavier sur la fenêtre de projection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        handleToggleBlackout();
      } else if (['ArrowRight', ' ', 'PageDown', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        handleNext();
      } else if (['ArrowLeft', 'PageUp', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handleToggleBlackout, toggleFullscreen]);

  // Clic écran : gauche = précédent, droite = suivant
  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    handleUserActivity();
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('header') || target.closest('footer')) return;
    if (e.clientX < window.innerWidth * 0.35) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  const isBlackout = displayState?.isBlackout || false;
  const lines = displayState?.lines || [];
  const title = displayState?.songTitle || '';
  const currentIdx = (displayState?.slideIndex ?? 0) + 1;
  const totalSlides = displayState?.totalSlides ?? 0;

  return (
    <div 
      onClick={handleScreenClick}
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      className="fixed inset-0 w-screen h-screen bg-black text-white select-none flex flex-col justify-between overflow-hidden font-sans cursor-pointer bg-cover bg-center bg-no-repeat transition-all duration-500"
      style={backgroundImage ? { backgroundImage: `url("${backgroundImage}")` } : undefined}
    >
      {/* Filtre sombre automatique protecteur de contraste et de lisibilité */}
      {backgroundImage && (
        <div 
          className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-300 z-0"
          style={{ opacity: isBlackout ? 1 : backgroundOverlay }}
        />
      )}

      {/* Barre supérieure discrète */}
      <header 
        onClick={(e) => e.stopPropagation()}
        className={`w-full flex items-center justify-between px-4 py-3 relative z-30 transition-opacity duration-300 ${
          isControlsActive ? 'opacity-100' : 'opacity-0 hover:opacity-100 focus-within:opacity-100'
        }`}
      >
        <span className="text-xs text-gray-400 font-mono tracking-wider drop-shadow">Melobook Projection</span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFullscreen();
          }}
          className="p-2 rounded-lg bg-gray-900/90 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700/60 shadow-lg transition-colors cursor-pointer"
          title={isFullscreen ? "Quitter le plein écran (F)" : "Plein écran (F)"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>
      </header>

      {/* Zone centrale des paroles avec mise à l'échelle dynamique */}
      <main className="flex-1 flex items-center justify-center px-6 sm:px-12 md:px-20 text-center relative z-20">
        {isBlackout ? (
          <div className="flex items-center gap-2 text-gray-400 animate-pulse text-sm">
            <EyeOff className="w-4 h-4" />
            <span>Écran masqué</span>
          </div>
        ) : lines.length > 0 ? (
          <div 
            key={`${title}-${displayState?.slideIndex}`}
            className="max-w-7xl w-full flex flex-col items-center justify-center gap-3 sm:gap-5 animate-presentation-slide"
          >
            {lines.map((line, idx) => (
              <p
                key={idx}
                className="font-bold tracking-wide text-white leading-relaxed select-none transition-all"
                style={{
                  fontSize: `calc(clamp(1.75rem, 4.3vw, 4.5rem) * ${fontScale})`,
                  lineHeight: 1.42,
                  textShadow: '0 2px 10px rgba(0, 0, 0, 0.85), 0 4px 25px rgba(0, 0, 0, 0.65)'
                }}
              >
                {line}
              </p>
            ))}
          </div>
        ) : (
          <div className="text-gray-400 text-lg">En attente de diffusion...</div>
        )}
      </main>

      {/* Footer minimaliste : Juste le titre centré */}
      <footer className="w-full px-8 py-5 relative z-20 flex items-center justify-center text-gray-300">
        <div className="min-w-0 max-w-4xl text-center">
          <h2 className="text-sm sm:text-base md:text-lg font-medium text-gray-200 tracking-wide truncate drop-shadow">
            {title}
          </h2>
        </div>
      </footer>

      {showControlsHint && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-gray-900/95 text-gray-300 text-xs px-4 py-2 rounded-full border border-gray-700/80 pointer-events-none transition-opacity shadow-2xl flex items-center gap-2 z-30">
          <span>Touche <strong>F</strong> : Plein écran</span>
          <span className="text-gray-600">•</span>
          <span><strong>B</strong> : Masquer</span>
          <span className="text-gray-600">•</span>
          <span>Flèches / Clic : Défiler</span>
        </div>
      )}
    </div>
  );
};
