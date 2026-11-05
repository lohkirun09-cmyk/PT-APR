import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BunkeringRecord,
  UnitMode,
  DEFAULT_DENSITY,
  convertLiterToTon,
  formatTonase,
  formatNumber
} from './bunkeringData';
import { KOP_HEADER_BASE64, KOP_PAGE_BG_BASE64 } from './kopSuratAssets';

export interface SupervisorKotakanSummary {
  pengawas: string;
  totalTrip: number;
  totalVolume: number;
  k20Kasih: number;
  k20Tidak: number;
  k25Kasih: number;
  k25Tidak: number;
  k50Kasih: number;
  k50Tidak: number;
  k100Kasih: number;
  k100Tidak: number;
  totalKasih: number;
  totalTidakKasih: number;
  totalNextTrip: number;
}

export interface ShipKotakanSummary {
  namaKapal: string;
  pt: string;
  displayKapal: string;
  totalKeluar: number; // Volume in Liters
  totalKotakan: number; // Sum of kotakan amount (e.g. 50, 100, 25)
  tripCount: number;
  pengawas: string; // Nama pengawas operasional (e.g. DAYAT, LOLI, ELMAN)
  kasihCount: number;
  tidakKasihCount: number;
  nextTripCount: number;
}

/**
 * Filter records for a specific month and year (e.g. "2026-10" or "ALL")
 */
export function filterRecordsByMonth(records: BunkeringRecord[], monthKey: string): BunkeringRecord[] {
  if (!monthKey || monthKey === 'ALL') return records;

  return records.filter(r => {
    if (!r.tanggal) return false;
    // tanggal can be MM/DD/YYYY or YYYY-MM-DD
    const parts = r.tanggal.split('/');
    if (parts.length === 3) {
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      const month = parts[0].padStart(2, '0');
      return `${year}-${month}` === monthKey;
    }
    const dashParts = r.tanggal.split('-');
    if (dashParts.length === 3) {
      if (dashParts[0].length === 4) {
        return `${dashParts[0]}-${dashParts[1].padStart(2, '0')}` === monthKey;
      }
      return `${dashParts[2]}-${dashParts[1].padStart(2, '0')}` === monthKey;
    }
    return false;
  });
}

/**
 * Get distinct list of available Month-Years from records
 */
export function getAvailableMonthKeys(records: BunkeringRecord[]): { key: string; label: string }[] {
  const monthsMap = new Map<string, string>();
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  records.forEach(r => {
    if (!r.tanggal) return;
    const parts = r.tanggal.split('/');
    if (parts.length === 3) {
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      const mIdx = parseInt(parts[0], 10) - 1;
      const key = `${year}-${parts[0].padStart(2, '0')}`;
      if (!monthsMap.has(key) && mIdx >= 0 && mIdx < 12) {
        monthsMap.set(key, `${monthNames[mIdx]} ${year}`);
      }
    } else if (r.tanggal.includes('-')) {
      const p = r.tanggal.split('-');
      if (p.length === 3) {
        const year = p[0].length === 4 ? p[0] : p[2];
        const monthNum = p[0].length === 4 ? p[1] : p[1];
        const mIdx = parseInt(monthNum, 10) - 1;
        const key = `${year}-${monthNum.padStart(2, '0')}`;
        if (!monthsMap.has(key) && mIdx >= 0 && mIdx < 12) {
          monthsMap.set(key, `${monthNames[mIdx]} ${year}`);
        }
      }
    }
  });

  const sortedKeys = Array.from(monthsMap.keys()).sort().reverse();
  return sortedKeys.map(k => ({
    key: k,
    label: monthsMap.get(k) || k
  }));
}

/**
 * Calculate Kotakan Summary Grouped by Supervisor (Pengawas)
 */
