import React from 'react';
import { Calendar, Filter, RotateCcw, Search } from 'lucide-react';
import { FilterState, ALLOWED_TANKS, ALLOWED_SUPERVISORS, ALLOWED_KOTAKAN_SIZES, ALLOWED_CATEGORIES } from '../utils/bunkeringData';
import { CalendarTablePicker } from './CalendarTablePicker';

interface FilterBarProps {
  filter: FilterState;
  onFilterChange: (newFilter: FilterState) => void;
  availableDates: string[];
  allPTs: string[];
  activeFilteredCount: number;
  totalCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filter,
  onFilterChange,
  availableDates,
  allPTs,
  activeFilteredCount,
  totalCount,
}) => {
  const handleDateChipClick = (dateStr: string) => {
    if (filter.startDate === dateStr && filter.endDate === dateStr) {
      // Toggle off to show all
      onFilterChange({ ...filter, startDate: '', endDate: '' });
    } else {
      onFilterChange({ ...filter, startDate: dateStr, endDate: dateStr });
    }
  };

  const handleResetFilters = () => {
    onFilterChange({
      startDate: '',
      endDate: '',
      selectedPT: 'ALL',
      selectedPengawas: 'ALL',
      selectedTangki: 'ALL',
      selectedKeterangan: 'ALL',
      selectedKotakan: 'ALL',
      searchQuery: ''
    });
  };

  const hasActiveFilters =
    filter.startDate !== '' ||
    filter.endDate !== '' ||
    filter.selectedPT !== 'ALL' ||
    filter.selectedPengawas !== 'ALL' ||
    filter.selectedTangki !== 'ALL' ||
    filter.selectedKeterangan !== 'ALL' ||
    filter.selectedKotakan !== 'ALL' ||
    filter.searchQuery.trim() !== '';

  return (
    <div className="relative z-30 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-xl mb-6">
      <div className="flex flex-col gap-4">
        {/* Row 1: Date Quick Chips & Interactive Calendar Table Picker */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Pilih Tanggal:
            </span>
            <button
              onClick={() => onFilterChange({ ...filter, startDate: '', endDate: '' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                !filter.startDate && !filter.endDate
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              Semua Tanggal
            </button>
            {availableDates.map(date => {
              const isSelected = filter.startDate === date && filter.endDate === date;
              return (
                <button
                  key={date}
                  onClick={() => handleDateChipClick(date)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold ring-2 ring-amber-400'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {date}
                </button>
              );
            })}
          </div>

          {/* Interactive Calendar Table Picker (Replaces manual typing) */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <CalendarTablePicker
              startDate={filter.startDate}
              endDate={filter.endDate}
              availableDates={availableDates}
              onApply={(start, end) => {
                onFilterChange({ ...filter, startDate: start, endDate: end });
              }}
              onClear={() => {
                onFilterChange({ ...filter, startDate: '', endDate: '' });
              }}
            />
          </div>
        </div>

        {/* Row 2: Dropdowns & Search */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {/* PT Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Nama PT</label>
            <select
              value={filter.selectedPT}
              onChange={e => onFilterChange({ ...filter, selectedPT: e.target.value })}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="ALL">Semua PT ({allPTs.length})</option>
              {allPTs.map(pt => (
                <option key={pt} value={pt}>
                  {pt}
                </option>
              ))}
            </select>
          </div>

          {/* Pengawas Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Pengawas</label>
            <select
              value={filter.selectedPengawas}
              onChange={e => onFilterChange({ ...filter, selectedPengawas: e.target.value })}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="ALL">Semua Pengawas</option>
              {ALLOWED_SUPERVISORS.map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Tangki Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Tangki</label>
            <select
              value={filter.selectedTangki}
              onChange={e => onFilterChange({ ...filter, selectedTangki: e.target.value })}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="ALL">Semua Tangki</option>
              {ALLOWED_TANKS.map(t => (
                <option key={t} value={t}>
                  Tangki {t}
                </option>
              ))}
            </select>
          </div>

          {/* Kotakan Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Kotakan</label>
            <select
              value={filter.selectedKotakan}
              onChange={e => onFilterChange({ ...filter, selectedKotakan: e.target.value })}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="ALL">Semua Kotakan</option>
              {ALLOWED_KOTAKAN_SIZES.map(k => (
                <option key={k} value={k.toString()}>
                  Kotakan {k}
                </option>
              ))}
              <option value="EMPTY">Tanpa Kotakan</option>
            </select>
          </div>

          {/* Keterangan Bunkering */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Kategori</label>
            <select
              value={filter.selectedKeterangan}
              onChange={e => onFilterChange({ ...filter, selectedKeterangan: e.target.value })}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="ALL">Semua Kategori</option>
              {ALLOWED_CATEGORIES.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Pencarian</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                value={filter.searchQuery}
                onChange={e => onFilterChange({ ...filter, searchQuery: e.target.value })}
                placeholder="Cari DN, Kapal, dll..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Filter Summary & Reset Bar */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              Menampilkan: <strong className="text-white">{activeFilteredCount}</strong> dari{' '}
              <span className="text-slate-400">{totalCount} transaksi</span>
            </span>
            {hasActiveFilters && (
              <span className="bg-amber-500/10 text-amber-400 text-[10px] px-2 py-0.5 rounded font-medium border border-amber-500/30">
                Filter Aktif
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-amber-400 text-xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Semua Filter</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
