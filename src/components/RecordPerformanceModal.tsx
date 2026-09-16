import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Setlist, Song, SetlistHistoryRecord, SetlistEventType } from '../types';
import { stripParentheses } from '../utils/chordUtils';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  FileText, 
  Check, 
  ListMusic, 
  Music2, 
  Sparkles,
  Users
} from 'lucide-react';

interface RecordPerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSetlist?: Setlist | null;
  defaultDurationMinutes?: number;
  initialRecord?: SetlistHistoryRecord | null;
  onSaved?: (recordId: string) => void;
}

const EVENT_TYPE_OPTIONS: { type: SetlistEventType; label: string; desc: string; color: string }[] = [
  { 
    type: 'rehearsal', 
    label: 'Répétition', 
    desc: 'Session de travail en groupe ou répétition générale',
    color: 'border-amber-500/40 text-amber-300 bg-amber-500/10'
  },
  { 
    type: 'concert', 
    label: 'Concert', 
    desc: 'Prestation publique sur scène ou festival',
    color: 'border-purple-500/40 text-purple-300 bg-purple-500/10'
  },
  { 
    type: 'service', 
    label: 'Culte ou Service', 
    desc: 'Animation musicale de culte ou cérémonie',
    color: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10'
  },
  { 
    type: 'other', 
    label: 'Autre événement', 
    desc: 'Animation privée, enregistrement ou atelier',
    color: 'border-gray-500/40 text-gray-300 bg-gray-500/10'
  }
];