export function calculateSupervisorKotakanSummary(records: BunkeringRecord[]): {
  supervisors: SupervisorKotakanSummary[];
  grandTotal: SupervisorKotakanSummary;
} {
  const map = new Map<string, SupervisorKotakanSummary>();
  const defaultSupervisors = ['DAYAT', 'LOLI', 'ELMAN'];

  defaultSupervisors.forEach(p => {
    map.set(p, {
      pengawas: p,
      totalTrip: 0,
      totalVolume: 0,
      k20Kasih: 0,
      k20Tidak: 0,
      k25Kasih: 0,
      k25Tidak: 0,
      k50Kasih: 0,
      k50Tidak: 0,
      k100Kasih: 0,
      k100Tidak: 0,
      totalKasih: 0,
      totalTidakKasih: 0,
      totalNextTrip: 0
    });
  });

  records.forEach(r => {
    const p = (r.pengawas || 'LAINNYA').trim().toUpperCase();
    if (!map.has(p)) {
      map.set(p, {
        pengawas: p,
        totalTrip: 0,
        totalVolume: 0,
        k20Kasih: 0,
        k20Tidak: 0,
        k25Kasih: 0,
        k25Tidak: 0,
        k50Kasih: 0,
        k50Tidak: 0,
        k100Kasih: 0,
        k100Tidak: 0,
        totalKasih: 0,
        totalTidakKasih: 0,
        totalNextTrip: 0
      });
    }

    const item = map.get(p)!;
    item.totalTrip += 1;
    item.totalVolume += (r.keluar || 0) + (r.masuk || 0);

    const kSize = r.kotakan;
    const status = (r.keteranganKotakan || '').toUpperCase();
    const isKasih = status.includes('KASIH') && !status.includes('TIDAK');
    const isTidak = status.includes('TIDAK');
    const isNext = status.includes('NEXT');

    if (isKasih) item.totalKasih += 1;
    if (isTidak) item.totalTidakKasih += 1;
    if (isNext) item.totalNextTrip += 1;

    if (kSize === 20) {
      if (isKasih) item.k20Kasih += 1;
      else item.k20Tidak += 1;
    } else if (kSize === 25) {
      if (isKasih) item.k25Kasih += 1;
      else item.k25Tidak += 1;
    } else if (kSize === 50) {
      if (isKasih) item.k50Kasih += 1;
      else item.k50Tidak += 1;
    } else if (kSize === 100) {
      if (isKasih) item.k100Kasih += 1;
      else item.k100Tidak += 1;
    }
  });

  const supervisors = Array.from(map.values()).sort((a, b) => b.totalVolume - a.totalVolume);

  const grandTotal: SupervisorKotakanSummary = {
    pengawas: 'TOTAL KESELURUHAN',
    totalTrip: supervisors.reduce((acc, s) => acc + s.totalTrip, 0),
    totalVolume: supervisors.reduce((acc, s) => acc + s.totalVolume, 0),
    k20Kasih: supervisors.reduce((acc, s) => acc + s.k20Kasih, 0),
    k20Tidak: supervisors.reduce((acc, s) => acc + s.k20Tidak, 0),
    k25Kasih: supervisors.reduce((acc, s) => acc + s.k25Kasih, 0),
    k25Tidak: supervisors.reduce((acc, s) => acc + s.k25Tidak, 0),
    k50Kasih: supervisors.reduce((acc, s) => acc + s.k50Kasih, 0),
    k50Tidak: supervisors.reduce((acc, s) => acc + s.k50Tidak, 0),
    k100Kasih: supervisors.reduce((acc, s) => acc + s.k100Kasih, 0),
    k100Tidak: supervisors.reduce((acc, s) => acc + s.k100Tidak, 0),
    totalKasih: supervisors.reduce((acc, s) => acc + s.totalKasih, 0),
    totalTidakKasih: supervisors.reduce((acc, s) => acc + s.totalTidakKasih, 0),
    totalNextTrip: supervisors.reduce((acc, s) => acc + s.totalNextTrip, 0)
  };

  return { supervisors, grandTotal };
}

/**
 * Generate official PDF Document with authentic KOP PT. ANGKA PETROLEUM RAYA
 */
