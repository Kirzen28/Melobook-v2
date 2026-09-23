import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { cacheSetlistInWorker } from '../utils/pwaCache';
import { SongReader } from './SongReader';
import { MidiStatusIndicator } from './MidiStatusIndicator';
import { useMidi } from '../context/MidiContext';
import { 
  requestFullscreenSafe, 
  exitFullscreenSafe, 
  addFullscreenChangeListener, 
  getIsNativeFullscreen 
} from '../utils/fullscreen';
import { 
  ListMusic, 
  X, 
  Layers, 
  Music,
  CheckCircle2,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface LiveSetlistPlayerProps {
  onClose: () => void;
}

const songTransitionVariants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: '0%',
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir >= 0 ? '-100%' : '100%',
    opacity: 0,
  }),
};

export const LiveSetlistPlayer: React.FC<LiveSetlistPlayerProps> = ({ onClose }) => {
  const { 
    selectedSetlist, 
    songs, 
    activeSetlistIndex, 
    setActiveSetlistIndex,
    updateStageSettings,
    stageSettings,
    currentGroup
  } = useApp();

  const { registerActionHandler } = useMidi();

  const [direction, setDirection] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const prevIndexRef = useRef<number>(activeSetlistIndex);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  useEffect(() => {
    return addFullscreenChangeListener((isFs) => {
      setIsFullscreen(isFs);
    });
  }, []);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      requestFullscreenSafe(document.documentElement);
      setIsFullscreen(true);
    } else {
      exitFullscreenSafe();
      setIsFullscreen(false);
    }
  };

  // Track transition direction whenever index changes
  useEffect(() => {
    if (activeSetlistIndex > prevIndexRef.current) {
      setDirection(1);
    } else if (activeSetlistIndex < prevIndexRef.current) {
      setDirection(-1);
    }
    prevIndexRef.current = activeSetlistIndex;
  }, [activeSetlistIndex]);

  // Ordered list of songs in this setlist
  const setlistSongs = useMemo(() => {
    if (!selectedSetlist) return [];
    return selectedSetlist.songIds
      .map(id => songs.find(s => s.id === id))
      .filter((s): s is typeof songs[0] => s !== undefined);
  }, [selectedSetlist, songs]);

  useEffect(() => {
    if (selectedSetlist) {
      cacheSetlistInWorker(selectedSetlist, setlistSongs);
    }
  }, [selectedSetlist, setlistSongs]);

  const currentSong = setlistSongs[activeSetlistIndex] || null;

  // Next / Previous navigation with direction tracking
  const handleNext = useCallback(() => {
    if (activeSetlistIndex < setlistSongs.length - 1) {
      setDirection(1);
      setActiveSetlistIndex(activeSetlistIndex + 1);
      // Reset scroll position and auto-scroll state on song change
      updateStageSettings({ isAutoScrolling: false });
    }
  }, [activeSetlistIndex, setlistSongs.length, setActiveSetlistIndex, updateStageSettings]);

  const handlePrev = useCallback(() => {
    if (activeSetlistIndex > 0) {
      setDirection(-1);
      setActiveSetlistIndex(activeSetlistIndex - 1);
      updateStageSettings({ isAutoScrolling: false });
    }
  }, [activeSetlistIndex, setActiveSetlistIndex, updateStageSettings]);

  // Touch Swipe for mobile/tablet
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;

    // Minimum swipe threshold 60px and must be predominantly horizontal
    if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY) * 1.3) {
      if (diffX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  // Register MIDI Remote Handlers for live performance (Next/Prev Song & Auto-scroll)
  useEffect(() => {
    const unsubNext = registerActionHandler('next_song', () => {
      handleNext();
    });

    const unsubPrev = registerActionHandler('prev_song', () => {
      handlePrev();
    });

    const unsubToggleAuto = registerActionHandler('toggle_autoscroll', () => {
      updateStageSettings({ isAutoScrolling: !stageSettings.isAutoScrolling });
    });

    const unsubSpeedUp = registerActionHandler('speed_up_autoscroll', () => {
      updateStageSettings({ 
        autoScrollSpeed: Math.min(10, (stageSettings.autoScrollSpeed || 3) + 1) 
      });
    });

    const unsubSpeedDown = registerActionHandler('speed_down_autoscroll', () => {
      updateStageSettings({ 
        autoScrollSpeed: Math.max(1, (stageSettings.autoScrollSpeed || 3) - 1) 
      });
    });

    return () => {
      unsubNext();
      unsubPrev();
      unsubToggleAuto();
      unsubSpeedUp();
      unsubSpeedDown();
    };
  }, [handleNext, handlePrev, stageSettings.isAutoScrolling, stageSettings.autoScrollSpeed, updateStageSettings, registerActionHandler]);

  if (!selectedSetlist || setlistSongs.length === 0) {
    return (
      <div className="fixed inset-0 top-16 z-40 bg-[#0A0A0B] flex flex-col items-center justify-center p-6 text-center text-[#E0E0E0]">
        <ListMusic className="w-12 h-12 text-gray-600 mb-4" />
        <h2 className="text-base font-bold text-gray-200">Cette setlist ne contient aucun chant</h2>
        <p className="text-xs text-gray-500 mt-1 mb-6">
          Ajoutez des morceaux à votre setlist avant de lancer le mode Scène Live.
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm"
        >
          Retour aux setlists
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`fixed inset-0 ${isFullscreen ? 'top-0 z-50' : 'top-16 z-30'} bg-[#0A0A0B] flex flex-col text-[#E0E0E0] overflow-hidden transition-all`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Live Setlist Top Navigation Bar */}
      <div className="no-print bg-[#111112]/98 border-b border-[#222224] px-3 sm:px-6 py-2 flex items-center justify-between gap-3 shadow-sm z-40 shrink-0">
        
        {/* Left: Close & Setlist info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onClose}
            className="p-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 hover:text-white border border-[#333] transition-colors shrink-0 flex items-center justify-center cursor-pointer"
            title="Quitter le mode Live"
            aria-label="Quitter le mode Live"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1 truncate">
                <ListMusic className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{selectedSetlist.name}</span>
              </span>
              <span 
                className="px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-[#1C1C1E] text-gray-300 border border-[#333] shrink-0 select-none"
                title={`${activeSetlistIndex + 1} / ${setlistSongs.length}`}
              >
                {activeSetlistIndex + 1}/{setlistSongs.length}
              </span>
            </div>
          </div>
        </div>

        {/* Right: MIDI Remote, Next Song Quick Peek */}
        <div className="flex items-center gap-2 text-right shrink-0">
          {/* Contrôle MIDI / Pédalier (icône uniquement) */}
          <MidiStatusIndicator />

          <div className="hidden lg:flex items-center gap-2">
            {activeSetlistIndex < setlistSongs.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="text-left group cursor-pointer hover:opacity-80 transition-opacity"
                title="Passer au chant suivant"
              >
                <span className="text-[10px] uppercase font-semibold text-gray-500 group-hover:text-gray-400">À suivre :</span>
                <p className="text-xs font-semibold text-blue-400 group-hover:text-blue-300 truncate max-w-[140px]">
                  {setlistSongs[activeSetlistIndex + 1]?.title}
                </p>
              </button>
            ) : (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Dernier chant
              </span>
            )}
          </div>

          {/* Plein écran */}
          <button
            type="button"
            id="btn-live-fullscreen"
            onClick={toggleFullscreen}
            className={`p-1.5 rounded-md border text-xs font-medium flex items-center gap-1 transition-colors shrink-0 cursor-pointer ${
              isFullscreen
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 hover:text-white border-[#333]'
            }`}
            title="Plein écran"
            aria-label="Plein écran"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

      </div>

      {/* Embedded Active Song Reader with animated transition */}
      <div className="flex-1 min-h-0 relative overflow-hidden bg-[#0A0A0B]">
        <AnimatePresence initial={false} custom={direction}>
          {currentSong && (
            <motion.div
              key={`${currentSong.id}-${activeSetlistIndex}`}
              custom={direction}
              variants={songTransitionVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 320, damping: 32, mass: 0.8 },
                opacity: { duration: 0.2, ease: 'easeInOut' }
              }}
              className="w-full h-full absolute inset-0 flex flex-col overflow-hidden"
            >
              <SongReader
                song={currentSong}
                setlistId={selectedSetlist.id}
                onBack={onClose}
                onNext={activeSetlistIndex < setlistSongs.length - 1 ? handleNext : undefined}
                onPrev={activeSetlistIndex > 0 ? handlePrev : undefined}
                hasNext={activeSetlistIndex < setlistSongs.length - 1}
                hasPrev={activeSetlistIndex > 0}
                setlistContextName={selectedSetlist.name}
                setlistPosition={{ current: activeSetlistIndex + 1, total: setlistSongs.length }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
