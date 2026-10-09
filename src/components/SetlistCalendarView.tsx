import React, { useState, useMemo } from 'react';
import { Setlist, Song } from '../types';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Play, 
  Clock, 
  Music, 
  FileDown, 
  Pencil, 
  Trash2, 
  Check, 
  X
} from 'lucide-react';
import { 
  parseDurationToSeconds, 
  formatSetlistDuration, 
  stripParentheses 
} from '../utils/chordUtils';

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const DAY_NAMES_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

interface SetlistCalendarViewProps {
  setlists: Setlist[];
  songs: Song[];
  canManageSetlists: boolean;
  onLaunchLive: (setlist: Setlist, startIndex?: number) => void;
  onOpenAddSongs: (setlist: Setlist) => void;
  onOpenPdf: (setlist: Setlist) => void;
  onOpenEdit: (setlist: Setlist) => void;
  onChangeDate: (setlist: Setlist) => void;
  onDeleteSetlist: (setlistId: string) => void;
  onCreateForDate: (dateStr: string) => void;
  formatFriendlyDate: (dateStr?: string) => string;
  getSetlistTotalDurationSeconds: (setlist: Setlist) => number;
}

export const SetlistCalendarView: React.FC<SetlistCalendarViewProps> = ({
  setlists,
  songs,
  canManageSetlists,
  onLaunchLive,
  onOpenAddSongs,
  onOpenPdf,
  onOpenEdit,
  onChangeDate,
  onDeleteSetlist,
  onCreateForDate,
  formatFriendlyDate,
  getSetlistTotalDurationSeconds
}) => {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [today]);

  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleGoToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(todayStr);
  };

  // Helper to format year, month (0-indexed), day to YYYY-MM-DD
  const formatIsoDate = (y: number, m: number, d: number) => {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  // Build calendar matrix (Monday first)
  const calendarCells = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday = 6

    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

    const cells: Array<{
      dayNumber: number;
      month: number;
      year: number;
      isCurrentMonth: boolean;
      dateStr: string;
      isWeekend: boolean;
    }> = [];

    // Previous month padding days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const m = currentMonth === 0 ? 11 : currentMonth - 1;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = formatIsoDate(y, m, d);
      const dow = new Date(y, m, d).getDay();
      cells.push({
        dayNumber: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        dateStr,
        isWeekend: dow === 0 || dow === 6
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = formatIsoDate(currentYear, currentMonth, d);
      const dow = new Date(currentYear, currentMonth, d).getDay();
      cells.push({
        dayNumber: d,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true,
        dateStr,
        isWeekend: dow === 0 || dow === 6
      });
    }

    // Next month padding days to complete grid (multiples of 7)
    const remainder = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remainder; d++) {
      const m = currentMonth === 11 ? 0 : currentMonth + 1;
      const y = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = formatIsoDate(y, m, d);
      const dow = new Date(y, m, d).getDay();
      cells.push({
        dayNumber: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        dateStr,
        isWeekend: dow === 0 || dow === 6
      });
    }

    return cells;
  }, [currentYear, currentMonth]);

  // Group setlists by dateStr
  const { setlistsByDate, unassignedSetlists } = useMemo(() => {
    const map = new Map<string, Setlist[]>();
    const unassigned: Setlist[] = [];

    setlists.forEach(st => {
      if (!st.date || !st.date.trim()) {
        unassigned.push(st);
        return;
      }

      // Normalize date (YYYY-MM-DD)
      const cleanDate = st.date.trim().substring(0, 10);
      const list = map.get(cleanDate) || [];
      list.push(st);
      map.set(cleanDate, list);
    });

    return { setlistsByDate: map, unassignedSetlists: unassigned };
  }, [setlists]);

  // Setlists for currently selected date
  const selectedDateSetlists = useMemo(() => {
    if (!selectedDate) return [];
    return setlistsByDate.get(selectedDate) || [];
  }, [selectedDate, setlistsByDate]);

  // Friendly French header for selected date
  const formatSelectedDateHeading = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const dateObj = new Date(y, m, d);
        return dateObj.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
    } catch {}
    return dateStr;
  };

  return (
    <div className="animate-in fade-in duration-200">
      
      {/* Main Grid & Selected Day Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Calendar Grid (8 cols on lg) */}
        <div className="lg:col-span-8 bg-[#111113] border border-[#222226] rounded-2xl p-3 sm:p-5 shadow-sm space-y-4">
          
          {/* Calendar Header: Month & Year Navigator + Aujourd'hui */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#1F1F24] flex-wrap">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="flex items-center bg-[#17171C] border border-[#2A2A30] rounded-xl p-1 shadow-inner">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-[#23232A] transition-colors"
                  title="Mois précédent"
                  aria-label="Mois précédent"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="px-3 py-1 text-center min-w-[140px] sm:min-w-[160px]">
                  <span className="text-sm sm:text-base font-bold text-white capitalize">
                    {MONTH_NAMES_FR[currentMonth]} {currentYear}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-[#23232A] transition-colors"
                  title="Mois suivant"
                  aria-label="Mois suivant"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleGoToday}
                className="px-3 py-1.5 rounded-xl bg-[#18181D] hover:bg-[#22222A] border border-[#2C2C34] text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors shadow-xs"
              >
                Aujourd'hui
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center mb-2">
            {DAY_NAMES_FR.map((name, i) => (
              <div 
                key={name}
                className={`py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg ${
                  i >= 5 ? 'text-blue-400 bg-blue-950/20' : 'text-gray-400'
                }`}
              >
                {name}
              </div>
            ))}
          </div>

          {/* Month Cells Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarCells.map((cell, idx) => {
              const isToday = cell.dateStr === todayStr;
              const isSelected = cell.dateStr === selectedDate;
              const daySetlists = setlistsByDate.get(cell.dateStr) || [];
              const hasEvents = daySetlists.length > 0;

              return (
                <div
                  key={`${cell.dateStr}-${idx}`}
                  onClick={() => setSelectedDate(cell.dateStr)}
                  className={`min-h-[78px] sm:min-h-[102px] p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative group select-none ${
                    isSelected
                      ? 'bg-[#181820] border-blue-500 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/60 z-10'
                      : isToday
                      ? 'bg-blue-950/15 border-blue-500/50 hover:border-blue-400 hover:bg-blue-950/25'
                      : cell.isCurrentMonth
                      ? 'bg-[#141417] border-[#222226] hover:border-[#33333D] hover:bg-[#18181C]'
                      : 'bg-[#0E0E10]/70 border-[#1C1C20] opacity-40 hover:opacity-75'
                  }`}
                >
                  {/* Top: Day Number + Quick Add */}
                  <div className="flex items-center justify-between gap-1">
                    <span 
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                        isToday
                          ? 'bg-blue-600 text-white shadow-xs'
                          : isSelected
                          ? 'text-blue-300 font-extrabold'
                          : cell.isCurrentMonth
                          ? 'text-gray-200 group-hover:text-white'
                          : 'text-gray-500'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {/* Quick Add setlist for this day button */}
                    {canManageSetlists && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDate(cell.dateStr);
                          onCreateForDate(cell.dateStr);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-gray-400 hover:text-white hover:bg-blue-600/30 transition-all"
                        title={`Planifier une setlist pour le ${cell.dayNumber}`}
                        aria-label={`Planifier une setlist pour le ${cell.dayNumber}`}
                      >
                        <Plus className="w-3 h-3 text-blue-400" />
                      </button>
                    )}
                  </div>

                  {/* Middle / Bottom: Setlist Chips inside cell */}
                  <div className="mt-1 space-y-1 overflow-hidden">
                    {daySetlists.slice(0, 2).map((st) => {
                      const totalSecs = getSetlistTotalDurationSeconds(st);
                      return (
                        <div
                          key={st.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(cell.dateStr);
                          }}
                          className="px-1.5 py-0.5 sm:py-1 rounded-md bg-[#1D1D24] hover:bg-[#252530] border border-[#2E2E38] hover:border-blue-500/50 text-[10px] sm:text-[11px] font-medium text-gray-200 truncate flex items-center justify-between gap-1 shadow-xs transition-colors group/chip"
                          title={`${st.name} (${st.songIds.length} chants, ${formatSetlistDuration(totalSecs)})`}
                        >
                          <div className="flex items-center gap-1 min-w-0 flex-1 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                            <span className="truncate font-semibold">{st.name}</span>
                          </div>

                          {/* Quick Live Launch icon */}
                          {st.songIds.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onLaunchLive(st, 0);
                              }}
                              className="opacity-0 group-hover/chip:opacity-100 p-0.5 text-blue-400 hover:text-blue-300 hover:scale-110 transition-all shrink-0"
                              title="Lancer en Live"
                            >
                              <Play className="w-2.5 h-2.5 fill-current" />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {daySetlists.length > 2 && (
                      <div className="text-[10px] font-semibold text-blue-400 pl-1">
                        +{daySetlists.length - 2} autre{daySetlists.length - 2 > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>

                  {/* Empty state hint on hover if cell has no events */}
                  {!hasEvents && (
                    <div className="hidden sm:block h-3" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Inspector / Details Panel (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-4">
          
          <div className="bg-[#111113] border border-[#222226] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            
            {/* Day Header */}
            <div className="flex items-start justify-between gap-2 border-b border-[#222228] pb-3">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-blue-400">
                  Journée sélectionnée
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white capitalize">
                  {formatSelectedDateHeading(selectedDate)}
                </h3>
              </div>

              {canManageSetlists && (
                <button
                  type="button"
                  onClick={() => onCreateForDate(selectedDate)}
                  className="p-1.5 rounded-lg bg-[#18181D] hover:bg-[#22222A] border border-[#2D2D36] text-blue-400 hover:text-blue-300 transition-colors shrink-0"
                  title="Ajouter une setlist à cette date"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Setlists for selected day */}
            {selectedDateSetlists.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#18181D] border border-[#26262E] flex items-center justify-center mx-auto text-gray-500">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div className="text-xs text-gray-400 max-w-xs mx-auto">
                  Aucune setlist n'est programmée pour cette date.
                </div>
                {canManageSetlists && (
                  <button
                    type="button"
                    onClick={() => onCreateForDate(selectedDate)}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-sm inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Créer une setlist pour ce jour</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDateSetlists.map((st) => {
                  const totalSecs = getSetlistTotalDurationSeconds(st);

                  return (
                    <div 
                      key={st.id}
                      className="bg-[#151518] border border-[#26262C] rounded-xl p-3.5 space-y-3 shadow-xs hover:border-[#383842] transition-colors"
                    >
                      {/* Setlist Name & Duration Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white truncate" title={st.name}>
                            {st.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                            <span className="inline-flex items-center gap-1">
                              <Music className="w-3 h-3 text-blue-400" />
                              <span>{st.songIds.length} chant{st.songIds.length > 1 ? 's' : ''}</span>
                            </span>
                            {totalSecs > 0 && (
                              <span className="inline-flex items-center gap-1 font-mono text-cyan-300">
                                <Clock className="w-3 h-3 text-cyan-400" />
                                <span>{formatSetlistDuration(totalSecs)}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Live Button */}
                        {st.songIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => onLaunchLive(st, 0)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-1 shrink-0"
                            title="Lancer le Live pour cette setlist"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Live</span>
                          </button>
                        )}
                      </div>

                      {/* Song List Preview (first 5 songs) */}
                      {st.songIds.length > 0 ? (
                        <div className="bg-[#111113] rounded-lg border border-[#202026] p-2 space-y-1.5 max-h-48 overflow-y-auto">
                          {st.songIds.map((songId, sIdx) => {
                            const song = songs.find(s => s.id === songId);
                            if (!song) return null;
                            return (
                              <div 
                                key={song.id} 
                                className="flex items-center justify-between gap-2 text-xs py-1 px-1.5 rounded hover:bg-[#1A1A20] text-gray-300 transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono text-[10px] text-gray-500 w-4 text-right">
                                    {sIdx + 1}.
                                  </span>
                                  <span className="font-medium text-white truncate max-w-[150px]">
                                    {stripParentheses(song.title)}
                                  </span>
                                  {song.artist && (
                                    <span className="text-[11px] text-gray-500 truncate hidden sm:inline">
                                      {song.artist}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-mono">
                                  {song.key && (
                                    <span className="px-1 py-0.2 rounded bg-[#202028] text-blue-300">
                                      {song.key}
                                    </span>
                                  )}
                                  {song.tempo && song.tempo > 0 && (
                                    <span className="text-gray-500 text-[10px]">
                                      {song.tempo} bpm
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 italic py-1">
                          Aucun chant dans cette setlist.
                        </div>
                      )}

                      {/* Action buttons row */}
                      <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-[#222228] flex-wrap">
                        <div className="flex items-center gap-1">
                          {canManageSetlists && (
                            <button
                              type="button"
                              onClick={() => onOpenAddSongs(st)}
                              className="px-2 py-1 rounded-md bg-[#1C1C22] hover:bg-[#25252E] text-blue-400 text-xs font-medium border border-[#2D2D36] transition-colors"
                              title="Ajouter ou gérer les chants"
                            >
                              + Chants
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenPdf(st)}
                            className="p-1.5 rounded-md bg-[#1C1C22] hover:bg-[#25252E] text-emerald-400 hover:text-emerald-300 border border-[#2D2D36] transition-colors"
                            title="Exporter en PDF"
                            aria-label="Exporter en PDF"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onChangeDate(st)}
                            className="p-1.5 rounded-md bg-[#1C1C22] hover:bg-[#25252E] text-gray-300 hover:text-white border border-[#2D2D36] transition-colors"
                            title="Changer la date"
                            aria-label="Changer la date"
                          >
                            <CalendarIcon className="w-3.5 h-3.5 text-blue-400" />
                          </button>
                          {canManageSetlists && (
                            <button
                              type="button"
                              onClick={() => onOpenEdit(st)}
                              className="p-1.5 rounded-md bg-[#1C1C22] hover:bg-[#25252E] text-gray-400 hover:text-white border border-[#2D2D36] transition-colors"
                              title="Modifier la setlist"
                              aria-label="Modifier la setlist"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {canManageSetlists && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirmDeleteId === st.id) {
                                onDeleteSetlist(st.id);
                                setConfirmDeleteId(null);
                              } else {
                                setConfirmDeleteId(st.id);
                                setTimeout(() => setConfirmDeleteId(null), 3000);
                              }
                            }}
                            className={`p-1.5 rounded-md border text-xs transition-colors ${
                              confirmDeleteId === st.id
                                ? 'bg-rose-600 text-white border-rose-500 font-bold'
                                : 'bg-[#1C1C22] hover:bg-rose-950/30 text-gray-400 hover:text-rose-400 border-[#2D2D36]'
                            }`}
                            title={confirmDeleteId === st.id ? "Confirmer la suppression" : "Supprimer la setlist"}
                            aria-label="Supprimer"
                          >
                            {confirmDeleteId === st.id ? (
                              <Check className="w-3.5 h-3.5 text-white" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {/* Unassigned Setlists Section (if any) */}
          {unassignedSetlists.length > 0 && (
            <div className="bg-[#111113] border border-[#222226] rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Setlists non planifiées ({unassignedSetlists.length})</span>
                </span>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {unassignedSetlists.map(st => (
                  <div
                    key={st.id}
                    className="p-2.5 rounded-xl bg-[#16161A] border border-[#26262E] hover:border-[#383842] flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">{st.name}</div>
                      <div className="text-[11px] text-gray-400">
                        {st.songIds.length} chant{st.songIds.length > 1 ? 's' : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onChangeDate(st)}
                        className="px-2 py-1 rounded-md bg-[#202028] hover:bg-[#2A2A36] text-blue-400 font-medium text-[11px] border border-[#2E2E3C] transition-colors"
                      >
                        Planifier
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