export function generateMonthlyReportPDF(
  records: BunkeringRecord[],
  monthLabel: string = 'Seluruh Periode',
  companyName: string = 'PT. ANGKA PETROLEUM RAYA',
  orientation: 'landscape' | 'portrait' = 'landscape',
  options?: {
    unitMode?: UnitMode;
    density?: number;
  }
): jsPDF {
  const isLandscape = orientation === 'landscape';
  const unitMode: UnitMode = options?.unitMode || 'LITER';
  const density: number = options?.density || DEFAULT_DENSITY;
  const isTon = unitMode === 'TONASE';
  const unitSuffix = isTon ? 'MT' : 'L';

  const formatCellVolume = (liters: number): string => {
    if (liters <= 0) return '-';
    if (isTon) {
      const tons = convertLiterToTon(liters, density);
      return formatNumber(tons, 3);
    }
    return formatNumber(liters);
  };

  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Draw Official KOP Surat Banner from user's PDF
  const drawKopSurat = () => {
    if (isLandscape) {
      // In landscape, center the official KOP header
      const kopWidth = 220;
      const kopHeight = kopWidth / (1935 / 505); // exact aspect ratio ~57.4 mm
      const kopX = (pageWidth - kopWidth) / 2;
      doc.addImage(KOP_HEADER_BASE64, 'PNG', kopX, 7, kopWidth, kopHeight);
    } else {
      // In portrait, use full width KOP header matching A4
      const kopWidth = 190;
      const kopHeight = kopWidth / (1935 / 505); // ~49.6 mm
      const kopX = (pageWidth - kopWidth) / 2;
      doc.addImage(KOP_HEADER_BASE64, 'PNG', kopX, 8, kopWidth, kopHeight);
    }
  };

  // Draw KOP on the first page
  drawKopSurat();

  // Document Title Banner below KOP
  const titleY = isLandscape ? 67 : 60;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('LAPORAN BULANAN OPERASIONAL BUNKERING', pageWidth / 2, titleY, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const printDateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  doc.text(
    `Periode: ${monthLabel}  |  Satuan: ${isTon ? `Tonase (MT) [BJ: ${density.toFixed(3)} kg/L]` : 'Liter (L)'}  |  Dicetak pada: ${printDateStr}`,
    pageWidth / 2,
    titleY + 5,
    { align: 'center' }
  );

  // 2. Prepare Data for Main Monthly Table
  // Columns requested by user:
  // 1. Tanggal
  // 2. Nomor DN
  // 3. PT / Nama kapal
  // 4. Keluar
  // 5. Masuk
  // 6. Bungker A Total
  // 7. Bungker B Total
  // 8. Kotakan
  // 3. PT / Nama kapal
  // 4. Keluar
  // 5. Masuk
  // 6. Bungker A Total
  // 7. Bungker B Total
  // 8. Kotakan
  let totalKeluar = 0;
  let totalMasuk = 0;
  let totalBungkerA = 0;
  let totalBungkerB = 0;

  const tableRows = records.map((r, idx) => {
    const k = r.keluar || 0;
    const m = r.masuk || 0;
    totalKeluar += k;
    totalMasuk += m;

    const ket = (r.keterangan || '').toUpperCase();
    const isBungkerA = ket.includes('BUNKERING A') || ket === 'A';
    const isBungkerB = ket.includes('BUNKERING B') || ket === 'B';

    const bAVol = isBungkerA ? (k > 0 ? k : m) : 0;
    const bBVol = isBungkerB ? (k > 0 ? k : m) : 0;

    totalBungkerA += bAVol;
    totalBungkerB += bBVol;

    // PT / Nama Kapal formatting
    const ptKapal = r.namaKapalMobil ? `${r.pt} - ${r.namaKapalMobil}` : r.pt;

    // Kotakan formatting removed as per user requirement: Kotakan dihapus dari laporan bulanan PDF
    return [
      idx + 1,
      r.tanggal || '-',
      r.nomorDn || '-',
      ptKapal || '-',
      k > 0 ? formatCellVolume(k) : '-',
      m > 0 ? formatCellVolume(m) : '-',
      bAVol > 0 ? formatCellVolume(bAVol) : '-',
      bBVol > 0 ? formatCellVolume(bBVol) : '-'
    ];
  });

  // Main Table using jspdf-autotable (7 Columns without Kotakan)
  autoTable(doc, {
    startY: isLandscape ? 76 : 69,
    head: [[
      'No',
      'Tanggal',
      'Nomor DN',
      'PT / Nama Kapal',
      `Keluar (${unitSuffix})`,
      `Masuk (${unitSuffix})`,
      `Bungker A Total (${unitSuffix})`,
      `Bungker B Total (${unitSuffix})`
    ]],
    body: tableRows,
    foot: [[
      '',
      'TOTAL',
      `${records.length} Transaksi`,
      '',
      formatCellVolume(totalKeluar),
      formatCellVolume(totalMasuk),
      formatCellVolume(totalBungkerA),
      formatCellVolume(totalBungkerB)
    ]],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: isLandscape ? 8 : 7,
      halign: 'center'
    },
    footStyles: {
      fillColor: [241, 245, 249], // slate-100
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: isLandscape ? 8.5 : 7.5
    },
    bodyStyles: {
      fontSize: isLandscape ? 7.5 : 6.8,
      textColor: [30, 41, 59]
    },
    columnStyles: isLandscape ? {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 24, halign: 'center' },
      2: { cellWidth: 26, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
      6: { cellWidth: 30, halign: 'right' },
      7: { cellWidth: 30, halign: 'right' }
    } : {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 20, halign: 'right' }
    },
    margin: isLandscape ? { left: 14, right: 14 } : { left: 10, right: 10 },
    showFoot: 'lastPage'
  });

  // 4. SIGNATURE SECTION (TANDA TANGAN PENGESAHAN)
  const finalY2 = (doc as any).lastAutoTable?.finalY || 150;
  let signY = finalY2 + 12;

  // If signature exceeds page height, add a page
  if (signY + 35 > pageHeight) {
    doc.addPage('a4', isLandscape ? 'landscape' : 'portrait');
    drawKopSurat();
    signY = isLandscape ? 72 : 65;
  }

  const col1X = isLandscape ? 35 : 30;
  const col2X = pageWidth / 2;
  const col3X = isLandscape ? pageWidth - 45 : pageWidth - 35;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  doc.text('Dibuat Oleh,', col1X, signY, { align: 'center' });
  doc.text('Pengawas Bunkering', col1X, signY + 4, { align: 'center' });

  doc.text('Diperiksa Oleh,', col2X, signY, { align: 'center' });
  doc.text('Koordinator Lapangan', col2X, signY + 4, { align: 'center' });

  doc.text('Disetujui Oleh,', col3X, signY, { align: 'center' });
  doc.text('Manajemen Operasional', col3X, signY + 4, { align: 'center' });

  // Signature lines
  const lineY = signY + 22;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);

  doc.line(col1X - 22, lineY, col1X + 22, lineY);
  doc.line(col2X - 22, lineY, col2X + 22, lineY);
  doc.line(col3X - 22, lineY, col3X + 22, lineY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('( DAYAT / LOLI / ELMAN )', col1X, lineY + 4, { align: 'center' });
  doc.text('( ................................. )', col2X, lineY + 4, { align: 'center' });
  doc.text('PT. ANGKA PETROLEUM RAYA', col3X, lineY + 4, { align: 'center' });

  // Page Numbers Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Halaman ${i} dari ${totalPages}  •  ${companyName} Laporan Bulanan Operasional Bunkering`,
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' }
    );
  }

  return doc;
}

