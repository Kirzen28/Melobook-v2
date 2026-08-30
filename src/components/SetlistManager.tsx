import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Setlist, Song } from '../types';
import { LiveSetlistPlayer } from './LiveSetlistPlayer';
import { SetlistPdfModal } from './SetlistPdfModal';
import { 
  parseDurationToSeconds, 
  formatSetlistDuration, 
  formatSecondsToMinutes,
  getSongDuration 
} from '../utils/chordUtils';
import { 
  ListMusic, 
  Plus, 
  PlayCircle, 
  Calendar, 
  Clock, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Music, 
  X, 
  Search, 
  Check, 
  Layers, 
  Sparkles,
  Info,
  ArrowRight,
  FileDown,
  Share2,
  GripVertical
} from 'lucide-react';

export const SetlistManager: React.FC = () => {
  const { 
    setlists, 
    songs, 
    selectedSetlist, 
    setSelectedSetlist, 
    createSetlist, 
    updateSetlist, 
    deleteSetlist, 
    currentUser,
    setSelectedSong,
    setActiveTab,
    setActiveSetlistIndex
  } = useApp();

  const [isLiveModeOpen, setIsLiveModeOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [newSetDate, setNewSetDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSetNotes, setNewSetNotes] = useState('');
  const [newSetDuration, setNewSetDuration] = useState(25);

  // Add songs to active setlist modal
  const [isAddSongModalOpen, setIsAddSongModalOpen] = useState(false);
  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [confirmDeleteSetlistId, setConfirmDeleteSetlistId] = useState<string | null>(null);
  const [pdfModalSetlist, setPdfModalSetlist] = useState<Setlist | null>(null);

  // Drag-and-Drop state for song reordering
  const [draggedSongIndex, setDraggedSongIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const songsListContainerRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartIndexRef = useRef<number | null>(null);

  // Helper to calculate total seconds for a setlist
  const getSetlistTotalDurationSeconds = (st: Setlist) => {
    return st.songIds.reduce((total, id) => {
      const s = songs.find(song => song.id === id);
      return total + parseDurationToSeconds(s);
    }, 0);
  };

  React.useEffect(() => {
    if (confirmDeleteSetlistId) {
      const timer = setTimeout(() => setConfirmDeleteSetlistId(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [confirmDeleteSetlistId]);

  // Open Live Player
  const handleLaunchLive = (setlist: Setlist, startIndex = 0) => {
    setSelectedSetlist(setlist);
    setActiveSetlistIndex(startIndex);
    setIsLiveModeOpen(true);
  };

  // Create new setlist
  const handleCreateSetlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetName.trim()) return;

    const newId = await createSetlist({
      name: newSetName.trim(),
      date: newSetDate,
      songIds: [],
      notes: newSetNotes.trim(),
      targetDuration: Number(newSetDuration) || 20
    });

    setNewSetName('');
    setNewSetNotes('');
    setIsCreateModalOpen(false);
  };

  // Reorder songs in setlist via index swap
  const handleMoveSong = async (setlist: Setlist, index: number, direction: 'up' | 'down') => {
    const newSongIds = [...setlist.songIds];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSongIds.length) return;

    const temp = newSongIds[index];
    newSongIds[index] = newSongIds[targetIndex];
    newSongIds[targetIndex] = temp;

    await updateSetlist(setlist.id, { songIds: newSongIds });
  };

  // Drag-and-Drop Handlers (HTML5 Mouse)
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedSongIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (index: number) => {
    if (dragOverIndex === index) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedSongIndex === null || !selectedSetlist) return;
    if (draggedSongIndex === targetIndex) {
      setDraggedSongIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newSongIds = [...selectedSetlist.songIds];
    const [movedSongId] = newSongIds.splice(draggedSongIndex, 1);
    newSongIds.splice(targetIndex, 0, movedSongId);

    setDraggedSongIndex(null);
    setDragOverIndex(null);

    await updateSetlist(selectedSetlist.id, { songIds: newSongIds });
  };

  const handleDragEnd = () => {
    setDraggedSongIndex(null);
    setDragOverIndex(null);
  };

  // Touch Drag & Drop Handlers (Mobile / Tablet)
  const handleTouchStartHandle = (e: React.TouchEvent, index: number) => {
    touchStartYRef.current = e.touches[0].clientY;
    touchStartIndexRef.current = index;
    setDraggedSongIndex(index);
  };

  const handleTouchMoveHandle = (e: React.TouchEvent) => {
    if (touchStartIndexRef.current === null || !songsListContainerRef.current) return;
    const currentY = e.touches[0].clientY;
    
    // Find item element under finger
    const children = Array.from(songsListContainerRef.current.children) as HTMLElement[];
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect();
      if (currentY >= rect.top && currentY <= rect.bottom) {
        if (dragOverIndex !== i) {
          setDragOverIndex(i);
        }
        break;
      }
    }
  };

  const handleTouchEndHandle = async () => {
    if (touchStartIndexRef.current !== null && dragOverIndex !== null && selectedSetlist) {
      const fromIdx = touchStartIndexRef.current;
      const toIdx = dragOverIndex;
      if (fromIdx !== toIdx) {
        const newSongIds = [...selectedSetlist.songIds];
        const [movedSongId] = newSongIds.splice(fromIdx, 1);
        newSongIds.splice(toIdx, 0, movedSongId);
        await updateSetlist(selectedSetlist.id, { songIds: newSongIds });
      }
    }
    touchStartYRef.current = null;
    touchStartIndexRef.current = null;
    setDraggedSongIndex(null);
    setDragOverIndex(null);
  };

  // Remove song from setlist
  const handleRemoveSong = async (setlist: Setlist, songId: string) => {
    const newSongIds = setlist.songIds.filter(id => id !== songId);
    await updateSetlist(setlist.id, { songIds: newSongIds });
  };

  // Add song to setlist
  const handleAddSongToActiveSetlist = async (songId: string) => {
    if (!selectedSetlist) return;
    if (!selectedSetlist.songIds.includes(songId)) {
      const newSongIds = [...selectedSetlist.songIds, songId];
      await updateSetlist(selectedSetlist.id, { songIds: newSongIds });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 pb-12 text-[#E0E0E0]">
      
      {/* Live Setlist Player Modal */}
      {isLiveModeOpen && selectedSetlist && (
        <LiveSetlistPlayer onClose={() => setIsLiveModeOpen(false)} />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span>Setlists</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#1C1C1E] text-blue-400 border border-[#333]">
              {setlists.length}
            </span>
          </h1>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouvelle Setlist</span>
          </button>
        )}
      </div>

      {/* Setlists Grid / Master View */}
      {setlists.length === 0 ? (
        <div className="text-center py-16 bg-[#111112] rounded-lg border border-[#222224] p-6">
          <ListMusic className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-300">Aucune setlist pour le moment</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto mb-4">
            Créez votre première liste de chants pour organiser votre prochain événement.
          </p>
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-1.5 rounded-md bg-blue-600 text-white font-semibold text-xs"
            >
              Créer une setlist
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Setlist Selector Cards */}
          <div className="space-y-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-1">
              Toutes les Setlists
            </h2>

            {setlists.map((st) => {
              const isSelected = selectedSetlist?.id === st.id;
              const totalSecs = getSetlistTotalDurationSeconds(st);
              return (
                <div
                  key={st.id}
                  onClick={() => setSelectedSetlist(st)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#1C1C1E] border-blue-500/60 shadow-sm'
                      : 'bg-[#111112] border-[#222224] hover:bg-[#141416] hover:border-[#333]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-blue-400">
                        {st.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-blue-400" />
                          {st.date}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-semibold text-blue-400">
                          <Music className="w-3 h-3" />
                          {st.songIds.length} chants
                        </span>
                        {totalSecs > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-semibold text-cyan-400 font-mono text-[11px]">
                              <Clock className="w-3 h-3 text-cyan-400" />
                              {formatSetlistDuration(totalSecs)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPdfModalSetlist(st);
                        }}
                        className="p-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 hover:text-white border border-[#333] text-xs font-semibold shadow-sm transition-all active:scale-95"
                        title="Exporter en PDF / Partager"
                      >
                        <FileDown className="w-4 h-4 text-emerald-400" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLaunchLive(st, 0);
                        }}
                        className="p-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-95"
                        title="Lancer le mode Live"
                      >
                        <PlayCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {st.notes && (
                    <p className="text-[11px] text-gray-400 mt-2 line-clamp-1 italic">
                      "{st.notes}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Columns: Selected Setlist Details & Song Sequence */}
          <div className="lg:col-span-2">
            {selectedSetlist ? (
              <div className="bg-[#111112] border border-[#222224] rounded-lg p-5 shadow-sm">
                
                {/* Active Setlist Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222224]">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                      Setlist Active
                    </span>
                    <h2 className="text-lg font-bold text-white">{selectedSetlist.name}</h2>
                    <div className="text-xs text-gray-400 flex items-center gap-2.5 mt-1 flex-wrap">
                      <span>Date : <strong className="text-gray-200">{selectedSetlist.date}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <span className="text-gray-400">Durée totale :</span>
                        {(() => {
                          const totalSecs = getSetlistTotalDurationSeconds(selectedSetlist);
                          return (
                            <strong className="text-cyan-300 font-semibold inline-flex items-center gap-1 font-mono">
                              <Clock className="w-3.5 h-3.5 text-cyan-400" />
                              {totalSecs > 0 ? formatSetlistDuration(totalSecs) : 'Non renseignée'}
                            </strong>
                          );
                        })()}
                      </span>
                      {selectedSetlist.targetDuration ? (
                        <>
                          <span>•</span>
                          <span>Cible : <strong className="text-gray-200">{selectedSetlist.targetDuration} min</strong></span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPdfModalSetlist(selectedSetlist)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-200 hover:text-white border border-[#333] font-semibold text-xs shadow-sm transition-all active:scale-95"
                      title="Exporter la setlist en PDF / Partager sur WhatsApp"
                    >
                      <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Exporter PDF</span>
                    </button>

                    <button
                      onClick={() => handleLaunchLive(selectedSetlist, 0)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-95"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Lancer Mode Live</span>
                    </button>

                    {currentUser?.role === 'admin' && (
                      <button
                        onClick={() => {
                          if (confirmDeleteSetlistId === selectedSetlist.id) {
                            deleteSetlist(selectedSetlist.id);
                            setConfirmDeleteSetlistId(null);
                          } else {
                            setConfirmDeleteSetlistId(selectedSetlist.id);
                          }
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all ${
                          confirmDeleteSetlistId === selectedSetlist.id
                            ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500 shadow-sm font-bold animate-pulse'
                            : 'bg-[#1C1C1E] hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 border-[#333] hover:border-rose-500/40'
                        }`}
                        title={confirmDeleteSetlistId === selectedSetlist.id ? "Cliquez pour confirmer la suppression" : "Supprimer la setlist"}
                      >
                        {confirmDeleteSetlistId === selectedSetlist.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-white" />
                            <span>Confirmer ?</span>
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>Supprimer</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Notes banner if present */}
                {selectedSetlist.notes && (
                  <div className="my-4 p-2.5 rounded-md bg-[#1C1C1E] border border-[#333] text-xs text-gray-300 flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <p>{selectedSetlist.notes}</p>
                  </div>
                )}

                {/* Songs Sequence List */}
                <div className="my-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        Ordre des Morceaux ({selectedSetlist.songIds.length})
                      </h3>
                      {currentUser?.role === 'admin' && selectedSetlist.songIds.length > 1 && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-blue-400/80 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-800/40">
                          <GripVertical className="w-3 h-3 text-blue-400" />
                          Glisser-déposer pour réordonner
                        </span>
                      )}
                    </div>

                    {currentUser?.role === 'admin' && (
                      <button
                        onClick={() => setIsAddSongModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 hover:text-white border border-[#333] text-xs font-semibold transition-all"
                      >
                        <Plus className="w-3.5 h-3.5 text-blue-400" />
                        <span>Ajouter un chant</span>
                      </button>
                    )}
                  </div>

                  {selectedSetlist.songIds.length === 0 ? (
                    <div className="text-center py-10 bg-[#0A0A0B] rounded-md border border-dashed border-[#333] p-4">
                      <p className="text-xs text-gray-400">Aucun chant dans cette setlist pour l'instant.</p>
                      <button
                        onClick={() => setIsAddSongModalOpen(true)}
                        className="mt-2 text-xs font-bold text-blue-400 hover:underline"
                      >
                        Sélectionner des chants de la bibliothèque
                      </button>
                    </div>
                  ) : (
                    <div 
                      ref={songsListContainerRef}
                      className="space-y-2 select-none"
                    >
                      {selectedSetlist.songIds.map((songId, index) => {
                        const song = songs.find(s => s.id === songId);
                        if (!song) return null;

                        const isBeingDragged = draggedSongIndex === index;
                        const isDragOver = dragOverIndex === index && draggedSongIndex !== index;

                        return (
                          <div
                            key={`${song.id}-${index}`}
                            draggable={currentUser?.role === 'admin'}
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragLeave={() => handleDragLeave(index)}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border transition-all duration-150 group ${
                              isBeingDragged 
                                ? 'opacity-40 scale-[0.98] border-dashed border-blue-500 bg-[#16161c]'
                                : isDragOver
                                ? 'border-blue-500 bg-blue-950/40 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/50 -translate-y-0.5'
                                : 'bg-[#0A0A0B] border-[#222224] hover:border-[#3a3a40] hover:bg-[#0f0f12]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              {/* Drag Grip Handle */}
                              {currentUser?.role === 'admin' && (
                                <div
                                  onTouchStart={(e) => handleTouchStartHandle(e, index)}
                                  onTouchMove={handleTouchMoveHandle}
                                  onTouchEnd={handleTouchEndHandle}
                                  className="p-1 -ml-1 text-gray-500 hover:text-blue-400 active:text-blue-300 cursor-grab active:cursor-grabbing rounded transition-colors touch-none shrink-0"
                                  title="Glisser pour réorganiser"
                                >
                                  <GripVertical className="w-4 h-4" />
                                </div>
                              )}

                              <span className="w-5 h-5 rounded bg-[#1C1C1E] text-gray-400 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 border border-[#333]">
                                {index + 1}
                              </span>

                              <div 
                                className="min-w-0 flex-1 cursor-pointer"
                                onClick={() => {
                                  setSelectedSong(song);
                                  setActiveTab('stage');
                                }}
                                title="Ouvrir les détails de ce chant"
                              >
                                <h4 className="text-xs font-bold text-white group-hover:text-blue-300 truncate transition-colors">
                                  {song.title}
                                </h4>
                                <p className="text-[11px] text-gray-400 truncate flex items-center gap-1.5 flex-wrap">
                                  <span>{song.artist || 'Auteur'}</span>
                                  <span>•</span>
                                  <span>Tonalité: <strong className="text-blue-400">{song.key}</strong></span>
                                  <span>•</span>
                                  <span>{song.tempo} BPM</span>
                                  {getSongDuration(song) ? (
                                    <>
                                      <span>•</span>
                                      <span className="inline-flex items-center gap-1 text-cyan-400 font-mono font-medium">
                                        <Clock className="w-2.5 h-2.5 text-cyan-400" />
                                        {getSongDuration(song)}
                                      </span>
                                    </>
                                  ) : null}
                                </p>
                              </div>
                            </div>

                            {/* Actions: Play single song in live / Reorder buttons fallback / Delete */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleLaunchLive(selectedSetlist, index)}
                                className="p-1.5 rounded-md bg-[#1C1C1E] hover:bg-blue-600 text-blue-400 hover:text-white border border-[#333] transition-colors"
                                title="Lire à partir de ce chant"
                              >
                                <PlayCircle className="w-3.5 h-3.5" />
                              </button>

                              {currentUser?.role === 'admin' && (
                                <>
                                  <button
                                    onClick={() => handleMoveSong(selectedSetlist, index, 'up')}
                                    disabled={index === 0}
                                    className="p-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] disabled:opacity-20 text-gray-300 border border-[#333] transition-colors"
                                    title="Monter d'une position"
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleMoveSong(selectedSetlist, index, 'down')}
                                    disabled={index === selectedSetlist.songIds.length - 1}
                                    className="p-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] disabled:opacity-20 text-gray-300 border border-[#333] transition-colors"
                                    title="Descendre d'une position"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleRemoveSong(selectedSetlist, song.id)}
                                    className="p-1.5 rounded-md bg-[#1C1C1E] hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 border border-[#333] transition-colors"
                                    title="Retirer de la setlist"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="text-center py-20 bg-[#111112] rounded-lg border border-[#222224] p-6">
                <ListMusic className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-gray-300">Sélectionnez une setlist</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Cliquez sur une setlist à gauche pour voir et réorganiser ses morceaux.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Modal: Create Setlist */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111112] border border-[#222224] rounded-lg w-full max-w-md p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-blue-400" />
                <span>Nouvelle Setlist</span>
              </h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSetlist} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Nom de l'événement / Setlist *
                </label>
                <input
                  type="text"
                  placeholder="ex: Culte Dimanche 30 Août"
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  className="w-full bg-[#1C1C1E] border border-[#333] rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newSetDate}
                    onChange={(e) => setNewSetDate(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-[#333] rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Durée estimée (min)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={240}
                    value={newSetDuration}
                    onChange={(e) => setNewSetDuration(parseInt(e.target.value, 10) || 20)}
                    className="w-full bg-[#1C1C1E] border border-[#333] rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Notes & Consignes
                </label>
                <textarea
                  rows={2}
                  placeholder="ex: Transition guitare solo sur le 2e chant, prière d'accueil"
                  value={newSetNotes}
                  onChange={(e) => setNewSetNotes(e.target.value)}
                  className="w-full bg-[#1C1C1E] border border-[#333] rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#222224]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md text-xs font-medium text-gray-400 hover:bg-[#1C1C1E]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!newSetName.trim()}
                  className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
                >
                  Créer la setlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Songs to Active Setlist */}
      {isAddSongModalOpen && selectedSetlist && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111112] border border-[#222224] rounded-lg w-full max-w-lg p-5 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>Ajouter des Chants à "{selectedSetlist.name}"</span>
              </h3>
              <button 
                onClick={() => setIsAddSongModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher un chant..."
                value={songSearchQuery}
                onChange={(e) => setSongSearchQuery(e.target.value)}
                className="w-full bg-[#1C1C1E] border border-[#333] rounded-md pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Songs Picker List */}
            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {songs
                .filter(s => {
                  if (!songSearchQuery.trim()) return true;
                  const q = songSearchQuery.toLowerCase();
                  return s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q);
                })
                .map(song => {
                  const isAlreadyIn = selectedSetlist.songIds.includes(song.id);
                  return (
                    <div
                      key={song.id}
                      className="flex items-center justify-between p-2.5 rounded-md bg-[#0A0A0B] border border-[#222224] hover:border-[#333]"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-white">{song.title}</h4>
                        <p className="text-[10px] text-gray-400 flex items-center gap-1.5 flex-wrap">
                          <span>{song.artist}</span>
                          <span>•</span>
                          <span className="text-blue-400 font-semibold">{song.key}</span>
                          <span>•</span>
                          <span>{song.tempo} BPM</span>
                          {getSongDuration(song) ? (
                            <>
                              <span>•</span>
                              <span className="text-cyan-400 font-mono flex items-center gap-0.5 font-medium">
                                <Clock className="w-2.5 h-2.5 text-cyan-400" />
                                {getSongDuration(song)}
                              </span>
                            </>
                          ) : null}
                        </p>
                      </div>

                      {isAlreadyIn ? (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-blue-400 px-2 py-0.5 bg-[#1C1C1E] border border-[#333] rounded">
                          <Check className="w-3 h-3" /> Ajouté
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddSongToActiveSetlist(song.id)}
                          className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors"
                        >
                          + Ajouter
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="pt-3 mt-3 border-t border-[#222224] flex justify-end">
              <button
                onClick={() => setIsAddSongModalOpen(false)}
                className="px-3.5 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-200 font-semibold text-xs border border-[#333]"
              >
                Terminer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Export & Share Modal */}
      {pdfModalSetlist && (
        <SetlistPdfModal
          setlist={pdfModalSetlist}
          songs={songs}
          onClose={() => setPdfModalSetlist(null)}
        />
      )}

    </div>
  );
};
