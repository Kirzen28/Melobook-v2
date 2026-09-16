import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { SetlistHistoryRecord, SetlistEventType, Setlist } from '../types';
import { RecordPerformanceModal } from './RecordPerformanceModal';
import { stripParentheses } from '../utils/chordUtils';
import { 
  History, 
  Calendar, 
  Clock, 
  MapPin, 
  FileText, 
  Music, 
  PlayCircle, 
  Plus, 
  Search, 
  Trash2, 
  Pencil, 
  Copy, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Users,
  CheckCircle2,
  Filter,
  ArrowUpDown
} from 'lucide-react';

interface SetlistHistoryViewProps {
  onPlaySetlist?: (setlist: Setlist) => void;
}

const TYPE_CONFIG: Record<SetlistEventType, { label: string; badgeClass: string; dotClass: string }> = {
  rehearsal: {
    label: 'Répétition',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    dotClass: 'bg-amber-400'
  },
  concert: {
    label: 'Concert',
    badgeClass: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    dotClass: 'bg-purple-400'
  },
  service: {
    label: 'Culte ou Service',
    badgeClass: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    dotClass: 'bg-cyan-400'
  },
  other: {
    label: 'Autre prestation',
    badgeClass: 'bg-gray-500/10 text-gray-300 border-gray-500/30',
    dotClass: 'bg-gray-400'
  }
};

