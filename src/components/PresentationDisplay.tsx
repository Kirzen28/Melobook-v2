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
  BACKGROUND_OVERLAY_KEY,
  formatRemainingTime,
  getCountdownTheme,
  cleanBibleVerseText
} from '../utils/presentationUtils';
import { stripParentheses } from '../utils/chordUtils';
import { useApp } from '../context/AppContext';
import { requestFullscreenSafe, exitFullscreenSafe, getIsNativeFullscreen } from '../utils/fullscreen';
import { Maximize2, Minimize2, EyeOff, Timer, Clock, Sparkles, BookOpen, Music, Video, Image as ImageIcon } from 'lucide-react';


export const PresentationDisplay: React.FC = () => {
  const { songs, selectedSong } = useApp();
  
  // 1. État unique de projection avec horodatage strict pour éliminer les race conditions
  const [displayState, setDisplayState] = useState<PresentationState | null>(() => getSavedPresentationState());
  const lastTimestampRef = useRef<number>(displayState?.updatedAt || 0);

  // Horloge locale pour le décompte en temps réel
  const [currentNow, setCurrentNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!displayState?.countdown?.isActive) return;
    const interval = setInterval(() => {
      setCurrentNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [displayState?.countdown?.isActive]);

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
        prev.itemType === incoming.itemType &&
        prev.bibleReference === incoming.bibleReference &&
        prev.lines.length === incoming.lines.length &&
        prev.lines.every((l, i) => l === incoming.lines[i]) &&
        prev.fontScale === incoming.fontScale &&
        prev.backgroundImage === incoming.backgroundImage &&
        prev.backgroundOverlay === incoming.backgroundOverlay &&
        prev.isBilingual === incoming.isBilingual &&
        prev.bilingualFormat === incoming.bilingualFormat &&
        prev.primaryLanguage === incoming.primaryLanguage &&
        prev.secondaryLanguage === incoming.secondaryLanguage &&
        prev.secondarySongTitle === incoming.secondarySongTitle &&
        prev.secondaryLines?.length === incoming.secondaryLines?.length &&
        (prev.secondaryLines || []).every((l, i) => l === (incoming.secondaryLines || [])[i])
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

  // Échelle de police effective garantie (prend la valeur la plus fraîche entre l'état de projection et le storage)
  const effectiveFontScale = (typeof displayState?.fontScale === 'number' && !isNaN(displayState.fontScale))
    ? displayState.fontScale
    : fontScale;

  const isCountdownActive = Boolean(displayState?.countdown?.isActive);
  const countdownTheme = getCountdownTheme(displayState?.countdown?.themeId);
  const countdownRemainingMs = isCountdownActive && displayState?.countdown?.targetTimestamp
    ? Math.max(0, displayState.countdown.targetTimestamp - currentNow)
    : 0;
  const countdownInfo = formatRemainingTime(countdownRemainingMs);

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

      {/* Zone centrale des paroles avec mise à l'échelle dynamique ou Décompte avant événement */}
      <main className="flex-1 flex items-center justify-center px-6 sm:px-12 md:px-20 text-center relative z-20">
        {isBlackout ? (
          <div className="flex items-center gap-2 text-gray-400 animate-pulse text-sm">
            <EyeOff className="w-4 h-4" />
            <span>Écran masqué</span>
          </div>
        ) : isCountdownActive ? (
          <div className="max-w-6xl w-full flex flex-col items-center justify-center gap-6 sm:gap-9 animate-presentation-slide select-none text-center">
            {/* Badge Titre / Message d'accueil */}
            <div className={`inline-flex items-center gap-3 px-6 sm:px-8 py-2.5 sm:py-3 rounded-full ${countdownTheme.badgeBg} border ${countdownTheme.badgeBorder} ${countdownTheme.badgeText} text-base sm:text-xl md:text-2xl font-black tracking-wider uppercase shadow-2xl backdrop-blur-md`}>
              <Timer className={`w-5 h-5 sm:w-7 sm:h-7 ${countdownTheme.badgeIconColor} animate-pulse shrink-0`} />
              <span>{displayState?.countdown?.title || "Le culte commence dans"}</span>
            </div>

            {/* Grand affichage numérique du décompte : plus grand, très gras, centré, avec effet de lueur */}
            <div className="flex flex-col items-center justify-center gap-4 w-full">
              <div 
                className={`font-mono font-black tracking-widest leading-none drop-shadow-2xl tabular-nums select-none ${countdownTheme.textColor}`}
                style={{
                  fontSize: `calc(clamp(5.5rem, 16vw, 15rem) * ${effectiveFontScale})`,
                  fontWeight: 900,
                  textShadow: countdownTheme.glowCss,
                  letterSpacing: '0.04em'
                }}
              >
                {countdownInfo.formatted}
              </div>
              
              {countdownInfo.isExpired ? (
                <div className="text-emerald-400 font-extrabold text-xl sm:text-3xl md:text-4xl tracking-wider uppercase animate-bounce drop-shadow-lg flex items-center justify-center gap-3 mt-3">
                  <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-300 shrink-0" />
                  <span>L'événement commence !</span>
                </div>
              ) : (
                <div className={`flex items-center justify-center gap-3 text-gray-100 text-base sm:text-xl md:text-2xl font-bold tracking-wide drop-shadow-md bg-black/60 px-6 py-2.5 rounded-2xl border ${countdownTheme.badgeBorder} backdrop-blur-md mt-1`}>
                  <Clock className={`w-5 h-5 sm:w-6 sm:h-6 ${countdownTheme.badgeIconColor} shrink-0`} />
                  <span>Début prévu à <strong className="text-white font-black underline decoration-2 underline-offset-4">{displayState?.countdown?.targetTime}</strong></span>
                </div>
              )}
            </div>
          </div>
        ) : displayState?.media?.isActive ? (
          <div className="max-w-7xl w-full h-full flex flex-col items-center justify-center gap-4 animate-presentation-slide select-none">
            {displayState.media.type === 'video' ? (
              displayState.media.source === 'youtube' ? (
                <div className="w-full aspect-video max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-black flex items-center justify-center">
                  <iframe
                    src={displayState.media.url}
                    title={displayState.media.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="w-full max-h-[85vh] flex items-center justify-center rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-black">
                  <video
                    src={displayState.media.url}
                    autoPlay
                    loop={displayState.media.isLoop ?? true}
                    muted={displayState.media.isMuted ?? false}
                    playsInline
                    className="max-h-[85vh] max-w-full w-auto h-auto object-contain rounded-2xl"
                  />
                </div>
              )
            ) : displayState.media.type === 'image' ? (
              <div className="w-full max-h-[85vh] flex items-center justify-center rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-black/40 backdrop-blur-xs">
                <img
                  src={displayState.media.url}
                  alt={displayState.media.title}
                  className="max-h-[85vh] max-w-full w-auto h-auto object-contain rounded-2xl animate-in fade-in zoom-in-95 duration-200"
                />
              </div>
            ) : (
              /* Audio */
              <div className="max-w-2xl w-full p-8 sm:p-12 rounded-3xl bg-black/75 border border-purple-500/40 shadow-2xl backdrop-blur-xl flex flex-col items-center justify-center gap-6 text-center animate-in fade-in zoom-in-95">
                <div className="w-24 h-24 rounded-full bg-purple-600/30 border-2 border-purple-400/50 flex items-center justify-center text-purple-300 shadow-xl shadow-purple-950/50 animate-pulse">
                  <Music className="w-12 h-12" />
                </div>
                <div>
                  <span className="text-xs uppercase font-extrabold px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
                    Diffusion Audio
                  </span>
                  <h2 
                    className="font-extrabold text-white mt-3"
                    style={{ fontSize: `calc(clamp(1.5rem, 3.2vw, 2.5rem) * ${effectiveFontScale})` }}
                  >
                    {displayState.media.title}
                  </h2>
                </div>
                {displayState.media.source === 'youtube' ? (
                  <iframe
                    src={displayState.media.url}
                    title={displayState.media.title}
                    className="w-full h-24 rounded-xl border border-white/10"
                    allow="autoplay; encrypted-media"
                  />
                ) : (
                  <audio
                    src={displayState.media.url}
                    autoPlay
                    loop={displayState.media.isLoop ?? true}
                    controls
                    className="w-full max-w-md accent-purple-500"
                  />
                )}
              </div>
            )}
          </div>
        ) : lines.length > 0 ? (
          (displayState?.itemType === 'bible' || Boolean(displayState?.bibleReference)) ? (
            displayState?.isBilingual && displayState?.secondaryLines && displayState.secondaryLines.length > 0 ? (
              displayState.bilingualFormat === 'columns' ? (
                <div 
                  key={`bible-bi-cols-${displayState?.bibleReference || title}-${displayState?.slideIndex}`}
                  className="max-w-7xl w-full flex flex-col items-center justify-center gap-5 sm:gap-7 animate-presentation-slide select-none"
                >
                  <div 
                    className="inline-flex items-center gap-2.5 px-6 sm:px-8 py-2 sm:py-2.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 font-black tracking-wider uppercase shadow-2xl backdrop-blur-md transition-all"
                    style={{ fontSize: `calc(clamp(0.95rem, 2vw, 1.55rem) * ${effectiveFontScale})` }}
                  >
                    <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0" />
                    <span>{displayState?.songTitle || displayState?.bibleReference || title}</span>
                  </div>

                  <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14 items-center">
                    {/* Left Column : Primary Version */}
                    <div className="flex flex-col items-start justify-center text-left space-y-2 sm:space-y-3">
                      <div 
                        className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-200 font-bold uppercase tracking-wider mb-1 transition-all self-start"
                        style={{ fontSize: `calc(clamp(0.75rem, 1.3vw, 1.15rem) * ${effectiveFontScale})` }}
                      >
                        <span>{displayState.primaryLanguage || displayState.bibleVersion || 'Principal'}</span>
                      </div>
                      {lines.map((line, idx) => (
                        <p
                          key={`bp-${idx}`}
                          className="font-extrabold tracking-wide text-white leading-relaxed select-none transition-all drop-shadow-md text-left w-full"
                          style={{
                            fontSize: `calc(clamp(1.5rem, 3.2vw, 3.6rem) * ${effectiveFontScale})`,
                            lineHeight: 1.4,
                            textShadow: '0 2px 12px rgba(0, 0, 0, 0.9), 0 4px 25px rgba(0, 0, 0, 0.7)'
                          }}
                        >
                          {cleanBibleVerseText(line)}
                        </p>
                      ))}
                    </div>

                    {/* Right Column : Secondary Version */}
                    <div className="flex flex-col items-start justify-center text-left space-y-2 sm:space-y-3 md:border-l md:border-amber-400/20 md:pl-8">
                      <div 
                        className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 font-bold uppercase tracking-wider mb-1 transition-all self-start"
                        style={{ fontSize: `calc(clamp(0.75rem, 1.3vw, 1.15rem) * ${effectiveFontScale})` }}
                      >
                        <span>{displayState.secondaryLanguage || 'Traduction'}</span>
                      </div>
                      {displayState.secondaryLines.map((line, idx) => (
                        <p
                          key={`bs-${idx}`}
                          className="font-bold tracking-wide text-cyan-100/95 leading-relaxed select-none transition-all drop-shadow-md text-left w-full"
                          style={{
                            fontSize: `calc(clamp(1.5rem, 3.2vw, 3.6rem) * ${effectiveFontScale})`,
                            lineHeight: 1.4,
                            textShadow: '0 2px 12px rgba(6, 182, 212, 0.4), 0 4px 25px rgba(0, 0, 0, 0.9)'
                          }}
                        >
                          {cleanBibleVerseText(line)}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Stacked / Subtitles for Bible */
                <div 
                  key={`bible-bi-stacked-${displayState?.bibleReference || title}-${displayState?.slideIndex}`}
                  className="max-w-6xl w-full flex flex-col items-center justify-center gap-5 sm:gap-7 animate-presentation-slide select-none"
                >
                  <div 
                    className="inline-flex items-center gap-2.5 px-6 sm:px-8 py-2 sm:py-2.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 font-black tracking-wider uppercase shadow-2xl backdrop-blur-md transition-all"
                    style={{ fontSize: `calc(clamp(0.95rem, 2vw, 1.55rem) * ${effectiveFontScale})` }}
                  >
                    <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0" />
                    <span>{displayState?.songTitle || displayState?.bibleReference || title}</span>
                  </div>

                  <div className="space-y-4 max-w-5xl text-center">
                    <div className="space-y-1">
                      {lines.map((primaryLine, idx) => (
                        <p
                          key={`bp-${idx}`}
                          className="font-black tracking-wide text-white leading-tight select-none drop-shadow-lg transition-all"
                          style={{
                            fontSize: `calc(clamp(1.65rem, 3.8vw, 4.2rem) * ${effectiveFontScale})`,
                            lineHeight: 1.35,
                            textShadow: '0 2px 12px rgba(0, 0, 0, 0.95), 0 4px 30px rgba(0, 0, 0, 0.8)'
                          }}
                        >
                          {cleanBibleVerseText(primaryLine)}
                        </p>
                      ))}
                    </div>
                    {displayState.secondaryLines && displayState.secondaryLines.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-amber-500/20">
                        <div 
                          className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 font-bold uppercase tracking-wider mb-1"
                          style={{ fontSize: `calc(clamp(0.7rem, 1.1vw, 0.95rem) * ${effectiveFontScale})` }}
                        >
                          <span>{displayState.secondaryLanguage || 'Traduction'}</span>
                        </div>
                        {displayState.secondaryLines.map((secondaryLine, idx) => (
                          <p
                            key={`bs-${idx}`}
                            className="font-semibold tracking-wide text-cyan-200/90 italic leading-snug select-none transition-all"
                            style={{
                              fontSize: `calc(clamp(1.2rem, 2.7vw, 2.9rem) * ${effectiveFontScale})`,
                              lineHeight: 1.35,
                              textShadow: '0 2px 10px rgba(6, 182, 212, 0.5), 0 4px 20px rgba(0, 0, 0, 0.95)'
                            }}
                          >
                            {cleanBibleVerseText(secondaryLine)}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div 
                key={`bible-${displayState?.bibleReference || title}-${displayState?.slideIndex}`}
                className="max-w-6xl w-full flex flex-col items-center justify-center gap-5 sm:gap-7 animate-presentation-slide select-none"
              >
                <div 
                  className="inline-flex items-center gap-2.5 px-5 sm:px-7 py-2 sm:py-2.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 font-black tracking-wider uppercase shadow-2xl backdrop-blur-md transition-all"
                  style={{ fontSize: `calc(clamp(0.85rem, 1.8vw, 1.45rem) * ${effectiveFontScale})` }}
                >
                  <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0" />
                  <span>{displayState?.bibleReference || title}</span>
                </div>

                <div className="space-y-3 sm:space-y-4 max-w-5xl">
                  {lines.map((line, idx) => (
                    <p
                      key={idx}
                      className="font-bold tracking-wide text-white leading-relaxed select-none transition-all"
                      style={{
                        fontSize: `calc(clamp(1.85rem, 4.4vw, 4.8rem) * ${effectiveFontScale})`,
                        lineHeight: 1.45,
                        textShadow: '0 2px 10px rgba(0, 0, 0, 0.9), 0 6px 30px rgba(0, 0, 0, 0.75)'
                      }}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )
          ) : displayState?.isBilingual && displayState?.secondaryLines && displayState.secondaryLines.length > 0 ? (
            displayState.bilingualFormat === 'columns' ? (
              <div 
                key={`bilingual-cols-${title}-${displayState?.slideIndex}`}
                className="max-w-7xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14 items-center animate-presentation-slide select-none"
              >
                {/* Left Column : Original / Primary */}
                <div className="flex flex-col items-start justify-center text-left space-y-2 sm:space-y-3">
                  <div 
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 font-bold uppercase tracking-wider mb-1 transition-all self-start"
                    style={{ fontSize: `calc(clamp(0.75rem, 1.3vw, 1.15rem) * ${effectiveFontScale})` }}
                  >
                    <span>{displayState.primaryLanguage || 'Original'}</span>
                  </div>
                  {lines.map((line, idx) => (
                    <p
                      key={`p-${idx}`}
                      className="font-extrabold tracking-wide text-white leading-relaxed select-none transition-all drop-shadow-md text-left w-full"
                      style={{
                        fontSize: `calc(clamp(1.5rem, 3.2vw, 3.6rem) * ${effectiveFontScale})`,
                        lineHeight: 1.38,
                        textShadow: '0 2px 12px rgba(0, 0, 0, 0.9), 0 4px 25px rgba(0, 0, 0, 0.7)'
                      }}
                    >
                      {line}
                    </p>
                  ))}
                </div>

                {/* Right Column : Secondary / Translation */}
                <div className="flex flex-col items-start justify-center text-left space-y-2 sm:space-y-3 md:border-l md:border-white/15 md:pl-8">
                  <div 
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 font-bold uppercase tracking-wider mb-1 transition-all self-start"
                    style={{ fontSize: `calc(clamp(0.75rem, 1.3vw, 1.15rem) * ${effectiveFontScale})` }}
                  >
                    <span>{displayState.secondaryLanguage || 'Traduction'}</span>
                  </div>
                  {displayState.secondaryLines.map((line, idx) => (
                    <p
                      key={`s-${idx}`}
                      className="font-bold tracking-wide text-cyan-100/95 leading-relaxed select-none transition-all drop-shadow-md text-left w-full"
                      style={{
                        fontSize: `calc(clamp(1.5rem, 3.2vw, 3.6rem) * ${effectiveFontScale})`,
                        lineHeight: 1.38,
                        textShadow: '0 2px 12px rgba(6, 182, 212, 0.4), 0 4px 25px rgba(0, 0, 0, 0.9)'
                      }}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              /* Stacked / Subtitles : Lignes originales au dessus, lignes traduites au dessous */
              <div 
                key={`bilingual-stacked-${title}-${displayState?.slideIndex}`}
                className="max-w-6xl w-full flex flex-col items-center justify-center gap-4 sm:gap-6 animate-presentation-slide select-none"
              >
                {lines.map((primaryLine, idx) => {
                  const secondaryLine = displayState.secondaryLines?.[idx];
                  return (
                    <div key={idx} className="flex flex-col items-center text-center space-y-1">
                      <p
                        className="font-black tracking-wide text-white leading-tight select-none drop-shadow-lg transition-all"
                        style={{
                          fontSize: `calc(clamp(1.65rem, 3.8vw, 4.2rem) * ${effectiveFontScale})`,
                          lineHeight: 1.3,
                          textShadow: '0 2px 12px rgba(0, 0, 0, 0.95), 0 4px 30px rgba(0, 0, 0, 0.8)'
                        }}
                      >
                        {primaryLine}
                      </p>
                      {secondaryLine && (
                        <p
                          className="font-semibold tracking-wide text-cyan-200/90 italic leading-snug select-none transition-all"
                          style={{
                            fontSize: `calc(clamp(1.2rem, 2.7vw, 2.9rem) * ${effectiveFontScale})`,
                            lineHeight: 1.35,
                            textShadow: '0 2px 10px rgba(6, 182, 212, 0.5), 0 4px 20px rgba(0, 0, 0, 0.95)'
                          }}
                        >
                          {secondaryLine}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div 
              key={`${title}-${displayState?.slideIndex}`}
              className="max-w-7xl w-full flex flex-col items-center justify-center gap-3 sm:gap-5 animate-presentation-slide"
            >
              {lines.map((line, idx) => (
                <p
                  key={idx}
                  className="font-bold tracking-wide text-white leading-relaxed select-none transition-all"
                  style={{
                    fontSize: `calc(clamp(1.75rem, 4.3vw, 4.5rem) * ${effectiveFontScale})`,
                    lineHeight: 1.42,
                    textShadow: '0 2px 10px rgba(0, 0, 0, 0.85), 0 4px 25px rgba(0, 0, 0, 0.65)'
                  }}
                >
                  {line}
                </p>
              ))}
            </div>
          )
        ) : (
          <div className="text-gray-400 text-lg">En attente de diffusion...</div>
        )}
      </main>

      {/* Footer minimaliste */}
      <footer className="w-full px-8 py-5 relative z-20 flex items-center justify-center text-gray-300">
        <div className="min-w-0 max-w-4xl text-center">
          <h2 
            className="font-medium text-gray-200 tracking-wide truncate drop-shadow flex items-center justify-center gap-2 transition-all"
            style={{ fontSize: `calc(clamp(0.875rem, 1.4vw, 1.25rem) * ${effectiveFontScale})` }}
          >
            {isCountdownActive 
              ? (displayState?.countdown?.title || "Bienvenue") 
              : (displayState?.itemType === 'bible' || Boolean(displayState?.bibleReference))
              ? (
                displayState?.isBilingual && displayState?.secondaryLanguage ? (
                  <>
                    <span>📖 {displayState.bibleReference || title}</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-amber-300 font-semibold">{displayState.primaryLanguage || 'Principal'}</span>
                    <span className="text-gray-500">+</span>
                    <span className="text-cyan-300 font-semibold">{displayState.secondaryLanguage}</span>
                  </>
                ) : (
                  `📖 ${displayState?.bibleReference || title}`
                )
              )
              : displayState?.isBilingual && displayState?.secondarySongTitle
              ? (
                <>
                  <span>{title}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-cyan-300 italic">{displayState.secondarySongTitle}</span>
                  {displayState.secondaryLanguage && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
                      {displayState.secondaryLanguage}
                    </span>
                  )}
                </>
              )
              : title}
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
