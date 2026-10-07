import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
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

const DAY_NAMES_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

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
