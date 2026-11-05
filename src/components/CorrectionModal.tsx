import React, { useState, useMemo } from 'react';
import {
  X,
  Wrench,
  AlertTriangle,
  Search,
  CheckCircle2,
  RotateCcw,
  History,
  Send,
  Fuel,
  Ship,
  User,
  Clock,
  Gauge,
  Check,
  Edit3,
  Trash2,
  ArrowRight,
  Filter,
  Sparkles,
  Info,
  Layers
} from 'lucide-react';
import {
  BunkeringRecord,
  TransactionAnomaly,
  CorrectionLogEntry,
  detectTransactionAnomalies,
  ALLOWED_TANKS,
  ALLOWED_SUPERVISORS,
  ALLOWED_KOTAKAN_SIZES,
  ALLOWED_KOTAKAN_STATUSES,
  ALLOWED_CATEGORIES,
  UnitMode,
  DEFAULT_DENSITY,
  convertLiterToTon
} from '../utils/bunkeringData';

interface CorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: BunkeringRecord[];
  onApplyCorrection: (updatedRecord: BunkeringRecord, reason?: string) => Promise<void> | void;
  onDeleteRecord?: (id: string) => void;
  correctionHistory: CorrectionLogEntry[];
  onUndoCorrection: (logId: string) => void;
  webhookUrl?: string;
  unitMode?: UnitMode;
  density?: number;
  onOpenFullEditModal: (record: BunkeringRecord) => void;
}

