import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ChevronUp,
  ChevronDown,
  X
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

const DAY_SHORT_FR = ['lu', 'ma', 'me', 'je', 've', 'sa', 'di'];

function toLocalDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseLocalDate(dStr?: string) {
  if (dStr) {
    const parts = dStr.split('-').map(Number);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
  }
  return new Date();
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

interface CalendarPanelProps {
  value: string;
  onSelectDate: (newDate: string) => void;
  disabled?: boolean;
  resetSignal?: boolean;
  topSlot?: React.ReactNode;
}

const CalendarPanel: React.FC<CalendarPanelProps> = ({
  value,
  onSelectDate,
  disabled = false,
  resetSignal,
  topSlot
}) => {
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => parseLocalDate(value).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parseLocalDate(value).getMonth());

  useEffect(() => {
    const d = parseLocalDate(value);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setIsMonthPickerOpen(false);
  }, [value, resetSignal]);

  const now = new Date();
  const todayStr = toLocalDateStr(now.getFullYear(), now.getMonth(), now.getDate());
  const calendarDays = buildCalendarDays(viewYear, viewMonth);

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
    <div className="rounded-2xl bg-slate-50 dark:bg-[#13141B] border border-slate-300 dark:border-[#2C2F3E] shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-3.5 text-slate-800 dark:text-gray-200">
      {topSlot}

      {/* Header Mois / Année + Navigation */}
      <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-300 dark:border-[#232532]">
        <button
          type="button"
          onClick={() => setIsMonthPickerOpen(prev => !prev)}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold text-slate-900 dark:text-white hover:bg-slate-200/70 dark:hover:bg-[#1E202B] transition-colors capitalize cursor-pointer"
        >
          <span>{MONTH_NAMES_FR[viewMonth].toLowerCase()} {viewYear}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 transition-transform ${isMonthPickerOpen ? 'rotate-180' : ''}`} />
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg bg-[#EDF1F5] dark:bg-[#1A1C24] hover:bg-slate-200 dark:hover:bg-[#242734] border border-slate-300 dark:border-[#2C2F3D] text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Mois précédent"
            aria-label="Mois précédent"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg bg-[#EDF1F5] dark:bg-[#1A1C24] hover:bg-slate-200 dark:hover:bg-[#242734] border border-slate-300 dark:border-[#2C2F3D] text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
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
              className="p-1 rounded-md bg-[#EDF1F5] dark:bg-[#1A1C24] hover:bg-slate-200 dark:hover:bg-[#242734] border border-slate-300 dark:border-[#2C2F3D] text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">{viewYear}</span>
            <button
              type="button"
              onClick={() => setViewYear(y => y + 1)}
              className="p-1 rounded-md bg-[#EDF1F5] dark:bg-[#1A1C24] hover:bg-slate-200 dark:hover:bg-[#242734] border border-slate-300 dark:border-[#2C2F3D] text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
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
                      : 'bg-[#EDF1F5] dark:bg-[#1A1C24] text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-[#242734] hover:text-slate-900 dark:hover:text-white'
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
                  i >= 5 ? 'text-blue-600 dark:text-blue-400/90' : 'text-slate-600 dark:text-gray-400'
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
                  disabled={disabled}
                  onClick={() => onSelectDate(cell.dateStr)}
                  className={`h-8 w-full rounded-lg text-xs flex items-center justify-center transition-all cursor-pointer select-none disabled:opacity-50 ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-400/70 shadow-md shadow-blue-600/30'
                      : isToday
                      ? 'border border-blue-400/60 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold hover:bg-blue-500/20'
                      : cell.isCurrentMonth
                      ? 'text-slate-800 dark:text-gray-200 hover:bg-slate-200 dark:hover:bg-[#232634] hover:text-slate-900 dark:hover:text-white font-medium'
                      : 'text-slate-500 dark:text-gray-600 hover:bg-slate-200/70 dark:hover:bg-[#1B1D26] hover:text-gray-400'
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
      <div className="flex items-center justify-between gap-2 pt-2.5 mt-2.5 border-t border-slate-300 dark:border-[#232532]">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setIsMonthPickerOpen(false);
            onSelectDate('');
          }}
          className="px-2 py-1 rounded-lg text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
        >
          Effacer
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setViewYear(now.getFullYear());
            setViewMonth(now.getMonth());
            setIsMonthPickerOpen(false);
            onSelectDate(todayStr);
          }}
          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-500/10 transition-colors cursor-pointer disabled:opacity-50"
        >
          Aujourd'hui
        </button>
      </div>
    </div>
  );
};

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
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const formattedDisplay = (() => {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return value;
  })();

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs transition-all cursor-pointer border ${
          isOpen
            ? 'bg-[#EDF1F5] dark:bg-[#20232E] border-blue-500 ring-2 ring-blue-500/20 text-slate-900 dark:text-white'
            : 'bg-[#EDF1F5] dark:bg-[#1E2028] hover:bg-slate-200 dark:hover:bg-[#232630] border-slate-300 dark:border-[#323542] hover:border-blue-500/40 text-slate-900 dark:text-white'
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <CalendarIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className={formattedDisplay ? 'font-mono font-medium text-slate-900 dark:text-white' : 'text-slate-600 dark:text-gray-400'}>
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
              className="p-0.5 rounded text-slate-600 dark:text-gray-400 hover:text-rose-800 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Effacer la date"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-600 dark:text-gray-400 transition-transform duration-150 ${isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''}`} />
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-[70] w-full min-w-[268px] max-w-[300px] animate-in fade-in zoom-in-95 duration-150">
          <CalendarPanel
            value={value}
            resetSignal={isOpen}
            onSelectDate={(newDate) => {
              onChange(newDate);
              setIsOpen(false);
            }}
          />
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSave = async (dateToSave: string) => {
    if (isSubmitting) return;
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
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        className="w-full max-w-[310px] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <CalendarPanel
          value={currentDate || ''}
          disabled={isSubmitting}
          resetSignal={isOpen}
          onSelectDate={handleSave}
          topSlot={
            <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-300 dark:border-[#232532]">
              <div className="flex items-center gap-1.5 min-w-0">
                <CalendarIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-900 dark:text-white truncate" title={setlistTitle}>
                  {setlistTitle}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="p-1 rounded-lg text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-[#1E202B] transition-colors shrink-0 cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          }
        />
      </div>
    </div>
  );
};
