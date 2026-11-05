import * as XLSX from 'xlsx';
import {
  BunkeringRecord,
  DashboardMetrics,
  FilterState,
  DEFAULT_DENSITY,
  convertLiterToTon,
  formatLiter,
  formatNumber
} from './bunkeringData';

/**
 * Generates an automated, multi-tab Excel Workbook (.xlsx)
 * with executive summary, raw transaction data, PT rankings, and kotakan status.
 */
export function exportBunkeringToExcel(
  records: BunkeringRecord[],
  metrics: DashboardMetrics,
  filter: FilterState,
  companyName: string = 'PT. ANGKA PETROLEUM RAYA',
  density: number = DEFAULT_DENSITY
): void {
  const wb = XLSX.utils.book_new();

  // ==========================================
  // TAB 1: RINGKASAN EKSEKUTIF (EXECUTIVE SUMMARY)
  // ==========================================
  const summaryData: (string | number)[][] = [
    [companyName],
    ['LAPORAN OPERASIONAL & MONITORING BUNKERING BBM'],
    [`Tanggal Cetak: ${new Date().toLocaleString('id-ID')}`],
    [`Filter Periode: ${filter.startDate || 'Semua'} s/d ${filter.endDate || 'Semua'}`],
    [`Faktor Berat Jenis (Density): ${density.toFixed(3)} kg/L (HSD Solar Industri)`],
    [],
    ['METRIK UTAMA OPERASIONAL', 'NILAI VOLUME', 'SATUAN', 'NILAI TONASE (MT)'],
    ['Total Bahan Bakar Masuk (Inflow)', metrics.totalMasuk, 'Liter', Number(convertLiterToTon(metrics.totalMasuk, density).toFixed(3))],
    ['Total Bahan Bakar Keluar (Bunkering Outflow)', metrics.totalKeluar, 'Liter', Number(convertLiterToTon(metrics.totalKeluar, density).toFixed(3))],
    ['Total Keseluruhan Aliran Minyak (Throughput)', metrics.totalKeseluruhan, 'Liter', Number(convertLiterToTon(metrics.totalKeseluruhan, density).toFixed(3))],
    ['Neraca Saldo / Perubahan Stok (Masuk - Keluar)', metrics.netBalance, 'Liter', Number(convertLiterToTon(metrics.netBalance, density).toFixed(3))],
    ['Total Frekuensi Transaksi', metrics.totalTransaksi, 'Transaksi', '-'],
    ['Jumlah Transaksi Masuk', metrics.transaksiMasukCount, 'Trip', '-'],
    ['Jumlah Transaksi Keluar', metrics.transaksiKeluarCount, 'Trip', '-'],
    [],
    ['5 TOP NAMA PT TERBANYAK (BERDASARKAN VOLUME KELUAR)'],
    ['Peringkat', 'Nama PT', 'Volume Keluar (L)', 'Volume Keluar (MT)', 'Volume Masuk (L)', 'Total (L)', 'Trip', 'Pangsa Pasar (%)'],
  ];

  metrics.top5PT.forEach((item, idx) => {
    summaryData.push([
      idx + 1,
      item.pt,
      item.volumeKeluar,
      Number(convertLiterToTon(item.volumeKeluar, density).toFixed(3)),
      item.volumeMasuk,
      item.totalVolume,
      item.tripCount,
      `${item.percentage.toFixed(1)}%`
    ]);
  });

  summaryData.push([]);
  summaryData.push(['5 TOP KOTAKAN TERBANYAK (DISTRIBUSI KOTAKAN)']);
  summaryData.push(['Kotakan', 'Jumlah Transaksi', 'KASIH', 'TIDAK KASIH', 'NEXT TRIP', 'Persentase (%)']);

  metrics.top5Kotakan.forEach(item => {
    summaryData.push([
      item.kotakan,
      item.count,
      item.kasihCount,
      item.tidakKasihCount,
      item.nextTripCount,
      `${item.percentage.toFixed(1)}%`
    ]);
  });

  summaryData.push([]);
  summaryData.push(['STATUS KOTAKAN KESELURUHAN']);
  summaryData.push(['Status', 'Jumlah']);
  summaryData.push(['KASIH', metrics.kotakanStatusSummary.kasih]);
  summaryData.push(['TIDAK KASIH', metrics.kotakanStatusSummary.tidakKasih]);
  summaryData.push(['NEXT TRIP', metrics.kotakanStatusSummary.nextTrip]);
  summaryData.push(['Lainnya / Kosong', metrics.kotakanStatusSummary.unspecified]);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  // Set column widths for summary
  wsSummary['!cols'] = [
    { wch: 35 },
    { wch: 25 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Eksekutif');

  // ==========================================
  // TAB 2: DATA TRANSAKSI LENGKAP
  // ==========================================
  const rawHeaders = [
    'No',
    'Tanggal',
    'Keterangan',
    'Masuk (Liter)',
    'Masuk (Ton/MT)',
    'Keluar (Liter)',
    'Keluar (Ton/MT)',
    'Nomor DN',
    'Nama PT',
    'Nama Kapal / Mobil',
    'Tangki',
    'Time Start',
    'Time Stop',
    'Flow Start',
    'Flow Stop',
    'Selisih Flow Meter',
    'Pengawas',
    'Kotakan',
    'Keterangan Kotakan',
    'Waktu Catat'
  ];

  const rawRows: (string | number)[][] = [rawHeaders];

  records.forEach((r, idx) => {
    const flowDiff = (r.flowStop > 0 && r.flowStart > 0) ? (r.flowStop - r.flowStart) : 0;
    const masukTon = r.masuk > 0 ? Number(convertLiterToTon(r.masuk, density).toFixed(3)) : 0;
    const keluarTon = r.keluar > 0 ? Number(convertLiterToTon(r.keluar, density).toFixed(3)) : 0;

    rawRows.push([
      idx + 1,
      r.tanggal,
      r.keterangan,
      r.masuk || 0,
      masukTon,
      r.keluar || 0,
      keluarTon,
      r.nomorDn,
      r.pt,
      r.namaKapalMobil,
      r.tangki,
      r.timeStart,
      r.timeStop,
      r.flowStart,
      r.flowStop,
      flowDiff,
      r.pengawas,
      r.kotakan !== null ? r.kotakan : '-',
      r.keteranganKotakan,
      r.timestamp
    ]);
  });

  const wsRaw = XLSX.utils.aoa_to_sheet(rawRows);
  wsRaw['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 16 },
    { wch: 15 },
    { wch: 15 },
    { wch: 14 },
    { wch: 18 },
    { wch: 22 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 10 },
    { wch: 18 },
    { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(wb, wsRaw, 'Data Transaksi');

  // ==========================================
  // TAB 3: REKAPITULASI PT LENGKAP
  // ==========================================
  const ptHeaders = ['Peringkat', 'Nama PT', 'Volume Keluar (L)', 'Volume Masuk (L)', 'Total Aliran (L)', 'Frekuensi Trip', 'Pangsa Pasar Keluar (%)'];
  const ptRows: (string | number)[][] = [ptHeaders];
  metrics.allPTStats.forEach((pt, i) => {
    ptRows.push([
      i + 1,
      pt.pt,
      pt.volumeKeluar,
      pt.volumeMasuk,
      pt.totalVolume,
      pt.tripCount,
      `${pt.percentage.toFixed(2)}%`
    ]);
  });
  const wsPT = XLSX.utils.aoa_to_sheet(ptRows);
  wsPT['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsPT, 'Rekapitulasi PT');

  // ==========================================
  // TAB 4: REKAP PENGAWAS & TANGKI
  // ==========================================
  const recSummary: (string | number)[][] = [
    ['REKAP PENGAWAS OPERASIONAL'],
    ['Nama Pengawas', 'Total Volume Ditangani (L)', 'Jumlah Transaksi'],
  ];
  metrics.pengawasStats.forEach(p => {
    recSummary.push([p.pengawas, p.volume, p.tripCount]);
  });

  recSummary.push([]);
  recSummary.push(['REKAP KOMPARTEMEN TANGKI']);
  recSummary.push(['Tangki', 'Volume Keluar (L)', 'Volume Masuk (L)', 'Total (L)', 'Jumlah Pengisian']);
  metrics.tangkiStats.forEach(t => {
    recSummary.push([t.tangki, t.keluar, t.masuk, t.keluar + t.masuk, t.count]);
  });

  const wsSupervisorTank = XLSX.utils.aoa_to_sheet(recSummary);
  wsSupervisorTank['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsSupervisorTank, 'Rekap Pengawas & Tangki');

  // Generate file name with date stamp
  const todayStr = new Date().toISOString().slice(0, 10);
  const fileName = `Laporan_Bunkering_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${todayStr}.xlsx`;

  // Trigger download in browser
  XLSX.writeFile(wb, fileName);
}