export const SetlistHistoryView: React.FC<SetlistHistoryViewProps> = ({ onPlaySetlist }) => {
  const { 
    setlistHistory, 
    setlists, 
    songs, 
    deleteSetlistHistory, 
    createSetlist,
    setSelectedSetlist,
    setActiveTab,
    currentUser 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expandedRecordIds, setExpandedRecordIds] = useState<Set<string>>(new Set());
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SetlistHistoryRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<SetlistHistoryRecord | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedRecordIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const showNotification = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = setlistHistory.length;
    const rehearsals = setlistHistory.filter(h => h.eventType === 'rehearsal').length;
    const concerts = setlistHistory.filter(h => h.eventType === 'concert').length;
    const totalSongsPlayed = setlistHistory.reduce((acc, h) => {
      return acc + (h.songsSnapshot?.length || h.songIds?.length || 0);
    }, 0);

    return { total, rehearsals, concerts, totalSongsPlayed };
  }, [setlistHistory]);

  // Filtered & sorted records
  const filteredRecords = useMemo(() => {
    return setlistHistory
      .filter(record => {
        if (selectedTypeFilter !== 'all' && record.eventType !== selectedTypeFilter) {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = record.setlistName.toLowerCase().includes(q);
          const matchesLocation = record.location?.toLowerCase().includes(q);
          const matchesNotes = record.notes?.toLowerCase().includes(q);
          const matchesSong = record.songsSnapshot?.some(s => 
            s.title.toLowerCase().includes(q) || s.artist?.toLowerCase().includes(q)
          );

          if (!matchesName && !matchesLocation && !matchesNotes && !matchesSong) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const comp = a.date.localeCompare(b.date);
        return sortOrder === 'desc' ? -comp : comp;
      });
  }, [setlistHistory, selectedTypeFilter, searchQuery, sortOrder]);

  // Duplicate historic session into an active setlist
  const handleDuplicateToActiveSetlist = async (record: SetlistHistoryRecord) => {
    const songIdsToUse = record.songsSnapshot 
      ? record.songsSnapshot.map(s => s.id)
      : record.songIds;

    const newName = `${stripParentheses(record.setlistName)} — Rejouée`;
    const newId = await createSetlist({
      name: newName,
      date: new Date().toISOString().split('T')[0],
      songIds: songIdsToUse,
      notes: record.notes ? `Issu de la prestation du ${record.date}. ${record.notes}` : `Issu de la prestation du ${record.date}`
    });

    showNotification(`Nouvelle setlist créée à partir de cette prestation`);
  };

  // Launch Live Mode for this historic setlist
  const handleLaunchLive = (record: SetlistHistoryRecord) => {
    // Check if the original setlist still exists
    const existing = setlists.find(st => st.id === record.setlistId);
    if (existing) {
      if (onPlaySetlist) {
        onPlaySetlist(existing);
      } else {
        setSelectedSetlist(existing);
      }
    } else {
      // Reconstruct temporary setlist for live mode
      const songIds = record.songsSnapshot ? record.songsSnapshot.map(s => s.id) : record.songIds;
      const virtualSetlist: Setlist = {
        id: record.setlistId,
        groupId: record.groupId,
        name: record.setlistName,
        date: record.date,
        songIds,
        notes: record.notes
      };
      if (onPlaySetlist) {
        onPlaySetlist(virtualSetlist);
      } else {
        setSelectedSetlist(virtualSetlist);
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    await deleteSetlistHistory(recordToDelete.id);
    setRecordToDelete(null);
    showNotification('Prestation retirée de l’historique');
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {feedbackMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1C1C1F] border border-purple-500/40 text-purple-300 px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-purple-400" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#141416] border border-[#242428] rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
            Prestations totales
          </span>
          <span className="text-xl sm:text-2xl font-bold text-white">
            {metrics.total}
          </span>
        </div>

        <div className="bg-[#141416] border border-[#242428] rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-amber-400/80 uppercase tracking-wider block mb-1">
            Répétitions
          </span>
          <span className="text-xl sm:text-2xl font-bold text-amber-300">
            {metrics.rehearsals}
          </span>
        </div>

        <div className="bg-[#141416] border border-[#242428] rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-purple-400/80 uppercase tracking-wider block mb-1">
            Concerts
          </span>
          <span className="text-xl sm:text-2xl font-bold text-purple-300">
            {metrics.concerts}
          </span>
        </div>

        <div className="bg-[#141416] border border-[#242428] rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-blue-400/80 uppercase tracking-wider block mb-1">
            Chants interprétés
          </span>
          <span className="text-xl sm:text-2xl font-bold text-blue-300">
            {metrics.totalSongsPlayed}
          </span>
        </div>
      </div>

      {/* Action and Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#111113] p-3 rounded-xl border border-[#222226]">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par titre, chant, salle ou mot-clé..."
            className="w-full pl-9 pr-3 py-2 bg-[#19191C] border border-[#2B2B30] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        {/* Filters and Add button */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          
          {/* Type selector */}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="px-3 py-2 bg-[#19191C] border border-[#2B2B30] rounded-lg text-xs font-medium text-gray-200 focus:outline-none focus:border-purple-500 transition-colors"
          >
            <option value="all">Tous les types</option>
            <option value="rehearsal">Répétitions</option>
            <option value="concert">Concerts</option>
            <option value="service">Cultes et Services</option>
            <option value="other">Autres</option>
          </select>

          {/* Sort order toggle */}
          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="px-3 py-2 bg-[#19191C] border border-[#2B2B30] hover:border-[#3A3A40] rounded-lg text-xs font-medium text-gray-300 flex items-center gap-1.5 transition-colors shrink-0"
            title="Inverser l'ordre chronologique"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
            <span className="hidden sm:inline">
              {sortOrder === 'desc' ? 'Plus récents' : 'Plus anciens'}
            </span>
          </button>

          {/* Add record button */}
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => {
                setEditingRecord(null);
                setIsRecordModalOpen(true);
              }}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all shrink-0 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Consigner une prestation</span>
            </button>
          )}

        </div>

      </div>

      {/* History Records List */}
      {filteredRecords.length === 0 ? (
        <div className="text-center py-16 bg-[#111113] rounded-xl border border-[#222226] p-6 max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-3">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-gray-200">Aucune prestation trouvée</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto mb-5">
            {searchQuery || selectedTypeFilter !== 'all'
              ? 'Aucun événement ne correspond à vos filtres actuels.'
              : 'Enregistrez les répétitions et concerts joués pour garder la mémoire de vos prestations.'}
          </p>
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => {
                setEditingRecord(null);
                setIsRecordModalOpen(true);
              }}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors shadow-sm inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Consigner une première prestation</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map((record) => {
            const isExpanded = expandedRecordIds.has(record.id);
            const typeConf = TYPE_CONFIG[record.eventType] || TYPE_CONFIG.other;
            const songsList = record.songsSnapshot || [];
            const songsCount = songsList.length || record.songIds.length;

            return (
              <div
                key={record.id}
                className="bg-[#121214] border border-[#242428] hover:border-[#323238] rounded-2xl transition-all overflow-hidden shadow-sm"
              >
                
                {/* Main Card Header */}
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    
                    {/* Event Type & Date */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${typeConf.badgeClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${typeConf.dotClass}`} />
                        <span>{typeConf.label}</span>
                      </span>

                      <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-500" />
                        <span>{record.date}</span>
                      </span>

                      {record.durationMinutes && record.durationMinutes > 0 && (
                        <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-500" />
                          <span>{record.durationMinutes} min</span>
                        </span>
                      )}

                      {record.location && (
                        <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-500" />
                          <span>{record.location}</span>
                        </span>
                      )}
                    </div>

                    {/* Actions Menu */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      
                      {/* Play in Live Mode */}
                      <button
                        onClick={() => handleLaunchLive(record)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm active:scale-95"
                        title="Ouvrir le mode Live pour rejouer cette setlist"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Mode Live</span>
                      </button>

                      {/* Duplicate to active setlist */}
                      {currentUser?.role === 'admin' && (
                        <button
                          onClick={() => handleDuplicateToActiveSetlist(record)}
                          className="p-1.5 rounded-lg bg-[#1C1C1F] hover:bg-[#28282D] text-gray-300 hover:text-white border border-[#303036] transition-colors"
                          title="Créer une nouvelle setlist active avec ces chants"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Edit */}
                      {currentUser?.role === 'admin' && (
                        <button
                          onClick={() => {
                            setEditingRecord(record);
                            setIsRecordModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-[#1C1C1F] hover:bg-[#28282D] text-gray-300 hover:text-white border border-[#303036] transition-colors"
                          title="Modifier les notes ou les détails"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete */}
                      {currentUser?.role === 'admin' && (
                        <button
                          onClick={() => setRecordToDelete(record)}
                          className="p-1.5 rounded-lg bg-[#1C1C1F] hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-[#303036] transition-colors"
                          title="Retirer de l'historique"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                    </div>

                  </div>

                  {/* Title & Stats */}
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {record.setlistName}
                    </h3>

                    <button
                      onClick={() => toggleExpand(record.id)}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                    >
                      <Music className="w-3.5 h-3.5" />
                      <span>{songsCount} chants interprétés</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Notes / Feedback callout */}
                  {record.notes && (
                    <div className="mt-3.5 p-3 rounded-xl bg-[#18181B] border-l-2 border-purple-500/80 border-t border-r border-b border-[#26262B] text-xs text-gray-300">
                      <p className="leading-relaxed italic">
                        "{record.notes}"
                      </p>
                      {record.playedByName && (
                        <p className="text-[11px] text-gray-500 mt-1.5 font-medium not-italic">
                          Consigné par {record.playedByName}
                        </p>
                      )}
                    </div>
                  )}

                </div>

                {/* Expanded Song List Breakdown */}
                {isExpanded && (
                  <div className="border-t border-[#222226] bg-[#0E0E10] p-4 sm:p-5">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <span>Ordre des chants joués ce jour-là</span>
                    </h4>

                    {songsList.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {songsList.map((sn, idx) => (
                          <div
                            key={sn.id + '-' + idx}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-[#141416] border border-[#242428] text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-5 h-5 rounded-md bg-[#222226] text-gray-400 text-[11px] font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-200 truncate">
                                  {sn.title}
                                </p>
                                {sn.artist && (
                                  <p className="text-[11px] text-gray-500 truncate">
                                    {sn.artist}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 pl-2">
                              {sn.key && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold font-mono">
                                  {sn.key}
                                </span>
                              )}
                              {sn.tempo && (
                                <span className="px-1.5 py-0.5 rounded bg-[#1C1C1F] text-gray-400 border border-[#333] text-[10px] font-mono">
                                  {sn.tempo} BPM
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">
                        {record.songIds.length} chants enregistrés dans la sélection.
                      </p>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Record / Edit Modal */}
      {isRecordModalOpen && (
        <RecordPerformanceModal
          isOpen={isRecordModalOpen}
          onClose={() => {
            setIsRecordModalOpen(false);
            setEditingRecord(null);
          }}
          initialRecord={editingRecord}
          onSaved={() => {
            showNotification(editingRecord ? 'Prestation mise à jour' : 'Nouvelle prestation ajoutée');
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141416] border border-[#28282D] rounded-2xl p-5 max-w-sm w-full text-[#E0E0E0] shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-2">
              Supprimer cette prestation de l'historique ?
            </h3>
            <p className="text-xs text-gray-400 mb-5 leading-relaxed">
              La trace de la prestation du {recordToDelete.date} pour {recordToDelete.setlistName} sera effacée. Cette opération est irréversible.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setRecordToDelete(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#222226] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
