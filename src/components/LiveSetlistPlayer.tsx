import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { parseDurationToSeconds, formatSetlistDuration, getSongDuration } from '../utils/chordUtils';
import { cacheSetlistInWorker } from '../utils/pwaCache';
import { SongReader } from './SongReader';
import { SetlistPdfModal } from './SetlistPdfModal';
import { SongQrModal } from './SongQrModal';
import { BatteryIndicator } from './BatteryIndicator';
import { 
  ListMusic, 
  X, 
  Layers, 
  Music,
  CheckCircle2,
  FileDown,
  QrCode
} from 'lucide-react';

interface LiveSetlistPlayerProps {
  onClose: () => void;
}

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

  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showSongQrModal, setShowSongQrModal] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

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

  // Next / Previous navigation
  const handleNext = useCallback(() => {
    if (activeSetlistIndex < setlistSongs.length - 1) {
      setActiveSetlistIndex(activeSetlistIndex + 1);
      // Reset scroll position and auto-scroll state on song change
      updateStageSettings({ isAutoScrolling: false });
    }
  }, [activeSetlistIndex, setlistSongs.length, setActiveSetlistIndex, updateStageSettings]);

  const handlePrev = useCallback(() => {
    if (activeSetlistIndex > 0) {
      setActiveSetlistIndex(activeSetlistIndex - 1);
      updateStageSettings({ isAutoScrolling: false });
    }
  }, [activeSetlistIndex, setActiveSetlistIndex, updateStageSettings]);

  // Touch Swipe for mobile/tablet
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchStartX - touchEndX;

    // Minimum swipe threshold 70px
    if (diffX > 70) {
      handleNext();
    } else if (diffX < -70) {
      handlePrev();
    }
    setTouchStartX(null);
  };

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
      className="fixed inset-0 top-16 z-30 bg-[#0A0A0B] flex flex-col text-[#E0E0E0] overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Live Setlist Top Navigation Bar */}
      <div className="no-print bg-[#111112]/98 border-b border-[#222224] px-3 sm:px-6 py-2 flex items-center justify-between gap-3 shadow-sm z-40 shrink-0">
        
        {/* Left: Close & Setlist info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onClose}
            className="p-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 hover:text-white border border-[#333] text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
            title="Quitter le mode Live"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Quitter Live</span>
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
            <p className="text-[10px] text-gray-400 hidden sm:block truncate">
              {setlistSongs.length} morceaux • Date : {selectedSetlist.date}
              {(() => {
                const totalSecs = setlistSongs.reduce((acc, s) => acc + parseDurationToSeconds(s), 0);
                return totalSecs > 0 ? ` • Durée : ${formatSetlistDuration(totalSecs)}` : '';
              })()}
            </p>
          </div>
        </div>

        {/* Right: Next Song Quick Peek, QR Code & PDF Export */}
        <div className="flex items-center gap-2 text-right shrink-0">
          {currentSong && (
            <button
              type="button"
              onClick={() => setShowSongQrModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 hover:text-white border border-[#333] text-xs font-medium transition-colors cursor-pointer"
              title="Partager le chant via QR Code"
            >
              <QrCode className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">QR Code</span>
            </button>
          )}

          <button
            onClick={() => setShowPdfModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 hover:text-white border border-[#333] text-xs font-medium transition-colors"
            title="Exporter la setlist en PDF / Partager"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          <div className="hidden lg:flex items-center gap-2">
            {activeSetlistIndex < setlistSongs.length - 1 ? (
              <div>
                <span className="text-[10px] uppercase font-semibold text-gray-500">À suivre :</span>
                <p className="text-xs font-semibold text-blue-400 truncate max-w-[140px]">
                  {setlistSongs[activeSetlistIndex + 1]?.title}
                </p>
              </div>
            ) : (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Dernier chant
              </span>
            )}
          </div>

          {/* Indicateur de batterie pour la scène */}
          {stageSettings.showBatteryIndicator !== false && (
            <div className="pl-1 border-l border-[#28282E] shrink-0">
              <BatteryIndicator />
            </div>
          )}
        </div>

      </div>

      {/* Embedded Active Song Reader */}
      {currentSong && (
        <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
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
        </div>
      )}

      {/* PDF Export & Share Modal */}
      {showPdfModal && selectedSetlist && (
        <SetlistPdfModal
          setlist={selectedSetlist}
          songs={songs}
          onClose={() => setShowPdfModal(false)}
        />
      )}

      {/* QR Code Share Modal for current song */}
      {showSongQrModal && currentSong && (
        <SongQrModal
          song={currentSong}
          onClose={() => setShowSongQrModal(false)}
          currentGroup={currentGroup}
        />
      )}
    </div>
  );
};
