import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  FileText,
  Download,
  Printer,
  Calendar,
  Fuel,
  CheckCircle2,
  Package,
  Layers,
  Ship,
  Sparkles,
  Filter
} from 'lucide-react';
import {
  BunkeringRecord,
  UnitMode,
  DEFAULT_DENSITY,
  convertLiterToTon,
  formatNumber,
  formatFuel
} from '../utils/bunkeringData';
import {
  getAvailableMonthKeys,
  filterRecordsByMonth,
  generateMonthlyReportPDF,
  calculateShipKotakanMonthlySummary,
  generateShipKotakanReportPDF,
  ShipKotakanSummary
} from '../utils/pdfMonthlyReport';
import { KOP_HEADER_BASE64 } from '../utils/kopSuratAssets';

export type MonthlyReportType = 'OPERASIONAL' | 'KOTAKAN_KAPAL';

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: BunkeringRecord[];
  companyName?: string;
  unitMode?: UnitMode;
  density?: number;
  initialReportType?: MonthlyReportType;
}

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({
  isOpen,
  onClose,
  records,
  companyName = 'PT. ANGKA PETROLEUM RAYA',
  unitMode = 'LITER',
  density = DEFAULT_DENSITY,
  initialReportType = 'OPERASIONAL'
}) => {
  const availableMonths = useMemo(() => {
    return getAvailableMonthKeys(records);
  }, [records]);

  // Default to the first available month, or 'ALL'
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    return availableMonths[0]?.key || 'ALL';
  });

  const [reportType, setReportType] = useState<MonthlyReportType>(initialReportType);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [pdfUnitMode, setPdfUnitMode] = useState<UnitMode>(unitMode);
  const [onlyWithKotakan, setOnlyWithKotakan] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Sync initialReportType when modal opens or prop changes
  useEffect(() => {
    if (initialReportType) {
      setReportType(initialReportType);
      // Kotakan report is very clean in portrait or landscape
      if (initialReportType === 'KOTAKAN_KAPAL') {
        setOrientation('portrait');
      } else {
        setOrientation('landscape');
      }
    }
  }, [initialReportType, isOpen]);

  const isTon = pdfUnitMode === 'TONASE';
  const unitSuffix = isTon ? 'MT' : 'L';

  const previewVol = (liters: number) => {
    if (!liters || liters <= 0) return '-';
    if (isTon) {
      return formatNumber(convertLiterToTon(liters, density), 3);
    }
    return formatNumber(liters);
  };

  // Filtered records based on selected month
  const monthlyRecords = useMemo(() => {
    return filterRecordsByMonth(records, selectedMonthKey);
  }, [records, selectedMonthKey]);

  // Selected Month label
  const currentMonthLabel = useMemo(() => {
    if (selectedMonthKey === 'ALL') return 'Seluruh Periode';
    const found = availableMonths.find(m => m.key === selectedMonthKey);
    return found ? found.label : selectedMonthKey;
  }, [selectedMonthKey, availableMonths]);

  // 1. Calculations for Operational Report
  const monthlyTotals = useMemo(() => {
    let keluar = 0;
    let masuk = 0;
    let bungkerA = 0;
    let bungkerB = 0;

    monthlyRecords.forEach(r => {
      const k = r.keluar || 0;
      const m = r.masuk || 0;
      keluar += k;
      masuk += m;

      const ket = (r.keterangan || '').toUpperCase();
      if (ket.includes('BUNKERING A') || ket === 'A') {
        bungkerA += (k > 0 ? k : m);
      } else if (ket.includes('BUNKERING B') || ket === 'B') {
        bungkerB += (k > 0 ? k : m);
      }
    });

    return {
      keluar,
      masuk,
      bungkerA,
      bungkerB,
      totalFlow: keluar + masuk,
      count: monthlyRecords.length
    };
  }, [monthlyRecords]);

  // 2. Calculations for Ship Kotakan Report (Sorted Descending by Total Kotakan)
  const { ships: allShips, grandTotal: shipGrandTotal } = useMemo(() => {
    return calculateShipKotakanMonthlySummary(monthlyRecords);
  }, [monthlyRecords]);

  const displayedShips = useMemo(() => {
    if (onlyWithKotakan) {
      return allShips.filter(s => s.totalKotakan > 0);
    }
    return allShips;
  }, [allShips, onlyWithKotakan]);

  const displayedShipTotals = useMemo(() => {
    return {
      totalKapal: displayedShips.length,
      totalKeluar: displayedShips.reduce((acc, s) => acc + s.totalKeluar, 0),
      totalKotakan: displayedShips.reduce((acc, s) => acc + s.totalKotakan, 0)
    };
  }, [displayedShips]);

  if (!isOpen) return null;

  const handleDownloadPDF = () => {
    setIsGeneratingPdf(true);
    try {
      const cleanLabel = currentMonthLabel.replace(/\s+/g, '_');
      const unitTag = isTon ? 'TONASE' : 'LITER';
      const compSlug = companyName.replace(/[^a-zA-Z0-9]/g, '_');

      if (reportType === 'KOTAKAN_KAPAL') {
        const doc = generateShipKotakanReportPDF(
          monthlyRecords,
          currentMonthLabel,
          companyName,
          orientation,
          {
            unitMode: pdfUnitMode,
            density,
            onlyWithKotakan
          }
        );
        doc.save(`Laporan_Bulanan_Kotakan_Kapal_${compSlug}_${cleanLabel}_${unitTag}.pdf`);
      } else {
        const doc = generateMonthlyReportPDF(
          monthlyRecords,
          currentMonthLabel,
          companyName,
          orientation,
          {
            unitMode: pdfUnitMode,
            density
          }
        );
        doc.save(`Laporan_Bulanan_Bunkering_${compSlug}_${cleanLabel}_${unitTag}.pdf`);
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    try {
      let doc;
      if (reportType === 'KOTAKAN_KAPAL') {
        doc = generateShipKotakanReportPDF(
          monthlyRecords,
          currentMonthLabel,
          companyName,
          orientation,
          {
            unitMode: pdfUnitMode,
            density,
            onlyWithKotakan
          }
        );
      } else {
        doc = generateMonthlyReportPDF(
          monthlyRecords,
          currentMonthLabel,
          companyName,
          orientation,
          {
            unitMode: pdfUnitMode,
            density
          }
        );
      }
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
      }
    } catch (err) {
      console.error('Error printing PDF:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full p-5 sm:p-7 shadow-2xl relative my-6 flex flex-col max-h-[92vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
              reportType === 'KOTAKAN_KAPAL'
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-amber-500/10'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-400 shadow-rose-500/10'
            }`}>
              {reportType === 'KOTAKAN_KAPAL' ? (
                <Package className="w-6 h-6" />
              ) : (
                <FileText className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {reportType === 'KOTAKAN_KAPAL' ? 'Laporan Bulanan Kotakan' : 'Laporan PDF Bulanan'}
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  KOP RESMI
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {reportType === 'KOTAKAN_KAPAL'
                  ? `Rekapitulasi Kotakan per Nama Kapal diurutkan terbanyak — ${companyName}`
                  : `Format resmi Laporan Bulanan Operasional Bunkering — ${companyName}`}
              </p>
            </div>
          </div>

          {/* Month Selector & Download Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[11px] text-slate-400 font-medium">Bulan:</span>
              <select
                value={selectedMonthKey}
                onChange={e => setSelectedMonthKey(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer pr-1"
              >
                <option value="ALL" className="bg-slate-900 text-white">Semua Periode Transaksi</option>
                {availableMonths.map(m => (
                  <option key={m.key} value={m.key} className="bg-slate-900 text-white">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Orientation Switch */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  orientation === 'portrait'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Format Portrait (Tegak A4 - Disarankan untuk Laporan Kotakan)"
              >
                Portrait
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  orientation === 'landscape'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Format Landscape (Lebar)"
              >
                Landscape
              </button>
            </div>

            {/* Satuan: Liter vs Tonase */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setPdfUnitMode('LITER')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  pdfUnitMode === 'LITER'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Format Laporan PDF dalam satuan Liter"
              >
                Liter (L)
              </button>
              <button
                type="button"
                onClick={() => setPdfUnitMode('TONASE')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  pdfUnitMode === 'TONASE'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Format Laporan PDF dalam satuan Tonase (MT)"
              >
                Tonase (MT)
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-all cursor-pointer border border-slate-700"
              title="Pratinjau & Cetak Dokumen"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Unduh PDF (.pdf)'}</span>
            </button>
          </div>
        </div>

        {/* Report Type Selector Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 pb-1 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setReportType('OPERASIONAL');
                setOrientation('landscape');
              }}
              className={`px-3.5 py-2 font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                reportType === 'OPERASIONAL'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>1. Laporan Bulanan Operasional (7 Kolom)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-normal">
                {monthlyRecords.length}
              </span>
            </button>

            <button
              onClick={() => {
                setReportType('KOTAKAN_KAPAL');
                setOrientation('portrait');
              }}
              className={`px-3.5 py-2 font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                reportType === 'KOTAKAN_KAPAL'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Package className="w-4 h-4 text-amber-400" />
              <span>2. Laporan Kotakan Kapal (4 Kolom)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-bold">
                {allShips.length} Kapal
              </span>
            </button>
          </div>

          {/* Additional Filter for Kotakan */}
          {reportType === 'KOTAKAN_KAPAL' && (
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1">
              <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyWithKotakan}
                  onChange={e => setOnlyWithKotakan(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-[11px]">Hanya Kapal dengan Kotakan ({allShips.filter(s => s.totalKotakan > 0).length})</span>
              </label>
            </div>
          )}
        </div>

        {/* Quick KPI Summary Bar */}
        {reportType === 'OPERASIONAL' ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 my-3">
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-400 font-medium block">Total Transaksi</span>
              <span className="text-sm font-bold text-white">{monthlyTotals.count} Baris</span>
            </div>
            <div className="bg-slate-950/70 border border-amber-500/20 rounded-xl p-2.5">
              <span className="text-[10px] text-amber-400 font-medium block">Total Keluar ({unitSuffix})</span>
              <span className="text-sm font-bold text-amber-300">{formatFuel(monthlyTotals.keluar, pdfUnitMode, density)}</span>
            </div>
            <div className="bg-slate-950/70 border border-emerald-500/20 rounded-xl p-2.5">
              <span className="text-[10px] text-emerald-400 font-medium block">Total Masuk ({unitSuffix})</span>
              <span className="text-sm font-bold text-emerald-300">{formatFuel(monthlyTotals.masuk, pdfUnitMode, density)}</span>
            </div>
            <div className="bg-slate-950/70 border border-blue-500/20 rounded-xl p-2.5">
              <span className="text-[10px] text-blue-400 font-medium block">Bungker A Total</span>
              <span className="text-sm font-bold text-blue-300">{formatFuel(monthlyTotals.bungkerA, pdfUnitMode, density)}</span>
            </div>
            <div className="bg-slate-950/70 border border-purple-500/20 rounded-xl p-2.5 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-purple-400 font-medium block">Bungker B Total</span>
              <span className="text-sm font-bold text-purple-300">{formatFuel(monthlyTotals.bungkerB, pdfUnitMode, density)}</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3">
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-400 font-medium block">Jumlah Armada / Kapal</span>
              <span className="text-sm font-bold text-white">{displayedShipTotals.totalKapal} Kapal</span>
            </div>
            <div className="bg-slate-950/70 border border-amber-500/20 rounded-xl p-2.5">
              <span className="text-[10px] text-amber-400 font-medium block">Total Keluar Minyak ({unitSuffix})</span>
              <span className="text-sm font-bold text-amber-300">{formatFuel(displayedShipTotals.totalKeluar, pdfUnitMode, density)}</span>
            </div>
            <div className="bg-slate-950/70 border border-yellow-500/20 rounded-xl p-2.5">
              <span className="text-[10px] text-yellow-400 font-medium block">Total Jumlah Kotakan</span>
              <span className="text-sm font-extrabold text-yellow-300">{displayedShipTotals.totalKotakan}</span>
            </div>
            <div className="bg-slate-950/70 border border-emerald-500/20 rounded-xl p-2.5">
              <span className="text-[10px] text-emerald-400 font-medium block">Kapal Kotakan Terbanyak (Top 1)</span>
              <span className="text-xs font-bold text-emerald-300 truncate block" title={allShips[0]?.displayKapal}>
                {allShips[0]?.displayKapal || '-'} ({allShips[0]?.totalKotakan || 0})
              </span>
            </div>
          </div>
        )}

        {/* Content Preview Container (Emulating Real Paper Document) */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          <div className="bg-white text-slate-900 rounded-2xl p-5 sm:p-6 shadow-inner border border-slate-200 font-sans">
            {/* Real KOP Surat from User's PDF */}
            <div className="text-center pb-2">
              <img
                src={KOP_HEADER_BASE64}
                alt="KOP Surat PT. ANGKA PETROLEUM RAYA"
                className="w-full max-w-2xl mx-auto block object-contain"
              />
            </div>

            {/* Document Title */}
            <div className="text-center py-2.5">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-wide">
                {reportType === 'KOTAKAN_KAPAL'
                  ? 'LAPORAN BULANAN KOTAKAN PER NAMA KAPAL'
                  : 'LAPORAN BULANAN OPERASIONAL BUNKERING'}
              </h3>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Periode: <strong className="text-slate-900">{currentMonthLabel}</strong> • Tanggal Cetak:{' '}
                {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                {reportType === 'KOTAKAN_KAPAL' && (
                  <span className="text-amber-800 font-semibold block mt-0.5">
                    Urutan: Total Jumlah Kotakan Terbanyak (Descending)
                  </span>
                )}
              </p>
            </div>

            {/* VIEW 1: Main Monthly Operational Table (7 Kolom Tanpa Kotakan) */}
            {reportType === 'OPERASIONAL' && (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold text-[10.5px]">
                      <th className="p-2 border border-slate-700 text-center w-8">No</th>
                      <th className="p-2 border border-slate-700 text-center">1. Tanggal</th>
                      <th className="p-2 border border-slate-700 text-center">2. Nomor DN</th>
                      <th className="p-2 border border-slate-700">3. PT / Nama Kapal</th>
                      <th className="p-2 border border-slate-700 text-right">4. Keluar ({unitSuffix})</th>
                      <th className="p-2 border border-slate-700 text-right">5. Masuk ({unitSuffix})</th>
                      <th className="p-2 border border-slate-700 text-right">6. Bungker A Total ({unitSuffix})</th>
                      <th className="p-2 border border-slate-700 text-right">7. Bungker B Total ({unitSuffix})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {monthlyRecords.map((r, idx) => {
                      const k = r.keluar || 0;
                      const m = r.masuk || 0;
                      const ket = (r.keterangan || '').toUpperCase();
                      const isBungkerA = ket.includes('BUNKERING A') || ket === 'A';
                      const isBungkerB = ket.includes('BUNKERING B') || ket === 'B';
                      const bAVol = isBungkerA ? (k > 0 ? k : m) : 0;
                      const bBVol = isBungkerB ? (k > 0 ? k : m) : 0;

                      return (
                        <tr key={r.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80 hover:bg-amber-50/50'}>
                          <td className="p-1.5 border border-slate-300 text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="p-1.5 border border-slate-300 text-center whitespace-nowrap font-medium text-slate-700">{r.tanggal || '-'}</td>
                          <td className="p-1.5 border border-slate-300 text-center font-mono font-bold text-slate-800">{r.nomorDn || '-'}</td>
                          <td className="p-1.5 border border-slate-300">
                            <span className="font-bold text-slate-900">{r.pt}</span>
                            {r.namaKapalMobil && (
                              <span className="text-slate-600 ml-1 block sm:inline text-[10px]">
                                - {r.namaKapalMobil}
                              </span>
                            )}
                          </td>
                          <td className="p-1.5 border border-slate-300 text-right font-mono font-bold text-amber-700">
                            {previewVol(k)}
                          </td>
                          <td className="p-1.5 border border-slate-300 text-right font-mono font-bold text-emerald-700">
                            {previewVol(m)}
                          </td>
                          <td className="p-1.5 border border-slate-300 text-right font-mono text-blue-800">
                            {previewVol(bAVol)}
                          </td>
                          <td className="p-1.5 border border-slate-300 text-right font-mono text-purple-800">
                            {previewVol(bBVol)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold text-slate-950 border-t-2 border-slate-900">
                      <td colSpan={3} className="p-2 border border-slate-300 text-center">TOTAL KESELURUHAN</td>
                      <td className="p-2 border border-slate-300 text-slate-600">{monthlyRecords.length} Transaksi</td>
                      <td className="p-2 border border-slate-300 text-right font-mono text-amber-800">{previewVol(monthlyTotals.keluar)} {unitSuffix}</td>
                      <td className="p-2 border border-slate-300 text-right font-mono text-emerald-800">{previewVol(monthlyTotals.masuk)} {unitSuffix}</td>
                      <td className="p-2 border border-slate-300 text-right font-mono text-blue-900">{previewVol(monthlyTotals.bungkerA)} {unitSuffix}</td>
                      <td className="p-2 border border-slate-300 text-right font-mono text-purple-900">{previewVol(monthlyTotals.bungkerB)} {unitSuffix}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* VIEW 2: Laporan Bulanan Kotakan (4 Kolom Sesuai Permintaan User) */}
            {reportType === 'KOTAKAN_KAPAL' && (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-amber-800 text-white font-bold text-[11px]">
                      <th className="p-2.5 border border-amber-900 text-center w-12">No</th>
                      <th className="p-2.5 border border-amber-900">1. Nama Kapal</th>
                      <th className="p-2.5 border border-amber-900 text-right">2. Keluar Minyak ({unitSuffix})</th>
                      <th className="p-2.5 border border-amber-900 text-center w-32">3. Kotakan</th>
                      <th className="p-2.5 border border-amber-900 text-center w-36">4. Pengawas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {displayedShips.map((s, idx) => (
                      <tr
                        key={`${s.pt}-${s.namaKapal}`}
                        className={
                          s.totalKotakan > 0
                            ? idx % 2 === 0
                              ? 'bg-amber-50/40 hover:bg-amber-100/60'
                              : 'bg-white hover:bg-amber-100/60'
                            : idx % 2 === 0
                            ? 'bg-white'
                            : 'bg-slate-50/70'
                        }
                      >
                        <td className="p-2 border border-slate-300 text-center font-mono text-slate-500 font-medium">
                          {idx + 1}
                        </td>
                        <td className="p-2 border border-slate-300">
                          <span className="font-bold text-slate-900">{s.displayKapal}</span>
                          {s.tripCount > 1 && (
                            <span className="ml-2 px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
                              {s.tripCount}x trip
                            </span>
                          )}
                        </td>
                        <td className="p-2 border border-slate-300 text-right font-mono font-bold text-amber-900">
                          {previewVol(s.totalKeluar)}
                        </td>
                        <td className="p-2 border border-slate-300 text-center">
                          {s.totalKotakan > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-extrabold bg-amber-500 text-slate-950 shadow-sm ring-1 ring-amber-600/30">
                              {s.totalKotakan}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">-</span>
                          )}
                        </td>
                        <td className="p-2 border border-slate-300 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10.5px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {s.pengawas || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-amber-100 font-extrabold text-amber-950 border-t-2 border-amber-800 text-[11.5px]">
                      <td colSpan={2} className="p-2.5 border border-amber-300 text-left">
                        TOTAL KESELURUHAN ({displayedShipTotals.totalKapal} Kapal)
                      </td>
                      <td className="p-2.5 border border-amber-300 text-right font-mono">
                        {previewVol(displayedShipTotals.totalKeluar)} {unitSuffix}
                      </td>
                      <td className="p-2.5 border border-amber-300 text-center font-mono text-base font-black text-amber-900">
                        {displayedShipTotals.totalKotakan}
                      </td>
                      <td className="p-2.5 border border-amber-300 text-center text-slate-500 font-normal">
                        -
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Document Signature Footers */}
            <div className="grid grid-cols-3 gap-4 pt-10 text-center text-xs text-slate-700 border-t border-slate-200 mt-8">
              <div>
                <p className="font-medium text-slate-500">Dibuat Oleh,</p>
                <p className="font-bold text-slate-800 mb-12">Pengawas Bunkering</p>
                <div className="w-3/4 mx-auto border-b border-slate-400"></div>
                <p className="font-bold text-slate-900 mt-1">( DAYAT / LOLI / ELMAN )</p>
              </div>

              <div>
                <p className="font-medium text-slate-500">Diperiksa Oleh,</p>
                <p className="font-bold text-slate-800 mb-12">Koordinator Lapangan</p>
                <div className="w-3/4 mx-auto border-b border-slate-400"></div>
                <p className="font-bold text-slate-900 mt-1">( ........................................ )</p>
              </div>

              <div>
                <p className="font-medium text-slate-500">Disetujui Oleh,</p>
                <p className="font-bold text-slate-800 mb-12">Manajemen Operasional</p>
                <div className="w-3/4 mx-auto border-b border-slate-400"></div>
                <p className="font-bold text-slate-900 mt-1">{companyName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 hidden sm:inline">
            Menampilkan data periode: <strong className="text-white">{currentMonthLabel}</strong>
            {reportType === 'KOTAKAN_KAPAL' && (
              <span className="text-amber-400 ml-2">
                • Mode: Laporan Kotakan Kapal (Diurutkan Terbanyak)
              </span>
            )}
          </span>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="px-5 py-2 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>
                {isGeneratingPdf
                  ? 'Membuat PDF...'
                  : reportType === 'KOTAKAN_KAPAL'
                  ? 'Unduh PDF Kotakan Kapal'
                  : 'Unduh Laporan PDF'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
