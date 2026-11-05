import React, { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ArrowLeftRight, Scale, Gauge, Settings2, Info } from 'lucide-react';
import {
  DashboardMetrics,
  UnitMode,
  DEFAULT_DENSITY,
  convertLiterToTon,
  formatTonase,
  formatLiter
} from '../utils/bunkeringData';

interface KPICardsProps {
  metrics: DashboardMetrics;
  unitMode: UnitMode;
  density: number;
  onToggleUnit: (unit: UnitMode) => void;
  onChangeDensity?: (density: number) => void;
}

export const KPICards: React.FC<KPICardsProps> = ({
  metrics,
  unitMode,
  density = DEFAULT_DENSITY,
  onToggleUnit,
  onChangeDensity
}) => {
  const [showDensityPopover, setShowDensityPopover] = useState(false);
  const [customDensityInput, setCustomDensityInput] = useState(density.toString());

  const handleApplyCustomDensity = () => {
    const parsed = parseFloat(customDensityInput.replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0.700 && parsed <= 1.100 && onChangeDensity) {
      onChangeDensity(parsed);
      setShowDensityPopover(false);
    }
  };

  const isTonase = unitMode === 'TONASE';

  // Format helper for primary and secondary display
  const renderCardValues = (literValue: number, isBalance: boolean = false) => {
    const isNegative = literValue < 0;
    const sign = isBalance && !isNegative && literValue > 0 ? '+' : '';

    if (isTonase) {
      const tonValue = convertLiterToTon(literValue, density);
      const primary = `${sign}${formatTonase(tonValue, 3)}`;
      const secondary = `Vol: ${sign}${formatLiter(literValue)} • BJ: ${density.toFixed(3)}`;
      return { primary, secondary };
    } else {
      const tonValue = convertLiterToTon(literValue, density);
      const primary = `${sign}${formatLiter(literValue)}`;
      const secondary = `Setara: ${sign}${formatTonase(tonValue, 2)} • BJ: ${density.toFixed(3)}`;
      return { primary, secondary };
    }
  };

  const masuk = renderCardValues(metrics.totalMasuk);
  const keluar = renderCardValues(metrics.totalKeluar);
  const total = renderCardValues(metrics.totalKeseluruhan);
  const saldo = renderCardValues(metrics.netBalance, true);

  return (
    <div className="mb-6">
      {/* Unit & Calculation Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-amber-400" />
            Hitungan Metrik Operasional
          </span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            (BBM High-Speed Diesel / Solar)
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Unit Switcher: Liter vs Tonase */}
          <div className="bg-slate-900 border border-slate-800 p-0.5 rounded-xl flex items-center shadow-inner">
            <button
              type="button"
              onClick={() => onToggleUnit('LITER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                unitMode === 'LITER'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Hitung volume dalam satuan Liter (L)"
            >
              <span>🛢️</span>
              <span>Liter (L)</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleUnit('TONASE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                unitMode === 'TONASE'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Hitung berat massa dalam satuan Tonase (MT / Metric Ton)"
            >
              <span>⚖️</span>
              <span>Tonase (MT)</span>
            </button>
          </div>

          {/* Density Factor Quick Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDensityPopover(!showDensityPopover)}
              className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Atur faktor Berat Jenis (Density)"
            >
              <span className="text-[11px] text-slate-400">BJ:</span>
              <span className="font-mono text-amber-400 font-bold">{density.toFixed(3)}</span>
              <span className="text-[10px] text-slate-500">kg/L</span>
              <Settings2 className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Density Popover */}
            {showDensityPopover && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl z-40 text-xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 font-bold text-white">
                  <span>Faktor Berat Jenis (Density)</span>
                  <span className="text-[10px] text-amber-400">Solar / HSD</span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  Rumus: <span className="font-mono text-white">Tonase (MT) = (Liter × BJ) ÷ 1.000</span>
                </p>

                <div className="space-y-1.5 mb-3">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Pilihan Standar:</div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onChangeDensity) onChangeDensity(0.840);
                      setCustomDensityInput('0.840');
                      setShowDensityPopover(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-xs flex justify-between items-center cursor-pointer ${
                      density === 0.840
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>0.840 kg/L (Standar Pertamina Solar HSD)</span>
                    {density === 0.840 && <span>✓</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onChangeDensity) onChangeDensity(0.845);
                      setCustomDensityInput('0.845');
                      setShowDensityPopover(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-xs flex justify-between items-center cursor-pointer ${
                      density === 0.845
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>0.845 kg/L (Biosolar B30 / B35)</span>
                    {density === 0.845 && <span>✓</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onChangeDensity) onChangeDensity(0.850);
                      setCustomDensityInput('0.850');
                      setShowDensityPopover(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-xs flex justify-between items-center cursor-pointer ${
                      density === 0.850
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>0.850 kg/L (MGO - Marine Gas Oil)</span>
                    {density === 0.850 && <span>✓</span>}
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <label className="text-[10px] text-slate-400 block mb-1">Kustom Nilai BJ (kg/L):</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customDensityInput}
                      onChange={e => setCustomDensityInput(e.target.value)}
                      placeholder="0.840"
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs w-full font-mono focus:border-amber-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCustomDensity}
                      className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-amber-400 cursor-pointer"
                    >
                      Terapkan
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. TOTAL MASUK */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">Total Masuk</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            {masuk.primary}
          </div>
          <div className="mt-1 text-[11px] font-mono text-emerald-400/90 font-medium">
            {masuk.secondary}
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Inflow Tangki Penerimaan</span>
            <span className="text-emerald-400 font-medium">{metrics.transaksiMasukCount} Pengisian</span>
          </div>
        </div>

        {/* 2. TOTAL KELUAR */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-amber-400">Total Keluar</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            {keluar.primary}
          </div>
          <div className="mt-1 text-[11px] font-mono text-amber-400/90 font-medium">
            {keluar.secondary}
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Bunkering ke Kapal & Mobil</span>
            <span className="text-amber-400 font-medium">{metrics.transaksiKeluarCount} Distribusi</span>
          </div>
        </div>

        {/* 3. TOTAL KESELURUHAN (MASUK + KELUAR) */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-blue-400">Total Keseluruhan</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            {total.primary}
          </div>
          <div className="mt-1 text-[11px] font-mono text-blue-400/90 font-medium">
            {total.secondary}
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Total Aliran Masuk + Keluar</span>
            <span className="text-blue-400 font-medium">{metrics.totalTransaksi} Total Transaksi</span>
          </div>
        </div>

        {/* 4. NERACA PERUBAHAN STOK */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-purple-400">Neraca Saldo Stok</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl lg:text-3xl font-extrabold tracking-tight ${metrics.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {saldo.primary}
          </div>
          <div className={`mt-1 text-[11px] font-mono font-medium ${metrics.netBalance >= 0 ? 'text-emerald-400/90' : 'text-rose-400/90'}`}>
            {saldo.secondary}
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Selisih (Masuk - Keluar)</span>
            <span className={`font-semibold ${metrics.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {metrics.netBalance >= 0 ? 'Surplus Masuk' : 'Net Pengeluaran'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
