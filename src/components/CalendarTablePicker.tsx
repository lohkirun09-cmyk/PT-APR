import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import { normalizeDate } from '../utils/bunkeringData';

interface CalendarTablePickerProps {
  startDate: string; // MM/DD/YYYY or YYYY-MM-DD
  endDate: string; // MM/DD/YYYY or YYYY-MM-DD
  availableDates: string[]; // List of dates that have transactions
  onApply: (start: string, end: string) => void;
  onClear: () => void;
}

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const CalendarTablePicker: React.FC<CalendarTablePickerProps> = ({
  startDate,
  endDate,
  availableDates,
  onApply,
  onClear
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial view month from available dates or current date
  const initialViewDate = useMemo(() => {
    if (startDate) {
      const norm = normalizeDate(startDate);
      const parts = norm.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      }
    }
    if (availableDates.length > 0) {
      const norm = normalizeDate(availableDates[0]);
      const parts = norm.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      }
    }
    return new Date();
  }, [startDate, availableDates]);

  const [currentYear, setCurrentYear] = useState<number>(initialViewDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialViewDate.getMonth());

  // Staged selection before user confirms
  const [tempStart, setTempStart] = useState<string>(startDate ? normalizeDate(startDate) : '');
  const [tempEnd, setTempEnd] = useState<string>(endDate ? normalizeDate(endDate) : '');
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Sync staged state when props change
  useEffect(() => {
    setTempStart(startDate ? normalizeDate(startDate) : '');
    setTempEnd(endDate ? normalizeDate(endDate) : '');
  }, [startDate, endDate]);

  // Map of available transaction dates for fast lookup: normalized 'YYYY-MM-DD' -> true
  const availableDatesMap = useMemo(() => {
    const map = new Map<string, string>();
    availableDates.forEach(d => {
      map.set(normalizeDate(d), d);
    });
    return map;
  }, [availableDates]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

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

  // Calendar cells generation for current month
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: {
      dateStr: string; // YYYY-MM-DD
      dayNumber: number;
      isCurrentMonth: boolean;
      hasData: boolean;
      originalDateStr?: string;
    }[] = [];

    // Prev month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        hasData: availableDatesMap.has(dateStr),
        originalDateStr: availableDatesMap.get(dateStr)
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: true,
        hasData: availableDatesMap.has(dateStr),
        originalDateStr: availableDatesMap.get(dateStr)
      });
    }

    // Next month padding to fill complete grid of 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        hasData: availableDatesMap.has(dateStr),
        originalDateStr: availableDatesMap.get(dateStr)
      });
    }

    return days;
  }, [currentYear, currentMonth, availableDatesMap]);

  const handleCellClick = (dateStr: string) => {
    if (!tempStart || (tempStart && tempEnd)) {
      // First click or reset: set new start
      setTempStart(dateStr);
      setTempEnd('');
    } else if (tempStart && !tempEnd) {
      // Second click: select range
      if (dateStr < tempStart) {
        setTempEnd(tempStart);
        setTempStart(dateStr);
      } else {
        setTempEnd(dateStr);
      }
    }
  };

  const handleApply = () => {
    if (tempStart && !tempEnd) {
      // If only one date selected, treat as single date filter
      onApply(tempStart, tempStart);
    } else if (tempStart && tempEnd) {
      onApply(tempStart, tempEnd);
    } else {
      onClear();
    }
    setIsOpen(false);
  };

  const handleQuickSelectDate = (dateStr: string) => {
    const norm = normalizeDate(dateStr);
    setTempStart(norm);
    setTempEnd(norm);
    onApply(norm, norm);
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempStart('');
    setTempEnd('');
    onClear();
    setIsOpen(false);
  };

  // Format label for the button trigger
  const triggerLabel = useMemo(() => {
    if (!startDate && !endDate) {
      return 'Semua Tanggal (Buka Tabel Kalender)';
    }

    const formatIdDate = (dStr: string) => {
      const norm = normalizeDate(dStr);
      const parts = norm.split('-');
      if (parts.length === 3) {
        const d = parseInt(parts[2], 10);
        const m = MONTH_NAMES_ID[parseInt(parts[1], 10) - 1].substring(0, 3);
        const y = parts[0];
        return `${d} ${m} ${y}`;
      }
      return dStr;
    };

    if (startDate && (!endDate || startDate === endDate)) {
      return formatIdDate(startDate);
    }

    return `${formatIdDate(startDate)} s/d ${formatIdDate(endDate)}`;
  }, [startDate, endDate]);

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer shadow-sm ${
          startDate || endDate
            ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 ring-1 ring-amber-500/30'
            : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
        }`}
      >
        <CalendarIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="truncate max-w-[200px] sm:max-w-none font-semibold">
          {triggerLabel}
        </span>
        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/50">
          Tabel Kalender
        </span>
      </button>

      {/* Popover Calendar Grid Dialog */}
      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 z-50 w-[330px] sm:w-[380px] bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header Month / Year Navigation */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-sm font-bold text-white px-2">
                {MONTH_NAMES_ID[currentMonth]} {currentYear}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setCurrentMonth(now.getMonth());
                  setCurrentYear(now.getFullYear());
                }}
                className="text-[10px] text-slate-400 hover:text-amber-400 px-2 py-1 rounded bg-slate-800/60 hover:bg-slate-800 transition cursor-pointer"
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Select Chips for Dates with Real Operational Data */}
          {availableDates.length > 0 && (
            <div className="mb-3 pb-2.5 border-b border-slate-800/80">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Tanggal Tersedia di Data:
                </span>
                <span className="text-[10px] text-slate-500">Klik untuk langsung pilih</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {availableDates.map(dateStr => {
                  const norm = normalizeDate(dateStr);
                  const isSelected = tempStart === norm && (tempEnd === norm || !tempEnd);
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => handleQuickSelectDate(dateStr)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60'
                      }`}
                    >
                      {dateStr}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Calendar Table Grid */}
          <div className="mb-3">
            {/* Weekday Names Header */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {DAY_NAMES_ID.map((dayName, idx) => (
                <div
                  key={dayName}
                  className={`text-[11px] font-bold py-1 ${
                    idx === 0 || idx === 6 ? 'text-amber-400/70' : 'text-slate-400'
                  }`}
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* Days Table Cells */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                const dateStr = day.dateStr;
                const isStart = tempStart === dateStr;
                const isEnd = tempEnd === dateStr;
                
                // Determine if in range
                let inRange = false;
                if (tempStart && tempEnd) {
                  inRange = dateStr >= tempStart && dateStr <= tempEnd;
                } else if (tempStart && hoverDate && !tempEnd) {
                  const rangeStart = tempStart < hoverDate ? tempStart : hoverDate;
                  const rangeEnd = tempStart < hoverDate ? hoverDate : tempStart;
                  inRange = dateStr >= rangeStart && dateStr <= rangeEnd;
                }

                const isCurrentMonth = day.isCurrentMonth;
                const hasData = day.hasData;

                return (
                  <button
                    key={`${dateStr}-${idx}`}
                    type="button"
                    onClick={() => handleCellClick(dateStr)}
                    onMouseEnter={() => setHoverDate(dateStr)}
                    onMouseLeave={() => setHoverDate(null)}
                    className={`relative h-9 w-full flex flex-col items-center justify-center rounded-lg text-xs transition-all cursor-pointer select-none ${
                      isStart || isEnd
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20 z-10'
                        : inRange
                        ? 'bg-amber-500/20 text-amber-200 font-semibold'
                        : hasData
                        ? 'bg-slate-800/80 text-white font-bold hover:bg-slate-700 border border-amber-500/30'
                        : isCurrentMonth
                        ? 'text-slate-300 hover:bg-slate-800/60'
                        : 'text-slate-600 hover:bg-slate-800/30'
                    }`}
                  >
                    <span>{day.dayNumber}</span>

                    {/* Operational Data Indicator Dot */}
                    {hasData && (
                      <span
                        className={`w-1 h-1 rounded-full mt-0.5 ${
                          isStart || isEnd ? 'bg-slate-950' : 'bg-amber-400'
                        }`}
                        title="Ada transaksi bunkering"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Selection Status */}
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 mb-3 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              {tempStart && tempEnd ? (
                <span>
                  Rentang Terpilih: <strong className="text-amber-300">{tempStart}</strong> s/d{' '}
                  <strong className="text-amber-300">{tempEnd}</strong>
                </span>
              ) : tempStart ? (
                <span>
                  Tanggal Terpilih: <strong className="text-amber-300">{tempStart}</strong> (Klik tanggal lain untuk memilih rentang)
                </span>
              ) : (
                <span className="text-slate-400">
                  Pilih tanggal di atas untuk memfilter data dashboard
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Semua Tanggal</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-slate-800 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-950 transition cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Terapkan</span>
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
