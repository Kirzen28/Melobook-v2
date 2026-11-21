import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ChevronUp,
  ChevronDown,
  X, 
  Check 
} from 'lucide-react';

interface SetlistDatePickerModalProps {
  isOpen: boolean;
  currentDate?: string;
  setlistTitle: string;
  onSaveDate: (newDate: string) => Promise<void> | void;
  onClose: () => void;
}

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const MONTH_SHORT_FR = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
];

const DAY_NAMES_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAY_SHORT_FR = ['lu', 'ma', 'me', 'je', 've', 'sa', 'di'];

function toLocalDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function buildCalendarDays(viewYear: number, viewMonth: number) {
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  let startDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6;

  const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
  const days: Array<{
    dayNumber: number;
    month: number;
    year: number;
    isCurrentMonth: boolean;
    dateStr: string;
  }> = [];

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    days.push({ dayNumber: d, month: m, year: y, isCurrentMonth: false, dateStr: toLocalDateStr(y, m, d) });
  }

  for (let d = 1; d <= totalDaysInMonth; d++) {
    days.push({ dayNumber: d, month: viewMonth, year: viewYear, isCurrentMonth: true, dateStr: toLocalDateStr(viewYear, viewMonth, d) });
  }

  const remaining = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const m = viewMonth === 11 ? 0 : viewMonth + 1;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    days.push({ dayNumber: d, month: m, year: y, isCurrentMonth: false, dateStr: toLocalDateStr(y, m, d) });
  }

  return days;
}

interface DarkDateInputProps {
  value: string;
  onChange: (newDate: string) => void;
  placeholder?: string;
}

