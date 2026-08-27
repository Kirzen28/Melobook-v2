import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Setlist, Song } from '../types';
import { LiveSetlistPlayer } from './LiveSetlistPlayer';
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
  ArrowRight
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

  // Reorder songs in setlist
  const handleMoveSong = async (setlist: Setlist, index: number, direction: 'up' | 'down') => {
    const newSongIds = [...setlist.songIds];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSongIds.length) return;

    const temp = newSongIds[index];
    newSongIds[index] = newSongIds[targetIndex];
    newSongIds[targetIndex] = temp;

    await updateSetlist(setlist.id, { songIds: newSongIds });
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
            <span>Listes de Morceaux (Setlists)</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#1C1C1E] text-blue-400 border border-[#333]">
              {setlists.length} listes
            </span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Préparez vos programmes de concerts, cultes et répétitions avec navigation instantanée
          </p>
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
                      <div className="flex items-center gap-2.5 text-xs text-gray-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-blue-400" />
                          {st.date}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-semibold text-blue-400">
                          <Music className="w-3 h-3" />
                          {st.songIds.length} chants
                        </span>
                      </div>
                    </div>

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
                    <p className="text-xs text-gray-400 flex items-center gap-3 mt-0.5">
                      <span>Date : <strong className="text-gray-200">{selectedSetlist.date}</strong></span>
                      <span>•</span>
                      <span>Durée estimée : <strong className="text-gray-200">{selectedSetlist.targetDuration || 25} min</strong></span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
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
                          if (window.confirm(`Supprimer la setlist "${selectedSetlist.name}" ?`)) {
                            deleteSetlist(selectedSetlist.id);
                          }
                        }}
                        className="p-1.5 rounded-md bg-[#1C1C1E] hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 border border-[#333] transition-colors"
                        title="Supprimer la setlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Ordre des Morceaux ({selectedSetlist.songIds.length})
                    </h3>

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
                    <div className="space-y-2">
                      {selectedSetlist.songIds.map((songId, index) => {
                        const song = songs.find(s => s.id === songId);
                        if (!song) return null;

                        return (
                          <div
                            key={`${song.id}-${index}`}
                            className="flex items-center justify-between gap-3 p-2.5 rounded-md bg-[#0A0A0B] border border-[#222224] hover:border-[#333] transition-colors group"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="w-5 h-5 rounded bg-[#1C1C1E] text-gray-400 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 border border-[#333]">
                                {index + 1}
                              </span>

                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-white truncate">
                                  {song.title}
                                </h4>
                                <p className="text-[11px] text-gray-400 truncate">
                                  {song.artist || 'Auteur'} • Tonalité: <strong className="text-blue-400">{song.key}</strong> • {song.tempo} BPM
                                </p>
                              </div>
                            </div>

                            {/* Actions: Play single song in live / Reorder / Delete */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleLaunchLive(selectedSetlist, index)}
                                className="p-1 rounded-md bg-[#1C1C1E] hover:bg-blue-600 text-blue-400 hover:text-white border border-[#333] transition-colors"
                                title="Lire à partir de ce chant"
                              >
                                <PlayCircle className="w-3.5 h-3.5" />
                              </button>

                              {currentUser?.role === 'admin' && (
                                <>
                                  <button
                                    onClick={() => handleMoveSong(selectedSetlist, index, 'up')}
                                    disabled={index === 0}
                                    className="p-1 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] disabled:opacity-20 text-gray-300 border border-[#333]"
                                    title="Monter"
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleMoveSong(selectedSetlist, index, 'down')}
                                    disabled={index === selectedSetlist.songIds.length - 1}
                                    className="p-1 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] disabled:opacity-20 text-gray-300 border border-[#333]"
                                    title="Descendre"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleRemoveSong(selectedSetlist, song.id)}
                                    className="p-1 rounded-md bg-[#1C1C1E] hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 border border-[#333]"
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
                        <p className="text-[10px] text-gray-400">
                          {song.artist} • <span className="text-blue-400">{song.key}</span> • {song.tempo} BPM
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

    </div>
  );
};
