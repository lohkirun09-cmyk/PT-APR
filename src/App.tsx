import React, { useState, useEffect, useMemo } from 'react';
import { exportBunkeringToExcel } from './utils/excelExporter';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { KPICards } from './components/KPICards';
import { VisualCharts } from './components/VisualCharts';
import { DailyTrendChart } from './components/DailyTrendChart';
import { DataTable } from './components/DataTable';
import { SpreadsheetModal } from './components/SpreadsheetModal';
import { AddRecordModal } from './components/AddRecordModal';
import { MonthlyReportModal } from './components/MonthlyReportModal';
import { CorrectionModal } from './components/CorrectionModal';
import { Check, Info, FileSpreadsheet, Sparkles, Wrench } from 'lucide-react';
import {
  BunkeringRecord,
  FilterState,
  UnitMode,
  DEFAULT_DENSITY,
  INITIAL_CSV_RAW,
  parseBunkeringCSV,
  filterRecords,
  calculateDashboardMetrics,
  CorrectionLogEntry,
  detectTransactionAnomalies,
  saveOrUpdateRecordToSpreadsheet
} from './utils/bunkeringData';

const STORAGE_KEY = 'bunkering_records_data_v1';
const SOURCE_KEY = 'bunkering_source_url_v1';
const WEBHOOK_KEY = 'bunkering_webhook_url_v1';
const UNIT_MODE_KEY = 'bunkering_unit_mode_v1';
const DENSITY_KEY = 'bunkering_density_v1';
const COMPANY_NAME = 'PT. ANGKA PETROLEUM RAYA';

