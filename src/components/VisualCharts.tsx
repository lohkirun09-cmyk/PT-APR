import React, { useState } from 'react';
import { BarChart3, PieChart, TrendingUp, Building2, Box, Award, Shield, Fuel } from 'lucide-react';
import {
  DashboardMetrics,
  PTVolumeStat,
  KotakanStat,
  UnitMode,
  DEFAULT_DENSITY,
  convertLiterToTon,
  formatTonase,
  formatLiter,
  formatNumber
} from '../utils/bunkeringData';

interface VisualChartsProps {
  metrics: DashboardMetrics;
  onSelectPTFilter?: (pt: string) => void;
  onSelectKotakanFilter?: (kotakan: string) => void;
  unitMode?: UnitMode;
  density?: number;
}

export const VisualCharts: React.FC<VisualChartsProps> = ({
  metrics,
  onSelectPTFilter,
  onSelectKotakanFilter,
  unitMode = 'LITER',
  density = DEFAULT_DENSITY
}) => {
  const [hoveredPT, setHoveredPT] = useState<PTVolumeStat | null>(null);
  const [hoveredKotakan, setHoveredKotakan] = useState<KotakanStat | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tankSupervisor'>('overview');

  const formatV = (liters: number) => {
    if (unitMode === 'TONASE') {
      return formatTonase(convertLiterToTon(liters, density), 2);
    }
    return formatLiter(liters);
  };

  // Max volume for scaling Top PT bar chart
  const maxPTVolume = metrics.top5PT.length > 0
    ? Math.max(...metrics.top5PT.map(p => Math.max(p.volumeKeluar, p.volumeMasuk, 1)))
    : 1;

  // Max count for scaling Kotakan bar chart
  const maxKotakanCount = metrics.top5Kotakan.length > 0
    ? Math.max(...metrics.top5Kotakan.map(k => k.count), 1)
    : 1;

  return (
    <div className="space-y-6 mb-8">
      {/* Top 5 PT and Top 5 Kotakan Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ========================================================= */}
        {/* CHART 1: 5 TOP NAMA PT TERBANYAK */}
        {/* ========================================================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    5 Top Nama PT Terbanyak
                    <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      Volume Keluar ({unitMode === 'TONASE' ? 'MT' : 'Liter'})
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">Peringkat konsumen bahan bakar dengan volume bunkering terbesar</p>
                </div>
              </div>
            </div>

            {/* List and Interactive Bars */}
            <div className="mt-4 space-y-3.5">
              {metrics.top5PT.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  Tidak ada data PT pada filter tanggal ini.
                </div>
              ) : (
                metrics.top5PT.map((ptItem, index) => {
                  const widthPercent = Math.max(8, (ptItem.volumeKeluar / maxPTVolume) * 100);
                  const isHovered = hoveredPT?.pt === ptItem.pt;

                  return (
                    <div
                      key={ptItem.pt}
                      onMouseEnter={() => setHoveredPT(ptItem)}
                      onMouseLeave={() => setHoveredPT(null)}
                      onClick={() => onSelectPTFilter && onSelectPTFilter(ptItem.pt)}
                      className={`p-3 rounded-xl transition-all cursor-pointer border ${
                        isHovered
                          ? 'bg-slate-800/90 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                          : 'bg-slate-950/50 border-slate-800/60 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2 font-semibold">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              index === 0
                                ? 'bg-amber-500 text-slate-950'
                                : index === 1
                                ? 'bg-slate-300 text-slate-950'
                                : index === 2
                                ? 'bg-amber-700 text-white'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span className="text-white text-sm">{ptItem.pt}</span>
                          <span className="text-slate-400 text-[11px] font-normal">
                            ({ptItem.tripCount} transaksi)
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-amber-400 font-bold text-sm">
                            {formatV(ptItem.volumeKeluar)}
                          </span>
                          <span className="text-slate-500 text-[10px] ml-1.5">
                            ({ptItem.percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>

                      {/* Interactive Progress Bar */}
                      <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>

                      {ptItem.volumeMasuk > 0 && (
                        <div className="mt-1 text-[10px] text-emerald-400 flex items-center justify-between">
                          <span>Volume Masuk (Penerimaan):</span>
                          <span>+{formatV(ptItem.volumeMasuk)}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between text-xs text-slate-400">
            <span>Total 5 PT teratas:</span>
            <span className="text-white font-semibold">
              {formatV(metrics.top5PT.reduce((acc, curr) => acc + curr.volumeKeluar, 0))}
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CHART 2: 5 TOP KOTAKAN TERBANYAK */}
        {/* ========================================================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Box className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    5 Top Kotakan Terbanyak
                    <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                      Frekuensi Kotakan
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">Distribusi kotakan BBM & rekap status (KASIH / TIDAK / NEXT)</p>
                </div>
              </div>
            </div>

            {/* List and Status Badges */}
            <div className="mt-4 space-y-3.5">
              {metrics.top5Kotakan.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  Tidak ada data kotakan pada filter ini.
                </div>
              ) : (
                metrics.top5Kotakan.map((kItem, index) => {
                  const widthPercent = Math.max(10, (kItem.count / maxKotakanCount) * 100);
                  const isHovered = hoveredKotakan?.kotakan === kItem.kotakan;

                  return (
                    <div
                      key={kItem.kotakan}
                      onMouseEnter={() => setHoveredKotakan(kItem)}
                      onMouseLeave={() => setHoveredKotakan(null)}
                      onClick={() => onSelectKotakanFilter && onSelectKotakanFilter(kItem.kotakan)}
                      className={`p-3 rounded-xl transition-all cursor-pointer border ${
                        isHovered
                          ? 'bg-slate-800/90 border-blue-500/50 shadow-md ring-1 ring-blue-500/30'
                          : 'bg-slate-950/50 border-slate-800/60 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2 font-semibold">
                          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold">
                            {kItem.kotakan.startsWith('Tidak') ? 'Non-Kotakan' : `Kotakan ${kItem.kotakan}`}
                          </span>
                          <span className="text-slate-300 font-normal text-xs">
                            {kItem.count}x kejadian
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-blue-400 font-bold text-sm">
                            {kItem.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Stacked Status Indicator Bar */}
                      <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                        {/* KASIH portion */}
                        {kItem.kasihCount > 0 && (
                          <div
                            className="h-full bg-emerald-500 transition-all"
                            style={{ width: `${(kItem.kasihCount / kItem.count) * 100}%` }}
                            title={`KASIH: ${kItem.kasihCount}`}
                          />
                        )}
                        {/* NEXT TRIP portion */}
                        {kItem.nextTripCount > 0 && (
                          <div
                            className="h-full bg-amber-500 transition-all"
                            style={{ width: `${(kItem.nextTripCount / kItem.count) * 100}%` }}
                            title={`NEXT TRIP: ${kItem.nextTripCount}`}
                          />
                        )}
                        {/* TIDAK KASIH portion */}
                        {kItem.tidakKasihCount > 0 && (
                          <div
                            className="h-full bg-rose-500 transition-all"
                            style={{ width: `${(kItem.tidakKasihCount / kItem.count) * 100}%` }}
                            title={`TIDAK KASIH: ${kItem.tidakKasihCount}`}
                          />
                        )}
                      </div>

                      {/* Status Count Badges */}
                      <div className="mt-2 flex items-center gap-2 text-[10px]">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          Kasih: <strong>{kItem.kasihCount}</strong>
                        </span>
                        <span className="flex items-center gap-1 text-rose-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                          Tidak Kasih: <strong>{kItem.tidakKasihCount}</strong>
                        </span>
                        <span className="flex items-center gap-1 text-amber-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                          Next Trip: <strong>{kItem.nextTripCount}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Kotakan Global Status Footer */}
          <div className="mt-4 pt-3 border-t border-slate-800/70 flex flex-wrap items-center justify-between text-xs gap-2">
            <span className="text-slate-400">Ringkasan Status:</span>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 font-medium">
                KASIH: {metrics.kotakanStatusSummary.kasih}
              </span>
              <span className="text-rose-400 font-medium">
                TIDAK: {metrics.kotakanStatusSummary.tidakKasih}
              </span>
              <span className="text-amber-400 font-medium">
                NEXT: {metrics.kotakanStatusSummary.nextTrip}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Operational Breakdowns (Tanks & Supervisors) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tangki Bunkering Compartment */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Fuel className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Kompartemen Tangki (1S, 1P, 2S, 2P, 3S, 3P, 4S, 4P)</h3>
                <p className="text-[11px] text-slate-400">Aktivitas pengeluaran dan penerimaan per tangki</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {['1S', '1P', '2S', '2P', '3S', '3P', '4S', '4P'].map(tankName => {
              const stat = metrics.tangkiStats.find(t => t.tangki === tankName);
              const totalVol = stat ? (stat.keluar + stat.masuk) : 0;
              const hasActivity = totalVol > 0;

              return (
                <div
                  key={tankName}
                  className={`p-3 rounded-xl border transition-all ${
                    hasActivity
                      ? 'bg-slate-950/70 border-purple-500/30 hover:border-purple-500/60'
                      : 'bg-slate-950/30 border-slate-850 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-white text-sm">Tangki {tankName}</span>
                    <span className="text-[10px] text-purple-400 font-semibold">
                      {stat ? `${stat.count}x` : '0x'}
                    </span>
                  </div>
                  <div className="text-xs text-amber-400 font-bold">
                    {stat && stat.keluar > 0 ? formatV(stat.keluar) : '-'}
                  </div>
                  {stat && stat.masuk > 0 && (
                    <div className="text-[10px] text-emerald-400">
                      +{formatV(stat.masuk)}
                    </div>
                  )}
                  {!hasActivity && (
                    <div className="text-[10px] text-slate-600">Standby</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Pengawas Operasional */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Pengawas Operasional (LOLI, ELMAN, DAYAT)</h3>
                <p className="text-[11px] text-slate-400">Distribusi volume ({unitMode === 'TONASE' ? 'MT' : 'Liter'}) dan frekuensi pengawasan transaksi</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {['LOLI', 'ELMAN', 'DAYAT'].map(name => {
              const stat = metrics.pengawasStats.find(p => p.pengawas.toUpperCase() === name);
              const vol = stat?.volume || 0;
              const trips = stat?.tripCount || 0;

              return (
                <div
                  key={name}
                  className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 hover:border-teal-500/40 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white text-sm tracking-wide">{name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-500/20 text-teal-300">
                      {trips} Pengawasan
                    </span>
                  </div>
                  <div className="text-base font-extrabold text-teal-400">
                    {formatV(vol)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Porsi:{' '}
                    {metrics.totalKeseluruhan > 0
                      ? `${((vol / metrics.totalKeseluruhan) * 100).toFixed(1)}%`
                      : '0%'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
