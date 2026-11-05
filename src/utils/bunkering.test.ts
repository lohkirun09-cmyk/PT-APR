import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseBunkeringCSV,
  calculateDashboardMetrics,
  filterRecords,
  convertGoogleSheetUrlToCsvUrl,
  INITIAL_CSV_RAW,
  FilterState
} from './bunkeringData';

test('parseBunkeringCSV correctly parses the user dataset', () => {
  const records = parseBunkeringCSV(INITIAL_CSV_RAW);
  assert.ok(records.length > 50, `Expected > 50 records, got ${records.length}`);

  // Test first record
  const r1 = records[0];
  assert.equal(r1.tanggal, '10/26/2026');
  assert.equal(r1.keterangan, 'BUNKERING A');
  assert.equal(r1.keluar, 6000);
  assert.equal(r1.masuk, 0);
  assert.equal(r1.nomorDn, '16155');
  assert.equal(r1.pt, 'KBT');
  assert.equal(r1.tangki, '3P');
  assert.equal(r1.pengawas, 'DAYAT');
  assert.equal(r1.keteranganKotakan, 'TIDAK KASIH');

  // Test record with masuk (e.g. APR row)
  const aprRecord = records.find(r => r.masuk > 0 && r.pt.includes('APR'));
  assert.ok(aprRecord, 'Should find at least one MASUK record for APR');
  assert.equal(aprRecord.masuk, 16000);
});

test('calculateDashboardMetrics computes accurate totals and Top 5 PT', () => {
  const records = parseBunkeringCSV(INITIAL_CSV_RAW);
  const metrics = calculateDashboardMetrics(records);

  // Check that Masuk and Keluar are positive and greater than 0
  assert.ok(metrics.totalMasuk > 0, `Total Masuk should be > 0, got ${metrics.totalMasuk}`);
  assert.ok(metrics.totalKeluar > 0, `Total Keluar should be > 0, got ${metrics.totalKeluar}`);
  assert.equal(metrics.totalKeseluruhan, metrics.totalMasuk + metrics.totalKeluar);
  assert.equal(metrics.netBalance, metrics.totalMasuk - metrics.totalKeluar);

  // Check Top 5 PT exists and has up to 5 items
  assert.ok(metrics.top5PT.length > 0 && metrics.top5PT.length <= 5);
  // First top PT should have the highest volume keluar
  assert.ok(metrics.top5PT[0].volumeKeluar >= metrics.top5PT[1].volumeKeluar);
  assert.equal(metrics.top5PT[0].pt, 'KBT');

  // Check Top 5 Kotakan
  assert.ok(metrics.top5Kotakan.length > 0 && metrics.top5Kotakan.length <= 5);
  const kotakanLabels = metrics.top5Kotakan.map(k => k.kotakan);
  assert.ok(kotakanLabels.includes('50') || kotakanLabels.includes('25'));

  // Check Kotakan status counts
  const totalKotakanStatus =
    metrics.kotakanStatusSummary.kasih +
    metrics.kotakanStatusSummary.tidakKasih +
    metrics.kotakanStatusSummary.nextTrip +
    metrics.kotakanStatusSummary.unspecified;
  assert.equal(totalKotakanStatus, records.length);
});

test('filterRecords filters accurately by date and supervisor', () => {
  const records = parseBunkeringCSV(INITIAL_CSV_RAW);

  // Filter single date 10/26/2026
  const singleDateFilter: FilterState = {
    startDate: '10/26/2026',
    endDate: '10/26/2026',
    selectedPT: 'ALL',
    selectedPengawas: 'ALL',
    selectedTangki: 'ALL',
    selectedKeterangan: 'ALL',
    selectedKotakan: 'ALL',
    searchQuery: ''
  };

  const filtered = filterRecords(records, singleDateFilter);
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every(r => r.tanggal === '10/26/2026'));

  // Filter by supervisor DAYAT
  const dayatFilter: FilterState = {
    ...singleDateFilter,
    startDate: '',
    endDate: '',
    selectedPengawas: 'DAYAT'
  };
  const dayatRecords = filterRecords(records, dayatFilter);
  assert.ok(dayatRecords.length > 0);
  assert.ok(dayatRecords.every(r => r.pengawas === 'DAYAT'));
});

