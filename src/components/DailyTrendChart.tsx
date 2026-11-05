import React, { useMemo } from 'react';
import { TrendingUp, Calendar, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import {
  BunkeringRecord,
  UnitMode,
  DEFAULT_DENSITY,
  formatFuel,
  normalizeDate
} from '../utils/bunkeringData';

interface DailyTrendChartProps {
  records: BunkeringRecord[];
  onSelectDate: (date: string) => void;
  selectedDate: string;
  unitMode?: UnitMode;
  density?: number;
}

export const DailyTrendChart: React.FC<DailyTrendChartProps> = ({
  records,
  onSelectDate,
  selectedDate,
  unitMode = 'LITER',
  density = DEFAULT_DENSITY
}) => {
  // Aggregate volume masuk and keluar per operational date
  const dailyData = useMemo(() => {
    const map = new Map<string, { date: string; masuk: number; keluar: number; count: number }>();

    records.forEach(r => {
      const d = r.tanggal || 'No Date';
      const existing = map.get(d) || { date: d, masuk: 0, keluar: 0, count: 0 };
      existing.masuk += (r.masuk || 0);
      existing.keluar += (r.keluar || 0);
      existing.count += 1;
      map.set(d, existing);
    });

    return Array.from(map.values()).sort((a, b) =>
      normalizeDate(a.date).localeCompare(normalizeDate(b.date))
    );
  }, [records]);

  if (dailyData.length <= 1) return null;

  const maxVal = Math.max(
    ...dailyData.map(d => Math.max(d.masuk, d.keluar)),
    1000
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Tren Harian Aliran BBM (Masuk vs Keluar)</h3>
            <p className="text-[11px] text-slate-400">
              Klik tanggal untuk langsung memfilter metrik dan rincian transaksi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
            Masuk (Inflow)
          </span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2.5 h-2.5 rounded bg-amber-500"></span>
            Keluar (Bunkering)
          </span>
        </div>
      </div>

      {/* Responsive Bar Columns */}
      <div className="grid grid-flow-col auto-cols-fr gap-3 pt-6 pb-2 items-end min-h-[160px]">
        {dailyData.map(item => {
          const keluarHeightPercent = Math.min(100, (item.keluar / maxVal) * 100);
          const masukHeightPercent = Math.min(100, (item.masuk / maxVal) * 100);
          const isSelected = selectedDate === item.date;

          return (
            <button
              key={item.date}
              onClick={() => onSelectDate(item.date)}
              className={`flex flex-col items-center group cursor-pointer p-2 rounded-xl transition-all ${
                isSelected
                  ? 'bg-slate-800 ring-2 ring-amber-400 shadow-lg'
                  : 'hover:bg-slate-800/60'
              }`}
            >
              {/* Bars container */}
              <div className="flex items-end gap-1.5 h-28 w-full justify-center">
                {/* Masuk Bar */}
                <div
                  className="w-3.5 bg-emerald-500 rounded-t-md transition-all duration-300 group-hover:brightness-125"
                  style={{ height: `${Math.max(masukHeightPercent, item.masuk > 0 ? 6 : 0)}%` }}
                  title={`Masuk: ${formatFuel(item.masuk, unitMode, density, { showBoth: true })}`}
                />
                {/* Keluar Bar */}
                <div
                  className="w-3.5 bg-amber-500 rounded-t-md transition-all duration-300 group-hover:brightness-125"
                  style={{ height: `${Math.max(keluarHeightPercent, item.keluar > 0 ? 6 : 0)}%` }}
                  title={`Keluar: ${formatFuel(item.keluar, unitMode, density, { showBoth: true })}`}
                />
              </div>

              {/* Date Label */}
              <span className={`text-[11px] font-bold mt-2 whitespace-nowrap ${isSelected ? 'text-amber-400 font-extrabold' : 'text-slate-300'}`}>
                {item.date}
              </span>
              <span className="text-[9px] text-slate-500 mt-0.5">
                {item.count} trip
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
