import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { SongReader } from './SongReader';
import { SetlistPdfModal } from './SetlistPdfModal';
import { 
  ChevronLeft, 
  ChevronRight, 
  ListMusic, 
  X, 
  Info, 
  Layers, 
  Music,
  CheckCircle2,
  FileDown
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
    updateStageSettings
  } = useApp();

  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Ordered list of songs in this setlist
  const setlistSongs = useMemo(() => {
    if (!selectedSetlist) return [];
    return selectedSetlist.songIds
      .map(id => songs.find(s => s.id === id))
      .filter((s): s is typeof songs[0] => s !== undefined);
  }, [selectedSetlist, songs]);

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
      className="fixed inset-0 top-16 z-30 bg-[#0A0A0B] flex flex-col text-[#E0E0E0]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Live Setlist Top Navigation Bar */}
      <div className="no-print bg-[#111112]/98 border-b border-[#222224] px-3 sm:px-6 py-2 flex items-center justify-between gap-3 shadow-sm z-40">
        
        {/* Left: Close & Setlist info */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onClose}
            className="p-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 hover:text-white border border-[#333] text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Quitter le mode Live"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Quitter Live</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                <ListMusic className="w-3.5 h-3.5" />
                <span>{selectedSetlist.name}</span>
              </span>
              {selectedSetlist.notes && (
                <button
                  onClick={() => setShowNotesModal(!showNotesModal)}
                  className="p-1 rounded bg-[#1C1C1E] text-blue-400 hover:bg-[#2A2A2D] border border-[#333] text-[10px]"
                  title="Voir les notes de la setlist"
                >
                  <Info className="w-3 h-3" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-gray-400 hidden sm:block">
              {setlistSongs.length} morceaux • Date : {selectedSetlist.date}
            </p>
          </div>
        </div>

        {/* Center: Song Jump Dropdown / Navigator */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrev}
            disabled={activeSetlistIndex === 0}
            className="p-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] disabled:opacity-30 text-gray-200 border border-[#333] transition-all active:scale-95"
            title="Chant précédent"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Song selector dropdown */}
          <select
            value={activeSetlistIndex}
            onChange={(e) => {
              setActiveSetlistIndex(parseInt(e.target.value, 10));
              updateStageSettings({ isAutoScrolling: false });
            }}
            className="bg-[#1C1C1E] text-gray-100 font-semibold text-xs border border-[#333] rounded-md px-3 py-1.5 focus:outline-none cursor-pointer max-w-[200px] sm:max-w-[340px] truncate"
          >
            {setlistSongs.map((s, idx) => (
              <option key={s.id} value={idx} className="bg-[#111112] text-gray-200">
                {idx + 1}. {s.title} ({s.key} • {s.tempo} BPM)
              </option>
            ))}
          </select>

          <button
            onClick={handleNext}
            disabled={activeSetlistIndex === setlistSongs.length - 1}
            className="p-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] disabled:opacity-30 text-gray-200 border border-[#333] transition-all active:scale-95"
            title="Chant suivant"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Next Song Quick Peek & PDF Export */}
        <div className="flex items-center gap-2 text-right">
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
        </div>

      </div>

      {/* Setlist Notes Modal */}
      {showNotesModal && selectedSetlist.notes && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111112] border border-[#222224] rounded-lg w-full max-w-md p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                <span>Notes pour cette Setlist</span>
              </h3>
              <button 
                onClick={() => setShowNotesModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap bg-[#1C1C1E] p-3 rounded-md border border-[#333]">
              {selectedSetlist.notes}
            </p>
            <button
              onClick={() => setShowNotesModal(false)}
              className="mt-4 w-full py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Embedded Active Song Reader */}
      {currentSong && (
        <SongReader
          song={currentSong}
          onBack={onClose}
          onNext={activeSetlistIndex < setlistSongs.length - 1 ? handleNext : undefined}
          onPrev={activeSetlistIndex > 0 ? handlePrev : undefined}
          hasNext={activeSetlistIndex < setlistSongs.length - 1}
          hasPrev={activeSetlistIndex > 0}
          setlistContextName={selectedSetlist.name}
          setlistPosition={{ current: activeSetlistIndex + 1, total: setlistSongs.length }}
        />
      )}

      {/* PDF Export & Share Modal */}
      {showPdfModal && selectedSetlist && (
        <SetlistPdfModal
          setlist={selectedSetlist}
          songs={songs}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </div>
  );
};