export const DarkDateInput: React.FC<DarkDateInputProps> = ({
  value,
  onChange,
  placeholder = 'Choisir une date'
}) => {
  const parseInitial = (dStr?: string) => {
    if (dStr) {
      const parts = dStr.split('-').map(Number);
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        return new Date(parts[0], parts[1] - 1, parts[2]);
      }
    }
    return new Date();
  };

  const [isOpen, setIsOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => parseInitial(value).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parseInitial(value).getMonth());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const d = parseInitial(value);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsMonthPickerOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setIsMonthPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const now = new Date();
  const todayStr = toLocalDateStr(now.getFullYear(), now.getMonth(), now.getDate());
  const calendarDays = buildCalendarDays(viewYear, viewMonth);

  const formattedDisplay = (() => {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return value;
  })();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setIsOpen(prev => !prev);
          setIsMonthPickerOpen(false);
        }}
        className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs transition-all cursor-pointer border ${
          isOpen
            ? 'bg-[#20232E] border-blue-500 ring-2 ring-blue-500/20 text-white'
            : 'bg-[#1E2028] hover:bg-[#232630] border-[#323542] hover:border-blue-500/40 text-white'
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <CalendarIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className={formattedDisplay ? 'font-mono font-medium text-white' : 'text-gray-400'}>
            {formattedDisplay || placeholder}
          </span>
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {value && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 rounded text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Effacer la date"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-[70] w-full min-w-[268px] max-w-[300px] rounded-2xl bg-[#13141B] border border-[#2C2F3E] shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-3.5 text-gray-200 animate-in fade-in zoom-in-95 duration-150">
          {/* Header Mois / Année + Navigation */}
          <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#232532]">
            <button
              type="button"
              onClick={() => setIsMonthPickerOpen(prev => !prev)}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold text-white hover:bg-[#1E202B] transition-colors capitalize cursor-pointer"
            >
              <span>{MONTH_NAMES_FR[viewMonth].toLowerCase()} {viewYear}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-blue-400 transition-transform ${isMonthPickerOpen ? 'rotate-180' : ''}`} />
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg bg-[#1A1C24] hover:bg-[#242734] border border-[#2C2F3D] text-gray-300 hover:text-white transition-colors cursor-pointer"
                title="Mois précédent"
                aria-label="Mois précédent"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg bg-[#1A1C24] hover:bg-[#242734] border border-[#2C2F3D] text-gray-300 hover:text-white transition-colors cursor-pointer"
                title="Mois suivant"
                aria-label="Mois suivant"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {isMonthPickerOpen ? (
            <div className="space-y-2.5 pb-1">
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => setViewYear(y => y - 1)}
                  className="p-1 rounded-md bg-[#1A1C24] hover:bg-[#242734] border border-[#2C2F3D] text-gray-300 hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold text-white font-mono">{viewYear}</span>
                <button
                  type="button"
                  onClick={() => setViewYear(y => y + 1)}
                  className="p-1 rounded-md bg-[#1A1C24] hover:bg-[#242734] border border-[#2C2F3D] text-gray-300 hover:text-white cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {MONTH_SHORT_FR.map((label, mIdx) => {
                  const active = mIdx === viewMonth;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        setViewMonth(mIdx);
                        setIsMonthPickerOpen(false);
                      }}
                      className={`py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        active
                          ? 'bg-blue-600 text-white font-semibold shadow-sm'
                          : 'bg-[#1A1C24] text-gray-300 hover:bg-[#242734] hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* Jours de la semaine */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {DAY_SHORT_FR.map((dName, i) => (
                  <div
                    key={dName}
                    className={`text-[10px] font-semibold uppercase tracking-wide py-1 ${
                      i >= 5 ? 'text-blue-400/90' : 'text-gray-400'
                    }`}
                  >
                    {dName}
                  </div>
                ))}
              </div>

              {/* Grille des jours */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((cell, idx) => {
                  const isSelected = value === cell.dateStr;
                  const isToday = cell.dateStr === todayStr;

                  return (
                    <button
                      key={`${cell.dateStr}-${idx}`}
                      type="button"
                      onClick={() => {
                        onChange(cell.dateStr);
                        setIsOpen(false);
                      }}
                      className={`h-8 w-full rounded-lg text-xs flex items-center justify-center transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-400/70 shadow-md shadow-blue-600/30'
                          : isToday
                          ? 'border border-blue-400/60 bg-blue-500/10 text-blue-300 font-semibold hover:bg-blue-500/20'
                          : cell.isCurrentMonth
                          ? 'text-gray-200 hover:bg-[#232634] hover:text-white font-medium'
                          : 'text-gray-600 hover:bg-[#1B1D26] hover:text-gray-400'
                      }`}
                    >
                      {cell.dayNumber}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Pied de page : Effacer / Aujourd'hui */}
          <div className="flex items-center justify-between gap-2 pt-2.5 mt-2.5 border-t border-[#232532]">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
                setIsMonthPickerOpen(false);
              }}
              className="px-2 py-1 rounded-lg text-[11px] font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              Effacer
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(todayStr);
                setViewYear(now.getFullYear());
                setViewMonth(now.getMonth());
                setIsOpen(false);
                setIsMonthPickerOpen(false);
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors cursor-pointer"
            >
              Aujourd'hui
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const SetlistDatePickerModal: React.FC<SetlistDatePickerModalProps> = ({
  isOpen,
  currentDate,
  setlistTitle,
  onSaveDate,
  onClose
}) => {
  // Parse initial date
  const parseDate = (dStr?: string) => {
    if (!dStr) return new Date();
    const parts = dStr.split('-').map(Number);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return new Date();
  };

  const initialObj = parseDate(currentDate);

  const [viewYear, setViewYear] = useState<number>(initialObj.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialObj.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(
    currentDate || new Date().toISOString().split('T')[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentDate) {
      const obj = parseDate(currentDate);
      setViewYear(obj.getFullYear());
      setViewMonth(obj.getMonth());
      setSelectedDate(currentDate);
    } else {
      const today = new Date();
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
      setSelectedDate(today.toISOString().split('T')[0]);
    }
  }, [currentDate, isOpen]);

  if (!isOpen) return null;

  // Format Date to YYYY-MM-DD
  const formatDateStr = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const todayObj = new Date();
  const todayStr = formatDateStr(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());

  // Navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  // Generate Calendar Days (Monday first)
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  let startDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday becomes 6

  const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
  const calendarDays: Array<{
    dayNumber: number;
    month: number;
    year: number;
    isCurrentMonth: boolean;
    dateStr: string;
  }> = [];

  // Trailing previous month days
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    calendarDays.push({
      dayNumber: d,
      month: m,
      year: y,
      isCurrentMonth: false,
      dateStr: formatDateStr(y, m, d)
    });
  }

  // Current month days
  for (let d = 1; d <= totalDaysInMonth; d++) {
    calendarDays.push({
      dayNumber: d,
      month: viewMonth,
      year: viewYear,
      isCurrentMonth: true,
      dateStr: formatDateStr(viewYear, viewMonth, d)
    });
  }

  // Next month leading days
  const remaining = (7 - (calendarDays.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const m = viewMonth === 11 ? 0 : viewMonth + 1;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    calendarDays.push({
      dayNumber: d,
      month: m,
      year: y,
      isCurrentMonth: false,
      dateStr: formatDateStr(y, m, d)
    });
  }

  const handleSave = async (dateToSave: string) => {
    setIsSubmitting(true);
    try {
      await onSaveDate(dateToSave);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-[#121215] border border-[#26262B] rounded-2xl w-full max-w-sm sm:max-w-md shadow-2xl p-4 sm:p-5 text-gray-200 animate-in zoom-in-95 duration-150 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#222228] pb-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Changer la date de la setlist</span>
            </h3>
            <p className="text-xs text-gray-400 truncate mt-0.5" title={setlistTitle}>
              {setlistTitle}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#1C1C20] transition-colors shrink-0"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg bg-[#18181C] hover:bg-[#222228] border border-[#2E2E34] text-gray-300 hover:text-white transition-colors"
            title="Mois précédent"
            aria-label="Mois précédent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-center">
            <span className="text-sm font-bold text-white capitalize">
              {MONTH_NAMES_FR[viewMonth]} {viewYear}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg bg-[#18181C] hover:bg-[#222228] border border-[#2E2E34] text-gray-300 hover:text-white transition-colors"
            title="Mois suivant"
            aria-label="Mois suivant"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {DAY_NAMES_FR.map((name, i) => (
            <div 
              key={name} 
              className={`text-[11px] font-semibold py-1 ${i >= 5 ? 'text-blue-400' : 'text-gray-400'}`}
            >
              {name}
            </div>
          ))}
        </div>

        {/* Calendar days grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((cell, idx) => {
            const isSelected = selectedDate === cell.dateStr;
            const isToday = cell.dateStr === todayStr;

            return (
              <button
                key={`${cell.dateStr}-${idx}`}
                type="button"
                onClick={() => {
                  setSelectedDate(cell.dateStr);
                  if (!cell.isCurrentMonth) {
                    setViewMonth(cell.month);
                    setViewYear(cell.year);
                  }
                }}
                onDoubleClick={() => {
                  setSelectedDate(cell.dateStr);
                  handleSave(cell.dateStr);
                }}
                className={`h-9 w-full rounded-lg text-xs font-medium flex items-center justify-center transition-all relative select-none ${
                  isSelected
                    ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-400 shadow-md shadow-blue-500/20 scale-[1.02] z-10'
                    : isToday
                    ? 'border border-blue-500/60 text-blue-300 bg-blue-950/20 hover:bg-blue-900/30'
                    : cell.isCurrentMonth
                    ? 'text-gray-200 hover:bg-[#202026] hover:text-white'
                    : 'text-gray-600 hover:bg-[#1A1A20] hover:text-gray-400'
                }`}
                title={cell.dateStr}
              >
                <span>{cell.dayNumber}</span>
                {isToday && !isSelected && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#222228]">
          <div>
            {currentDate && (
              <button
                type="button"
                onClick={() => handleSave('')}
                disabled={isSubmitting}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-950/30 hover:border-rose-500/30 border border-transparent transition-colors"
                title="Supprimer la date de la setlist"
              >
                Effacer la date
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:bg-[#1C1C20] hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => handleSave(selectedDate)}
              disabled={isSubmitting || !selectedDate}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Valider la date</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
