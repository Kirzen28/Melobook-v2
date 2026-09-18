import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Song } from '../types';
import { 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Eye, 
  EyeOff,
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Layers, 
  ArrowRight,
  ListMusic,
  Check,
  X,
  FileText,
  SlidersHorizontal,
  Info
} from 'lucide-react';

// Normalisation du texte (minuscules, sans accents, sans ponctuations parasites)
const normalizeText = (text: string): string => {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprime les accents
    .replace(/[^a-z0-9]/g, ' ') // remplace la ponctuation par des espaces
    .replace(/\s+/g, ' ')
    .trim();
};

// Normalisation des paroles pour comparaison de contenu
const normalizeLyrics = (chordPro: string): string => {
  return (chordPro || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\[.*?\]/g, ' ') // supprime les accords entre crochets
    .replace(/\{.*?\}/g, ' ') // supprime les directives type {title:...}
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

// Score de complétude d'un chant pour recommander la meilleure version à conserver
const getSongCompletenessScore = (song: Song): number => {
  let score = 0;
  // Longueur du contenu
  score += Math.min((song.contentChordPro || '').length, 2000) / 10;
  // Présence d'artiste
  if (song.artist && song.artist.trim().length > 0) score += 25;
  // Présence de tonalité
  if (song.key && song.key.trim().length > 0) score += 20;
  // Présence de tempo
  if (song.tempo && song.tempo > 0) score += 15;
  // Présence de tags ou notes
  if (song.tags && song.tags.length > 0) score += song.tags.length * 5;
  if (song.notes && song.notes.trim().length > 0) score += 10;
  // Date de mise à jour récente (si présente)
  if (song.updatedAt) {
    try {
      const time = typeof song.updatedAt === 'string' ? new Date(song.updatedAt).getTime() : 
                   song.updatedAt?.toMillis ? song.updatedAt.toMillis() : 0;
      if (time > 0) score += (time / 100000000000);
    } catch {}
  }
  return score;
};

type DetectionCriteria = 'title_only' | 'title_and_artist' | 'similar_content';

interface DuplicateGroup {
  id: string;
  matchKey: string;
  songs: Song[];
  recommendedKeepId: string;
}

export const DuplicateCleanerSection: React.FC = () => {
  const { songs, setlists, updateSetlist, deleteSong } = useApp();

  const [criteria, setCriteria] = useState<DetectionCriteria>('title_only');
  const [selectedToKeep, setSelectedToKeep] = useState<Record<string, string>>({}); // groupId -> songId to KEEP
  const [selectedToDelete, setSelectedToDelete] = useState<Record<string, boolean>>({}); // songId -> boolean (to delete)
  const [previewSongId, setPreviewSongId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [migrateSetlists, setMigrateSetlists] = useState<boolean>(true);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteProgress, setDeleteProgress] = useState<{ current: number; total: number } | null>(null);
  const [lastCleanResult, setLastCleanResult] = useState<string | null>(null);

  // Détection des groupes de doublons selon le critère choisi
  const duplicateGroups = useMemo<DuplicateGroup[]>(() => {
    if (!songs || songs.length === 0) return [];

    const map = new Map<string, Song[]>();

    songs.forEach(song => {
      const normTitle = normalizeText(song.title);
      const normArtist = normalizeText(song.artist);

      if (!normTitle) return;

      let key = '';
      if (criteria === 'title_only') {
        key = normTitle;
      } else if (criteria === 'title_and_artist') {
        key = `${normTitle}___${normArtist || 'unknown'}`;
      } else if (criteria === 'similar_content') {
        const normContent = normalizeLyrics(song.contentChordPro).slice(0, 120);
        key = `${normTitle}___${normContent}`;
      }

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(song);
    });

    // Garder uniquement les groupes avec au moins 2 chants
    const groups: DuplicateGroup[] = [];
    let groupIdx = 1;

    map.forEach((groupedSongs, key) => {
      if (groupedSongs.length >= 2) {
        // Déterminer la version recommandée à conserver (score de complétude le plus élevé)
        const sorted = [...groupedSongs].sort((a, b) => getSongCompletenessScore(b) - getSongCompletenessScore(a));
        const recommendedKeepId = sorted[0].id;

        groups.push({
          id: `group_${groupIdx++}`,
          matchKey: key,
          songs: groupedSongs,
          recommendedKeepId
        });
      }
    });

    return groups;
  }, [songs, criteria]);

  // Synchroniser l'état de sélection quand les groupes changent
  React.useEffect(() => {
    const newKeepMap: Record<string, string> = {};
    const newDeleteMap: Record<string, boolean> = {};
    const newExpanded: Record<string, boolean> = {};

    duplicateGroups.forEach(group => {
      // Déterminer quel chant est gardé (soit celui déjà choisi par l'utilisateur s'il existe encore, soit le recommandé)
      const currentKeep = selectedToKeep[group.id];
      const validKeep = group.songs.some(s => s.id === currentKeep) ? currentKeep : group.recommendedKeepId;
      newKeepMap[group.id] = validKeep;

      // Par défaut, tous les autres chants du groupe sont marqués pour suppression
      group.songs.forEach(song => {
        if (song.id !== validKeep) {
          newDeleteMap[song.id] = true;
        } else {
          newDeleteMap[song.id] = false;
        }
      });

      newExpanded[group.id] = true; // Déplié par défaut pour faciliter la vue
    });

    setSelectedToKeep(newKeepMap);
    setSelectedToDelete(newDeleteMap);
    setExpandedGroups(newExpanded);
  }, [duplicateGroups]);

  // Gestion du choix de conservation d'un chant dans un groupe
  const handleSelectSongToKeep = (groupId: string, songId: string) => {
    const group = duplicateGroups.find(g => g.id === groupId);
    if (!group) return;

    setSelectedToKeep(prev => ({ ...prev, [groupId]: songId }));

    setSelectedToDelete(prev => {
      const updated = { ...prev };
      group.songs.forEach(s => {
        if (s.id === songId) {
          updated[s.id] = false; // Ne pas supprimer celui qu'on garde
        } else {
          updated[s.id] = true; // Marquer les autres pour suppression
        }
      });
      return updated;
    });
  };

  // Toggle suppression d'un chant spécifique
  const handleToggleSongDelete = (songId: string, groupId: string) => {
    const keepId = selectedToKeep[groupId];
    if (songId === keepId) return; // On ne peut pas cocher pour suppression le chant conservé

    setSelectedToDelete(prev => ({
      ...prev,
      [songId]: !prev[songId]
    }));
  };

  // Calcul du nombre total de chants cochés pour suppression
  const totalToDeleteCount = useMemo(() => {
    return Object.values(selectedToDelete).filter(Boolean).length;
  }, [selectedToDelete]);

  // Toggle tout sélectionner / tout désélectionner
  const handleToggleSelectAll = (select: boolean) => {
    setSelectedToDelete(prev => {
      const updated = { ...prev };
      duplicateGroups.forEach(group => {
        const keepId = selectedToKeep[group.id] || group.recommendedKeepId;
        group.songs.forEach(s => {
          if (s.id !== keepId) {
            updated[s.id] = select;
          }
        });
      });
      return updated;
    });
  };

  // Trouver dans quelles setlists se trouve un chant
  const getSongSetlists = (songId: string) => {
    return setlists.filter(st => st.songIds.includes(songId));
  };

  // Exécution de la suppression
  const handleExecuteDelete = async () => {
    const idsToDelete = Object.keys(selectedToDelete).filter(id => selectedToDelete[id]);
    if (idsToDelete.length === 0) return;

    setIsDeleting(true);
    setDeleteProgress({ current: 0, total: idsToDelete.length });

    try {
      // 1. Si migration des setlists activée, remplacer les références dans les setlists
      if (migrateSetlists) {
        // Construire la map: songIdToDelete -> songIdToKeep
        const replacementMap: Record<string, string> = {};
        duplicateGroups.forEach(group => {
          const keepId = selectedToKeep[group.id] || group.recommendedKeepId;
          group.songs.forEach(song => {
            if (idsToDelete.includes(song.id) && song.id !== keepId) {
              replacementMap[song.id] = keepId;
            }
          });
        });

        for (const setlist of setlists) {
          let hasChanges = false;
          const updatedSongIds = setlist.songIds.map(sId => {
            if (replacementMap[sId]) {
              hasChanges = true;
              return replacementMap[sId];
            }
            return sId;
          });

          if (hasChanges) {
            // Éliminer les doublons successifs dans la même setlist
            const cleanedSongIds = updatedSongIds.filter((id, index) => updatedSongIds.indexOf(id) === index);
            await updateSetlist(setlist.id, { songIds: cleanedSongIds });
          }
        }
      }

      // 2. Supprimer les chants un par un
      let count = 0;
      for (const id of idsToDelete) {
        await deleteSong(id);
        count++;
        setDeleteProgress({ current: count, total: idsToDelete.length });
        // Petit délai pour laisser respirer l'UI et la synchronisation
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      setLastCleanResult(`${idsToDelete.length} doublon(s) supprimé(s) avec succès de la bibliothèque.`);
      setTimeout(() => setLastCleanResult(null), 5000);
    } catch (err) {
      console.error('Erreur lors de la suppression des doublons:', err);
      setLastCleanResult('Une erreur est survenue lors de la suppression.');
    } finally {
      setIsDeleting(false);
      setDeleteProgress(null);
      setIsConfirmModalOpen(false);
    }
  };

  return (
    <div className="bg-[#111112] border border-[#222224] rounded-xl p-4 sm:p-5 shadow-sm">
      {/* En-tête de section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-[#222224] gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <Copy className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Nettoyage des Doublons
              {duplicateGroups.length > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {duplicateGroups.length} groupe(s) trouvé(s)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Bibliothèque propre
                </span>
              )}
            </h2>
            <p className="text-[11px] text-gray-400">
              Détectez, comparez et supprimez les chants en double dans votre répertoire
            </p>
          </div>
        </div>

        {/* Critère de détection */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="text-[11px] text-gray-400 font-medium hidden md:inline">Critère :</span>
          <div className="flex items-center bg-[#18181A] border border-[#2B2B30] rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setCriteria('title_only')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                criteria === 'title_only'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Compare les titres uniquement (insensible à la casse et accents)"
            >
              Même titre
            </button>
            <button
              type="button"
              onClick={() => setCriteria('title_and_artist')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                criteria === 'title_and_artist'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Compare le titre ET l'artiste"
            >
              Titre & Artiste
            </button>
            <button
              type="button"
              onClick={() => setCriteria('similar_content')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                criteria === 'similar_content'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Compare le début des paroles pour détecter les copies identiques"
            >
              Paroles
            </button>
          </div>
        </div>
      </div>

      {/* Notification de résultat */}
      {lastCleanResult && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{lastCleanResult}</span>
        </div>
      )}

      {/* État 1 : AUCUN DOUBLON */}
      {duplicateGroups.length === 0 ? (
        <div className="p-6 rounded-xl bg-[#151518] border border-[#252528] text-center flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2.5">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">
            Aucun doublon détecté
          </h3>
          <p className="text-xs text-gray-400 max-w-md">
            L'analyse des {songs.length} chants de votre bibliothèque n'a révélé aucun titre en double avec le filtre actif.
          </p>
        </div>
      ) : (
        /* État 2 : DOUBLONS TROUVÉS */
        <div className="space-y-4">
          
          {/* Barre d'action supérieure */}
          <div className="p-3 rounded-lg bg-[#18181A] border border-[#28282D] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-300 font-medium">
                <strong className="text-rose-400 font-bold">{totalToDeleteCount}</strong> doublon(s) sélectionné(s) pour suppression
              </span>
              <span className="text-gray-500">•</span>
              <button
                type="button"
                onClick={() => handleToggleSelectAll(true)}
                className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
              >
                Tout cocher
              </button>
              <span className="text-gray-600">|</span>
              <button
                type="button"
                onClick={() => handleToggleSelectAll(false)}
                className="text-[11px] text-gray-400 hover:text-gray-200 hover:underline cursor-pointer"
              >
                Tout décocher
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Option préservation des listes */}
              <label className="flex items-center gap-1.5 text-[11px] text-gray-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={migrateSetlists}
                  onChange={(e) => setMigrateSetlists(e.target.checked)}
                  className="rounded border-[#444] bg-[#222] text-blue-600 focus:ring-0 w-3.5 h-3.5"
                />
                <span>Préserver les listes (remplacer par la version gardée)</span>
              </label>

              {/* Bouton de suppression primaire */}
              <button
                type="button"
                disabled={totalToDeleteCount === 0 || isDeleting}
                onClick={() => setIsConfirmModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer ({totalToDeleteCount})</span>
              </button>
            </div>
          </div>

          {/* Liste des groupes de doublons */}
          <div className="space-y-3">
            {duplicateGroups.map(group => {
              const keepSongId = selectedToKeep[group.id] || group.recommendedKeepId;
              const isExpanded = expandedGroups[group.id] !== false;

              return (
                <div
                  key={group.id}
                  className="rounded-xl bg-[#141416] border border-[#252528] overflow-hidden"
                >
                  {/* Barre de titre du groupe */}
                  <div
                    onClick={() => setExpandedGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                    className="px-3.5 py-2.5 bg-[#18181C] border-b border-[#222226] flex items-center justify-between cursor-pointer hover:bg-[#1C1C20] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-5 h-5 rounded bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {group.songs.length}
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-white text-xs">
                          {group.songs[0].title}
                        </span>
                        {group.songs[0].artist && (
                          <span className="text-[11px] text-gray-400 ml-2">
                            • {group.songs[0].artist}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-gray-400 hidden sm:inline">
                        1 conservé • {group.songs.length - 1} doublon(s)
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Versions du groupe */}
                  {isExpanded && (
                    <div className="p-3 space-y-2">
                      {group.songs.map((song) => {
                        const isKept = song.id === keepSongId;
                        const isMarkedForDelete = !isKept && Boolean(selectedToDelete[song.id]);
                        const isRecommended = song.id === group.recommendedKeepId;
                        const inSetlists = getSongSetlists(song.id);
                        const isPreviewOpen = previewSongId === song.id;

                        return (
                          <div
                            key={song.id}
                            className={`p-2.5 rounded-lg border transition-all ${
                              isKept
                                ? 'bg-emerald-950/20 border-emerald-500/40'
                                : isMarkedForDelete
                                ? 'bg-rose-950/15 border-rose-500/30'
                                : 'bg-[#18181A] border-[#2A2A2E]'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              {/* Colonne gauche : infos du chant */}
                              <div className="flex items-start gap-2.5 min-w-0">
                                {/* Choix de conservation (Radio) */}
                                <button
                                  type="button"
                                  onClick={() => handleSelectSongToKeep(group.id, song.id)}
                                  className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                    isKept
                                      ? 'bg-emerald-500 border-emerald-400 text-black shadow-xs'
                                      : 'border-gray-500 hover:border-gray-300'
                                  }`}
                                  title={isKept ? "Version conservée" : "Cliquer pour conserver cette version"}
                                >
                                  {isKept && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                                </button>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-white text-xs truncate">
                                      {song.title}
                                    </span>
                                    {isKept && (
                                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold">
                                        À CONSERVER
                                      </span>
                                    )}
                                    {isRecommended && (
                                      <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] font-medium" title="Version la plus complète">
                                        Plus complet
                                      </span>
                                    )}
                                  </div>

                                  {/* Métadonnées */}
                                  <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400 flex-wrap">
                                    {song.artist && <span>Artiste : <strong className="text-gray-300">{song.artist}</strong></span>}
                                    {song.key && <span>Tonalité : <strong className="text-amber-400 font-mono">{song.key}</strong></span>}
                                    {song.tempo ? <span>Tempo : <strong className="text-gray-300">{song.tempo} bpm</strong></span> : null}
                                    <span>Lignes : <strong className="text-gray-300">{(song.contentChordPro || '').split('\n').length}</strong></span>
                                    {inSetlists.length > 0 && (
                                      <span className="text-cyan-400 flex items-center gap-0.5">
                                        <ListMusic className="w-2.5 h-2.5" />
                                        Dans {inSetlists.length} liste(s)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Colonne droite : Actions */}
                              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                {/* Bouton Aperçu paroles */}
                                <button
                                  type="button"
                                  onClick={() => setPreviewSongId(isPreviewOpen ? null : song.id)}
                                  className="p-1 rounded bg-[#222226] hover:bg-[#2C2C30] text-gray-300 hover:text-white border border-[#333] text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Aperçu du contenu"
                                >
                                  {isPreviewOpen ? <EyeOff className="w-3 h-3 text-blue-400" /> : <Eye className="w-3 h-3 text-gray-400" />}
                                  <span className="hidden sm:inline">Aperçu</span>
                                </button>

                                {/* Checkbox pour marquer pour suppression si ce n'est pas le chant conservé */}
                                {!isKept && (
                                  <label 
                                    onClick={() => handleToggleSongDelete(song.id, group.id)}
                                    className={`px-2 py-1 rounded text-[11px] font-semibold border flex items-center gap-1.5 cursor-pointer transition-colors ${
                                      isMarkedForDelete
                                        ? 'bg-rose-600/20 text-rose-300 border-rose-500/40 hover:bg-rose-600/30'
                                        : 'bg-[#222] text-gray-400 border-[#333] hover:text-white'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isMarkedForDelete}
                                      onChange={() => {}} // géré par le parent
                                      className="hidden"
                                    />
                                    <Trash2 className="w-3 h-3" />
                                    <span>{isMarkedForDelete ? 'Supprimer' : 'Ignorer'}</span>
                                  </label>
                                )}
                              </div>
                            </div>

                            {/* Tiroir d'aperçu paroles / accords */}
                            {isPreviewOpen && (
                              <div className="mt-2.5 pt-2 border-t border-[#26262B] text-xs font-mono text-gray-300 bg-[#0E0E10] p-2.5 rounded-md max-h-48 overflow-y-auto leading-relaxed whitespace-pre-wrap select-text">
                                {song.contentChordPro || 'Aucun contenu'}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* MODAL DE CONFIRMATION DE SUPPRESSION */}
      {isConfirmModalOpen && (
        <div 
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#18181B] border border-[#2E2E33] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Confirmer la suppression des doublons
                </h3>
                <p className="text-[11px] text-gray-400">
                  Cette action retirera définitivement les versions sélectionnées.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#111112] border border-[#252528] text-xs space-y-2">
              <div className="flex items-center justify-between text-gray-300">
                <span>Chants à supprimer :</span>
                <strong className="text-rose-400 font-bold">{totalToDeleteCount} chant(s)</strong>
              </div>
              <div className="flex items-center justify-between text-gray-300">
                <span>Groupes nettoyés :</span>
                <strong className="text-white font-bold">{duplicateGroups.length} groupe(s)</strong>
              </div>
              {migrateSetlists && (
                <div className="pt-2 border-t border-[#202024] text-[11px] text-cyan-300 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Les listes contenant des doublons seront automatiquement mises à jour avec la version conservée.</span>
                </div>
              )}
            </div>

            {isDeleting && deleteProgress && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                  <span>Suppression en cours...</span>
                  <span>{deleteProgress.current} / {deleteProgress.total}</span>
                </div>
                <div className="w-full h-1.5 bg-[#252528] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 transition-all duration-150"
                    style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-[#222] hover:bg-[#28282D] text-gray-300 hover:text-white border border-[#333] text-xs font-semibold transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleExecuteDelete}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Suppression...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmer la suppression</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
