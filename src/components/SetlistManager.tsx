import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Setlist, Song } from '../types';
import { LiveSetlistPlayer } from './LiveSetlistPlayer';
import { SetlistPdfModal } from './SetlistPdfModal';
import { SetlistAddSongsModal } from './SetlistAddSongsModal';
import { SetlistDatePickerModal } from './SetlistDatePickerModal';
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
  ArrowRight,
  FileDown,
  Share2,
  GripVertical,
  Pencil,
  Calendar,
  MoreVertical
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
    setActiveSetlistIndex,
    showNotification,
    canManageSongs
  } = useApp();

  const [expandedSetlistId, setExpandedSetlistId] = useState<string | null>(null);
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

  // Drag-and-Drop state for song reordering
  const [draggedSongIndex, setDraggedSongIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [datePickerSetlist, setDatePickerSetlist] = useState<Setlist | null>(null);
  const [activeMenuSetlistId, setActiveMenuSetlistId] = useState<string | null>(null);
  const songsListContainerRef = useRef<HTMLDivElement>(null);

  // Close mobile actions menu on click outside
  useEffect(() => {
    if (!activeMenuSetlistId) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-setlist-menu]')) {
        setActiveMenuSetlistId(null);
        setConfirmDeleteSetlistId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenuSetlistId]);

  // Friendly date formatter
  const formatFriendlyDate = (dateStr?: string) => {
    if (!dateStr) return 'Choisir une date';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const dateObj = new Date(y, m, d);
        return dateObj.toLocaleDateString('fr-FR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };
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

    if (newId) {
      setExpandedSetlistId(newId);
    }

    setNewSetName('');
    setIsCreateModalOpen(false);
  };

  // Open Edit Metadata Modal
  const handleOpenEditModal = (st: Setlist) => {
    setEditingSetlist(st);
    setEditName(st.name || '');
    setEditDate(st.date || new Date().toISOString().split('T')[0]);
    setEditTargetDuration(st.targetDuration || 25);
  };

  // Save edited setlist metadata
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSetlist || !editName.trim()) return;

    const trimmedName = editName.trim();
    const durationNum = Number(editTargetDuration) || 20;

    await updateSetlist(editingSetlist.id, {
      name: trimmedName,
      date: editDate,
      targetDuration: durationNum
    });

    if (selectedSetlist?.id === editingSetlist.id) {
      setSelectedSetlist({
        ...selectedSetlist,
        name: trimmedName,
        date: editDate,
        targetDuration: durationNum
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
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2 sm:gap-2.5">
            <ListMusic className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 shrink-0" />
            <span>Setlists</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#1C1C1E] border border-[#2E2E34] text-gray-400 shrink-0">
              {setlists.length}
            </span>
          </h1>
        </div>

        {canManageSongs && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-95 whitespace-nowrap"
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
              {canManageSongs && (
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
                const isExpanded = expandedSetlistId === st.id;
                const totalSecs = getSetlistTotalDurationSeconds(st);

            return (
              <div
                key={st.id}
                className={`rounded-xl border transition-all duration-200 ${
                  activeMenuSetlistId === st.id ? 'overflow-visible z-20 relative' : 'overflow-hidden'
                } ${
                  isExpanded
                    ? 'bg-[#111113] border-blue-500/50 shadow-lg shadow-blue-500/5'
                    : 'bg-[#111112] border-[#222224] hover:border-[#333] hover:bg-[#141416]'
                }`}
              >
                {/* Accordion Header / Setlist Bar : clic direct sur le bloc = lancement du Live dès le 1er chant */}
                <div
                  onClick={() => {
                    if (st.songIds.length > 0) {
                      handleLaunchLive(st, 0);
                    } else {
                      setExpandedSetlistId(prev => (prev === st.id ? null : st.id));
                      setSelectedSetlist(st);
                      showNotification?.({
                        title: st.name,
                        message: 'Cette setlist est vide. Ajoutez des chants pour lancer le mode Live.',
                        type: 'info'
                      });
                    }
                  }}
                  className="p-3.5 sm:p-5 flex items-center justify-between gap-3 cursor-pointer select-none group/card hover:bg-[#151519] transition-colors"
                  title={st.songIds.length > 0 ? "Lancer le mode Live (dès la première chanson)" : "Dérouler la setlist"}
                >
                  {/* Left info: Bouton déroulant + Titre + Indicateur Live */}
                  <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                    {/* Bouton pour dérouler la liste et les informations */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedSetlistId(prev => (prev === st.id ? null : st.id));
                        setSelectedSetlist(st);
                      }}
                      className={`p-2 rounded-lg border transition-all shrink-0 cursor-pointer ${
                        isExpanded
                          ? 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                          : 'bg-[#1C1C1E] border-[#2E2E32] text-gray-400 hover:text-white hover:bg-[#252529]'
                      }`}
                      title={isExpanded ? "Replier la liste" : "Dérouler la liste des chants et informations"}
                      aria-label={isExpanded ? "Replier la setlist" : "Dérouler la setlist"}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <h3 className={`text-sm sm:text-base font-bold truncate transition-colors group-hover/card:text-blue-300 ${
                            isExpanded ? 'text-blue-300' : 'text-white'
                          }`}>
                            {st.name}
                          </h3>
                        </div>

                        {/* Durée totale et Date (en dessous du titre sur mobile, à côté sur desktop) */}
                        <div 
                          className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Durée totale */}
                          {totalSecs > 0 && (
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 font-mono font-medium text-[11px] sm:text-xs shadow-xs"
                              title="Durée totale estimée de la setlist"
                            >
                              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400 shrink-0" />
                              <span>{formatSetlistDuration(totalSecs)}</span>
                            </span>
                          )}

                          {/* Sélecteur de date interactif ouvrant directement le calendrier */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDatePickerSetlist(st);
                            }}
                            className="relative inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1C1C1F] hover:bg-[#25252A] border border-[#2E2E34] hover:border-blue-500/50 text-gray-200 hover:text-white transition-all cursor-pointer group shadow-xs select-none text-[11px] sm:text-xs"
                            title="Cliquer pour choisir la date dans le calendrier"
                          >
                            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
                            <span className="font-semibold capitalize truncate max-w-[140px] sm:max-w-none">
                              {st.date ? formatFriendlyDate(st.date) : 'Choisir une date'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions: Add Song + Desktop 3 buttons / Mobile 3-dots menu */}
                  <div 
                    className="flex items-center gap-1.5 sm:gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Bouton pour ajouter un chant à la setlist */}
                    {canManageSongs && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSetlist(st);
                          setIsAddSongModalOpen(true);
                        }}
                        className="p-2 sm:px-2.5 sm:py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
                        title="Ajouter des chants à cette setlist"
                        aria-label="Ajouter un chant"
                      >
                        <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                        <span className="hidden sm:inline">Ajouter chant</span>
                      </button>
                    )}

                    {/* Desktop: Les 3 boutons visibles (Modifier, PDF, Supprimer) */}
                    <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
                      {canManageSongs && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(st)}
                          className="p-2 rounded-lg bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-400 hover:text-blue-400 border border-[#333] hover:border-blue-500/40 text-xs font-medium shadow-sm transition-all active:scale-95 flex items-center justify-center"
                          title="Modifier les infos de la setlist"
                          aria-label="Modifier les infos de la setlist"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setPdfModalSetlist(st)}
                        className="p-2 rounded-lg bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-400 hover:text-emerald-400 border border-[#333] hover:border-emerald-500/40 text-xs font-medium shadow-sm transition-all active:scale-95 flex items-center justify-center"
                        title="Exporter en PDF / Partager"
                        aria-label="Exporter en PDF"
                      >
                        <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                      </button>

                      {canManageSongs && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirmDeleteSetlistId === st.id) {
                              deleteSetlist(st.id);
                              setConfirmDeleteSetlistId(null);
                              if (selectedSetlist?.id === st.id) {
                                setSelectedSetlist(null);
                              }
                              if (expandedSetlistId === st.id) {
                                setExpandedSetlistId(null);
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

                    {/* Mobile: Bouton 3 petits points avec menu déroulant */}
                    <div className="relative sm:hidden" data-setlist-menu>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuSetlistId(prev => (prev === st.id ? null : st.id));
                        }}
                        className={`p-2 rounded-lg border text-xs font-medium transition-all flex items-center justify-center ${
                          activeMenuSetlistId === st.id
                            ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                            : 'bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-400 hover:text-white border-[#333]'
                        }`}
                        title="Plus d'actions"
                        aria-label="Plus d'actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Menu déroulant mobile */}
                      {activeMenuSetlistId === st.id && (
                        <div 
                          className="absolute right-0 top-full mt-1.5 w-52 bg-[#161619] border border-[#2E2E34] rounded-xl shadow-2xl py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {canManageSongs && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuSetlistId(null);
                                handleOpenEditModal(st);
                              }}
                              className="w-full px-3 py-2 text-left text-xs font-medium text-gray-300 hover:text-white hover:bg-[#222228] flex items-center gap-2.5 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span>Modifier la setlist</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuSetlistId(null);
                              setPdfModalSetlist(st);
                            }}
                            className="w-full px-3 py-2 text-left text-xs font-medium text-gray-300 hover:text-white hover:bg-[#222228] flex items-center gap-2.5 transition-colors"
                          >
                            <FileDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Exporter en PDF</span>
                          </button>

                          {canManageSongs && (
                            <div className="border-t border-[#25252B] my-1 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirmDeleteSetlistId === st.id) {
                                    deleteSetlist(st.id);
                                    setConfirmDeleteSetlistId(null);
                                    setActiveMenuSetlistId(null);
                                    if (selectedSetlist?.id === st.id) {
                                      setSelectedSetlist(null);
                                    }
                                    if (expandedSetlistId === st.id) {
                                      setExpandedSetlistId(null);
                                    }
                                  } else {
                                    setConfirmDeleteSetlistId(st.id);
                                  }
                                }}
                                className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2.5 transition-colors ${
                                  confirmDeleteSetlistId === st.id
                                    ? 'bg-rose-600/20 text-rose-300 font-bold'
                                    : 'text-rose-400 hover:bg-rose-950/20 hover:text-rose-300'
                                }`}
                              >
                                {confirmDeleteSetlistId === st.id ? (
                                  <Check className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                )}
                                <span>
                                  {confirmDeleteSetlistId === st.id
                                    ? 'Confirmer la suppression'
                                    : 'Supprimer la setlist'}
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content: Songs Sequence */}
                {isExpanded && (
                  <div className="px-4 sm:px-6 pb-6 pt-2 border-t border-[#1F1F24] bg-[#0C0C0E]/70 space-y-4">
                    {/* Songs Sequence Management */}
                    <div>
                      {st.songIds.length === 0 ? (
                        <div className="text-center py-10 bg-[#0E0E10] rounded-xl border border-dashed border-[#2A2A2E] p-4">
                          <Music className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                          <p className="text-xs text-gray-400">Aucun chant dans cette setlist pour l'instant.</p>
                          {canManageSongs && (
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
                          )}
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
                                draggable={canManageSongs}
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
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                  {canManageSongs && (
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      onTouchStart={(e) => handleTouchStartHandle(e, index)}
                                      onTouchMove={handleTouchMoveHandle}
                                      onTouchEnd={() => handleTouchEndHandle(st)}
                                      className={`p-1 rounded cursor-grab active:cursor-grabbing transition-all duration-150 touch-none shrink-0 -ml-1 ${
                                        isBeingDragged
                                          ? 'text-blue-400 bg-blue-500/20 ring-1 ring-blue-400/40'
                                          : 'text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 active:text-blue-300 active:bg-blue-500/20'
                                      }`}
                                      title="Glisser pour réorganiser"
                                    >
                                      <GripVertical className="w-4 h-4" />
                                    </div>
                                  )}

                                  <div 
                                    className="min-w-0 flex-1 cursor-pointer"
                                    onClick={() => handleLaunchLive(st, index)}
                                    title="Lancer ce chant en mode Live"
                                  >
                                    {/* Compteur et titre dans la même balise/div sans colonne séparée */}
                                    <h5 className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-300 truncate transition-colors flex items-center gap-2 min-w-0">
                                      <span className="text-blue-400 font-mono font-bold shrink-0">
                                        {index + 1}.
                                      </span>
                                      <span className="truncate">
                                        {stripParentheses(song.title)}
                                      </span>
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
                                {canManageSongs && (
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



      {/* Modal: Setlist Date Picker */}
      {datePickerSetlist && (
        <SetlistDatePickerModal
          isOpen={!!datePickerSetlist}
          currentDate={datePickerSetlist.date}
          setlistTitle={datePickerSetlist.name}
          onSaveDate={async (newDate: string) => {
            await updateSetlist(datePickerSetlist.id, { date: newDate });
            if (selectedSetlist?.id === datePickerSetlist.id) {
              setSelectedSetlist({ ...selectedSetlist, date: newDate });
            }
            showNotification?.({
              title: datePickerSetlist.name,
              message: newDate 
                ? `Date mise à jour : ${formatFriendlyDate(newDate)}`
                : 'Date supprimée de la setlist',
              type: 'success'
            });
            setDatePickerSetlist(null);
          }}
          onClose={() => setDatePickerSetlist(null)}
        />
      )}

    </div>
  );
};
