import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Gauge,
  Fuel,
  FileText,
  Wrench
} from 'lucide-react';
import {
  BunkeringRecord,
  UnitMode,
  DEFAULT_DENSITY,
  convertLiterToTon,
  formatTonase,
  formatLiter,
  formatNumber
} from '../utils/bunkeringData';

interface DataTableProps {
  records: BunkeringRecord[];
  onEditRecord: (record: BunkeringRecord) => void;
  onDeleteRecord: (id: string) => void;
  onOpenCorrectionModal?: () => void;
  unitMode?: UnitMode;
  density?: number;
}

type SortField = 'tanggal' | 'pt' | 'keluar' | 'masuk' | 'nomorDn' | 'pengawas' | 'kotakan';
type SortOrder = 'asc' | 'desc';

export const DataTable: React.FC<DataTableProps> = ({
  records,
  onEditRecord,
  onDeleteRecord,
  onOpenCorrectionModal,
  unitMode = 'LITER',
  density = DEFAULT_DENSITY
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [sortField, setSortField] = useState<SortField>('tanggal');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'tanggal') {
        comparison = a.tanggal.localeCompare(b.tanggal);
      } else if (sortField === 'pt') {
        comparison = a.pt.localeCompare(b.pt);
      } else if (sortField === 'keluar') {
        comparison = (a.keluar || 0) - (b.keluar || 0);
      } else if (sortField === 'masuk') {
        comparison = (a.masuk || 0) - (b.masuk || 0);
      } else if (sortField === 'nomorDn') {
        comparison = a.nomorDn.localeCompare(b.nomorDn);
      } else if (sortField === 'pengawas') {
        comparison = a.pengawas.localeCompare(b.pengawas);
      } else if (sortField === 'kotakan') {
        comparison = (a.kotakan || 0) - (b.kotakan || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [records, sortField, sortOrder]);

  const totalPages = Math.ceil(sortedRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            Data Log Bunkering & Transaksi BBM
          </h2>
          <p className="text-xs text-slate-400">
            Daftar lengkap transaksi aliran masuk/keluar, flow meter, tangki, dan status kotakan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-stretch sm:self-auto justify-between sm:justify-end">
          {onOpenCorrectionModal && (
            <button
              onClick={onOpenCorrectionModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold transition-colors cursor-pointer shadow-sm"
              title="Buka alat bantu perbaikan dan koreksi salah input"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Alat Koreksi</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">
              Baris:
            </span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-800 text-white text-xs rounded-lg px-2 py-1 focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Wrapper */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 select-none">
            <tr>
              <th className="py-3 px-3 w-12 text-center">No</th>
              <th
                onClick={() => handleSort('tanggal')}
                className="py-3 px-3 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Tanggal</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th className="py-3 px-3">Kategori</th>
              <th
                onClick={() => handleSort('masuk')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Masuk ({unitMode === 'TONASE' ? 'MT' : 'L'})</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th
                onClick={() => handleSort('keluar')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Keluar ({unitMode === 'TONASE' ? 'MT' : 'L'})</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th
                onClick={() => handleSort('nomorDn')}
                className="py-3 px-3 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>No. DN</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th
                onClick={() => handleSort('pt')}
                className="py-3 px-3 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Nama PT</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th className="py-3 px-3">Kapal / Mobil</th>
              <th className="py-3 px-3 text-center">Tangki</th>
              <th className="py-3 px-3">Waktu (Start - Stop)</th>
              <th className="py-3 px-3 text-right">Flow Meter (Awal & Akhir)</th>
              <th
                onClick={() => handleSort('pengawas')}
                className="py-3 px-3 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Pengawas</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th
                onClick={() => handleSort('kotakan')}
                className="py-3 px-3 text-center cursor-pointer hover:text-white"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Kotakan</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th className="py-3 px-3">Keterangan Kotakan</th>
              <th className="py-3 px-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={15} className="py-12 text-center text-slate-500">
                  Tidak ada catatan data transaksi yang sesuai filter.
                </td>
              </tr>
            ) : (
              paginatedRecords.map((r, index) => {
                const globalIndex = (currentPage - 1) * pageSize + index + 1;
                const flowDiff = (r.flowStop > 0 && r.flowStart > 0) ? (r.flowStop - r.flowStart) : 0;
                const targetVolume = r.keluar > 0 ? r.keluar : r.masuk;
                const hasFlowDiscrepancy = flowDiff > 0 && targetVolume > 0 && Math.abs(flowDiff - targetVolume) > 10;

                return (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-850/50 transition-colors group"
                  >
                    <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                      {globalIndex}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-white font-semibold">
                      {r.tanggal}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {r.keterangan || '-'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-400 whitespace-nowrap">
                      {r.masuk > 0 ? (
                        unitMode === 'TONASE' ? (
                          <div>
                            <div>{formatTonase(convertLiterToTon(r.masuk, density), 3)}</div>
                            <span className="block text-[10px] text-slate-400 font-normal">{formatLiter(r.masuk)}</span>
                          </div>
                        ) : (
                          formatLiter(r.masuk)
                        )
                      ) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-400 whitespace-nowrap">
                      {r.keluar > 0 ? (
                        unitMode === 'TONASE' ? (
                          <div>
                            <div>{formatTonase(convertLiterToTon(r.keluar, density), 3)}</div>
                            <span className="block text-[10px] text-slate-400 font-normal">{formatLiter(r.keluar)}</span>
                          </div>
                        ) : (
                          formatLiter(r.keluar)
                        )
                      ) : '-'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-300">
                      {r.nomorDn || '-'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-white font-semibold">
                      {r.pt}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-300">
                      {r.namaKapalMobil || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded font-bold text-[11px] bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        {r.tangki || '-'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-[11px] text-slate-400">
                      {r.timeStart ? `${r.timeStart} - ${r.timeStop || '?'}` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono text-[11px]">
                      {r.flowStart > 0 || r.flowStop > 0 ? (
                        <div>
                          <span className="text-slate-300">{formatNumber(r.flowStart)} → {formatNumber(r.flowStop)}</span>
                          <span className={`block text-[10px] ${hasFlowDiscrepancy ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                            Δ {formatLiter(flowDiff)} {hasFlowDiscrepancy ? '⚠️' : ''}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30">
                        {r.pengawas || '-'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap font-bold">
                      {r.kotakan ? (
                        <span className="px-2 py-0.5 rounded text-[11px] bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {r.kotakan}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {r.keteranganKotakan ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                            r.keteranganKotakan.includes('TIDAK')
                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              : r.keteranganKotakan.includes('NEXT')
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {r.keteranganKotakan}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={() => onEditRecord(r)}
                          className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit transaksi"
                          aria-label={`Edit transaksi ${r.nomorDn}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteRecord(r.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Hapus transaksi"
                          aria-label={`Hapus transaksi ${r.nomorDn}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 text-xs text-slate-400">
        <div>
          Menampilkan baris {(currentPage - 1) * pageSize + 1} -{' '}
          {Math.min(currentPage * pageSize, sortedRecords.length)} dari {sortedRecords.length} total data
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Halaman Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3 py-1 font-semibold text-white">
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Halaman Selanjutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
