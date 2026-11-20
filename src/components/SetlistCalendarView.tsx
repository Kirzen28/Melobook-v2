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
  X,
  Copy
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
  onDuplicateSetlist?: (setlist: Setlist) => void;
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
  onDuplicateSetlist,
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
      
      {/* Calendar Grid */}
      <div className="bg-[#111113] border border-[#222226] rounded-2xl p-3 sm:p-5 shadow-sm space-y-4">
          
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
    </div>
  );
};
