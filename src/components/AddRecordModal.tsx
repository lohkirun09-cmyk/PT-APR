import React, { useState, useEffect } from 'react';
import {
  X,
  Fuel,
  Save,
  AlertCircle,
  Send,
  CheckCircle2,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Ship,
  User,
  Gauge,
  Check,
  ExternalLink,
  Plus,
  RotateCcw
} from 'lucide-react';
import {
  BunkeringRecord,
  ALLOWED_TANKS,
  ALLOWED_SUPERVISORS,
  ALLOWED_KOTAKAN_SIZES,
  ALLOWED_KOTAKAN_STATUSES,
  ALLOWED_CATEGORIES,
  appendRecordToSpreadsheet,
  DEFAULT_DENSITY
} from '../utils/bunkeringData';

interface AddRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: BunkeringRecord, syncSuccessMsg?: string) => void;
  editingRecord: BunkeringRecord | null;
  knownPTs: string[];
  knownVessels?: string[];
  webhookUrl?: string;
  onSaveWebhookUrl?: (url: string) => void;
  sourceUrl?: string;
  fuelDensity?: number;
  onOpenSpreadsheetSettings?: () => void;
}

export const AddRecordModal: React.FC<AddRecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingRecord,
  knownPTs,
  knownVessels = [],
  webhookUrl = '',
  onSaveWebhookUrl,
  sourceUrl = '',
  fuelDensity = DEFAULT_DENSITY,
  onOpenSpreadsheetSettings
}) => {
  const [formData, setFormData] = useState<Partial<BunkeringRecord>>({
    tanggal: new Date().toLocaleDateString('en-US'),
    keterangan: 'BUNKERING A',
    masuk: 0,
    keluar: 0,
    nomorDn: '',
    pt: '',
    namaKapalMobil: '',
    tangki: '3P',
    timeStart: '',
    timeStop: '',
    flowStart: 0,
    flowStop: 0,
    pengawas: 'DAYAT',
    kotakan: 50,
    keteranganKotakan: 'KASIH'
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sendToSpreadsheet, setSendToSpreadsheet] = useState<boolean>(Boolean(webhookUrl));
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isTestingSync, setIsTestingSync] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showWebhookInput, setShowWebhookInput] = useState<boolean>(false);
  const [inputtedWebhookUrl, setInputtedWebhookUrl] = useState<string>(webhookUrl);

  // Common quick PT suggestions
  const topPTSuggestions = ['KBT', 'APR', 'MIL', 'CDM', 'GSM'];

  // Common quick vessel suggestions
  const quickVessels = knownVessels.length > 0
    ? knownVessels.slice(0, 8)
    : ['TB Karya Star 57', 'TB Karya Star 38', 'TB Karya Star 15', 'TB Karya Star 120', 'KT 8825 BY'];

  useEffect(() => {
    if (editingRecord) {
      setFormData(editingRecord);
    } else {
      setFormData({
        tanggal: new Date().toLocaleDateString('en-US'),
        keterangan: 'BUNKERING A',
        masuk: 0,
        keluar: 0,
        nomorDn: '',
        pt: knownPTs[0] || 'KBT',
        namaKapalMobil: '',
        tangki: '3P',
        timeStart: '',
        timeStop: '',
        flowStart: 0,
        flowStop: 0,
        pengawas: 'DAYAT',
        kotakan: 50,
        keteranganKotakan: 'KASIH'
      });
    }
    setSendToSpreadsheet(Boolean(webhookUrl));
    setInputtedWebhookUrl(webhookUrl);
    setErrorMsg(null);
    setTestResult(null);
  }, [editingRecord, isOpen, knownPTs, webhookUrl]);

  if (!isOpen) return null;

  // Flow difference
  const flowDiff = (Number(formData.flowStop) || 0) - (Number(formData.flowStart) || 0);

  // Quick Time Formatter
  const handleSetCurrentTime = (field: 'timeStart' | 'timeStop') => {
    const now = new Date();
    const formatted = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
    setFormData(prev => ({ ...prev, [field]: formatted }));
  };

  // Quick Date Helpers
  const handleSetToday = () => {
    const today = new Date();
    setFormData(prev => ({ ...prev, tanggal: today.toLocaleDateString('en-US') }));
  };

  const handleSetYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setFormData(prev => ({ ...prev, tanggal: d.toLocaleDateString('en-US') }));
  };

  // Convert date format for <input type="date">
  const getHtmlDateValue = (): string => {
    if (!formData.tanggal) return '';
    if (formData.tanggal.includes('-') && formData.tanggal.split('-')[0].length === 4) {
      return formData.tanggal;
    }
    if (formData.tanggal.includes('/')) {
      const parts = formData.tanggal.split('/');
      if (parts.length === 3) {
        const m = parts[0].padStart(2, '0');
        const d = parts[1].padStart(2, '0');
        let y = parts[2];
        if (y.length === 2) y = '20' + y;
        return `${y}-${m}-${d}`;
      }
    }
    return '';
  };

  const handleHtmlDateChange = (isoDate: string) => {
    if (!isoDate) {
      setFormData(prev => ({ ...prev, tanggal: '' }));
      return;
    }
    const [y, m, d] = isoDate.split('-');
    // Store in M/D/YYYY format matching dataset
    const formatted = `${parseInt(m, 10)}/${parseInt(d, 10)}/${y}`;
    setFormData(prev => ({ ...prev, tanggal: formatted }));
  };

  // Volume Presets
  const handleAddVolumeKeluar = (increment: number) => {
    setFormData(prev => ({
      ...prev,
      keluar: Math.max(0, (Number(prev.keluar) || 0) + increment)
    }));
  };

  const handleAddVolumeMasuk = (increment: number) => {
    setFormData(prev => ({
      ...prev,
      masuk: Math.max(0, (Number(prev.masuk) || 0) + increment)
    }));
  };

  // Apply flow difference directly to Volume Keluar
  const handleApplyFlowDiff = () => {
    if (flowDiff > 0) {
      setFormData(prev => ({ ...prev, keluar: flowDiff }));
    }
  };

  // Save inline webhook URL
  const handleSaveInlineWebhook = () => {
    const trimmed = inputtedWebhookUrl.trim();
    if (!trimmed) {
      setErrorMsg('Masukkan URL Webhook Google Apps Script yang valid.');
      return;
    }
    if (onSaveWebhookUrl) {
      onSaveWebhookUrl(trimmed);
    }
    setSendToSpreadsheet(true);
    setShowWebhookInput(false);
    setTestResult({
      success: true,
      message: 'Koneksi Webhook tersimpan! Data transaksi akan otomatis terkirim ke Google Spreadsheet.'
    });
  };

  // Test current webhook
  const handleTestInlineWebhook = async () => {
    const targetUrl = inputtedWebhookUrl.trim() || webhookUrl.trim();
    if (!targetUrl) {
      setErrorMsg('Masukkan URL Webhook Apps Script terlebih dahulu.');
      return;
    }
    setIsTestingSync(true);
    setTestResult(null);
    setErrorMsg(null);

    const testRecord: BunkeringRecord = {
      id: `test-check-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      tanggal: formData.tanggal || new Date().toLocaleDateString('en-US'),
      keterangan: 'TEST KONEKSI MOBILE',
      masuk: 0,
      keluar: 100,
      nomorDn: 'TEST-DN',
      pt: formData.pt || 'PT. ANGKA PETROLEUM RAYA',
      namaKapalMobil: formData.namaKapalMobil || 'Uji Coba Handphone',
      tangki: formData.tangki || '3P',
      timeStart: formData.timeStart || '09:00:00 AM',
      timeStop: formData.timeStop || '09:10:00 AM',
      flowStart: 100,
      flowStop: 200,
      pengawas: formData.pengawas || 'DAYAT',
      kotakan: formData.kotakan || 50,
      keteranganKotakan: formData.keteranganKotakan || 'KASIH'
    };

    try {
      const res = await appendRecordToSpreadsheet(targetUrl, testRecord);
      if (res.success) {
        setTestResult({
          success: true,
          message: `Koneksi Google Spreadsheet Berhasil! Baris uji coba tercatat${res.row ? ` (Baris #${res.row})` : ''}.`
        });
        if (onSaveWebhookUrl) {
          onSaveWebhookUrl(targetUrl);
        }
        setSendToSpreadsheet(true);
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Gagal tersambung ke Apps Script. Pastikan Web App disetel akses "Siapa saja (Anyone)".'
      });
    } finally {
      setIsTestingSync(false);
    }
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tanggal) {
      setErrorMsg('Tanggal transaksi wajib diisi.');
      return;
    }
    if (!formData.pt?.trim()) {
      setErrorMsg('Nama PT (Client/Rekanan) wajib diisi.');
      return;
    }
    if ((formData.keluar || 0) <= 0 && (formData.masuk || 0) <= 0) {
      setErrorMsg('Mohon masukkan volume Keluar atau Masuk (lebih dari 0 Liter).');
      return;
    }

    const newRecord: BunkeringRecord = {
      id: editingRecord ? editingRecord.id : `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: editingRecord ? editingRecord.timestamp : new Date().toLocaleString(),
      tanggal: formData.tanggal || '',
      keterangan: formData.keterangan || 'BUNKERING A',
      masuk: Number(formData.masuk) || 0,
      keluar: Number(formData.keluar) || 0,
      nomorDn: formData.nomorDn || '',
      pt: (formData.pt || '').trim().toUpperCase(),
      namaKapalMobil: formData.namaKapalMobil || '',
      tangki: formData.tangki || '3P',
      timeStart: formData.timeStart || '',
      timeStop: formData.timeStop || '',
      flowStart: Number(formData.flowStart) || 0,
      flowStop: Number(formData.flowStop) || 0,
      pengawas: formData.pengawas || 'DAYAT',
      kotakan: formData.kotakan ? Number(formData.kotakan) : null,
      keteranganKotakan: formData.keteranganKotakan || ''
    };

    let syncResultMsg: string | undefined;

    // Send directly to Google Spreadsheet via Apps Script Webhook if configured and enabled
    const activeWebhook = webhookUrl.trim() || inputtedWebhookUrl.trim();
    if (activeWebhook && sendToSpreadsheet) {
      setIsSyncing(true);
      setErrorMsg(null);
      try {
        const res = await appendRecordToSpreadsheet(activeWebhook, newRecord);
        if (res.success) {
          syncResultMsg = `Tercatat langsung di Google Spreadsheet${res.row ? ` (Baris #${res.row})` : ''}!`;
        }
      } catch (err: any) {
        console.warn('Google Sheet sync error:', err);
        setErrorMsg(`Data tersimpan lokal di aplikasi, namun gagal masuk ke Google Spreadsheet: ${err.message || 'Koneksi error'}`);
        setIsSyncing(false);
        onSave(newRecord);
        return;
      } finally {
        setIsSyncing(false);
      }
    }

    onSave(newRecord, syncResultMsg);
    onClose();
  };

  const keluarLiters = Number(formData.keluar) || 0;
  const masukLiters = Number(formData.masuk) || 0;
  const keluarTonase = (keluarLiters * fuelDensity) / 1000;
  const masukTonase = (masukLiters * fuelDensity) / 1000;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal Container: Full height on mobile with bottom sheet feel, centered dialog on desktop */}
      <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full h-[96vh] sm:h-auto max-h-[96vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-2 duration-200">
        
        {/* Mobile Swipe / Drag Handle Indicator */}
        <div className="w-12 h-1 bg-slate-700/60 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Modal Header: Sticky Top */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-800/80 bg-slate-900/95 backdrop-blur flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Fuel className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-white truncate">
                {editingRecord ? 'Perbarui Transaksi Bunkering' : 'Catat Transaksi Bunkering Baru'}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>Input operasional Masuk / Keluar BBM</span>
                {webhookUrl ? (
                  <span className="hidden sm:inline-flex items-center gap-1 text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Auto-Update Spreadsheet Aktif
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Spreadsheet Badge */}
            {webhookUrl ? (
              <div className="sm:hidden flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-semibold text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Sync</span>
              </div>
            ) : null}

            {/* Close Button: Large touch target (44x44px) */}
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5 space-y-4">
          
          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Perhatian:</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Test / Success Result Banner */}
          {testResult && (
            <div className={`p-3.5 rounded-2xl text-xs sm:text-sm flex items-start gap-2.5 ${
              testResult.success
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              )}
              <div className="flex-1">
                <span className="font-semibold block">{testResult.success ? 'Koneksi Berhasil' : 'Periksa Koneksi'}:</span>
                <span>{testResult.message}</span>
              </div>
            </div>
          )}

          {/* CARD 1: 📅 Waktu & Identitas Dokumen */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5 text-amber-400">
                <Clock className="w-4 h-4" />
                1. Informasi Transaksi & Dokumen
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSetToday}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-800 text-slate-300 hover:text-white active:bg-slate-700"
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={handleSetYesterday}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-800 text-slate-300 hover:text-white active:bg-slate-700"
                >
                  Kemarin
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Tanggal Transaksi */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Tanggal Transaksi *
                </label>
                <input
                  type="date"
                  value={getHtmlDateValue()}
                  onChange={e => handleHtmlDateChange(e.target.value)}
                  className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                  required
                />
              </div>

              {/* Kategori Bunkering */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Kategori Bunkering
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {ALLOWED_CATEGORIES.map(cat => {
                    const isSelected = formData.keterangan === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormData({ ...formData, keterangan: cat })}
                        className={`min-h-[44px] px-1 py-1 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400 shadow-md shadow-amber-500/20'
                            : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                        }`}
                      >
                        <span className="text-[10px] opacity-75">BUNKER</span>
                        <span className="text-xs">{cat.replace('BUNKERING ', '')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nomor DN */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Nomor DN (Delivery Note)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 16155"
                  value={formData.nomorDn || ''}
                  onChange={e => setFormData({ ...formData, nomorDn: e.target.value })}
                  className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* CARD 2: ⛽ Volume Minyak (Paling Sering Digunakan di Lapangan) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5 text-amber-400">
                <Fuel className="w-4 h-4" />
                2. Volume Bahan Bakar (BBM)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                BJ: {fuelDensity.toFixed(3)} kg/L
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Volume Keluar (Penyaluran ke Kapal/Mobil) - Amber Accent */}
              <div className="p-3.5 rounded-2xl bg-amber-500/5 border-2 border-amber-500/30 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <ArrowUpRight className="w-4 h-4" />
                    Volume Keluar (Outflow)
                  </label>
                  {keluarLiters > 0 && (
                    <span className="text-[11px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full">
                      ≈ {keluarTonase.toFixed(3)} MT
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={formData.keluar || ''}
                    onChange={e => setFormData({ ...formData, keluar: parseFloat(e.target.value) || 0 })}
                    className="w-full min-h-[48px] bg-slate-900 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-lg sm:text-xl font-bold font-mono text-amber-400 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                    Liter
                  </span>
                </div>

                {/* Quick Increment Chips for Mobile Touch */}
                <div className="flex flex-wrap items-center gap-1 pt-1">
                  <span className="text-[10px] text-slate-400 mr-1">Cepat:</span>
                  {[1000, 5000, 10000, 25000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleAddVolumeKeluar(amt)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-500/15 border border-amber-500/25 text-amber-300 active:bg-amber-500 active:text-slate-950 transition-colors cursor-pointer"
                    >
                      +{(amt / 1000).toLocaleString('id-ID')}k
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, keluar: 0 }))}
                    className="px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-800 text-slate-400 hover:text-white"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Volume Masuk (Penerimaan Inflow ke Tangki) - Emerald Accent */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <ArrowDownLeft className="w-4 h-4" />
                    Volume Masuk (Inflow)
                  </label>
                  {masukLiters > 0 && (
                    <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                      ≈ {masukTonase.toFixed(3)} MT
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={formData.masuk || ''}
                    onChange={e => setFormData({ ...formData, masuk: parseFloat(e.target.value) || 0 })}
                    className="w-full min-h-[48px] bg-slate-900 border border-emerald-500/40 rounded-xl px-3.5 py-2.5 text-lg sm:text-xl font-bold font-mono text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                    Liter
                  </span>
                </div>

                {/* Quick Inflow Chips */}
                <div className="flex flex-wrap items-center gap-1 pt-1">
                  <span className="text-[10px] text-slate-400 mr-1">Cepat:</span>
                  {[10000, 50000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleAddVolumeMasuk(amt)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 active:bg-emerald-500 active:text-slate-950 transition-colors cursor-pointer"
                    >
                      +{(amt / 1000).toLocaleString('id-ID')}k
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, masuk: 0 }))}
                    className="px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-800 text-slate-400 hover:text-white"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 3: 🚢 Rekanan & Armada */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
              <Ship className="w-4 h-4" />
              3. Rekanan, Armada & Kompartemen
            </span>

            {/* Nama PT with Quick Chips */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  Nama PT (Client / Rekanan) *
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400">Pilih:</span>
                  {topPTSuggestions.map(pt => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setFormData({ ...formData, pt })}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        formData.pt?.toUpperCase() === pt
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {pt}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="text"
                list="pt-modal-list"
                placeholder="Contoh: KBT, APR, MIL, CDM, GSM"
                value={formData.pt || ''}
                onChange={e => setFormData({ ...formData, pt: e.target.value.toUpperCase() })}
                className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
              <datalist id="pt-modal-list">
                {knownPTs.map(pt => (
                  <option key={pt} value={pt} />
                ))}
              </datalist>
            </div>

            {/* Nama Kapal / Mobil */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nama Kapal / Mobil
              </label>
              <input
                type="text"
                list="vessel-modal-list"
                placeholder="Contoh: TB Karya Star 57, KT 8825 BY"
                value={formData.namaKapalMobil || ''}
                onChange={e => setFormData({ ...formData, namaKapalMobil: e.target.value })}
                className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <datalist id="vessel-modal-list">
                {quickVessels.map(v => (
                  <option key={v} value={v} />
                ))}
              </datalist>

              {/* Quick Vessel Chips */}
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="text-[10px] text-slate-400">Armada Sering Digunakan:</span>
                {quickVessels.slice(0, 4).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setFormData({ ...formData, namaKapalMobil: v })}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Tangki: 8 Segmented Buttons (Easy Single-Tap) */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Kompartemen Tangki Sumber:
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                {ALLOWED_TANKS.map(tank => {
                  const isSelected = formData.tangki === tank;
                  return (
                    <button
                      key={tank}
                      type="button"
                      onClick={() => setFormData({ ...formData, tangki: tank })}
                      className={`min-h-[42px] py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400 shadow-lg shadow-amber-500/20 scale-105'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      <span className="text-[10px] opacity-75">TANGKI</span>
                      <span className="text-xs font-mono">{tank}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pengawas: 3 Large Segmented Touch Buttons */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Pengawas Lapangan:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ALLOWED_SUPERVISORS.map(spv => {
                  const isSelected = formData.pengawas === spv;
                  return (
                    <button
                      key={spv}
                      type="button"
                      onClick={() => setFormData({ ...formData, pengawas: spv })}
                      className={`min-h-[46px] px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400 shadow-lg shadow-amber-500/20'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>{spv}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CARD 4: ⏱️ Jam & Flow Meter */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
              <Gauge className="w-4 h-4" />
              4. Waktu Operasional & Flow Meter
            </span>

            {/* Time Start & Stop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-400">Time Start</label>
                  <button
                    type="button"
                    onClick={() => handleSetCurrentTime('timeStart')}
                    className="text-[10px] text-amber-400 hover:underline"
                  >
                    Set Sekarang
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Contoh: 9:54:00 AM"
                  value={formData.timeStart || ''}
                  onChange={e => setFormData({ ...formData, timeStart: e.target.value })}
                  className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-400">Time Stop</label>
                  <button
                    type="button"
                    onClick={() => handleSetCurrentTime('timeStop')}
                    className="text-[10px] text-amber-400 hover:underline"
                  >
                    Set Sekarang
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Contoh: 10:12:00 AM"
                  value={formData.timeStop || ''}
                  onChange={e => setFormData({ ...formData, timeStop: e.target.value })}
                  className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Flow Meter Start, Stop & Selisih */}
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Flow Meter Start
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={formData.flowStart || ''}
                    onChange={e => setFormData({ ...formData, flowStart: parseFloat(e.target.value) || 0 })}
                    className="w-full min-h-[40px] bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Flow Meter Stop
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={formData.flowStop || ''}
                    onChange={e => setFormData({ ...formData, flowStop: parseFloat(e.target.value) || 0 })}
                    className="w-full min-h-[40px] bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Selisih Flow Meter
                  </label>
                  <div className="min-h-[40px] px-3 py-1.5 bg-slate-950 rounded-lg border border-slate-700 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-300">
                      {flowDiff > 0 ? `${flowDiff.toLocaleString('id-ID')} L` : '-'}
                    </span>
                    {flowDiff > 0 && (
                      <button
                        type="button"
                        onClick={handleApplyFlowDiff}
                        className="text-[10px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded cursor-pointer"
                        title="Salin selisih ke kolom Volume Keluar"
                      >
                        Gunakan
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 5: 📦 Kotakan (Bonus / Jatah) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-950/20 border border-blue-900/40 space-y-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-300">
              <span className="text-base">📦</span>
              5. Pengaturan Kotakan Bunkering
            </span>

            {/* Kotakan Sizes: Easy Touch Pill Buttons */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Jumlah Unit Kotakan:
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, kotakan: null })}
                  className={`min-h-[44px] py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                    formData.kotakan === null || formData.kotakan === undefined
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-md shadow-blue-600/30'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <span className="text-[10px] opacity-75">TANPA</span>
                  <span>-</span>
                </button>
                {ALLOWED_KOTAKAN_SIZES.map(size => {
                  const isSelected = formData.kotakan === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setFormData({ ...formData, kotakan: size })}
                      className={`min-h-[44px] py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-md shadow-blue-600/30'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      <span className="text-[10px] opacity-75">KOTAK</span>
                      <span className="text-xs font-mono">{size}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status Kotakan: 3 Segmented Pill Buttons */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Keterangan Status Kotakan:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ALLOWED_KOTAKAN_STATUSES.map(status => {
                  const isSelected = formData.keteranganKotakan === status;
                  let activeColors = 'bg-emerald-600 text-white ring-2 ring-emerald-400';
                  if (status === 'TIDAK KASIH') {
                    activeColors = 'bg-slate-700 text-white ring-2 ring-slate-500';
                  } else if (status === 'NEXT TRIP') {
                    activeColors = 'bg-amber-600 text-white ring-2 ring-amber-400';
                  }

                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setFormData({ ...formData, keteranganKotakan: status })}
                      className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center text-center cursor-pointer ${
                        isSelected
                          ? activeColors
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CARD 6: 🌐 SINKRONISASI KE GOOGLE SPREADSHEET */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-amber-500/25 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    Kirim Langsung ke Google Spreadsheet
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    {webhookUrl
                      ? '● Webhook Terhubung — Data langsung masuk ke sheet saat disimpan'
                      : 'Koneksikan webhook agar transaksi otomatis terinput'}
                  </span>
                </div>
              </div>

              {/* Toggle Switch */}
              {webhookUrl ? (
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={sendToSpreadsheet}
                    onChange={e => setSendToSpreadsheet(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowWebhookInput(!showWebhookInput)}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
                >
                  {showWebhookInput ? 'Tutup' : 'Sambungkan'}
                </button>
              )}
            </div>

            {/* If Connected: Show Active Status Details */}
            {webhookUrl ? (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-300 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span>Siap menginput langsung ke baris terakhir Google Sheet</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestInlineWebhook}
                    disabled={isTestingSync}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer disabled:opacity-50"
                  >
                    {isTestingSync ? 'Menguji...' : 'Uji Koneksi'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWebhookInput(!showWebhookInput)}
                    className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    {showWebhookInput ? 'Tutup URL' : 'Ganti URL'}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Inline Webhook URL Input Form (Directly in Modal so user never loses form entries) */}
            {(!webhookUrl || showWebhookInput) && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-700/80 space-y-2.5">
                <label className="block text-xs font-semibold text-amber-300">
                  URL Webhook Google Apps Script (Web App)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={inputtedWebhookUrl}
                    onChange={e => setInputtedWebhookUrl(e.target.value)}
                    className="flex-1 min-h-[42px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveInlineWebhook}
                    className="min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Simpan & Aktifkan</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Tempel URL Web App dari Google Apps Script (Deployment: &ldquo;Siapa saja / Anyone&rdquo;).
                  {onOpenSpreadsheetSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSpreadsheetSettings();
                      }}
                      className="ml-1 text-amber-400 underline font-medium hover:text-amber-300"
                    >
                      Buka panduan lengkap &rarr;
                    </button>
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="h-6" />
        </form>

        {/* MODAL FOOTER: Sticky Bottom Bar (Always Accessible on Mobile) */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-slate-900/95 border-t border-slate-800/80 backdrop-blur flex items-center justify-between gap-3 shrink-0 z-20">
          {/* Quick Summary Pill on Mobile */}
          <div className="text-left">
            <span className="text-[10px] text-slate-400 block font-medium">Ringkasan Input</span>
            <span className="text-xs sm:text-sm font-bold text-amber-400 font-mono">
              {keluarLiters > 0
                ? `${keluarLiters.toLocaleString('id-ID')} L Keluar`
                : masukLiters > 0
                ? `${masukLiters.toLocaleString('id-ID')} L Masuk`
                : 'Belum ada volume'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSyncing}
              className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSyncing}
              className="min-h-[44px] px-5 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 active:scale-95 transition-all flex items-center gap-2 shadow-xl shadow-amber-500/25 cursor-pointer disabled:opacity-60"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Mengirim ke Spreadsheet...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{editingRecord ? 'Perbarui Data' : 'Simpan Transaksi'}</span>
                  {webhookUrl && sendToSpreadsheet && (
                    <Send className="w-3.5 h-3.5 text-slate-950/70 ml-0.5" />
                  )}
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