test('convertGoogleSheetUrlToCsvUrl extracts correct export link', () => {
  const normalUrl = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0';
  const csvUrl = convertGoogleSheetUrlToCsvUrl(normalUrl);
  assert.equal(csvUrl, 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/export?format=csv&gid=0');

  const directCsv = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/export?format=csv';
  assert.equal(convertGoogleSheetUrlToCsvUrl(directCsv), directCsv);
});

test('GOOGLE_APPS_SCRIPT_TEMPLATE contains doPost and appendRow logic', async () => {
  const { GOOGLE_APPS_SCRIPT_TEMPLATE } = await import('./bunkeringData');
  assert.ok(GOOGLE_APPS_SCRIPT_TEMPLATE.includes('function doPost(e)'));
  assert.ok(GOOGLE_APPS_SCRIPT_TEMPLATE.includes('sheet.appendRow'));
  assert.ok(GOOGLE_APPS_SCRIPT_TEMPLATE.includes('PT. ANGKA PETROLEUM RAYA'));
});

test('calculateSupervisorKotakanSummary groups kotakan by supervisor correctly', async () => {
  const { calculateSupervisorKotakanSummary, getAvailableMonthKeys } = await import('./pdfMonthlyReport');
  const records = parseBunkeringCSV(INITIAL_CSV_RAW);

  const months = getAvailableMonthKeys(records);
  assert.ok(months.length > 0, 'Should find at least 1 month key');
  assert.ok(months.some(m => m.label.includes('Oktober 2026')));

  const { supervisors, grandTotal } = calculateSupervisorKotakanSummary(records);
  assert.ok(supervisors.length >= 3, 'Should have DAYAT, LOLI, ELMAN');
  
  const dayat = supervisors.find(s => s.pengawas === 'DAYAT');
  const loli = supervisors.find(s => s.pengawas === 'LOLI');
  const elman = supervisors.find(s => s.pengawas === 'ELMAN');

  assert.ok(dayat, 'DAYAT must exist');
  assert.ok(loli, 'LOLI must exist');
  assert.ok(elman, 'ELMAN must exist');

  assert.ok(dayat.totalTrip > 0);
  assert.ok(loli.totalTrip > 0);
  assert.ok(elman.totalTrip > 0);

  assert.equal(
    grandTotal.totalTrip,
    supervisors.reduce((acc, s) => acc + s.totalTrip, 0)
  );
  assert.equal(
    grandTotal.totalKasih,
    supervisors.reduce((acc, s) => acc + s.totalKasih, 0)
  );
});

test('generateMonthlyReportPDF creates a valid jsPDF instance with pages', async () => {
  const { generateMonthlyReportPDF } = await import('./pdfMonthlyReport');
  const records = parseBunkeringCSV(INITIAL_CSV_RAW);
  const docLandscape = generateMonthlyReportPDF(records.slice(0, 10), 'Oktober 2026', 'PT. ANGKA PETROLEUM RAYA', 'landscape');
  assert.ok(docLandscape, 'Landscape PDF doc should be generated');
  assert.ok(docLandscape.getNumberOfPages() >= 1, 'Landscape should have at least 1 page');

  const docPortrait = generateMonthlyReportPDF(records.slice(0, 10), 'Oktober 2026', 'PT. ANGKA PETROLEUM RAYA', 'portrait');
  assert.ok(docPortrait, 'Portrait PDF doc should be generated');
  assert.ok(docPortrait.getNumberOfPages() >= 1, 'Portrait should have at least 1 page');

  // Test Tonase Mode PDF export without Kotakan column
  const docTonase = generateMonthlyReportPDF(records.slice(0, 10), 'Oktober 2026', 'PT. ANGKA PETROLEUM RAYA', 'landscape', {
    unitMode: 'TONASE',
    density: 0.840
  });
  assert.ok(docTonase, 'Tonase mode PDF doc should be generated');
  assert.ok(docTonase.getNumberOfPages() >= 1);
  // Verify autotable generated has 8 columns (1 No + 7 data columns = 8 table columns)
  const lastCols = (docTonase as any).lastAutoTable?.columns;
  if (lastCols) {
    assert.equal(lastCols.length, 8, 'Table should have 8 columns (No + 7 operational columns without Kotakan)');
  }
});

test('calculateShipKotakanMonthlySummary and generateShipKotakanReportPDF sort by highest kotakan and generate 4-column PDF', async () => {
  const { calculateShipKotakanMonthlySummary, generateShipKotakanReportPDF } = await import('./pdfMonthlyReport');
  const records = parseBunkeringCSV(INITIAL_CSV_RAW);

  const { ships, grandTotal } = calculateShipKotakanMonthlySummary(records);
  assert.ok(ships.length > 0, 'Should aggregate ships');
  assert.ok(grandTotal.totalKotakan > 0, 'Total Kotakan should be > 0');

  // Verify sorting: totalKotakan descending
  for (let i = 0; i < ships.length - 1; i++) {
    assert.ok(
      ships[i].totalKotakan >= ships[i + 1].totalKotakan,
      `Ships must be sorted descending by kotakan: ship[${i}].totalKotakan (${ships[i].totalKotakan}) >= ship[${i+1}].totalKotakan (${ships[i+1].totalKotakan})`
    );
  }

  // Top ship should have a non-empty name and pengawas
  assert.ok(ships[0].namaKapal, 'Top ship must have a name');
  assert.ok(ships[0].pengawas, 'Top ship must have pengawas');

  // Generate Kotakan PDF in Portrait (standard) with 4 columns: Nama Kapal, Keluar Minyak, Kotakan, Pengawas
  const docKotakanPortrait = generateShipKotakanReportPDF(records, 'Oktober 2026', 'PT. ANGKA PETROLEUM RAYA', 'portrait', {
    unitMode: 'TONASE',
    density: 0.840
  });
  assert.ok(docKotakanPortrait.getNumberOfPages() >= 1);
  const kotakanCols = (docKotakanPortrait as any).lastAutoTable?.columns;
  if (kotakanCols) {
    assert.equal(kotakanCols.length, 5, 'Kotakan table must have 5 table columns (No + 4 columns: 1. Nama Kapal, 2. Keluar Minyak, 3. Kotakan, 4. Pengawas)');
  }

  // Generate in Landscape
  const docKotakanLandscape = generateShipKotakanReportPDF(records, 'Oktober 2026', 'PT. ANGKA PETROLEUM RAYA', 'landscape');
  assert.ok(docKotakanLandscape.getNumberOfPages() >= 1);
});

test('Tonase conversion and formatting logic behaves accurately', async () => {
  const {
    convertLiterToTon,
    convertTonToLiter,
    formatTonase,
    formatFuel,
    DEFAULT_DENSITY
  } = await import('./bunkeringData');

  assert.equal(DEFAULT_DENSITY, 0.840);

  // 100,000 Liters with density 0.840 kg/L is exactly 84.0 MT
  const tonVal = convertLiterToTon(100000, 0.840);
  assert.equal(tonVal, 84);

  // Convert back to Liters
  const literVal = convertTonToLiter(84, 0.840);
  assert.equal(literVal, 100000);

  // Negative values (balance)
  const negTon = convertLiterToTon(-250821, 0.840);
  assert.ok(negTon < 0);
  assert.equal(Number(negTon.toFixed(3)), -210.690);

  // Format Tonase string
  const formatted = formatTonase(84, 3);
  assert.ok(formatted.includes('84') && formatted.includes('MT'));

  // Format Fuel with dual display
  const dualTon = formatFuel(100000, 'TONASE', 0.840, { showBoth: true });
  assert.ok(dualTon.includes('MT') && dualTon.includes('L'));
});