export default function App() {
  // 1. Core Data State
  const [records, setRecords] = useState<BunkeringRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load from storage, using initial dataset', e);
    }
    return parseBunkeringCSV(INITIAL_CSV_RAW);
  });

  const [sourceUrl, setSourceUrl] = useState<string>(() => {
    return localStorage.getItem(SOURCE_KEY) || '';
  });

  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    return localStorage.getItem(WEBHOOK_KEY) || '';
  });

  const [sheetSource, setSheetSource] = useState<'default' | 'googlesheets' | 'custom_csv'>(() => {
    return localStorage.getItem(SOURCE_KEY) ? 'googlesheets' : 'default';
  });

  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Unit Mode (Liter vs Tonase) & Fuel Density Factor (kg/L)
  const [unitMode, setUnitMode] = useState<UnitMode>(() => {
    return (localStorage.getItem(UNIT_MODE_KEY) as UnitMode) || 'TONASE';
  });

  const [fuelDensity, setFuelDensity] = useState<number>(() => {
    const saved = localStorage.getItem(DENSITY_KEY);
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0.700 && parsed <= 1.100) return parsed;
    }
    return DEFAULT_DENSITY;
  });

  const handleToggleUnit = (unit: UnitMode) => {
    setUnitMode(unit);
    localStorage.setItem(UNIT_MODE_KEY, unit);
    showToast(`Satuan tampilan diubah menjadi: ${unit === 'TONASE' ? 'Tonase (Metric Ton / MT)' : 'Liter (L)'}`);
  };

  const handleChangeDensity = (density: number) => {
    setFuelDensity(density);
    localStorage.setItem(DENSITY_KEY, density.toString());
    showToast(`Faktor Berat Jenis (BJ) disetel: ${density.toFixed(3)} kg/L`);
  };

  // 2. Filter State
  const [filter, setFilter] = useState<FilterState>({
    startDate: '',
    endDate: '',
    selectedPT: 'ALL',
    selectedPengawas: 'ALL',
    selectedTangki: 'ALL',
    selectedKeterangan: 'ALL',
    selectedKotakan: 'ALL',
    searchQuery: '',
  });

  // 3. Modals State
  const [isSpreadsheetModalOpen, setIsSpreadsheetModalOpen] = useState(false);
  const [spreadsheetTab, setSpreadsheetTab] = useState<'url' | 'paste' | 'file' | 'sync'>('url');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMonthlyPdfModalOpen, setIsMonthlyPdfModalOpen] = useState(false);
  const [pdfModalInitialTab, setPdfModalInitialTab] = useState<'OPERASIONAL' | 'KOTAKAN_KAPAL'>('OPERASIONAL');
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BunkeringRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Correction history state for audit trail & Undo
  const [correctionHistory, setCorrectionHistory] = useState<CorrectionLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('bunkering_correction_history_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load correction history', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('bunkering_correction_history_v1', JSON.stringify(correctionHistory));
    } catch (e) {
      console.warn('Storage quota exceeded for correction history', e);
    }
  }, [correctionHistory]);

  // Detected anomalies across all records
  const anomalies = useMemo(() => {
    return detectTransactionAnomalies(records);
  }, [records]);

  // Save records to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Storage quota exceeded', e);
    }
  }, [records]);

  // Distinct Lists for Selectors
  const allPTs = useMemo(() => {
    const pts = new Set<string>();
    records.forEach(r => {
      if (r.pt && r.pt.trim()) pts.add(r.pt.trim());
    });
    return Array.from(pts).sort();
  }, [records]);

  const allVessels = useMemo(() => {
    const vessels = new Set<string>();
    records.forEach(r => {
      if (r.namaKapalMobil && r.namaKapalMobil.trim()) {
        vessels.add(r.namaKapalMobil.trim());
      }
    });
    return Array.from(vessels).sort();
  }, [records]);

  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    records.forEach(r => {
      if (r.tanggal) dates.add(r.tanggal);
    });
    return Array.from(dates).sort();
  }, [records]);

  // Filtered Records & Calculated Metrics
  const filteredRecords = useMemo(() => {
    return filterRecords(records, filter);
  }, [records, filter]);

  const metrics = useMemo(() => {
    return calculateDashboardMetrics(filteredRecords);
  }, [filteredRecords]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Handlers
  const handleDataLoaded = (
    newRecords: BunkeringRecord[],
    source: 'googlesheets' | 'custom_csv',
    sourceLink?: string
  ) => {
    setRecords(newRecords);
    setSheetSource(source);
    if (sourceLink) {
      setSourceUrl(sourceLink);
      localStorage.setItem(SOURCE_KEY, sourceLink);
    }
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setLastSyncTime(nowTime);
    showToast(`Berhasil menyinkronkan ${newRecords.length} baris data operasional!`);
  };

  const handleExportExcel = () => {
    exportBunkeringToExcel(filteredRecords, metrics, filter, COMPANY_NAME, fuelDensity);
    showToast('Laporan Excel (Liter & Tonase) berhasil diunduh secara otomatis!');
  };

  const handleSaveRecord = (record: BunkeringRecord, syncSuccessMsg?: string) => {
    if (editingRecord) {
      setRecords(prev => prev.map(r => (r.id === record.id ? record : r)));
      showToast(`Transaksi ${record.nomorDn || record.pt} berhasil diperbarui!`);
    } else {
      setRecords(prev => [record, ...prev]);
      if (syncSuccessMsg) {
        showToast(`Transaksi baru untuk ${record.pt} berhasil dicatat & ${syncSuccessMsg}`);
      } else {
        showToast(`Transaksi baru untuk ${record.pt} berhasil dicatat!`);
      }
    }
    setEditingRecord(null);
  };

  const handleApplyCorrection = async (updatedRecord: BunkeringRecord, reason?: string) => {
    const oldRecord = records.find(r => r.id === updatedRecord.id);
    if (!oldRecord) return;

    // Detect changed fields for audit trail
    const changes: { field: string; label: string; oldVal: any; newVal: any }[] = [];
    const fieldsToCheck: (keyof BunkeringRecord)[] = [
      'keluar', 'masuk', 'nomorDn', 'pt', 'namaKapalMobil',
      'tangki', 'pengawas', 'kotakan', 'keteranganKotakan', 'tanggal'
    ];

    const fieldLabels: Record<string, string> = {
      keluar: 'Volume Keluar',
      masuk: 'Volume Masuk',
      nomorDn: 'Nomor DN',
      pt: 'Nama PT',
      namaKapalMobil: 'Armada / Kapal',
      tangki: 'Tangki',
      pengawas: 'Pengawas',
      kotakan: 'Kotakan',
      keteranganKotakan: 'Status Kotakan',
      tanggal: 'Tanggal'
    };

    fieldsToCheck.forEach(f => {
      if (oldRecord[f] !== updatedRecord[f]) {
        changes.push({
          field: f,
          label: fieldLabels[f] || f,
          oldVal: oldRecord[f],
          newVal: updatedRecord[f]
        });
      }
    });

    const newLogEntry: CorrectionLogEntry = {
      id: `corr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleString('id-ID'),
      recordId: updatedRecord.id,
      nomorDn: updatedRecord.nomorDn,
      pt: updatedRecord.pt,
      namaKapal: updatedRecord.namaKapalMobil,
      fieldChanges: changes,
      reason: reason || 'Koreksi data catatan transaksi',
      previousRecord: { ...oldRecord },
      updatedRecord: { ...updatedRecord }
    };

    setCorrectionHistory(prev => [newLogEntry, ...prev]);
    setRecords(prev => prev.map(r => (r.id === updatedRecord.id ? updatedRecord : r)));

    // Auto-update to Google Spreadsheet if webhook is configured
    if (webhookUrl) {
      try {
        await saveOrUpdateRecordToSpreadsheet(webhookUrl, updatedRecord, 'update');
        showToast(`Koreksi data DN ${updatedRecord.nomorDn || updatedRecord.pt} berhasil disimpan & diupdate ke Google Spreadsheet!`);
      } catch (err: any) {
        showToast(`Koreksi disimpan lokal, namun gagal update ke sheet: ${err.message}`);
      }
    } else {
      showToast(`Koreksi data DN ${updatedRecord.nomorDn || updatedRecord.pt} berhasil disimpan!`);
    }
  };

  const handleUndoCorrection = async (logId: string) => {
    const log = correctionHistory.find(l => l.id === logId);
    if (!log) return;

    setRecords(prev => prev.map(r => (r.id === log.recordId ? log.previousRecord : r)));
    setCorrectionHistory(prev => prev.filter(l => l.id !== logId));

    if (webhookUrl) {
      try {
        await saveOrUpdateRecordToSpreadsheet(webhookUrl, log.previousRecord, 'update');
        showToast(`Perubahan DN ${log.nomorDn} dibatalkan (Undo) & Google Spreadsheet diperbarui!`);
      } catch (err: any) {
        showToast(`Data dikembalikan ke semula, namun gagal sync sheet: ${err.message}`);
      }
    } else {
      showToast(`Perubahan DN ${log.nomorDn} berhasil dibatalkan (Undo)!`);
    }
  };

  const handleSaveWebhookUrl = (url: string) => {
    setWebhookUrl(url);
    localStorage.setItem(WEBHOOK_KEY, url);
    showToast('Koneksi Webhook Google Spreadsheet aktif! Transaksi baru akan otomatis masuk ke Google Sheet.');
  };

  const handleDeleteRecord = (id: string) => {
    const toDelete = records.find(r => r.id === id);
    if (confirm(`Apakah Anda yakin ingin menghapus data transaksi ${toDelete?.nomorDn || toDelete?.pt}?`)) {
      setRecords(prev => prev.filter(r => r.id !== id));
      showToast('Data transaksi telah dihapus.');
    }
  };

  const handleSelectDate = (date: string) => {
    if (filter.startDate === date && filter.endDate === date) {
      setFilter({ ...filter, startDate: '', endDate: '' });
    } else {
      setFilter({ ...filter, startDate: date, endDate: date });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* 1. Header */}
      <Header
        companyName={COMPANY_NAME}
        totalRecords={records.length}
        lastSyncTime={lastSyncTime}
        sheetSource={sheetSource}
        isTwoWaySyncActive={Boolean(webhookUrl)}
        anomalyCount={anomalies.length}
        onOpenSpreadsheetModal={() => {
          setSpreadsheetTab('url');
          setIsSpreadsheetModalOpen(true);
        }}
        onOpenCorrectionModal={() => setIsCorrectionModalOpen(true)}
        onOpenAddModal={() => {
          setEditingRecord(null);
          setIsAddModalOpen(true);
        }}
        onOpenMonthlyPdfModal={() => {
          setPdfModalInitialTab('OPERASIONAL');
          setIsMonthlyPdfModalOpen(true);
        }}
        onOpenKotakanPdfModal={() => {
          setPdfModalInitialTab('KOTAKAN_KAPAL');
          setIsMonthlyPdfModalOpen(true);
        }}
        onExportExcel={handleExportExcel}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/50 text-emerald-300 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom duration-300">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 2. Filter Bar with Date Selector */}
        <FilterBar
          filter={filter}
          onFilterChange={setFilter}
          availableDates={availableDates}
          allPTs={allPTs}
          activeFilteredCount={filteredRecords.length}
          totalCount={records.length}
        />

        {/* 3. Operational KPI Metric Cards */}
        <KPICards
          metrics={metrics}
          unitMode={unitMode}
          density={fuelDensity}
          onToggleUnit={handleToggleUnit}
          onChangeDensity={handleChangeDensity}
        />

        {/* 4. Daily Flow Trend (Inflow vs Outflow over time) */}
        <DailyTrendChart
          records={records}
          onSelectDate={handleSelectDate}
          selectedDate={filter.startDate === filter.endDate ? filter.startDate : ''}
          unitMode={unitMode}
          density={fuelDensity}
        />

        {/* 5. Interactive Visual Charts: Top 5 PT & Top 5 Kotakan */}
        <VisualCharts
          metrics={metrics}
          onSelectPTFilter={pt => setFilter({ ...filter, selectedPT: pt })}
          onSelectKotakanFilter={kotakan => {
            if (kotakan.startsWith('Tidak')) {
              setFilter({ ...filter, selectedKotakan: 'EMPTY' });
            } else {
              setFilter({ ...filter, selectedKotakan: kotakan });
            }
          }}
          unitMode={unitMode}
          density={fuelDensity}
        />

        {/* 6. Complete Data Log Table */}
        <DataTable
          records={filteredRecords}
          onEditRecord={r => {
            setEditingRecord(r);
            setIsAddModalOpen(true);
          }}
          onDeleteRecord={handleDeleteRecord}
          onOpenCorrectionModal={() => setIsCorrectionModalOpen(true)}
          unitMode={unitMode}
          density={fuelDensity}
        />
      </main>

      {/* Modals */}
      <SpreadsheetModal
        isOpen={isSpreadsheetModalOpen}
        onClose={() => setIsSpreadsheetModalOpen(false)}
        onDataLoaded={handleDataLoaded}
        currentSourceUrl={sourceUrl}
        currentWebhookUrl={webhookUrl}
        onSaveWebhookUrl={handleSaveWebhookUrl}
        initialTab={spreadsheetTab}
      />

      <AddRecordModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveRecord}
        editingRecord={editingRecord}
        knownPTs={allPTs}
        knownVessels={allVessels}
        webhookUrl={webhookUrl}
        onSaveWebhookUrl={handleSaveWebhookUrl}
        sourceUrl={sourceUrl}
        fuelDensity={fuelDensity}
        onOpenSpreadsheetSettings={() => {
          setSpreadsheetTab('sync');
          setIsSpreadsheetModalOpen(true);
        }}
      />

      <MonthlyReportModal
        isOpen={isMonthlyPdfModalOpen}
        onClose={() => setIsMonthlyPdfModalOpen(false)}
        records={records}
        companyName={COMPANY_NAME}
        unitMode={unitMode}
        density={fuelDensity}
        initialReportType={pdfModalInitialTab}
        onExportExcel={handleExportExcel}
      />

      <CorrectionModal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        records={records}
        onApplyCorrection={handleApplyCorrection}
        onDeleteRecord={handleDeleteRecord}
        correctionHistory={correctionHistory}
        onUndoCorrection={handleUndoCorrection}
        webhookUrl={webhookUrl}
        unitMode={unitMode}
        density={fuelDensity}
        onOpenFullEditModal={rec => {
          setEditingRecord(rec);
          setIsAddModalOpen(true);
        }}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} {COMPANY_NAME} — Sistem Monitoring & Dashboard Bunkering BBM</span>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Kompartemen Tangki 1S-4P</span>
            <span>•</span>
            <span>Flow Meter Otomatis</span>
            <span>•</span>
            <span>Sinkronisasi Spreadsheet Aktif</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
