import React, { useMemo } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ListMusic,
  Pencil,
  Play,
  Plus,
  X
} from 'lucide-react';
import { Setlist, Song } from '../types';
import { useApp } from '../context/AppContext';
import {
  getSongDuration,
  stripParentheses,
  transposeChord
} from '../utils/chordUtils';

interface SetlistSongsPanelProps {
  setlist: Setlist;
  onLaunchLive: (setlist: Setlist, startIndex?: number) => void;
  onOpenAddSongs?: (setlist: Setlist) => void;
  onEditNotes?: (setlist: Setlist) => void;
}

export const SetlistSongsPanel: React.FC<SetlistSongsPanelProps> = ({
  setlist,
  onLaunchLive,
  onOpenAddSongs,
  onEditNotes
}) => {
  const {
    songs,
    updateSetlist,
    canManageSetlists,
    canAccessStage,
    stageSettings,
    setSelectedSetlist,
    setSelectedSong,
    setActiveSetlistIndex,
    setActiveTab
  } = useApp();

  const songsById = useMemo(() => new Map(songs.map(s => [s.id, s])), [songs]);

  const resolvedSongs = useMemo(
    () =>
      setlist.songIds
        .map(id => songsById.get(id))
        .filter((s): s is Song => Boolean(s)),
    [setlist.songIds, songsById]
  );

  const handleMoveSong = async (idx: number, delta: -1 | 1) => {
    const validIds = resolvedSongs.map(s => s.id);
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= validIds.length) return;
    const nextIds = [...validIds];
    const [moved] = nextIds.splice(idx, 1);
    nextIds.splice(targetIdx, 0, moved);
    await updateSetlist(setlist.id, { songIds: nextIds });
  };

  const handleRemoveSong = async (songId: string) => {
    const nextIds = resolvedSongs.filter(s => s.id !== songId).map(s => s.id);
    await updateSetlist(setlist.id, { songIds: nextIds });
  };

  const handleOpenSongInStage = (song: Song, idx: number) => {
    setSelectedSetlist(setlist);
    setActiveSetlistIndex(idx);
    setSelectedSong(song);
    setActiveTab('stage');
  };

  return (
    <div className="space-y-3">
      {/* Setlist Notes */}
      {(setlist.notes || onEditNotes) && (
        <div className="bg-[#F8FAFC] dark:bg-[#151518] border border-slate-200 dark:border-[#222226] rounded-xl px-3.5 py-2.5 flex items-start justify-between gap-2">
          <div className="text-xs text-slate-700 dark:text-gray-300 whitespace-pre-wrap min-w-0">
            {setlist.notes ? (
              setlist.notes
            ) : (
              <span className="text-slate-400 dark:text-gray-500">Aucune note pour cette setlist</span>
            )}
          </div>
          {onEditNotes && (
            <button
              type="button"
              onClick={() => onEditNotes(setlist)}
              className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-[#24242A] cursor-pointer shrink-0"
              title="Modifier les notes"
              aria-label="Modifier les notes"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Primary Live Action */}
      {resolvedSongs.length > 0 && canAccessStage && (
        <button
          type="button"
          onClick={() => onLaunchLive(setlist, 0)}
          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Lancer le mode Live ({resolvedSongs.length})</span>
        </button>
      )}

      {/* Songs List or Empty State */}
      {resolvedSongs.length === 0 ? (
        <div className="bg-[#F4F6F9] dark:bg-[#16161A] border border-slate-200 dark:border-[#242429] rounded-xl p-6 text-center space-y-3">
          <ListMusic className="w-7 h-7 text-slate-400 mx-auto" />
          <p className="text-xs text-slate-600 dark:text-gray-400">
            Aucun chant dans cette setlist.
          </p>
          {onOpenAddSongs && (
            <button
              type="button"
              onClick={() => onOpenAddSongs(setlist)}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter des chants</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#151518] border border-slate-200 dark:border-[#222226] rounded-xl divide-y divide-slate-200 dark:divide-[#202026]">
          {resolvedSongs.map((song, idx) => {
            const override = setlist.songOverrides?.[song.id];
            const rawKey = override?.key || song.key;
            const offset = override?.key ? 0 : (override?.transposeOffset ?? 0);
            const effectiveKey = rawKey
              ? transposeChord(rawKey, offset, stageSettings.notation)
              : '';
            const effectiveTempo = override?.tempo ?? song.bpm ?? song.tempo;
            const effectiveDuration = override?.duration || getSongDuration(song);
            const cleanTitle = stripParentheses(song.title) || song.title;

            return (
              <div
                key={`${song.id}-${idx}`}
                className="px-3.5 py-2.5 flex items-center justify-between gap-2.5 hover:bg-slate-50 dark:hover:bg-[#19191E] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="text-xs font-mono tabular-nums text-slate-400 dark:text-gray-500 w-5 text-right shrink-0">
                    {idx + 1}.
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      canAccessStage
                        ? onLaunchLive(setlist, idx)
                        : handleOpenSongInStage(song, idx)
                    }
                    className="min-w-0 flex-1 text-left cursor-pointer group"
                    title="Ouvrir ce chant"
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                      {cleanTitle}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-gray-400 flex items-center gap-1.5 flex-wrap tabular-nums">
                      {song.artist && <span className="truncate">{song.artist}</span>}
                      {song.artist && (effectiveKey || effectiveTempo || effectiveDuration) && (
                        <span aria-hidden="true">·</span>
                      )}
                      {effectiveKey && (
                        <span className="font-mono font-semibold text-slate-700 dark:text-gray-300">
                          {effectiveKey}
                        </span>
                      )}
                      {effectiveKey && (effectiveTempo || effectiveDuration) && (
                        <span aria-hidden="true">·</span>
                      )}
                      {effectiveTempo ? <span>{effectiveTempo} BPM</span> : null}
                      {effectiveTempo && effectiveDuration && <span aria-hidden="true">·</span>}
                      {effectiveDuration && <span>{effectiveDuration}</span>}
                    </div>
                  </button>
                </div>

                {canManageSetlists && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveSong(idx, -1)}
                      className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-25 cursor-pointer disabled:cursor-default"
                      title="Monter"
                      aria-label="Monter le chant"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === resolvedSongs.length - 1}
                      onClick={() => handleMoveSong(idx, 1)}
                      className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-25 cursor-pointer disabled:cursor-default"
                      title="Descendre"
                      aria-label="Descendre le chant"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSong(song.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                      title="Retirer de la setlist"
                      aria-label="Retirer de la setlist"
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
  );
};
