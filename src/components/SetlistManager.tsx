import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Setlist, Song } from '../types';
import { LiveSetlistPlayer } from './LiveSetlistPlayer';
import { SetlistPdfModal } from './SetlistPdfModal';
import { SetlistAddSongsModal } from './SetlistAddSongsModal';
import { 
  parseDurationToSeconds, 
  formatSetlistDuration, 
  formatSecondsToMinutes,
  getSongDuration,
  stripParentheses 
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
  GripVertical,
  Pencil
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
  const [newSetDuration, setNewSetDuration] = useState(25);

  // Add songs to active setlist modal
  const [isAddSongModalOpen, setIsAddSongModalOpen] = useState(false);
  const [confirmDeleteSetlistId, setConfirmDeleteSetlistId] = useState<string | null>(null);
  const [pdfModalSetlist, setPdfModalSetlist] = useState<Setlist | null>(null);

  // Edit setlist metadata state
  const [editingSetlist, setEditingSetlist] = useState<Setlist | null>(null);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTargetDuration, setEditTargetDuration] = useState(25);
  const [editNotes, setEditNotes] = useState('');

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
    if (setlist.songIds[startIndex]) {
      const s = songs.find(item => item.id === setlist.songIds[startIndex]);
      if (s) setSelectedSong(s);
    }
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
      notes: '',
      targetDuration: Number(newSetDuration) || 20
    });

    setNewSetName('');
    setIsCreateModalOpen(false);
  };

  // Open Edit Metadata Modal
  const handleOpenEditModal = (st: Setlist) => {
    setEditingSetlist(st);
    setEditName(st.name || '');
    setEditDate(st.date || new Date().toISOString().split('T')[0]);
    setEditTargetDuration(st.targetDuration || 25);
    setEditNotes(st.notes || '');
  };

  // Save edited setlist metadata
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSetlist || !editName.trim()) return;

    const trimmedName = editName.trim();
    const durationNum = Number(editTargetDuration) || 20;
    const trimmedNotes = editNotes.trim();

    await updateSetlist(editingSetlist.id, {
      name: trimmedName,
      date: editDate,
      targetDuration: durationNum,
      notes: trimmedNotes
    });

    if (selectedSetlist?.id === editingSetlist.id) {
      setSelectedSetlist({
        ...selectedSetlist,
        name: trimmedName,
        date: editDate,
        targetDuration: durationNum,
        notes: trimmedNotes
      });
    }

    setEditingSetlist(null);
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

  const handleDrop = async (e: React.DragEvent, setlist: Setlist, targetIndex: number) => {
    e.preventDefault();
    if (draggedSongIndex === null) return;
    if (draggedSongIndex === targetIndex) {
      setDraggedSongIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newSongIds = [...setlist.songIds];
    const [movedSongId] = newSongIds.splice(draggedSongIndex, 1);
    newSongIds.splice(targetIndex, 0, movedSongId);

    setDraggedSongIndex(null);
    setDragOverIndex(null);

    await updateSetlist(setlist.id, { songIds: newSongIds });
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

  const handleTouchEndHandle = async (setlist: Setlist) => {
    if (touchStartIndexRef.current !== null && dragOverIndex !== null) {
      const fromIdx = touchStartIndexRef.current;
      const toIdx = dragOverIndex;
      if (fromIdx !== toIdx) {
        const newSongIds = [...setlist.songIds];
        const [movedSongId] = newSongIds.splice(fromIdx, 1);
        newSongIds.splice(toIdx, 0, movedSongId);
        await updateSetlist(setlist.id, { songIds: newSongIds });
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

  // Toggle song in active setlist
  const handleToggleSongInActiveSetlist = async (songId: string) => {
    if (!selectedSetlist) return;
    const isPresent = selectedSetlist.songIds.includes(songId);
    const newSongIds = isPresent
      ? selectedSetlist.songIds.filter(id => id !== songId)
      : [...selectedSetlist.songIds, songId];
    await updateSetlist(selectedSetlist.id, { songIds: newSongIds });
  };

  // Bulk add songs
  const handleAddMultipleSongs = async (songIdsToAdd: string[]) => {
    if (!selectedSetlist) return;
    const existing = new Set(selectedSetlist.songIds);
    const newIds = [...selectedSetlist.songIds];
    songIdsToAdd.forEach(id => {
      if (!existing.has(id)) {
        newIds.push(id);
        existing.add(id);
      }
    });
    await updateSetlist(selectedSetlist.id, { songIds: newIds });
  };

  // Bulk remove songs
  const handleRemoveMultipleSongs = async (songIdsToRemove: string[]) => {
    if (!selectedSetlist) return;
    const toRemove = new Set(songIdsToRemove);
    const newSongIds = selectedSetlist.songIds.filter(id => !toRemove.has(id));
    await updateSetlist(selectedSetlist.id, { songIds: newSongIds });
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 pb-12 text-[#E0E0E0]">
      
      {/* Live Setlist Player Modal */}
      {isLiveModeOpen && selectedSetlist && (
        <LiveSetlistPlayer onClose={() => setIsLiveModeOpen(false)} />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ListMusic className="w-6 h-6 text-blue-500" />
            <span>Setlists</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#1C1C1E] border border-[#2E2E34] text-gray-400">
              {setlists.length}
            </span>
          </h1>
        </div>

        {currentUser?.role === 'admin' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouvelle Setlist</span>
            </button>
          </div>
        )}
      </div>
          {/* Setlists Accordion List */}
          {setlists.length === 0 ? (
            <div className="text-center py-16 bg-[#111112] rounded-xl border border-[#222224] p-6 max-w-2xl mx-auto">
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-3">
                <ListMusic className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-gray-200">Aucune setlist pour le moment</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto mb-4">
                Créez votre première liste de chants pour organiser votre prochain événement.
              </p>
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-sm inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Créer une setlist</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3.5">
              {setlists.map((st) => {
                const isExpanded = selectedSetlist?.id === st.id;
                const totalSecs = getSetlistTotalDurationSeconds(st);

            return (
              <div
                key={st.id}
                className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? 'bg-[#111113] border-blue-500/50 shadow-lg shadow-blue-500/5'
                    : 'bg-[#111112] border-[#222224] hover:border-[#333] hover:bg-[#141416]'
                }`}
              >
                {/* Accordion Header / Setlist Bar */}
                <div
                  onClick={() => {
                    if (isExpanded) {
                      setSelectedSetlist(null);
                    } else {
                      setSelectedSetlist(st);
                    }
                  }}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  {/* Left info: Chevron + Name + Metadata Badges */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                    {/* Expand/Collapse Toggle icon */}
                    <div className={`p-2 rounded-lg border transition-colors shrink-0 mt-0.5 sm:mt-0 ${
                      isExpanded
                        ? 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                        : 'bg-[#1C1C1E] border-[#2E2E32] text-gray-400 group-hover:text-white'
                    }`}>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-base font-bold truncate transition-colors ${
                          isExpanded ? 'text-blue-300' : 'text-white'
                        }`}>
                          {st.name}
                        </h3>
                        {currentUser?.role === 'admin' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(st);
                            }}
                            className="p-1 rounded-md text-gray-400 hover:text-blue-400 hover:bg-blue-500/15 border border-transparent hover:border-blue-500/30 transition-all active:scale-90"
                            title="Modifier les métadonnées"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Metadata row */}
                      <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-400 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="text-gray-300 font-medium">{st.date}</span>
                        </span>
                        
                        <span className="text-gray-600">•</span>
                        
                        <span className="flex items-center gap-1 font-semibold text-blue-400">
                          <Music className="w-3.5 h-3.5 shrink-0" />
                          <span>{st.songIds.length} chant{st.songIds.length > 1 ? 's' : ''}</span>
                        </span>

                        {totalSecs > 0 && (
                          <>
                            <span className="text-gray-600">•</span>
                            <span className="flex items-center gap-1 font-semibold text-cyan-300 font-mono text-[11px]">
                              <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              <span>{formatSetlistDuration(totalSecs)}</span>
                            </span>
                          </>
                        )}


                      </div>
                    </div>
                  </div>

                  {/* Right Actions: Edit, PDF, Live Mode, Delete */}
                  <div 
                    className="flex items-center gap-2 shrink-0 self-start md:self-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setPdfModalSetlist(st)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-200 hover:text-white border border-[#333] text-xs font-semibold shadow-sm transition-all active:scale-95"
                      title="Exporter en PDF / Partager"
                    >
                      <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">Exporter PDF</span>
                    </button>



                    <button
                      onClick={() => handleLaunchLive(st, 0)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-95"
                      title="Lancer le mode Live"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Mode Live</span>
                    </button>

                    {currentUser?.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirmDeleteSetlistId === st.id) {
                            deleteSetlist(st.id);
                            setConfirmDeleteSetlistId(null);
                            if (selectedSetlist?.id === st.id) {
                              setSelectedSetlist(null);
                            }
                          } else {
                            setConfirmDeleteSetlistId(st.id);
                          }
                        }}
                        className={`p-2 rounded-lg border text-xs font-medium transition-all flex items-center justify-center ${
                          confirmDeleteSetlistId === st.id
                            ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500 shadow-sm font-bold animate-pulse'
                            : 'bg-[#1C1C1E] hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 border-[#333] hover:border-rose-500/40'
                        }`}
                        title={confirmDeleteSetlistId === st.id ? "Confirmer la suppression" : "Supprimer la setlist"}
                        aria-label={confirmDeleteSetlistId === st.id ? "Confirmer la suppression" : "Supprimer la setlist"}
                      >
                        {confirmDeleteSetlistId === st.id ? (
                          <Check className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Content: Songs Sequence */}
                {isExpanded && (
                  <div className="px-4 sm:px-6 pb-6 pt-2 border-t border-[#1F1F24] bg-[#0C0C0E]/70 space-y-4">
                    {/* Songs Sequence Management */}
                    <div>
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          {currentUser?.role === 'admin' && st.songIds.length > 1 && (
                            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-blue-400/80 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-800/40">
                              <GripVertical className="w-3 h-3 text-blue-400" />
                              Glisser-déposer pour réordonner
                            </span>
                          )}
                        </div>

                        {currentUser?.role === 'admin' && (
                          <button
                            onClick={() => {
                              setSelectedSetlist(st);
                              setIsAddSongModalOpen(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-sm active:scale-95 ml-auto"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Ajouter un chant</span>
                          </button>
                        )}
                      </div>

                      {st.songIds.length === 0 ? (
                        <div className="text-center py-10 bg-[#0E0E10] rounded-xl border border-dashed border-[#2A2A2E] p-4">
                          <Music className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                          <p className="text-xs text-gray-400">Aucun chant dans cette setlist pour l'instant.</p>
                          <button
                            onClick={() => {
                              setSelectedSetlist(st);
                              setIsAddSongModalOpen(true);
                            }}
                            className="mt-2 text-xs font-bold text-blue-400 hover:underline inline-flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Sélectionner des chants de la bibliothèque</span>
                          </button>
                        </div>
                      ) : (
                        <div 
                          ref={songsListContainerRef}
                          className="space-y-2 select-none"
                        >
                          {st.songIds.map((songId, index) => {
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
                                onDrop={(e) => handleDrop(e, st, index)}
                                onDragEnd={handleDragEnd}
                                className={`flex items-start justify-between gap-3 p-3 rounded-lg border transition-all duration-200 group relative ${
                                  isBeingDragged 
                                    ? 'opacity-40 scale-[0.98] border-2 border-dashed border-blue-500 bg-blue-950/20 shadow-inner ring-2 ring-blue-500/20 cursor-grabbing'
                                    : isDragOver
                                    ? 'border-2 border-blue-400 bg-gradient-to-r from-blue-950/50 to-[#121218] shadow-lg shadow-blue-500/20 ring-2 ring-blue-400/50 -translate-y-1 scale-[1.01]'
                                    : 'bg-[#121215] border-[#222226] hover:border-blue-500/40 hover:bg-[#16161c]'
                                }`}
                              >
                                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                  {/* Song Number & Drag Grip Handle in vertical column: Number on top, Grip below */}
                                  <div className="flex flex-col items-center justify-center gap-1 shrink-0 -ml-1 mt-0.5">
                                    {/* Song number badge */}
                                    <span 
                                      onClick={() => handleLaunchLive(st, index)}
                                      className={`w-5 h-5 rounded font-mono text-[11px] font-bold flex items-center justify-center transition-colors cursor-pointer ${
                                        isDragOver
                                          ? 'bg-blue-600 text-white border border-blue-400 font-black shadow-sm'
                                          : 'bg-[#1C1C1E] text-gray-300 border border-[#333] group-hover:border-blue-500/40 group-hover:text-blue-200'
                                      }`}
                                      title="Lancer ce chant en mode Live"
                                    >
                                      {index + 1}
                                    </span>

                                    {currentUser?.role === 'admin' && (
                                      <div
                                        onClick={(e) => e.stopPropagation()}
                                        onTouchStart={(e) => handleTouchStartHandle(e, index)}
                                        onTouchMove={handleTouchMoveHandle}
                                        onTouchEnd={() => handleTouchEndHandle(st)}
                                        className={`p-1 rounded cursor-grab active:cursor-grabbing transition-all duration-150 touch-none ${
                                          isBeingDragged
                                            ? 'text-blue-400 bg-blue-500/20 ring-1 ring-blue-400/40'
                                            : 'text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 active:text-blue-300 active:bg-blue-500/20'
                                        }`}
                                        title="Glisser pour réorganiser"
                                      >
                                        <GripVertical className="w-4 h-4" />
                                      </div>
                                    )}
                                  </div>

                                  <div 
                                    className="min-w-0 flex-1 cursor-pointer"
                                    onClick={() => handleLaunchLive(st, index)}
                                    title="Lancer ce chant en mode Live"
                                  >
                                    <h5 className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-300 truncate transition-colors">
                                      {stripParentheses(song.title)}
                                    </h5>
                                    <p className="text-[11px] text-gray-400 truncate flex items-center gap-1.5 flex-wrap mt-0.5">
                                      <span>{song.artist || 'Auteur inconnu'}</span>
                                      <span className="text-gray-600">•</span>
                                      <span>Tonalité : <strong className="text-blue-400">{song.key}</strong></span>
                                      <span className="text-gray-600">•</span>
                                      <span>{song.tempo} BPM</span>
                                      {getSongDuration(song) ? (
                                        <>
                                          <span className="text-gray-600">•</span>
                                          <span className="inline-flex items-center gap-1 text-cyan-400 font-mono font-medium">
                                            <Clock className="w-2.5 h-2.5 text-cyan-400" />
                                            {getSongDuration(song)}
                                          </span>
                                        </>
                                      ) : null}
                                    </p>
                                  </div>
                                </div>

                                {/* Actions: Remove button */}
                                {currentUser?.role === 'admin' && (
                                  <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveSong(st, song.id);
                                      }}
                                      className="p-1.5 rounded-lg bg-[#1C1C1E] hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 border border-[#333] transition-colors"
                                      title="Retirer de la setlist"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {st.notes && (
                        <div className="mt-3 p-3.5 bg-[#121215] border border-[#222226] rounded-lg text-xs text-gray-300">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="text-[11px] font-bold text-gray-400 flex items-center gap-1.5">
                              <Info className="w-3.5 h-3.5 text-blue-400" />
                              <span>Notes et déroulé</span>
                            </div>
                            {currentUser?.role === 'admin' && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(st)}
                                className="text-[11px] text-blue-400 hover:text-blue-300 font-medium hover:underline flex items-center gap-1"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Modifier</span>
                              </button>
                            )}
                          </div>
                          <div className="whitespace-pre-wrap font-sans text-gray-300 leading-relaxed">{st.notes}</div>
                        </div>
                      )}
                    </div>

                  </div>
                )}

              </div>
            );
          })}
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

              <div className="mb-3">
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
      {selectedSetlist && (
        <SetlistAddSongsModal
          isOpen={isAddSongModalOpen}
          onClose={() => setIsAddSongModalOpen(false)}
          setlist={selectedSetlist}
          songs={songs}
          onToggleSong={handleToggleSongInActiveSetlist}
          onAddMultipleSongs={handleAddMultipleSongs}
          onRemoveMultipleSongs={handleRemoveMultipleSongs}
        />
      )}

      {/* PDF Export & Share Modal */}
      {pdfModalSetlist && (
        <SetlistPdfModal
          setlist={pdfModalSetlist}
          songs={songs}
          onClose={() => setPdfModalSetlist(null)}
        />
      )}

      {/* Modal: Edit Setlist Metadata */}
      {editingSetlist && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111112] border border-[#222224] rounded-xl w-full max-w-md p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#222224]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-400" />
                <span>Modifier les métadonnées de la setlist</span>
              </h3>
              <button 
                type="button"
                onClick={() => setEditingSetlist(null)}
                className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-[#1C1C1E] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Nom de la setlist *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#1C1C1E] border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Date de l'événement
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-[#1C1C1E] border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Notes et indications pour le groupe
                </label>
                <textarea
                  rows={3}
                  placeholder="Ordre particulier, conducteur, transitions..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-[#1C1C1E] border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#222224]">
                <button
                  type="button"
                  onClick={() => setEditingSetlist(null)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:bg-[#1C1C1E] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!editName.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Enregistrer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



    </div>
  );
};