export const RecordPerformanceModal: React.FC<RecordPerformanceModalProps> = ({
  isOpen,
  onClose,
  defaultSetlist,
  defaultDurationMinutes,
  initialRecord,
  onSaved
}) => {
  const { setlists, songs, recordSetlistHistory, updateSetlistHistory, currentUser } = useApp();

  const [selectedSetlistId, setSelectedSetlistId] = useState<string>(
    initialRecord?.setlistId || defaultSetlist?.id || (setlists[0]?.id || '')
  );
  const [customSetlistName, setCustomSetlistName] = useState<string>(
    initialRecord?.setlistName || defaultSetlist?.name || ''
  );
  const [eventType, setEventType] = useState<SetlistEventType>(
    initialRecord?.eventType || 'rehearsal'
  );
  const [date, setDate] = useState<string>(
    initialRecord?.date || new Date().toISOString().split('T')[0]
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(
    initialRecord?.durationMinutes || defaultDurationMinutes || 45
  );
  const [location, setLocation] = useState<string>(
    initialRecord?.location || ''
  );
  const [notes, setNotes] = useState<string>(
    initialRecord?.notes || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialRecord) {
      setSelectedSetlistId(initialRecord.setlistId);
      setCustomSetlistName(initialRecord.setlistName);
      setEventType(initialRecord.eventType);
      setDate(initialRecord.date);
      setDurationMinutes(initialRecord.durationMinutes || 45);
      setLocation(initialRecord.location || '');
      setNotes(initialRecord.notes || '');
    } else if (defaultSetlist) {
      setSelectedSetlistId(defaultSetlist.id);
      setCustomSetlistName(defaultSetlist.name);
      if (defaultDurationMinutes) {
        setDurationMinutes(defaultDurationMinutes);
      }
    }
  }, [initialRecord, defaultSetlist, defaultDurationMinutes]);

  if (!isOpen) return null;

  const currentSetlist = setlists.find(st => st.id === selectedSetlistId);
  const targetSongs = currentSetlist 
    ? currentSetlist.songIds.map(id => songs.find(s => s.id === id)).filter((s): s is Song => Boolean(s))
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const setlistName = currentSetlist ? currentSetlist.name : (customSetlistName.trim() || 'Setlist sans titre');
    const songIds = currentSetlist ? currentSetlist.songIds : (initialRecord?.songIds || []);

    const songsSnapshot = currentSetlist
      ? targetSongs.map(s => ({
          id: s.id,
          title: stripParentheses(s.title),
          artist: s.artist ? stripParentheses(s.artist) : undefined,
          key: s.key,
          tempo: s.tempo
        }))
      : (initialRecord?.songsSnapshot || []);

    setIsSubmitting(true);
    try {
      if (initialRecord) {
        await updateSetlistHistory(initialRecord.id, {
          setlistId: selectedSetlistId,
          setlistName: stripParentheses(setlistName),
          eventType,
          date,
          durationMinutes: Number(durationMinutes) || 0,
          location: stripParentheses(location.trim()),
          notes: stripParentheses(notes.trim())
        });
        if (onSaved) onSaved(initialRecord.id);
      } else {
        const newId = await recordSetlistHistory({
          setlistId: selectedSetlistId || 'custom',
          setlistName: stripParentheses(setlistName),
          eventType,
          date,
          durationMinutes: Number(durationMinutes) || 0,
          location: stripParentheses(location.trim()),
          notes: stripParentheses(notes.trim()),
          songIds,
          songsSnapshot,
          playedByUid: currentUser?.uid,
          playedByName: currentUser?.displayName ? stripParentheses(currentUser.displayName) : undefined
        });
        if (onSaved) onSaved(newId);
      }
      onClose();
    } catch (err) {
      console.error('Error saving setlist history:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#141416] border border-[#2A2A2E] rounded-2xl shadow-2xl p-5 sm:p-7 text-[#E0E0E0] my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#252528] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {initialRecord ? 'Modifier la prestation' : 'Enregistrer dans l’historique'}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Consignez cette répétition ou ce concert dans votre journal de bord
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#222226] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Setlist selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Setlist jouée
            </label>
            {setlists.length > 0 ? (
              <select
                value={selectedSetlistId}
                onChange={(e) => {
                  setSelectedSetlistId(e.target.value);
                  const found = setlists.find(s => s.id === e.target.value);
                  if (found) setCustomSetlistName(found.name);
                }}
                className="w-full px-3.5 py-2.5 bg-[#1C1C1F] border border-[#333338] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                {setlists.map((st) => (
                  <option key={st.id} value={st.id} className="bg-[#1C1C1F] text-white">
                    {st.name} — {st.songIds.length} chants
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={customSetlistName}
                onChange={(e) => setCustomSetlistName(e.target.value)}
                placeholder="Nom de la setlist"
                required
                className="w-full px-3.5 py-2.5 bg-[#1C1C1F] border border-[#333338] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
            )}
          </div>

          {/* Event type picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Type d'événement
            </label>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_TYPE_OPTIONS.map((opt) => {
                const isSelected = eventType === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setEventType(opt.type)}
                    className={`flex flex-col text-left p-3 rounded-xl border text-xs transition-all ${
                      isSelected
                        ? opt.color + ' ring-1 ring-purple-500/50 shadow-sm'
                        : 'border-[#28282D] bg-[#1A1A1D] text-gray-400 hover:border-[#38383E] hover:text-gray-200'
                    }`}
                  >
                    <span className="font-semibold text-sm mb-0.5">{opt.label}</span>
                    <span className="text-[11px] opacity-80 leading-snug">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Date de la prestation
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full pl-3.5 pr-3 py-2 bg-[#1C1C1F] border border-[#333338] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Durée en minutes
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="600"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 0))}
                  placeholder="Exemple 45"
                  className="w-full pl-3.5 pr-3 py-2 bg-[#1C1C1F] border border-[#333338] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Lieu ou Salle
            </label>
            <div className="relative">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Exemple Salle de répétition, Église, Scène Plein Air"
                className="w-full px-3.5 py-2.5 bg-[#1C1C1F] border border-[#333338] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          {/* Notes & Feedback */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Notes et bilan de la session
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Exemple Transitions fluides, attention au départ du 3e chant, super énergie..."
              className="w-full px-3.5 py-2.5 bg-[#1C1C1F] border border-[#333338] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
            />
          </div>

          {/* Song count summary preview */}
          {targetSongs.length > 0 && (
            <div className="p-3 rounded-xl bg-[#1A1A1D] border border-[#28282D] text-xs text-gray-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-gray-300">
                <Music2 className="w-3.5 h-3.5 text-purple-400" />
                <span>{targetSongs.length} chants archivés avec cette session</span>
              </span>
              <span className="text-[11px] text-gray-500">
                Instantané des tonalités sauvegardé
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#252528]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#222226] transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{initialRecord ? 'Enregistrer les modifications' : 'Ajouter à l’historique'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
