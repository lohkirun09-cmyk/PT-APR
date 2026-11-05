import React, { useState, useRef, useEffect } from 'react';
import {
  Fuel,
  CheckCircle2,
  Plus,
  FileText,
  Package,
  FileSpreadsheet,
  Wrench,
  Database,
  ChevronDown,
  Layers,
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  companyName: string;
  totalRecords: number;
  lastSyncTime: string | null;
  sheetSource: 'default' | 'googlesheets' | 'custom_csv';
  isTwoWaySyncActive?: boolean;
  anomalyCount?: number;
  onOpenSpreadsheetModal: () => void;
  onOpenCorrectionModal: () => void;
  onOpenAddModal: () => void;
  onOpenMonthlyPdfModal: () => void;
  onOpenKotakanPdfModal: () => void;
  onExportExcel: () => void;
  onResetData?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  companyName,
  totalRecords,
  lastSyncTime,
  sheetSource,
  isTwoWaySyncActive = false,
  anomalyCount = 0,
  onOpenSpreadsheetModal,
  onOpenCorrectionModal,
  onOpenAddModal,
  onOpenMonthlyPdfModal,
  onOpenKotakanPdfModal,
  onExportExcel,
  onResetData,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu on click outside or escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Brand & Title */}
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 ring-2 ring-amber-400/30 shrink-0">
              <Fuel className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight text-white">{companyName}</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  BUNKERING OPS
                </span>
                {isTwoWaySyncActive && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    2-Arah Aktif
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                <span>Dashboard Aliran BBM & Terkoneksi Spreadsheet</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {sheetSource === 'googlesheets' ? 'Terkoneksi Google Sheets' : 'Dataset Aktif'} ({totalRecords} Baris)
                </span>
                {lastSyncTime && (
                  <>
                    <span>•</span>
                    <span className="text-slate-400">Sinkron: {lastSyncTime}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Unified Action Controls: 1 Single Dropdown Menu & 1 Primary Action */}
          <div className="flex items-center gap-2.5 self-start md:self-auto relative">
            {/* 1 Tempat: Unified Dropdown Menu Button */}
            <div className="relative z-50">
              <button
                ref={buttonRef}
                onClick={() => setIsMenuOpen(prev => !prev)}
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95 border ${
                  isMenuOpen
                    ? 'bg-slate-800 text-amber-300 border-amber-400/50 ring-2 ring-amber-400/20'
                    : 'bg-slate-800/90 hover:bg-slate-800 text-slate-100 hover:text-white border-slate-700'
                }`}
                title="Pusat Menu Laporan, Ekspor, Koreksi Data & Koneksi Spreadsheet"
              >
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Pusat Laporan & Menu</span>

                {/* Anomaly Badge Indicator */}
                {anomalyCount > 0 && (
                  <span
                    className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-slate-950 shadow-sm"
                    title={`${anomalyCount} anomali input terdeteksi`}
                  >
                    {anomalyCount}
                  </span>
                )}

                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    isMenuOpen ? 'rotate-180 text-amber-400' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu Popover */}
              {isMenuOpen && (
                <div
                  ref={menuRef}
                  className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl ring-1 ring-white/10"
                >
                  {/* Bagian 1: Laporan & Dokumen Ekspor */}
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between border-b border-slate-800/80 mb-1">
                    <span>📑 Laporan & Ekspor Dokumen</span>
                    <span className="text-[10px] text-amber-400 font-medium">KOP PT. APR</span>
                  </div>

                  <div className="space-y-1">
                    {/* 1. Laporan PDF Bulanan (7 Kolom) */}
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenMonthlyPdfModal();
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-slate-800/90 transition-colors group cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white group-hover:text-rose-300 flex items-center justify-between">
                          <span>Laporan PDF Bulanan</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            7 Kolom
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          Format resmi KOP PT. Angka Petroleum Raya
                        </p>
                      </div>
                    </button>

                    {/* 2. Laporan Kotakan Kapal PDF (4 Kolom) */}
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenKotakanPdfModal();
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-slate-800/90 transition-colors group cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white group-hover:text-amber-300 flex items-center justify-between">
                          <span>Laporan Kotakan PDF</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            4 Kolom
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          Peringkat kotakan per kapal (terbanyak ke bawah)
                        </p>
                      </div>
                    </button>

                    {/* 3. Unduh Excel (.xlsx) */}
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onExportExcel();
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-slate-800/90 transition-colors group cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white group-hover:text-emerald-300 flex items-center justify-between">
                          <span>Unduh Excel (.xlsx)</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            L + MT
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          Rekap data transaksi, neraca saldo, dan flow meter
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Bagian 2: Alat & Sinkronisasi Data */}
                  <div className="mt-2 pt-2 border-t border-slate-800/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between mb-1">
                    <span>🛠️ Alat & Sinkronisasi Data</span>
                  </div>

                  <div className="space-y-1">
                    {/* 4. Koreksi & Audit Transaksi */}
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenCorrectionModal();
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-slate-800/90 transition-colors group cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                        <Wrench className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white group-hover:text-amber-300 flex items-center justify-between">
                          <span>Koreksi & Audit Data</span>
                          {anomalyCount > 0 ? (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                              {anomalyCount} dicek
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-400 font-normal">Audit Bersih</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          Deteksi salah input, selisih meter, dan fitur undo
                        </p>
                      </div>
                    </button>

                    {/* 5. Koneksi Google Spreadsheet */}
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenSpreadsheetModal();
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-slate-800/90 transition-colors group cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                        <Database className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white group-hover:text-teal-300 flex items-center justify-between">
                          <span>Koneksi Spreadsheet</span>
                          {isTwoWaySyncActive ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Aktif 2-Arah
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">Manual / Link</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          Atur link Google Sheet & Webhook Apps Script
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Primary Action Button */}
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20 cursor-pointer active:scale-95 shrink-0"
              title="Catat Transaksi Bunkering Baru"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Transaksi</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
