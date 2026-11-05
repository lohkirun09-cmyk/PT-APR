import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Link2,
  Upload,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  ClipboardPaste,
  Database,
  HelpCircle,
  Send,
  Copy,
  Check,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  getGoogleSheetCandidateUrls,
  parseBunkeringCSV,
  BunkeringRecord,
  INITIAL_CSV_RAW,
  appendRecordToSpreadsheet,
  GOOGLE_APPS_SCRIPT_TEMPLATE
} from '../utils/bunkeringData';

interface SpreadsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (records: BunkeringRecord[], source: 'googlesheets' | 'custom_csv', sourceUrl?: string) => void;
  currentSourceUrl?: string;
  currentWebhookUrl?: string;
  onSaveWebhookUrl?: (url: string) => void;
  initialTab?: 'url' | 'paste' | 'file' | 'sync';
}

export const SpreadsheetModal: React.FC<SpreadsheetModalProps> = ({
  isOpen,
  onClose,
  onDataLoaded,
  currentSourceUrl = '',
  currentWebhookUrl = '',
  onSaveWebhookUrl,
  initialTab = 'url'
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'paste' | 'file' | 'sync'>(initialTab);
  const [sheetUrl, setSheetUrl] = useState<string>(currentSourceUrl);
  const [webhookUrl, setWebhookUrl] = useState<string>(currentWebhookUrl);
  const [pastedText, setPastedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState<boolean>(false);
  const [isCopiedScript, setIsCopiedScript] = useState<boolean>(false);
  const [showScriptCode, setShowScriptCode] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showShareGuide, setShowShareGuide] = useState<boolean>(false);

  useEffect(() => {
    setSheetUrl(currentSourceUrl);
    setWebhookUrl(currentWebhookUrl);
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [currentSourceUrl, currentWebhookUrl, initialTab, isOpen]);

  if (!isOpen) return null;

  const handleFetchGoogleSheet = async () => {
    if (!sheetUrl.trim()) {
      setErrorMsg('Silakan masukkan link Google Spreadsheet Anda.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowShareGuide(false);

    try {
      const candidateUrls = getGoogleSheetCandidateUrls(sheetUrl);
      let csvText = '';
      let lastStatus = 0;

      for (const targetUrl of candidateUrls) {
        try {
          const res = await fetch(targetUrl);
          if (res.ok) {
            const text = await res.text();
            // Verify valid CSV/tabular text (not an HTML error/login page)
            if (text && text.trim().length > 0 && !text.includes('<!DOCTYPE html>') && !text.includes('<html')) {
              csvText = text;
              break;
            }
          } else {
            lastStatus = res.status;
          }
        } catch {
          // Continue to next candidate URL (e.g. gviz or export)
        }
      }

      if (!csvText) {
        setShowShareGuide(true);
        throw new Error(
          `Gagal mengambil data dari Google Spreadsheet (${lastStatus || 'Koneksi Dibatasi'}). Pastikan izin berbagi disetel ke "Siapa saja yang memiliki link" (Anyone with the link can view).`
        );
      }

      const records = parseBunkeringCSV(csvText);

      if (records.length === 0) {
        throw new Error('Data berhasil diakses, tetapi tidak ada baris transaksi bunkering yang sesuai dengan format kolom.');
      }

      setSuccessMsg(`Berhasil menghubungkan dan memuat ${records.length} baris transaksi dari Google Spreadsheet!`);
      setTimeout(() => {
        onDataLoaded(records, 'googlesheets', sheetUrl);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.message ||
        'Gagal menyinkronkan Google Spreadsheet. Pastikan link dapat diakses publik.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      setErrorMsg('Silakan tempel (paste) data tabel atau CSV terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const records = parseBunkeringCSV(pastedText);
      if (records.length === 0) {
        throw new Error('Tidak ada baris transaksi bunkering valid yang terbaca dari teks yang ditempel.');
      }

      setSuccessMsg(`Berhasil membaca ${records.length} baris transaksi dari teks yang ditempel!`);
      setTimeout(() => {
        onDataLoaded(records, 'custom_csv');
        onClose();
      }, 800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membaca data teks.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const reader = new FileReader();

    if (file.name.endsWith('.csv')) {
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const records = parseBunkeringCSV(text);
          if (records.length === 0) throw new Error('Tidak ada baris valid pada file CSV.');
          setSuccessMsg(`Berhasil mengimpor ${records.length} baris dari file ${file.name}!`);
          setTimeout(() => {
            onDataLoaded(records, 'custom_csv');
            onClose();
          }, 800);
        } catch (err: any) {
          setErrorMsg(err.message || 'Gagal membaca file CSV.');
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsText(file);
    } else {
      // Excel file .xlsx
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const csvText = XLSX.utils.sheet_to_csv(worksheet);
          const records = parseBunkeringCSV(csvText);
          if (records.length === 0) throw new Error('Tidak ada baris transaksi valid pada file Excel.');
          setSuccessMsg(`Berhasil mengimpor ${records.length} baris dari sheet "${firstSheetName}"!`);
          setTimeout(() => {
            onDataLoaded(records, 'custom_csv');
            onClose();
          }, 800);
        } catch (err: any) {
          setErrorMsg(err.message || 'Gagal membaca file Excel.');
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleLoadSampleData = () => {
    setIsLoading(true);
    try {
      const records = parseBunkeringCSV(INITIAL_CSV_RAW);
      setSuccessMsg(`Berhasil memuat dataset resmi PT ANGKA PETROLEUM RAYA (${records.length} baris).`);
      setTimeout(() => {
        onDataLoaded(records, 'custom_csv');
        onClose();
      }, 700);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveWebhook = () => {
    if (!webhookUrl.trim()) {
      setErrorMsg('Masukkan URL Webhook Apps Script terlebih dahulu.');
      return;
    }
    if (onSaveWebhookUrl) {
      onSaveWebhookUrl(webhookUrl.trim());
    }
    setSuccessMsg('Koneksi Webhook Google Apps Script berhasil disimpan dan diaktifkan!');
    setErrorMsg(null);
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      setErrorMsg('Masukkan URL Webhook Apps Script terlebih dahulu untuk diuji.');
      return;
    }
    setIsTestingWebhook(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const testRecord: BunkeringRecord = {
      id: `test-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      tanggal: new Date().toLocaleDateString('en-US'),
      keterangan: 'TEST KONEKSI DASHBOARD',
      masuk: 0,
      keluar: 1000,
      nomorDn: 'TEST-DN',
      pt: 'PT. ANGKA PETROLEUM RAYA',
      namaKapalMobil: 'Unit Uji Coba',
      tangki: '3P',
      timeStart: '10:00:00 AM',
      timeStop: '10:15:00 AM',
      flowStart: 1000,
      flowStop: 2000,
      pengawas: 'DAYAT',
      kotakan: 50,
      keteranganKotakan: 'KASIH'
    };

    try {
      const res = await appendRecordToSpreadsheet(webhookUrl.trim(), testRecord);
      if (res.success) {
        setSuccessMsg(`Koneksi Sukses! Baris uji coba telah masuk ke Google Spreadsheet Anda${res.row ? ` (Baris #${res.row})` : ''}.`);
        if (onSaveWebhookUrl) {
          onSaveWebhookUrl(webhookUrl.trim());
        }
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengirim data uji coba ke Apps Script. Pastikan URL Web App benar dan akses disetel ke "Siapa saja (Anyone)".');
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setIsCopiedScript(true);
    setTimeout(() => setIsCopiedScript(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">Koneksi Spreadsheet & Sinkronisasi Data</h3>
            <p className="text-xs text-slate-400">
              Baca data riil, unggah file, dan aktifkan kirim otomatis transaksi baru ke Google Spreadsheet
            </p>
          </div>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold">{errorMsg}</div>
              {showShareGuide && (
                <div className="text-[11px] text-rose-200/90 bg-rose-950/50 p-2.5 rounded-lg border border-rose-800/40 mt-1.5 space-y-1">
                  <p className="font-bold">💡 Cara Mengatur Izin Google Sheets:</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-300">
                    <li>Buka file Google Sheets Anda di browser.</li>
                    <li>Klik tombol biru <strong>Bagikan (Share)</strong> di pojok kanan atas.</li>
                    <li>Pada <em>Akses umum (General access)</em>, ubah dari <strong>Dibatasi</strong> menjadi <strong>"Siapa saja yang memiliki link"</strong> (Anyone with the link).</li>
                    <li>Atur peran sebagai <strong>Pelihat (Viewer)</strong>, lalu klik <strong>Salin link</strong>.</li>
                    <li>Atau gunakan tab <strong>"Tempel Data"</strong> untuk menyalin isi tabel tanpa perlu mengubah izin sharing!</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mb-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <div>{successMsg}</div>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 gap-1 mb-4 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('url')}
            className={`px-3 py-2 font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'url'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            Link Google Sheet
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-3 py-2 font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'sync'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Kirim ke Sheet (2-Arah)
            {webhookUrl ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" title="Aktif" />
            ) : null}
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`px-3 py-2 font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'paste'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            Tempel Data (Copy-Paste)
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`px-3 py-2 font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'file'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Unggah File (.xlsx / .csv)
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto pr-1 flex-1 space-y-4">
          {/* TAB 1: Link Google Sheet (Read Data) */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <label className="block text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-emerald-400" />
                  URL Google Spreadsheet (Baca Data)
                </label>
                <p className="text-[11px] text-slate-400 mb-3">
                  Salin tautan dari address bar Google Sheets Anda untuk memuat data transaksi ke dalam dashboard.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sheetUrl}
                    onChange={e => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                  <button
                    onClick={handleFetchGoogleSheet}
                    disabled={isLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-emerald-950 shrink-0"
                  >
                    {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>Sinkronkan</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-200">Tips Mengatasi Error 400 / Dibatasi:</span>
                  <p className="mt-0.5">
                    Pastikan file Spreadsheet Anda tidak disetel "Restricted / Dibatasi". Jika file berada di Google Workspace kantor dengan pembatasan domain, gunakan tab <strong>Tempel Data (Copy-Paste)</strong> di atas untuk memuat data tanpa perlu mengubah izin organisasi.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Two-Way Writeback Webhook Sync */}
          {activeTab === 'sync' && (
            <div className="space-y-3.5">
              <div className="bg-slate-950/70 border border-amber-500/30 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-amber-400" />
                    URL Webhook Google Apps Script (Simpan Otomatis ke Sheet)
                  </label>
                  {webhookUrl ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      <CheckCircle className="w-3 h-3" />
                      Aktif
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Belum disetel</span>
                  )}
                </div>

                <p className="text-[11px] text-slate-300">
                  Ketika URL Webhook ini diisi, setiap transaksi baru yang Anda masukkan lewat tombol <strong className="text-amber-400">+ Catat Transaksi</strong> akan otomatis ditambahkan langsung ke baris bawah Google Spreadsheet Anda secara real-time!
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={webhookUrl}
                    onChange={e => setWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleSaveWebhook}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-950"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleTestWebhook}
                      disabled={isTestingWebhook || !webhookUrl.trim()}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer border border-slate-700"
                    >
                      {isTestingWebhook ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span>Uji Kirim (Test)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Step by step guide */}
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Cara Menghubungkan Google Sheet Anda dalam 1 Menit:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition-colors cursor-pointer"
                  >
                    {isCopiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{isCopiedScript ? 'Kode Tersalin!' : 'Salin Kode Apps Script'}</span>
                  </button>
                </div>

                <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside">
                  <li>
                    Buka Google Spreadsheet Anda &rarr; klik menu <strong>Ekstensi (Extensions)</strong> &rarr; pilih <strong>Apps Script</strong>.
                  </li>
                  <li>
                    Hapus semua tulisan di editor Apps Script, lalu klik tombol <strong>Salin Kode Apps Script</strong> di atas dan <strong>Paste (Ctrl+V)</strong> ke editor tersebut.
                  </li>
                  <li>
                    Klik tombol biru <strong>Terapkan (Deploy)</strong> di pojok kanan atas &rarr; pilih <strong>Deployment baru (New deployment)</strong>.
                  </li>
                  <li>
                    Pilih jenis: <strong>Aplikasi Web (Web app)</strong>.
                    <div className="mt-1 ml-4 p-2 bg-slate-900 rounded-lg text-[11px] text-slate-300 border border-slate-800 space-y-0.5">
                      <div>&bull; Jalankan sebagai: <strong>Saya (Me)</strong></div>
                      <div>&bull; Yang memiliki akses: <strong className="text-amber-400">Siapa saja (Anyone)</strong> &larr; <em>Wajib dipilih</em></div>
                    </div>
                  </li>
                  <li>
                    Klik <strong>Terapkan (Deploy)</strong>, lalu salin <strong>URL Aplikasi Web</strong> (berakhiran <code>/exec</code>) dan tempelkan pada kolom di atas!
                  </li>
                </ol>

                <div className="pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setShowScriptCode(!showScriptCode)}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showScriptCode ? '▼ Sembunyikan Kode Apps Script' : '▶ Tampilkan Kode Apps Script (.gs)'}</span>
                  </button>

                  {showScriptCode && (
                    <div className="mt-2 relative">
                      <pre className="p-3 bg-slate-950 rounded-xl text-[10px] font-mono text-slate-300 border border-slate-800 overflow-x-auto max-h-48">
                        {GOOGLE_APPS_SCRIPT_TEMPLATE}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Tempel Data */}
          {activeTab === 'paste' && (
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                  <ClipboardPaste className="w-3.5 h-3.5 text-indigo-400" />
                  Tempel Seluruh Tabel dari Google Sheet / Excel (Ctrl+A & Ctrl+V)
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  Buka Spreadsheet Anda, tekan <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-300">Ctrl + A</kbd> untuk memilih semua sel, lalu <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-300">Ctrl + C</kbd> untuk salin, dan tempelkan di bawah ini:
                </p>
              </div>

              <textarea
                rows={5}
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                placeholder="Tempel data di sini (mendukung format Tab / CSV / Tabel Excel)..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />

              <div className="flex justify-end">
                <button
                  onClick={handleParsePastedText}
                  disabled={isLoading || !pastedText.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-indigo-950"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Proses & Terapkan Data</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Unggah File */}
          {activeTab === 'file' && (
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <label className="block text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-blue-400" />
                Unggah File Spreadsheet (.xlsx / .csv)
              </label>
              <p className="text-[11px] text-slate-400 mb-3">
                Impor langsung file spreadsheet dari komputer Anda untuk memperbarui data dashboard.
              </p>

              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-xl p-6 cursor-pointer transition-colors bg-slate-900/40">
                <Upload className="w-7 h-7 text-slate-400 mb-1.5" />
                <span className="text-xs font-medium text-slate-200">Pilih file Excel (.xlsx) atau CSV (.csv)</span>
                <span className="text-[10px] text-slate-500 mt-1">Format kolom standar PT ANGKA PETROLEUM RAYA</span>
                <input
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Format Guide */}
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300 block mb-1">
              Urutan Kolom Standar yang Terbaca:
            </span>
            <div className="text-[10px] font-mono text-slate-400 bg-slate-900/90 p-2 rounded-lg overflow-x-auto whitespace-nowrap border border-slate-800">
              TANGGAL | KETERANGAN | MASUK | KELUAR | NOMOR DN | PT | KAPAL/MOBIL | TANGKI | TIME START | TIME STOP | FLOW START | FLOW STOP | PENGAWAS | KOTAKAN | KETERANGAN KOTAKAN
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleLoadSampleData}
            disabled={isLoading}
            className="text-xs text-amber-400/90 hover:text-amber-300 flex items-center gap-1.5 hover:underline cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Muat Data Riil PT Angka Petroleum Raya</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