export const CorrectionModal: React.FC<CorrectionModalProps> = ({
  isOpen,
  onClose,
  records,
  onApplyCorrection,
  onDeleteRecord,
  correctionHistory,
  onUndoCorrection,
  webhookUrl = '',
  unitMode = 'TONASE',
  density = DEFAULT_DENSITY,
  onOpenFullEditModal
}) => {
  const [activeTab, setActiveTab] = useState<'anomalies' | 'search' | 'history'>('anomalies');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [editingRecordDraft, setEditingRecordDraft] = useState<BunkeringRecord | null>(null);
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Filter anomalies
  const anomalies = useMemo(() => {
    return detectTransactionAnomalies(records);
  }, [records]);

  // Filtered records for search
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records.slice(0, 30);
    const q = searchQuery.toLowerCase().trim();
    return records.filter(r =>
      (r.nomorDn && r.nomorDn.toLowerCase().includes(q)) ||
      (r.namaKapalMobil && r.namaKapalMobil.toLowerCase().includes(q)) ||
      (r.pt && r.pt.toLowerCase().includes(q)) ||
      (r.tanggal && r.tanggal.toLowerCase().includes(q)) ||
      (r.pengawas && r.pengawas.toLowerCase().includes(q)) ||
      (r.tangki && r.tangki.toLowerCase().includes(q)) ||
      (r.keteranganKotakan && r.keteranganKotakan.toLowerCase().includes(q))
    );
  }, [records, searchQuery]);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Select record for fast inline edit
  const handleSelectRecordForEdit = (record: BunkeringRecord) => {
    setSelectedRecordId(record.id);
    setEditingRecordDraft({ ...record });
    setCorrectionReason('');
  };

  // Apply suggested anomaly fix directly
  const handleApplySuggestedAnomalyFix = async (anomaly: TransactionAnomaly) => {
    const rec = anomaly.record;
    let updated: BunkeringRecord = { ...rec };

    if (anomaly.field === 'keluar' && typeof anomaly.suggestedValue === 'number') {
      updated.keluar = anomaly.suggestedValue;
    } else if (anomaly.field === 'keteranganKotakan' && typeof anomaly.suggestedValue === 'string') {
      updated.keteranganKotakan = anomaly.suggestedValue;
    }

    setIsSaving(true);
    try {
      await onApplyCorrection(updated, `Perbaikan otomatis: ${anomaly.title}`);
      showNotification(`Koreksi transaksi DN ${rec.nomorDn || rec.pt} berhasil diterapkan!`);
    } catch (err: any) {
      showNotification(`Gagal menyimpan koreksi: ${err.message || 'Error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Save quick in-line correction
  const handleSaveDraft = async () => {
    if (!editingRecordDraft) return;

    if (!editingRecordDraft.pt?.trim()) {
      showNotification('Nama PT tidak boleh kosong!');
      return;
    }
    if ((editingRecordDraft.keluar || 0) <= 0 && (editingRecordDraft.masuk || 0) <= 0) {
      showNotification('Volume Keluar atau Masuk harus lebih dari 0 Liter!');
      return;
    }

    setIsSaving(true);
    try {
      await onApplyCorrection(
        editingRecordDraft,
        correctionReason.trim() || 'Koreksi cepat kesalahan pengisian'
      );
      showNotification(`Perbaikan data transaksi ${editingRecordDraft.nomorDn || editingRecordDraft.pt} berhasil disimpan!`);
      setSelectedRecordId(null);
      setEditingRecordDraft(null);
    } catch (err: any) {
      showNotification(`Gagal menyimpan: ${err.message || 'Error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full h-[94vh] max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Pusat Perbaikan & Koreksi Catatan Transaksi
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Audit & Koreksi
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Alat untuk menemukan salah input, membetulkan volume/DN/kapal/pengawas, dan memperbarui Google Spreadsheet
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 cursor-pointer transition-all"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab('anomalies')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'anomalies'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Deteksi Salah Input</span>
              {anomalies.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === 'anomalies' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {anomalies.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('search')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'search'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Cari & Perbaiki Cepat</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Riwayat Koreksi & Undo</span>
              {correctionHistory.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300">
                  {correctionHistory.length}
                </span>
              )}
            </button>
          </div>

          {/* Sync Status Tag */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            {webhookUrl ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Update Otomatis ke Spreadsheet Aktif
              </span>
            ) : (
              <span className="text-slate-500">
                Penyimpanan Lokal Aktif
              </span>
            )}
          </div>
        </div>

        {/* Toast Alert */}
        {toastMsg && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* TAB 1: ⚠️ DETEKSI ANOMALI & KESALAHAN OTOMATIS */}
        {activeTab === 'anomalies' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Pemeriksaan Otomatis Terhadap 64+ Catatan Bunkering
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sistem menganalisis ketidaksesuaian Flow Meter vs Volume, nomor DN duplikat, dan status kotakan bertentangan.
                </p>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-slate-300">
                {anomalies.length === 0 ? '✅ 0 Kesalahan Terdeteksi' : `⚠️ ${anomalies.length} Data Perlu Dicek`}
              </div>
            </div>

            {anomalies.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-white">Semua Data Transaksi Sesuai & Valid!</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Tidak ditemukan selisih flow meter yang salah atau data duplikat. Anda dapat menggunakan tab &ldquo;Cari & Perbaiki Cepat&rdquo; jika ingin mengubah data tertentu.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {anomalies.map(anomaly => {
                  const r = anomaly.record;
                  return (
                    <div
                      key={anomaly.id}
                      className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 hover:border-amber-500/50 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            anomaly.severity === 'error'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {anomaly.type.replace('_', ' ')}
                          </span>
                          <span className="text-xs font-bold text-white">
                            DN {r.nomorDn || '(Tanpa DN)'} • {r.pt} ({r.namaKapalMobil || 'Kapal Tidak Bernama'})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Tgl: {r.tanggal} • Pengawas: {r.pengawas} • Tangki: {r.tangki}
                        </div>
                      </div>

                      {/* Explanation */}
                      <p className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
                        {anomaly.description}
                      </p>

                      {/* Comparison / Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                        <div className="flex items-center gap-3 text-xs">
                          <div>
                            <span className="text-slate-400 text-[10px] block">Nilai Saat Ini:</span>
                            <span className="font-mono font-bold text-rose-300">
                              {anomaly.currentValue} {anomaly.field === 'keluar' ? 'L' : ''}
                            </span>
                          </div>
                          {anomaly.suggestedValue !== undefined && (
                            <>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                              <div>
                                <span className="text-slate-400 text-[10px] block">Nilai Disarankan:</span>
                                <span className="font-mono font-bold text-emerald-400">
                                  {anomaly.suggestedValue} {anomaly.field === 'keluar' ? 'L' : ''}
                                </span>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {anomaly.suggestedValue !== undefined && (
                            <button
                              type="button"
                              onClick={() => handleApplySuggestedAnomalyFix(anomaly)}
                              disabled={isSaving}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer disabled:opacity-50"
                            >
                              Terapkan {anomaly.suggestedValue} {anomaly.field === 'keluar' ? 'L' : ''}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('search');
                              handleSelectRecordForEdit(r);
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Perbaiki di Sini</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenFullEditModal(r);
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
                          >
                            Buka Modal Form
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: 🔍 CARI & PERBAIKI CEPAT */}
        {activeTab === 'search' && (
          <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
            {/* Left Column: Record Search & Selection List */}
            <div className="w-full sm:w-1/2 border-r border-slate-800 flex flex-col h-full bg-slate-950/40">
              <div className="p-3 sm:p-4 border-b border-slate-800 space-y-2 shrink-0">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Ketik Nomor DN, Nama Kapal, PT, Tanggal, Pengawas..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                    >
                      &times;
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>Ditemukan: {filteredRecords.length} catatan</span>
                  <span className="text-[10px]">Klik salah satu untuk mengoreksi</span>
                </div>
              </div>

              {/* Records List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
                {filteredRecords.map(r => {
                  const isSelected = selectedRecordId === r.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => handleSelectRecordForEdit(r)}
                      className={`p-3 rounded-2xl cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-amber-500/15 border-2 border-amber-500/60 text-white shadow-lg shadow-amber-500/10'
                          : 'bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-xs text-amber-400">
                          DN {r.nomorDn || '(Kosong)'}
                        </span>
                        <span className="text-[10px] text-slate-400">{r.tanggal}</span>
                      </div>
                      <div className="text-xs font-bold text-white truncate mt-0.5">
                        {r.pt} - {r.namaKapalMobil || '(Tanpa Armada)'}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                        <span>
                          {r.keluar > 0
                            ? `${r.keluar.toLocaleString('id-ID')} L Keluar`
                            : `${r.masuk.toLocaleString('id-ID')} L Masuk`}
                        </span>
                        <span className="font-mono text-[10px]">
                          Tangki {r.tangki} • {r.pengawas}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Quick In-line Correction Editor */}
            <div className="w-full sm:w-1/2 flex flex-col h-full bg-slate-900 p-4 sm:p-5 overflow-y-auto">
              {editingRecordDraft ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                        Koreksi Catatan Transaksi
                      </span>
                      <h4 className="text-sm font-bold text-white">
                        DN {editingRecordDraft.nomorDn} • {editingRecordDraft.pt}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenFullEditModal(editingRecordDraft);
                        }}
                        className="text-[11px] text-amber-400 hover:underline font-medium"
                      >
                        Buka Form Lengkap &rarr;
                      </button>
                    </div>
                  </div>

                  {/* Field: Tanggal & Nomor DN */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Tanggal (M/D/YYYY)
                      </label>
                      <input
                        type="text"
                        value={editingRecordDraft.tanggal}
                        onChange={e => setEditingRecordDraft({ ...editingRecordDraft, tanggal: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Nomor DN (Delivery Note)
                      </label>
                      <input
                        type="text"
                        value={editingRecordDraft.nomorDn}
                        onChange={e => setEditingRecordDraft({ ...editingRecordDraft, nomorDn: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Field: Nama PT & Nama Kapal/Mobil */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Nama PT (Rekanan)
                      </label>
                      <input
                        type="text"
                        value={editingRecordDraft.pt}
                        onChange={e => setEditingRecordDraft({ ...editingRecordDraft, pt: e.target.value.toUpperCase() })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Nama Kapal / Mobil
                      </label>
                      <input
                        type="text"
                        value={editingRecordDraft.namaKapalMobil}
                        onChange={e => setEditingRecordDraft({ ...editingRecordDraft, namaKapalMobil: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Field: Volume Keluar & Masuk */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <div>
                      <label className="block text-[11px] font-bold text-amber-400 mb-1">
                        Volume Keluar (Liter)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editingRecordDraft.keluar || ''}
                        onChange={e => setEditingRecordDraft({ ...editingRecordDraft, keluar: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-amber-500/30 rounded-xl px-3 py-2 text-sm text-amber-400 font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-amber-300 block mt-1">
                        ≈ {((Number(editingRecordDraft.keluar) || 0) * density / 1000).toFixed(3)} MT
                      </span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-400 mb-1">
                        Volume Masuk (Liter)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editingRecordDraft.masuk || ''}
                        onChange={e => setEditingRecordDraft({ ...editingRecordDraft, masuk: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-emerald-500/30 rounded-xl px-3 py-2 text-sm text-emerald-400 font-mono font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-emerald-300 block mt-1">
                        ≈ {((Number(editingRecordDraft.masuk) || 0) * density / 1000).toFixed(3)} MT
                      </span>
                    </div>
                  </div>

                  {/* Field: Tangki & Pengawas (Touch Segmented Buttons) */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-medium text-slate-400">
                      Kompartemen Tangki:
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {ALLOWED_TANKS.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setEditingRecordDraft({ ...editingRecordDraft, tangki: t })}
                          className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                            editingRecordDraft.tangki === t
                              ? 'bg-amber-500 text-slate-950 ring-1 ring-amber-400'
                              : 'bg-slate-950 text-slate-300 border border-slate-800'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-medium text-slate-400">
                      Pengawas Bunkering:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {ALLOWED_SUPERVISORS.map(spv => (
                        <button
                          key={spv}
                          type="button"
                          onClick={() => setEditingRecordDraft({ ...editingRecordDraft, pengawas: spv })}
                          className={`py-2 rounded-xl text-xs font-bold transition-all ${
                            editingRecordDraft.pengawas === spv
                              ? 'bg-amber-500 text-slate-950 ring-1 ring-amber-400'
                              : 'bg-slate-950 text-slate-300 border border-slate-800'
                          }`}
                        >
                          {spv}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Field: Kotakan & Keterangan */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Ukuran Kotakan
                      </label>
                      <select
                        value={editingRecordDraft.kotakan || ''}
                        onChange={e => setEditingRecordDraft({
                          ...editingRecordDraft,
                          kotakan: e.target.value ? Number(e.target.value) : null
                        })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      >
                        <option value="">Tanpa Kotakan</option>
                        {ALLOWED_KOTAKAN_SIZES.map(k => (
                          <option key={k} value={k}>Kotakan {k}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Status Kotakan
                      </label>
                      <select
                        value={editingRecordDraft.keteranganKotakan || ''}
                        onChange={e => setEditingRecordDraft({
                          ...editingRecordDraft,
                          keteranganKotakan: e.target.value
                        })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      >
                        <option value="">(Kosong / Standar)</option>
                        {ALLOWED_KOTAKAN_STATUSES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Catatan / Alasan Perbaikan */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Alasan / Keterangan Koreksi
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Koreksi salah ketik volume sesuai slip bunker"
                      value={correctionReason}
                      onChange={e => setCorrectionReason(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    {onDeleteRecord && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Yakin ingin menghapus transaksi DN ${editingRecordDraft.nomorDn || editingRecordDraft.pt}?`)) {
                            onDeleteRecord(editingRecordDraft.id);
                            setSelectedRecordId(null);
                            setEditingRecordDraft(null);
                            showNotification('Transaksi berhasil dihapus.');
                          }
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    )}

                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRecordId(null);
                          setEditingRecordDraft(null);
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={isSaving}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>{isSaving ? 'Menyimpan...' : 'Simpan Koreksi'}</span>
                        {webhookUrl && <Send className="w-3 h-3 text-slate-900" />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mb-2">
                    <Edit3 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-300">Pilih Transaksi di Kolom Kiri</h4>
                  <p className="text-xs text-slate-500 max-w-xs mt-1">
                    Klik salah satu catatan transaksi di daftar sebelah kiri untuk membetulkan data pengisian yang keliru.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: 🕒 RIWAYAT KOREKSI & UNDO */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-400" />
                  Audit Trail & Riwayat Pembetulan Catatan
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Setiap koreksi tersimpan rapi. Anda dapat membatalkan koreksi (Undo) jika ingin mengembalikan data semula.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-300 px-2.5 py-1 bg-slate-900 rounded-lg border border-slate-800">
                {correctionHistory.length} Riwayat
              </span>
            </div>

            {correctionHistory.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto mb-2 text-slate-500">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-300">Belum Ada Riwayat Koreksi</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Saat Anda membetulkan data yang salah, perubahan dan nilai aslinya akan tercatat di sini sehingga dapat di-undo kapan saja.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {correctionHistory.map(log => (
                  <div
                    key={log.id}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-amber-400">
                          DN {log.nomorDn || '(Tanpa DN)'}
                        </span>
                        <span className="text-xs text-white font-semibold">
                          {log.pt} - {log.namaKapal}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          • {log.timestamp}
                        </span>
                      </div>

                      {/* Changed Fields */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {log.fieldChanges.map((change, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px]"
                          >
                            <span className="text-slate-400">{change.label}:</span>
                            <span className="text-rose-300 line-through font-mono">{String(change.oldVal || '-')}</span>
                            <ArrowRight className="w-3 h-3 text-slate-500" />
                            <span className="text-emerald-400 font-mono font-bold">{String(change.newVal || '-')}</span>
                          </span>
                        ))}
                      </div>

                      {log.reason && (
                        <p className="text-[11px] text-slate-400 italic">
                          Alasan: &ldquo;{log.reason}&rdquo;
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onUndoCorrection(log.id);
                        showNotification(`Koreksi transaksi DN ${log.nomorDn} berhasil dibatalkan (Undo)!`);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-400 hover:text-slate-950 hover:bg-amber-400 border border-amber-500/30 transition-all flex items-center gap-1.5 self-start sm:self-auto shrink-0 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Batalkan (Undo)</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 sm:px-6 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>
            {anomalies.length > 0
              ? `⚠️ Terdapat ${anomalies.length} ketidaksesuaian input yang perlu ditinjau.`
              : '✅ Seluruh data transaksi siap digunakan untuk pelaporan PDF & Spreadsheet.'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Selesai / Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
