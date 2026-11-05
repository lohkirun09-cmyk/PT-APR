import React, { useState, useEffect, useMemo } from 'react';
import {
  parseBunkeringCSV,
  filterRecords,
  calculateDashboardMetrics,
  BunkeringRecord,
  FilterState,
  INITIAL_CSV_RAW,
  UnitMode,
  DEFAULT_DENSITY,
  formatLiter
} from './utils/bunkeringData';
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
import { Check, Info, FileSpreadsheet, Sparkles } from 'lucide-react';

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
  const [editingRecord, setEditingRecord] = useState<BunkeringRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const handleResetData = () => {
    if (confirm('Kembalikan ke dataset awal bawaan PT ANGKA PETROLEUM RAYA?')) {
      const defaultData = parseBunkeringCSV(INITIAL_CSV_RAW);
      setRecords(defaultData);
      setSheetSource('default');
      setSourceUrl('');
      localStorage.removeItem(SOURCE_KEY);
      localStorage.removeItem(STORAGE_KEY);
      setFilter({
        startDate: '',
        endDate: '',
        selectedPT: 'ALL',
        selectedPengawas: 'ALL',
        selectedTangki: 'ALL',
        selectedKeterangan: 'ALL',
        selectedKotakan: 'ALL',
        searchQuery: '',
      });
      showToast('Data telah direset ke dataset asli bawaan.');
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
        onOpenSpreadsheetModal={() => {
          setSpreadsheetTab('url');
          setIsSpreadsheetModalOpen(true);
        }}
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
        onResetData={handleResetData}
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
        webhookUrl={webhookUrl}
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
