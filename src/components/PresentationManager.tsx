import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Song, Setlist } from '../types';
import { 
  buildPresentationSlides, 
  broadcastPresentationState, 
  pushPresentationStateToServer,
  PresentationSlide,
  PresentationState,
  getSavedFontScale,
  saveFontScale,
  getSavedBackgroundImage,
  saveBackgroundImage,
  getSavedBackgroundOverlay,
  saveBackgroundOverlay
} from '../utils/presentationUtils';
import { stripParentheses } from '../utils/chordUtils';
import { PresentationBackgroundModal } from './PresentationBackgroundModal';
import { 
  Tv, 
  ExternalLink, 
  EyeOff, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  ListMusic, 
  Search, 
  ArrowUp, 
  ArrowDown, 
  Music, 
  Check, 
  Sparkles,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Type,
  Image as ImageIcon,
  Sliders,
  ChevronDown,
  ChevronUp,
  GripVertical
} from 'lucide-react';

export const PresentationManager: React.FC = () => {
  const { songs, setlists, selectedSetlist } = useApp();

  // File de chants pour la projection (Playlist de projection)
  const [queueSongIds, setQueueSongIds] = useState<string[]>(() => {
    // Si une setlist est active par défaut, l'utiliser
    if (selectedSetlist?.songIds && selectedSetlist.songIds.length > 0) {
      return [...selectedSetlist.songIds];
    }
    // Sinon pré-remplir avec les premiers chants disponibles
    return songs.slice(0, 3).map(s => s.id);
  });

  const [activeSongIndex, setActiveSongIndex] = useState<number>(0);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [isBlackout, setIsBlackout] = useState<boolean>(false);

  // Échelle de police globale pour l'écran externe (pilotée depuis la régie)
  const [fontScale, setFontScale] = useState<number>(() => getSavedFontScale());

  // Image d'arrière-plan personnalisée et filtre sombre automatique
  const [backgroundImage, setBackgroundImage] = useState<string>(() => getSavedBackgroundImage());
  const [backgroundOverlay, setBackgroundOverlay] = useState<number>(() => getSavedBackgroundOverlay());
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState<boolean>(false);

  const handleAdjustFontScale = useCallback((delta: number) => {
    setFontScale(prev => {
      const next = Math.max(0.5, Math.min(2.5, Math.round((prev + delta) * 20) / 20));
      saveFontScale(next);
      return next;
    });
  }, []);

  const handleResetFontScale = useCallback(() => {
    setFontScale(1.0);
    saveFontScale(1.0);
  }, []);

  const handleSetFontScalePreset = useCallback((preset: number) => {
    setFontScale(preset);
    saveFontScale(preset);
  }, []);

  const handleSelectBackground = useCallback((url: string) => {
    setBackgroundImage(url);
    saveBackgroundImage(url);
  }, []);

  const handleAdjustBackgroundOverlay = useCallback((overlay: number) => {
    setBackgroundOverlay(overlay);
    saveBackgroundOverlay(overlay);
  }, []);

  // Recherche rapide pour ajout depuis la bibliothèque
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Sélecteur de setlist
  const [selectedSetlistId, setSelectedSetlistId] = useState<string>(selectedSetlist?.id || '');

  // Organisation de la colonne gauche : ordre drag & drop et sections pliables/dépliables
  type LeftPanelBlockId = 'settings' | 'program' | 'queue';
  const [leftColumnOrder, setLeftColumnOrder] = useState<LeftPanelBlockId[]>(() => {
    try {
      const saved = localStorage.getItem('presentation_left_blocks_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 3 && ['settings', 'program', 'queue'].every(id => parsed.includes(id))) {
          return parsed;
        }
      }
    } catch {}
    return ['settings', 'program', 'queue'];
  });

  const [collapsedBlocks, setCollapsedBlocks] = useState<Record<LeftPanelBlockId, boolean>>(() => {
    try {
      const saved = localStorage.getItem('presentation_left_blocks_collapsed');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { settings: false, program: false, queue: false };
  });

  const [draggedBlock, setDraggedBlock] = useState<LeftPanelBlockId | null>(null);
  const [dragOverBlock, setDragOverBlock] = useState<LeftPanelBlockId | null>(null);

  const toggleBlockCollapse = useCallback((blockId: LeftPanelBlockId) => {
    setCollapsedBlocks(prev => {
      const next = { ...prev, [blockId]: !prev[blockId] };
      try { localStorage.setItem('presentation_left_blocks_collapsed', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const handleDropBlock = useCallback((targetBlockId: LeftPanelBlockId) => {
    if (!draggedBlock || draggedBlock === targetBlockId) {
      setDraggedBlock(null);
      setDragOverBlock(null);
      return;
    }
    setLeftColumnOrder(prev => {
      const fromIdx = prev.indexOf(draggedBlock);
      const toIdx = prev.indexOf(targetBlockId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [removed] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, removed);
      try { localStorage.setItem('presentation_left_blocks_order', JSON.stringify(next)); } catch {}
      return next;
    });
    setDraggedBlock(null);
    setDragOverBlock(null);
  }, [draggedBlock]);

  // Référence vers la pop-up de projection
  const popupRef = useRef<Window | null>(null);

  // Chants résolus dans la file
  const queueSongs: Song[] = useMemo(() => {
    return queueSongIds
      .map(id => songs.find(s => s.id === id))
      .filter((s): s is Song => Boolean(s));
  }, [queueSongIds, songs]);

  // Chant actuellement projeté
  const currentSong: Song | null = useMemo(() => {
    if (queueSongs.length === 0) return null;
    const clamped = Math.max(0, Math.min(queueSongs.length - 1, activeSongIndex));
    return queueSongs[clamped] || null;
  }, [queueSongs, activeSongIndex]);

  // Slides calculées pour le chant en cours
  const currentSlides: PresentationSlide[] = useMemo(() => {
    if (!currentSong) return [];
    return buildPresentationSlides(
      currentSong.contentChordPro || currentSong.content || '',
      currentSong.title
    );
  }, [currentSong]);

  // Slide actuellement affichée
  const clampedSlideIndex = Math.max(0, Math.min(Math.max(0, currentSlides.length - 1), activeSlideIndex));
  const activeSlide: PresentationSlide | null = currentSlides[clampedSlideIndex] || currentSlides[0] || null;

  // Diffusion de l'état vers tous les canaux
  const broadcastCurrentState = useCallback((
    targetSong: Song | null,
    slideIdx: number,
    blackout: boolean,
    scale: number,
    bgImg: string,
    bgOverlay: number
  ) => {
    if (!targetSong) {
      const emptyState: PresentationState = {
        songTitle: '',
        sectionTitle: '',
        lines: [],
        slideIndex: 0,
        totalSlides: 0,
        isBlackout: blackout,
        fontScale: scale,
        backgroundImage: bgImg,
        backgroundOverlay: bgOverlay,
        updatedAt: Date.now()
      };
      broadcastPresentationState(emptyState);
      pushPresentationStateToServer(emptyState);
      return;
    }

    const slides = buildPresentationSlides(
      targetSong.contentChordPro || targetSong.content || '',
      targetSong.title
    );
    const validIdx = Math.max(0, Math.min(Math.max(0, slides.length - 1), slideIdx));
    const slide = slides[validIdx] || slides[0];

    const statePayload: PresentationState = {
      songTitle: stripParentheses(targetSong.title),
      sectionTitle: slide?.sectionTitle || '',
      lines: slide?.lines || [],
      slideIndex: validIdx,
      totalSlides: slides.length,
      isBlackout: blackout,
      fontScale: scale,
      backgroundImage: bgImg,
      backgroundOverlay: bgOverlay,
      updatedAt: Date.now()
    };

    // 1. BroadcastChannel + localStorage
    broadcastPresentationState(statePayload);
    // 2. Serveur Express HTTP
    pushPresentationStateToServer(statePayload);
    // 3. PostMessage direct vers la pop-up
    try {
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.postMessage({
          type: 'MELOBOOK_PRESENTATION_UPDATE',
          state: statePayload
        }, '*');
      }
    } catch {}
  }, []);

  // Synchronisation continue dès que le chant, la slide, l'échelle ou le fond change
  useEffect(() => {
    broadcastCurrentState(currentSong, activeSlideIndex, isBlackout, fontScale, backgroundImage, backgroundOverlay);
  }, [currentSong, activeSlideIndex, isBlackout, fontScale, backgroundImage, backgroundOverlay, broadcastCurrentState]);

  // Écoute des messages venant de la pop-up
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'MELOBOOK_PRESENTATION_READY' || e.data?.type === 'REQUEST_SYNC') {
        if (e.source) {
          popupRef.current = e.source as Window;
        }
        broadcastCurrentState(currentSong, activeSlideIndex, isBlackout, fontScale, backgroundImage, backgroundOverlay);
      } else if (e.data?.type === 'MELOBOOK_PRESENTATION_NAV') {
        if (typeof e.data.slideIndex === 'number') {
          setActiveSlideIndex(e.data.slideIndex);
        }
        if (typeof e.data.isBlackout === 'boolean') {
          setIsBlackout(e.data.isBlackout);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentSong, activeSlideIndex, isBlackout, fontScale, backgroundImage, backgroundOverlay, broadcastCurrentState]);

  // Raccourcis clavier pour naviguer dans la régie
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return;

      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setIsBlackout(prev => !prev);
      } else if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
        e.preventDefault();
        handleAdjustFontScale(0.1);
      } else if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') {
        e.preventDefault();
        handleAdjustFontScale(-0.1);
      } else if (e.key === '0' || e.code === 'Numpad0') {
        e.preventDefault();
        handleResetFontScale();
      } else if (['ArrowRight', ' ', 'PageDown'].includes(e.key)) {
        e.preventDefault();
        goToNextSlide();
      } else if (['ArrowLeft', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        goToPrevSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Navigation dans les slides
  const goToNextSlide = () => {
    if (activeSlideIndex < currentSlides.length - 1) {
      setActiveSlideIndex(i => i + 1);
    } else if (activeSongIndex < queueSongs.length - 1) {
      // Passer au chant suivant
      setActiveSongIndex(i => i + 1);
      setActiveSlideIndex(0);
    }
  };

  const goToPrevSlide = () => {
    if (activeSlideIndex > 0) {
      setActiveSlideIndex(i => i - 1);
    } else if (activeSongIndex > 0) {
      // Revenir à la fin du chant précédent
      const prevSong = queueSongs[activeSongIndex - 1];
      const prevSlides = buildPresentationSlides(prevSong.contentChordPro || prevSong.content || '', prevSong.title);
      setActiveSongIndex(i => i - 1);
      setActiveSlideIndex(Math.max(0, prevSlides.length - 1));
    }
  };

  // Ouvrir la pop-up de projection
  const handleOpenProjectionWindow = () => {
    const targetUrl = currentSong 
      ? `${window.location.origin}${window.location.pathname}?mode=presentation&songId=${encodeURIComponent(currentSong.id)}`
      : `${window.location.origin}${window.location.pathname}?mode=presentation`;

    broadcastCurrentState(currentSong, activeSlideIndex, isBlackout);

    const win = window.open(
      targetUrl,
      'melobook_presentation_window',
      'width=1280,height=720,menubar=no,toolbar=no,location=no'
    );
    if (win) {
      popupRef.current = win;
    }
  };

  // Charger une setlist dans la file
  const handleLoadSetlist = (setlistId: string) => {
    const target = setlists.find(s => s.id === setlistId);
    if (target && target.songIds.length > 0) {
      setQueueSongIds([...target.songIds]);
      setActiveSongIndex(0);
      setActiveSlideIndex(0);
      setSelectedSetlistId(setlistId);
    }
  };

  // Ajouter un chant rapidement
  const handleAddSong = (song: Song) => {
    if (!queueSongIds.includes(song.id)) {
      setQueueSongIds(prev => [...prev, song.id]);
    }
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  // Retirer un chant de la file
  const handleRemoveSong = (indexToRemove: number) => {
    setQueueSongIds(prev => {
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      if (activeSongIndex >= next.length) {
        setActiveSongIndex(Math.max(0, next.length - 1));
        setActiveSlideIndex(0);
      }
      return next;
    });
  };

  // Déplacer un chant dans la file
  const handleMoveSong = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= queueSongIds.length) return;

    setQueueSongIds(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });

    if (activeSongIndex === index) {
      setActiveSongIndex(targetIndex);
    } else if (activeSongIndex === targetIndex) {
      setActiveSongIndex(index);
    }
  };

  // Suggestions de recherche parmi les chants du répertoire
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return songs
      .filter(s => s.title.toLowerCase().includes(q) || (s.artist && s.artist.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [searchQuery, songs]);

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#0A0A0B] text-[#E0E0E0] p-3 sm:p-6 flex flex-col gap-5 max-w-7xl mx-auto">
      
      {/* 1. Barre d'en-tête de régie */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121215] border border-[#222226] p-4 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Mode Présentation</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-semibold font-mono">
                Régie Direct
              </span>
            </h1>
            <p className="text-xs text-gray-400">
              Contrôlez les paroles projetées vers votre écran secondaire, vidéoprojecteur ou TV.
            </p>
          </div>
        </div>

        {/* Bouton d'action d'ouverture de l'écran externe */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenProjectionWindow}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-blue-900/30 ring-1 ring-blue-400/40"
            title="Ouvrir la fenêtre d'affichage pour l'écran externe"
          >
            <Tv className="w-4 h-4" />
            <span>Ouvrir l'écran de projection</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </button>
        </div>
      </div>

      {/* 2. Corps principal : Colonne gauche (Réglages, File & Ajout) + Colonne droite (Pupitre & Slides) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Colonne Gauche : Réglages projection, File de projection & Sélecteur de setlist (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-3.5">
          {leftColumnOrder.map((blockId) => {
            const isDragged = draggedBlock === blockId;
            const isOver = dragOverBlock === blockId;
            const isCollapsed = collapsedBlocks[blockId];

            if (blockId === 'settings') {
              return (
                <div
                  key="settings"
                  draggable
                  onDragStart={(e) => {
                    setDraggedBlock('settings');
                    e.dataTransfer.setData('text/plain', 'settings');
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => {
                    setDraggedBlock(null);
                    setDragOverBlock(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverBlock !== 'settings') setDragOverBlock('settings');
                  }}
                  onDragLeave={() => {
                    if (dragOverBlock === 'settings') setDragOverBlock(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDropBlock('settings');
                  }}
                  className={`bg-[#121215] border rounded-2xl shadow-md transition-all duration-150 ${
                    isOver ? 'border-blue-500 ring-2 ring-blue-500/30 -translate-y-0.5' : 'border-[#222226]'
                  } ${isDragged ? 'opacity-40 scale-[0.99]' : 'opacity-100'}`}
                >
                  {/* En-tête harmonisé avec poignée Drag & Drop et bouton Dérouler/Enrouler */}
                  <div
                    onClick={() => toggleBlockCollapse('settings')}
                    className="flex items-center justify-between p-3.5 sm:p-4 select-none cursor-pointer hover:bg-white/[0.02] transition-colors rounded-2xl"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="p-1 -ml-1 text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing rounded"
                        title="Glisser pour réorganiser ce bloc"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                        <Sliders className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-bold text-gray-200 uppercase tracking-wide truncate">
                          Réglages projection
                        </span>
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                          Externe
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-1 bg-[#1A1A22] px-2 py-0.5 rounded-md border border-[#272734] font-mono text-[11px] text-gray-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {Math.round(fontScale * 100)}%
                      </span>
                      <button
                        type="button"
                        aria-label={isCollapsed ? "Dérouler" : "Enrouler"}
                        className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#202028] transition-colors"
                      >
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Corps du bloc déroulable */}
                  {!isCollapsed && (
                    <div className="px-3.5 sm:px-4 pb-3.5 sm:pb-4 pt-0 space-y-3 border-t border-[#1E1E26] mt-0.5">
                      {/* Module 1 : Taille du texte des paroles */}
                      <div className="bg-[#17171E] border border-[#22222C] rounded-xl p-3 space-y-2.5 mt-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-300">
                            <Type className="w-3.5 h-3.5 text-blue-400" />
                            <span>Taille des paroles</span>
                          </div>

                          {/* Presets rapides */}
                          <div className="flex items-center bg-[#101015] p-0.5 rounded-lg border border-[#22222E]">
                            <button
                              type="button"
                              onClick={() => handleSetFontScalePreset(0.8)}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                                Math.abs(fontScale - 0.8) < 0.06
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-gray-400 hover:text-gray-200'
                              }`}
                              title="Taille Petite (80%)"
                            >
                              Petit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetFontScalePreset(1.0)}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                                Math.abs(fontScale - 1.0) < 0.06
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-gray-400 hover:text-gray-200'
                              }`}
                              title="Taille Normale (100%)"
                            >
                              Normal
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetFontScalePreset(1.35)}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                                Math.abs(fontScale - 1.35) < 0.06
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-gray-400 hover:text-gray-200'
                              }`}
                              title="Taille Grande (135%)"
                            >
                              Grand
                            </button>
                          </div>
                        </div>

                        {/* Slider + Steppers */}
                        <div className="flex items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleAdjustFontScale(-0.1)}
                            disabled={fontScale <= 0.5}
                            className="w-7 h-7 rounded-lg bg-[#22222E] hover:bg-[#2C2C3C] disabled:opacity-30 text-gray-300 hover:text-white transition-all cursor-pointer flex items-center justify-center border border-[#2C2C3D] shrink-0"
                            title="Diminuer (-)"
                          >
                            <ZoomOut className="w-3.5 h-3.5" />
                          </button>

                          <input
                            type="range"
                            min="0.5"
                            max="2.2"
                            step="0.05"
                            value={fontScale}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setFontScale(val);
                              saveFontScale(val);
                            }}
                            className="flex-1 h-1.5 bg-[#252533] rounded-lg appearance-none cursor-pointer accent-blue-500"
                            title={`Zoom actuel : ${Math.round(fontScale * 100)}%`}
                          />

                          <button
                            type="button"
                            onClick={() => handleAdjustFontScale(0.1)}
                            disabled={fontScale >= 2.2}
                            className="w-7 h-7 rounded-lg bg-[#22222E] hover:bg-[#2C2C3C] disabled:opacity-30 text-gray-300 hover:text-white transition-all cursor-pointer flex items-center justify-center border border-[#2C2C3D] shrink-0"
                            title="Agrandir (+)"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={handleResetFontScale}
                            className="h-7 px-1.5 rounded-lg bg-[#22222E] hover:bg-[#2C2C3C] text-[10px] font-mono text-gray-300 hover:text-white transition-all cursor-pointer flex items-center gap-1 border border-[#2C2C3D] shrink-0"
                            title="Réinitialiser à 100%"
                          >
                            <span>100%</span>
                            <RotateCcw className="w-2.5 h-2.5 text-gray-400" />
                          </button>
                        </div>
                      </div>

                      {/* Module 2 : Fond d'écran & Ambiance */}
                      <div className="bg-[#17171E] border border-[#22222C] rounded-xl p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {backgroundImage ? (
                            <div 
                              className="w-9 h-9 rounded-lg bg-cover bg-center border border-purple-500/40 shrink-0 relative overflow-hidden shadow-xs ring-1 ring-purple-500/30"
                              style={{ backgroundImage: `url("${backgroundImage}")` }}
                              title="Arrière-plan en cours d'utilisation"
                            >
                              <div 
                                className="absolute inset-0 bg-black" 
                                style={{ opacity: backgroundOverlay }} 
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-[#20202A] border border-[#2B2B38] flex items-center justify-center text-purple-400 shrink-0">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-gray-200 truncate flex items-center gap-1.5">
                              <span>Arrière-plan</span>
                              {backgroundImage ? (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                                  Actif
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-500 font-normal">Noir</span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400 truncate">
                              {backgroundImage ? `${Math.round(backgroundOverlay * 100)}% opacité` : 'Fond noir par défaut'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {backgroundImage && (
                            <button
                              type="button"
                              onClick={() => handleSelectBackground('')}
                              className="h-8 w-8 rounded-lg bg-[#20202A] hover:bg-rose-950/40 text-gray-400 hover:text-rose-300 border border-[#2B2B38] hover:border-rose-500/30 transition-all cursor-pointer flex items-center justify-center"
                              title="Supprimer l'arrière-plan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setIsBackgroundModalOpen(true)}
                            className="h-8 px-2.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 hover:text-white border border-purple-500/30 hover:border-purple-400/50 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                            <span>{backgroundImage ? 'Changer' : 'Choisir'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            if (blockId === 'program') {
              return (
                <div
                  key="program"
                  draggable
                  onDragStart={(e) => {
                    setDraggedBlock('program');
                    e.dataTransfer.setData('text/plain', 'program');
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => {
                    setDraggedBlock(null);
                    setDragOverBlock(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverBlock !== 'program') setDragOverBlock('program');
                  }}
                  onDragLeave={() => {
                    if (dragOverBlock === 'program') setDragOverBlock(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDropBlock('program');
                  }}
                  className={`bg-[#121215] border rounded-2xl shadow-md transition-all duration-150 ${
                    isOver ? 'border-blue-500 ring-2 ring-blue-500/30 -translate-y-0.5' : 'border-[#222226]'
                  } ${isDragged ? 'opacity-40 scale-[0.99]' : 'opacity-100'}`}
                >
                  {/* En-tête harmonisé avec poignée Drag & Drop et bouton Dérouler/Enrouler */}
                  <div
                    onClick={() => toggleBlockCollapse('program')}
                    className="flex items-center justify-between p-3.5 sm:p-4 select-none cursor-pointer hover:bg-white/[0.02] transition-colors rounded-2xl"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="p-1 -ml-1 text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing rounded"
                        title="Glisser pour réorganiser ce bloc"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                        <ListMusic className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-bold text-gray-200 uppercase tracking-wide truncate">
                          Programmation
                        </span>
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                          {setlists.length} setlists
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-gray-400 font-mono bg-[#1A1A22] px-2 py-0.5 rounded-md border border-[#272734]">
                        {queueSongs.length} chant(s)
                      </span>
                      <button
                        type="button"
                        aria-label={isCollapsed ? "Dérouler" : "Enrouler"}
                        className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#202028] transition-colors"
                      >
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Corps du bloc déroulable */}
                  {!isCollapsed && (
                    <div className="px-3.5 sm:px-4 pb-3.5 sm:pb-4 pt-0 space-y-3.5 border-t border-[#1E1E26] mt-0.5">
                      {/* Sélecteur de setlist */}
                      <div className="space-y-1.5 pt-3">
                        <label className="text-[11px] font-semibold text-gray-300 flex items-center gap-1.5">
                          <ListMusic className="w-3.5 h-3.5 text-blue-400" />
                          <span>Charger une setlist existante :</span>
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={selectedSetlistId}
                            onChange={(e) => setSelectedSetlistId(e.target.value)}
                            className="flex-1 bg-[#1A1A1E] border border-[#333] hover:border-blue-500/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                          >
                            <option value="">-- Choisir une setlist --</option>
                            {setlists.map(st => (
                              <option key={st.id} value={st.id}>
                                {st.name} ({st.songIds?.length || 0} chants)
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => selectedSetlistId && handleLoadSetlist(selectedSetlistId)}
                            disabled={!selectedSetlistId}
                            className="px-3 py-2 rounded-xl bg-[#222228] hover:bg-blue-600 hover:text-white text-gray-200 text-xs font-semibold border border-[#333] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          >
                            Charger
                          </button>
                        </div>
                      </div>

                      {/* Recherche rapide pour ajout depuis la bibliothèque */}
                      <div className="space-y-1.5 relative pt-1 border-t border-[#202026]">
                        <label className="text-[11px] font-semibold text-gray-300 flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Ajouter un chant depuis la bibliothèque :</span>
                        </label>
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Rechercher par titre ou artiste..."
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              setIsSearchOpen(true);
                            }}
                            onFocus={() => setIsSearchOpen(true)}
                            className="w-full bg-[#1A1A1E] border border-[#333] focus:border-blue-500 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                          />
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery('');
                                setIsSearchOpen(false);
                              }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Menu déroulant des suggestions de recherche */}
                        {isSearchOpen && searchResults.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#18181D] border border-[#2E2E36] rounded-xl shadow-2xl z-30 max-h-56 overflow-y-auto divide-y divide-[#25252D]">
                            {searchResults.map(song => (
                              <button
                                key={song.id}
                                type="button"
                                onClick={() => handleAddSong(song)}
                                className="w-full text-left px-3 py-2 hover:bg-blue-600/20 text-xs text-gray-200 hover:text-white flex items-center justify-between group cursor-pointer transition-colors"
                              >
                                <div className="min-w-0 pr-2">
                                  <p className="font-semibold text-white truncate">{song.title}</p>
                                  {song.artist && <p className="text-[10px] text-gray-400 truncate">{song.artist}</p>}
                                </div>
                                <Plus className="w-4 h-4 text-emerald-400 opacity-60 group-hover:opacity-100 shrink-0" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            if (blockId === 'queue') {
              return (
                <div
                  key="queue"
                  draggable
                  onDragStart={(e) => {
                    setDraggedBlock('queue');
                    e.dataTransfer.setData('text/plain', 'queue');
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => {
                    setDraggedBlock(null);
                    setDragOverBlock(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverBlock !== 'queue') setDragOverBlock('queue');
                  }}
                  onDragLeave={() => {
                    if (dragOverBlock === 'queue') setDragOverBlock(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDropBlock('queue');
                  }}
                  className={`bg-[#121215] border rounded-2xl shadow-md transition-all duration-150 ${
                    isOver ? 'border-blue-500 ring-2 ring-blue-500/30 -translate-y-0.5' : 'border-[#222226]'
                  } ${isDragged ? 'opacity-40 scale-[0.99]' : 'opacity-100'}`}
                >
                  {/* En-tête harmonisé avec poignée Drag & Drop et bouton Dérouler/Enrouler */}
                  <div
                    onClick={() => toggleBlockCollapse('queue')}
                    className="flex items-center justify-between p-3.5 sm:p-4 select-none cursor-pointer hover:bg-white/[0.02] transition-colors rounded-2xl"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="p-1 -ml-1 text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing rounded"
                        title="Glisser pour réorganiser ce bloc"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                        <Music className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-bold text-gray-200 uppercase tracking-wide truncate">
                          File de projection
                        </span>
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                          En direct
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {queueSongs.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQueueSongIds([]);
                          }}
                          className="text-[10px] text-gray-500 hover:text-red-400 cursor-pointer px-1.5 py-0.5 rounded hover:bg-red-500/10 transition-colors"
                          title="Vider la file de projection"
                        >
                          Vider
                        </button>
                      )}
                      <span className="text-[11px] text-gray-400 font-mono bg-[#1A1A22] px-2 py-0.5 rounded-md border border-[#272734]">
                        {queueSongs.length}
                      </span>
                      <button
                        type="button"
                        aria-label={isCollapsed ? "Dérouler" : "Enrouler"}
                        className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#202028] transition-colors"
                      >
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Corps du bloc déroulable */}
                  {!isCollapsed && (
                    <div className="px-3.5 sm:px-4 pb-3.5 sm:pb-4 pt-0 space-y-2 border-t border-[#1E1E26] mt-0.5">
                      {queueSongs.length === 0 ? (
                        <div className="text-center py-7 text-gray-500 text-xs">
                          <Music className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-400" />
                          <span>Aucun chant dans la file.</span>
                          <p className="text-[10px] mt-1 text-gray-600">Chargez une setlist ou recherchez un chant ci-dessus.</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-0.5 custom-scrollbar pt-2.5">
                          {queueSongs.map((song, idx) => {
                            const isActive = idx === activeSongIndex;
                            return (
                              <div
                                key={`${song.id}_${idx}`}
                                onClick={() => {
                                  setActiveSongIndex(idx);
                                  setActiveSlideIndex(0);
                                }}
                                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer group ${
                                  isActive
                                    ? 'bg-blue-950/40 border-blue-500/70 text-white shadow-md'
                                    : 'bg-[#18181D] hover:bg-[#202026] border-[#26262E] text-gray-300'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono shrink-0 ${
                                    isActive ? 'bg-blue-600 text-white' : 'bg-[#25252D] text-gray-400'
                                  }`}>
                                    {idx + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-xs truncate leading-snug">{song.title}</p>
                                    {song.artist && <p className="text-[10px] text-gray-500 truncate">{song.artist}</p>}
                                  </div>
                                </div>

                                {/* Commandes rapides : monter, descendre, supprimer */}
                                <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                                  {isActive && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white uppercase tracking-wider mr-1">
                                      Direct
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveSong(idx, 'up');
                                    }}
                                    disabled={idx === 0}
                                    className="p-1 rounded text-gray-500 hover:text-white disabled:opacity-20 cursor-pointer"
                                    title="Monter"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveSong(idx, 'down');
                                    }}
                                    disabled={idx === queueSongs.length - 1}
                                    className="p-1 rounded text-gray-500 hover:text-white disabled:opacity-20 cursor-pointer"
                                    title="Descendre"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveSong(idx);
                                    }}
                                    className="p-1 rounded text-gray-500 hover:text-red-400 cursor-pointer"
                                    title="Supprimer de la file"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            return null;
          })}
        </div>

        {/* Colonne Droite : Pupitre de contrôle & Grille de slides (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* Aperçu en direct & Contrôleur de défilement */}
          <div className="bg-[#121215] border border-[#222226] rounded-2xl p-4 sm:p-5 shadow-md flex flex-col gap-4">
            
            {/* Barre de navigation du chant */}
            <div className="flex items-center justify-between gap-3 border-b border-[#202026] pb-3">
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-bold text-blue-400">
                  Chant {activeSongIndex + 1} sur {queueSongs.length}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white truncate">
                  {currentSong ? stripParentheses(currentSong.title) : 'Aucun chant actif'}
                </h3>
              </div>

              {/* Boutons Suivant / Précédent & Bouton Noir */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsBlackout(b => !b)}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                    isBlackout
                      ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400/60 ring-2 ring-amber-500/40'
                      : 'bg-[#1C1C22] hover:bg-[#282830] text-gray-300 border-[#333]'
                  }`}
                  title="Masquer ou afficher l'écran externe (Touche B)"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>{isBlackout ? 'Écran masqué' : 'Noir (B)'}</span>
                </button>

                <div className="h-5 w-px bg-[#262630] mx-0.5" />

                <button
                  type="button"
                  onClick={goToPrevSlide}
                  disabled={activeSongIndex === 0 && activeSlideIndex === 0}
                  className="px-3 py-2 rounded-xl bg-[#1C1C22] hover:bg-[#282830] text-white disabled:opacity-30 disabled:cursor-not-allowed font-semibold text-xs flex items-center gap-1 border border-[#333] transition-colors cursor-pointer"
                  title="Slide précédente (Flèche Gauche)"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Précédent</span>
                </button>

                <div className="font-mono text-xs font-bold text-gray-300 px-2 py-1 rounded bg-[#18181C] border border-[#2A2A30]">
                  {currentSlides.length > 0 ? `${clampedSlideIndex + 1} / ${currentSlides.length}` : '0 / 0'}
                </div>

                <button
                  type="button"
                  onClick={goToNextSlide}
                  disabled={activeSongIndex >= queueSongs.length - 1 && activeSlideIndex >= currentSlides.length - 1}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs flex items-center gap-1 shadow-md shadow-blue-900/30 transition-colors cursor-pointer"
                  title="Slide suivante (Flèche Droite / Espace)"
                >
                  <span>Suivant</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Moniteur Miniature de l'écran externe (Aperçu en direct 16:9) */}
            <div 
              className="w-full aspect-[16/9] max-h-56 sm:max-h-64 bg-black border-2 border-blue-500/50 rounded-xl relative overflow-hidden flex flex-col justify-between p-4 sm:p-6 shadow-inner text-center select-none group bg-cover bg-center transition-all duration-300"
              style={backgroundImage ? { backgroundImage: `url("${backgroundImage}")` } : undefined}
            >
              {/* Filtre sombre automatique sur le moniteur */}
              {backgroundImage && (
                <div 
                  className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-300 z-0"
                  style={{ opacity: isBlackout ? 1 : backgroundOverlay }}
                />
              )}

              <div className="text-[10px] font-mono text-gray-300 drop-shadow absolute top-2 left-3 flex items-center gap-1.5 z-10">
                <span className={`w-2 h-2 rounded-full ${isBlackout ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
                <span>MONITEUR SORTIE {isBlackout ? '(MASQUÉ)' : '(EN DIRECT)'}</span>
              </div>

              <div className="text-[10px] font-mono text-gray-300 drop-shadow absolute top-2 right-3 z-10">
                Taille : {Math.round(fontScale * 100)}%
              </div>

              {/* Paroles projetées */}
              <div className="flex-1 flex items-center justify-center px-4 relative z-10">
                {isBlackout ? (
                  <span className="text-gray-400 text-xs font-mono drop-shadow">[ Écran masqué ]</span>
                ) : activeSlide && activeSlide.lines.length > 0 ? (
                  <div className="space-y-1 sm:space-y-1.5">
                    {activeSlide.lines.map((l, i) => (
                      <p 
                        key={i} 
                        className="font-bold text-white drop-shadow transition-all"
                        style={{ 
                          fontSize: `calc(0.95rem * ${fontScale})`,
                          textShadow: '0 1px 4px rgba(0,0,0,0.85)'
                        }}
                      >
                        {l}
                      </p>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-400 text-xs drop-shadow">Aucune parole</span>
                )}
              </div>

              {/* Footer miniature */}
              <div className="flex items-center justify-between text-[11px] text-gray-300 border-t border-gray-800/80 pt-1.5 relative z-10">
                <span className="truncate drop-shadow">{currentSong ? stripParentheses(currentSong.title) : ''}</span>
                {currentSlides.length > 0 && !isBlackout && (
                  <span className="font-mono drop-shadow">{clampedSlideIndex + 1} / {currentSlides.length}</span>
                )}
              </div>
            </div>
          </div>

          {/* Grille de sélection directe de toutes les slides du chant (ProPresenter style) */}
          <div className="bg-[#121215] border border-[#222226] rounded-2xl p-4 sm:p-5 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <span>Slides du chant actif</span>
                <span className="text-[10px] text-gray-500 font-normal">
                  (Cliquez sur une slide pour la projeter immédiatement)
                </span>
              </h3>
              <span className="text-xs font-mono text-gray-500">{currentSlides.length} slide(s)</span>
            </div>

            {currentSlides.length === 0 ? (
              <div className="text-center py-10 text-gray-600 text-xs">
                Sélectionnez un chant pour afficher ses sections de paroles.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
                {currentSlides.map((slide, sIdx) => {
                  const isCurrent = sIdx === clampedSlideIndex;
                  return (
                    <button
                      key={slide.id || sIdx}
                      type="button"
                      onClick={() => {
                        setActiveSlideIndex(sIdx);
                        setIsBlackout(false);
                      }}
                      className={`text-left p-3.5 rounded-xl border flex flex-col justify-between min-h-[110px] transition-all cursor-pointer relative overflow-hidden group ${
                        isCurrent
                          ? 'bg-blue-950/50 border-blue-400 ring-2 ring-blue-500/40 text-white shadow-lg shadow-blue-950/50'
                          : 'bg-[#16161B] hover:bg-[#1E1E24] border-[#2A2A33] text-gray-300 hover:text-white'
                      }`}
                    >
                      {/* En-tête de la slide card */}
                      <div className="flex items-center justify-between w-full mb-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isCurrent ? 'bg-blue-600 text-white' : 'bg-[#22222A] text-gray-400 group-hover:text-blue-300'
                        }`}>
                          {slide.sectionTitle || `Slide ${sIdx + 1}`}
                        </span>
                        <span className="text-[10px] font-mono text-gray-500">
                          #{sIdx + 1}
                        </span>
                      </div>

                      {/* Lignes de paroles */}
                      <div className="space-y-0.5 flex-1">
                        {slide.lines.slice(0, 3).map((line, lIdx) => (
                          <p key={lIdx} className="text-xs leading-snug line-clamp-1 opacity-90">
                            {line}
                          </p>
                        ))}
                        {slide.lines.length > 3 && (
                          <p className="text-[10px] text-gray-500 italic">+{slide.lines.length - 3} ligne(s)</p>
                        )}
                      </div>

                      {isCurrent && (
                        <div className="absolute top-1 right-1">
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Modal de sélection d'arrière-plan et filtre sombre */}
      <PresentationBackgroundModal
        isOpen={isBackgroundModalOpen}
        onClose={() => setIsBackgroundModalOpen(false)}
        currentBackground={backgroundImage}
        onSelectBackground={handleSelectBackground}
        currentOverlay={backgroundOverlay}
        onAdjustOverlay={handleAdjustBackgroundOverlay}
      />

    </div>
  );
};