/**
 * Calculate Kotakan Summary per Ship/Kapal for a monthly period
 * Sorted by Total Jumlah Kotakan Terbanyak (Descending)
 */
export function calculateShipKotakanMonthlySummary(records: BunkeringRecord[]): {
  ships: ShipKotakanSummary[];
  grandTotal: {
    totalKapal: number;
    totalKeluar: number;
    totalKotakan: number;
    totalTrip: number;
    totalKasih: number;
  };
} {
  const map = new Map<string, ShipKotakanSummary>();
  const pengawasMap = new Map<string, Set<string>>();

  records.forEach(r => {
    const k = r.keluar || 0;
    const kotakanVal = typeof r.kotakan === 'number' ? r.kotakan : 0;
    const rawKapal = (r.namaKapalMobil || '').trim();
    const rawPt = (r.pt || '').trim();
    const namaKapal = rawKapal || rawPt || 'Armada / Kapal Lainnya';
    // Use unique identifier per ship and PT
    const key = `${rawPt}__${namaKapal}`.toUpperCase();

    if (!map.has(key)) {
      map.set(key, {
        namaKapal,
        pt: rawPt,
        displayKapal: rawPt && rawKapal && !rawKapal.toUpperCase().includes(rawPt.toUpperCase())
          ? `${rawPt} - ${namaKapal}`
          : namaKapal,
        totalKeluar: 0,
        totalKotakan: 0,
        tripCount: 0,
        pengawas: '-',
        kasihCount: 0,
        tidakKasihCount: 0,
        nextTripCount: 0
      });
      pengawasMap.set(key, new Set<string>());
    }

    const item = map.get(key)!;
    item.totalKeluar += k;
    item.tripCount += 1;
    item.totalKotakan += kotakanVal;

    const p = (r.pengawas || '').trim().toUpperCase();
    if (p) {
      pengawasMap.get(key)!.add(p);
    }

    const status = (r.keteranganKotakan || '').toUpperCase();
    if (status.includes('KASIH') && !status.includes('TIDAK')) {
      item.kasihCount += 1;
    } else if (status.includes('TIDAK')) {
      item.tidakKasihCount += 1;
    } else if (status.includes('NEXT')) {
      item.nextTripCount += 1;
    }
  });

  // Assign combined pengawas list to each ship
  map.forEach((item, key) => {
    const set = pengawasMap.get(key);
    item.pengawas = set && set.size > 0 ? Array.from(set).join(', ') : '-';
  });

  // Di Urutkan Berdasarkan Total Jumlah Kotakan Terbanyak dari atas ke bawah dalam periode 1 bulan
  // Tie-breaker: total keluar minyak terbanyak
  const ships = Array.from(map.values()).sort((a, b) => {
    if (b.totalKotakan !== a.totalKotakan) {
      return b.totalKotakan - a.totalKotakan;
    }
    return b.totalKeluar - a.totalKeluar;
  });

  const grandTotal = {
    totalKapal: ships.length,
    totalKeluar: ships.reduce((acc, s) => acc + s.totalKeluar, 0),
    totalKotakan: ships.reduce((acc, s) => acc + s.totalKotakan, 0),
    totalTrip: ships.reduce((acc, s) => acc + s.tripCount, 0),
    totalKasih: ships.reduce((acc, s) => acc + s.kasihCount, 0)
  };

  return { ships, grandTotal };
}

