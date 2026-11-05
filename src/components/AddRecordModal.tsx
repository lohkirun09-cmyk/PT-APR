import React, { useState, useEffect } from 'react';
import { X, Fuel, Save, AlertCircle, Send, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  BunkeringRecord,
  ALLOWED_TANKS,
  ALLOWED_SUPERVISORS,
  ALLOWED_KOTAKAN_SIZES,
  ALLOWED_KOTAKAN_STATUSES,
  ALLOWED_CATEGORIES,
  appendRecordToSpreadsheet
} from '../utils/bunkeringData';

interface AddRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: BunkeringRecord, syncSuccessMsg?: string) => void;
  editingRecord: BunkeringRecord | null;
  knownPTs: string[];
  webhookUrl?: string;
  onOpenSpreadsheetSettings?: () => void;
}

export const AddRecordModal: React.FC<AddRecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingRecord,
  knownPTs,
  webhookUrl = '',
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
    kotakan: null,
    keteranganKotakan: 'KASIH'
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sendToSpreadsheet, setSendToSpreadsheet] = useState<boolean>(Boolean(webhookUrl));
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

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
    setErrorMsg(null);
  }, [editingRecord, isOpen, knownPTs, webhookUrl]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tanggal) {
      setErrorMsg('Tanggal wajib diisi.');
      return;
    }
    if (!formData.pt?.trim()) {
      setErrorMsg('Nama PT wajib diisi.');
      return;
    }
    if ((formData.keluar || 0) <= 0 && (formData.masuk || 0) <= 0) {
      setErrorMsg('Mohon isi volume Masuk atau volume Keluar (lebih dari 0 Liter).');
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

    // Send to Google Spreadsheet via Apps Script Webhook if configured and enabled
    if (!editingRecord && webhookUrl && sendToSpreadsheet) {
      setIsSyncing(true);
      setErrorMsg(null);
      try {
        const res = await appendRecordToSpreadsheet(webhookUrl, newRecord);
        if (res.success) {
          syncResultMsg = `Tercatat di Google Spreadsheet${res.row ? ` (Baris #${res.row})` : ''}!`;
        }
      } catch (err: any) {
        console.warn('Google Sheet writeback error:', err);
        // Warn the user but still save locally so data isn't lost
        setErrorMsg(`Perhatian: Data tersimpan di dashboard, tapi gagal masuk ke Google Sheet: ${err.message || 'Koneksi error'}`);
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

  // Flow difference
  const flowDiff = (Number(formData.flowStop) || 0) - (Number(formData.flowStart) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <Fuel className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {editingRecord ? 'Perbarui Data Transaksi Bunkering' : 'Catat Transaksi Bunkering Baru'}
            </h3>
            <p className="text-xs text-slate-400">
              Input data operasional penerimaan (Masuk) atau penyaluran (Keluar) bahan bakar
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Tanggal & Keterangan & Nomor DN */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Tanggal Transaksi *</label>
              <input
                type="date"
                value={formData.tanggal ? (formData.tanggal.includes('-') && formData.tanggal.split('-')[0].length === 4 ? formData.tanggal : formData.tanggal.split('/').length === 3 ? `${formData.tanggal.split('/')[2].length === 2 ? '20' + formData.tanggal.split('/')[2] : formData.tanggal.split('/')[2]}-${formData.tanggal.split('/')[0].padStart(2, '0')}-${formData.tanggal.split('/')[1].padStart(2, '0')}` : formData.tanggal) : ''}
                onChange={e => setFormData({ ...formData, tanggal: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-amber-500 cursor-pointer"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Kategori Bunkering</label>
              <select
                value={formData.keterangan || 'BUNKERING A'}
                onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                {ALLOWED_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Nomor DN (Delivery Note)</label>
              <input
                type="text"
                placeholder="Contoh: 16155"
                value={formData.nomorDn || ''}
                onChange={e => setFormData({ ...formData, nomorDn: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Row 2: Volume Masuk & Volume Keluar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80">
            <div>
              <label className="block text-xs font-semibold text-emerald-400 mb-1">
                Volume Masuk (Penerimaan / Inflow) - Liter
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={formData.masuk || ''}
                onChange={e => setFormData({ ...formData, masuk: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-emerald-500/30 rounded-xl px-3 py-2 text-sm font-bold text-emerald-400 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-amber-400 mb-1">
                Volume Keluar (Penyaluran / Outflow) - Liter
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={formData.keluar || ''}
                onChange={e => setFormData({ ...formData, keluar: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-amber-500/30 rounded-xl px-3 py-2 text-sm font-bold text-amber-400 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Row 3: Nama PT & Kapal / Mobil */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Nama PT (Client / Rekanan) *</label>
              <input
                type="text"
                list="pt-list"
                placeholder="Contoh: KBT, APR, MIL, CDM, GSM"
                value={formData.pt || ''}
                onChange={e => setFormData({ ...formData, pt: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-amber-500"
                required
              />
              <datalist id="pt-list">
                {knownPTs.map(pt => (
                  <option key={pt} value={pt} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Nama Mobil / Kapal</label>
              <input
                type="text"
                placeholder="Contoh: TB Karya Star 57, KT 8825 BY"
                value={formData.namaKapalMobil || ''}
                onChange={e => setFormData({ ...formData, namaKapalMobil: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Row 4: Tangki & Pengawas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tangki (1S, 1P, 2S, 2P, 3S, 3P, 4S, 4P)
              </label>
              <select
                value={formData.tangki || '3P'}
                onChange={e => setFormData({ ...formData, tangki: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                {ALLOWED_TANKS.map(t => (
                  <option key={t} value={t}>Tangki {t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Pengawas (LOLI, ELMAN, DAYAT)
              </label>
              <select
                value={formData.pengawas || 'DAYAT'}
                onChange={e => setFormData({ ...formData, pengawas: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                {ALLOWED_SUPERVISORS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 5: Waktu Start & Stop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Time Start</label>
              <input
                type="text"
                placeholder="Contoh: 9:54:00 AM"
                value={formData.timeStart || ''}
                onChange={e => setFormData({ ...formData, timeStart: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Time Stop</label>
              <input
                type="text"
                placeholder="Contoh: 10:12:00 AM"
                value={formData.timeStop || ''}
                onChange={e => setFormData({ ...formData, timeStop: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Row 6: Flow Meter Start & Stop */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-950/40 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Flow Meter Start</label>
              <input
                type="number"
                placeholder="0"
                value={formData.flowStart || ''}
                onChange={e => setFormData({ ...formData, flowStart: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Flow Meter Stop</label>
              <input
                type="number"
                placeholder="0"
                value={formData.flowStop || ''}
                onChange={e => setFormData({ ...formData, flowStop: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Selisih Flow Meter</label>
              <div className="px-2.5 py-1.5 bg-slate-900/80 rounded-lg text-xs font-mono font-bold text-amber-300 border border-slate-800">
                {flowDiff > 0 ? `${flowDiff.toLocaleString('id-ID')} L` : '-'}
              </div>
            </div>
          </div>

          {/* Row 7: Kotakan & Keterangan Kotakan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-blue-950/20 border border-blue-900/40 rounded-2xl">
            <div>
              <label className="block text-xs font-semibold text-blue-300 mb-1">
                Kotakan (20, 25, 50, dan 100)
              </label>
              <select
                value={formData.kotakan !== null && formData.kotakan !== undefined ? formData.kotakan : ''}
                onChange={e => {
                  const val = e.target.value;
                  setFormData({ ...formData, kotakan: val ? Number(val) : null });
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">Tanpa Kotakan</option>
                {ALLOWED_KOTAKAN_SIZES.map(k => (
                  <option key={k} value={k}>Kotakan {k}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-300 mb-1">
                Keterangan Kotakan (NEXT TRIP, TIDAK KASIH, KASIH)
              </label>
              <select
                value={formData.keteranganKotakan || ''}
                onChange={e => setFormData({ ...formData, keteranganKotakan: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">(Kosong / Standar)</option>
                {ALLOWED_KOTAKAN_STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Google Spreadsheet Sync Banner / Toggle */}
          {!editingRecord && (
            webhookUrl ? (
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Kirim Langsung ke Google Spreadsheet</span>
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Webhook Apps Script Terhubung Aktif
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendToSpreadsheet}
                    onChange={e => setSendToSpreadsheet(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-[11px]">Ingin transaksi ini otomatis terinput ke Google Spreadsheet?</span>
                </div>
                {onOpenSpreadsheetSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSpreadsheetSettings();
                    }}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline shrink-0 cursor-pointer text-left"
                  >
                    Hubungkan Google Sheet &rarr;
                  </button>
                )}
              </div>
            )
          )}

          {/* Form Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSyncing}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSyncing}
              className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 disabled:opacity-60"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengirim ke Spreadsheet...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{editingRecord ? 'Perbarui Data' : 'Simpan Transaksi'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