/**
 * Generate official PDF Document for Laporan Bulanan Kotakan per Nama Kapal
 * 4 Columns requested:
 * 1. Nama Kapal
 * 2. Keluar Minyak (Liter / Tonase)
 * 3. Kotakan
 * 4. Pengawas
 * Sorted by Total Jumlah Kotakan Terbanyak (Descending)
 */
export function generateShipKotakanReportPDF(
  records: BunkeringRecord[],
  monthLabel: string = 'Seluruh Periode',
  companyName: string = 'PT. ANGKA PETROLEUM RAYA',
  orientation: 'portrait' | 'landscape' = 'portrait',
  options?: {
    unitMode?: UnitMode;
    density?: number;
    onlyWithKotakan?: boolean;
  }
): jsPDF {
  const isLandscape = orientation === 'landscape';
  const unitMode: UnitMode = options?.unitMode || 'LITER';
  const density: number = options?.density || DEFAULT_DENSITY;
  const isTon = unitMode === 'TONASE';
  const unitSuffix = isTon ? 'MT' : 'L';

  const formatCellVolume = (liters: number): string => {
    if (liters <= 0) return '-';
    if (isTon) {
      const tons = convertLiterToTon(liters, density);
      return formatNumber(tons, 3);
    }
    return formatNumber(liters);
  };

  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const drawKopSurat = () => {
    if (isLandscape) {
      const kopWidth = 220;
      const kopHeight = kopWidth / (1935 / 505);
      const kopX = (pageWidth - kopWidth) / 2;
      doc.addImage(KOP_HEADER_BASE64, 'PNG', kopX, 7, kopWidth, kopHeight);
    } else {
      const kopWidth = 190;
      const kopHeight = kopWidth / (1935 / 505);
      const kopX = (pageWidth - kopWidth) / 2;
      doc.addImage(KOP_HEADER_BASE64, 'PNG', kopX, 8, kopWidth, kopHeight);
    }
  };

  drawKopSurat();

  const titleY = isLandscape ? 67 : 60;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('LAPORAN BULANAN KOTAKAN PER NAMA KAPAL', pageWidth / 2, titleY, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const printDateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  doc.text(
    `Periode: ${monthLabel}  |  Satuan Minyak: ${isTon ? `Tonase (MT) [BJ: ${density.toFixed(3)} kg/L]` : 'Liter (L)'}  |  Urutan: Total Kotakan Terbanyak`,
    pageWidth / 2,
    titleY + 5,
    { align: 'center' }
  );

  let { ships, grandTotal } = calculateShipKotakanMonthlySummary(records);
  if (options?.onlyWithKotakan) {
    ships = ships.filter(s => s.totalKotakan > 0);
  }

  // 4 Kolom Sesuai Permintaan User:
  // 1. Nama Kapal
  // 2. Keluar Minyak
  // 3. Kotakan
  // 4. Pengawas
  const tableRows = ships.map((s, idx) => [
    idx + 1,
    s.displayKapal,
    formatCellVolume(s.totalKeluar),
    s.totalKotakan > 0 ? `${s.totalKotakan}` : '-',
    s.pengawas || '-'
  ]);

  autoTable(doc, {
    startY: isLandscape ? 76 : 69,
    head: [[
      'No',
      '1. Nama Kapal',
      `2. Keluar Minyak (${unitSuffix})`,
      '3. Kotakan',
      '4. Pengawas'
    ]],
    body: tableRows,
    foot: [[
      '',
      `TOTAL KESELURUHAN (${ships.length} Kapal)`,
      formatCellVolume(grandTotal.totalKeluar),
      `${grandTotal.totalKotakan}`,
      ''
    ]],
    theme: 'grid',
    headStyles: {
      fillColor: [180, 83, 9], // amber-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: isLandscape ? 9 : 8.5,
      halign: 'center'
    },
    footStyles: {
      fillColor: [254, 243, 199], // amber-100
      textColor: [120, 53, 15],
      fontStyle: 'bold',
      fontSize: isLandscape ? 9 : 8.5
    },
    bodyStyles: {
      fontSize: isLandscape ? 8.5 : 8,
      textColor: [30, 41, 59]
    },
    columnStyles: isLandscape ? {
      0: { cellWidth: 14, halign: 'center' },
      1: { fontStyle: 'bold' },
      2: { cellWidth: 48, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: 42, halign: 'center', fontStyle: 'bold', textColor: [180, 83, 9] },
      4: { cellWidth: 48, halign: 'center', fontStyle: 'bold', textColor: [71, 85, 105] }
    } : {
      0: { cellWidth: 10, halign: 'center' },
      1: { fontStyle: 'bold' },
      2: { cellWidth: 36, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: 30, halign: 'center', fontStyle: 'bold', textColor: [180, 83, 9] },
      4: { cellWidth: 34, halign: 'center', fontStyle: 'bold', textColor: [71, 85, 105] }
    },
    margin: isLandscape ? { left: 14, right: 14 } : { left: 10, right: 10 },
    showFoot: 'lastPage'
  });

  // Signature Section
  const finalY = (doc as any).lastAutoTable?.finalY || 140;
  let signY = finalY + 12;

  if (signY + 35 > pageHeight) {
    doc.addPage('a4', isLandscape ? 'landscape' : 'portrait');
    drawKopSurat();
    signY = isLandscape ? 72 : 65;
  }

  const col1X = isLandscape ? 35 : 30;
  const col2X = pageWidth / 2;
  const col3X = isLandscape ? pageWidth - 45 : pageWidth - 35;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  doc.text('Dibuat Oleh,', col1X, signY, { align: 'center' });
  doc.text('Pengawas Bunkering', col1X, signY + 4, { align: 'center' });

  doc.text('Diperiksa Oleh,', col2X, signY, { align: 'center' });
  doc.text('Koordinator Lapangan', col2X, signY + 4, { align: 'center' });

  doc.text('Disetujui Oleh,', col3X, signY, { align: 'center' });
  doc.text('Manajemen Operasional', col3X, signY + 4, { align: 'center' });

  const lineY = signY + 22;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);

  doc.line(col1X - 22, lineY, col1X + 22, lineY);
  doc.line(col2X - 22, lineY, col2X + 22, lineY);
  doc.line(col3X - 22, lineY, col3X + 22, lineY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('( DAYAT / LOLI / ELMAN )', col1X, lineY + 4, { align: 'center' });
  doc.text('( ................................. )', col2X, lineY + 4, { align: 'center' });
  doc.text('PT. ANGKA PETROLEUM RAYA', col3X, lineY + 4, { align: 'center' });

  // Page numbering
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Halaman ${i} dari ${totalPages}  •  ${companyName} Laporan Bulanan Kotakan Kapal`,
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' }
    );
  }

  return doc;
}

