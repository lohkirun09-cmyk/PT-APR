/**
 * Bunkering Operation Types and Core Business Logic
 * PT ANGKA PETROLEUM RAYA
 */

export interface BunkeringRecord {
  id: string;
  timestamp: string;
  tanggal: string; // MM/DD/YYYY or YYYY-MM-DD
  keterangan: string; // e.g. BUNKERING A, BUNKERING B, BUNKERING M
  masuk: number; // Volume Masuk (Liters)
  keluar: number; // Volume Keluar (Liters)
  nomorDn: string; // Nomor Delivery Note / Surat Jalan
  pt: string; // Nama PT / Client
  namaKapalMobil: string; // Nama Kapal / Nomor Plat Mobil
  tangki: string; // 1S, 1P, 2S, 2P, 3S, 3P, 4S, 4P
  timeStart: string;
  timeStop: string;
  flowStart: number;
  flowStop: number;
  pengawas: string; // LOLI, ELMAN, DAYAT
  kotakan: number | null; // 20, 25, 50, 100
  keteranganKotakan: string; // NEXT TRIP, TIDAK KASIH, KASIH, or custom
}

export interface FilterState {
  startDate: string;
  endDate: string;
  selectedPT: string;
  selectedPengawas: string;
  selectedTangki: string;
  selectedKeterangan: string;
  selectedKotakan: string;
  searchQuery: string;
}

export interface PTVolumeStat {
  pt: string;
  volumeKeluar: number;
  volumeMasuk: number;
  totalVolume: number;
  tripCount: number;
  percentage: number;
}

export interface KotakanStat {
  kotakan: string; // '20', '25', '50', '100', 'Lainnya / Kosong'
  count: number;
  totalVolumeAssociated: number;
  kasihCount: number;
  tidakKasihCount: number;
  nextTripCount: number;
  percentage: number;
}

export interface DashboardMetrics {
  totalMasuk: number;
  totalKeluar: number;
  totalKeseluruhan: number; // Total volume flow (Masuk + Keluar)
  netBalance: number; // Masuk - Keluar
  totalTransaksi: number;
  transaksiMasukCount: number;
  transaksiKeluarCount: number;
  top5PT: PTVolumeStat[];
  allPTStats: PTVolumeStat[];
  top5Kotakan: KotakanStat[];
  allKotakanStats: KotakanStat[];
  kotakanStatusSummary: {
    kasih: number;
    tidakKasih: number;
    nextTrip: number;
    unspecified: number;
  };
  tangkiStats: { tangki: string; keluar: number; masuk: number; count: number }[];
  pengawasStats: { pengawas: string; volume: number; tripCount: number }[];
  dateRange: { minDate: string; maxDate: string };
  availableDates: string[];
}

export interface TransactionAnomaly {
  id: string;
  record: BunkeringRecord;
  type: 'flow_mismatch' | 'duplicate_dn' | 'missing_dn' | 'zero_volume' | 'kotakan_conflict' | 'missing_vessel';
  severity: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  field: keyof BunkeringRecord;
  currentValue: any;
  suggestedValue?: any;
}

export interface CorrectionLogEntry {
  id: string;
  timestamp: string;
  recordId: string;
  nomorDn: string;
  pt: string;
  namaKapal: string;
  fieldChanges: {
    field: string;
    label: string;
    oldVal: any;
    newVal: any;
  }[];
  reason?: string;
  previousRecord: BunkeringRecord;
  updatedRecord: BunkeringRecord;
}

/**
 * Standardized Options
 */
export const ALLOWED_TANKS = ['1S', '1P', '2S', '2P', '3S', '3P', '4S', '4P'] as const;
export const ALLOWED_SUPERVISORS = ['LOLI', 'ELMAN', 'DAYAT'] as const;
export const ALLOWED_KOTAKAN_SIZES = [20, 25, 50, 100] as const;
export const ALLOWED_KOTAKAN_STATUSES = ['KASIH', 'TIDAK KASIH', 'NEXT TRIP'] as const;
export const ALLOWED_CATEGORIES = ['BUNKERING A', 'BUNKERING B', 'BUNKERING M'] as const;

/**
 * Initial real dataset from PT ANGKA PETROLEUM RAYA
 */
export const INITIAL_CSV_RAW = `Timestamp,TANGGAL,KETERANGAN,MASUK,KELUAR,NOMOR DN,PT,NAMA KAPAL / MOBIL,TANGKI,TIME START,TIME STOP,FLOW START,FLOW STOP,PENGAWAS,KOTAKAN,KETERANGAN1
10/30/2026 13:33:14,10/26/2026,BUNKERING A,,6000,16155,KBT,TB Karya Star 57,3P,9:54:00 AM,10:12:00 AM,5468986,5474986,DAYAT,,TIDAK KASIH
10/30/2026 13:39:14,10/26/2026,BUNKERING B,,16000,16156,MIL-Amburawang,KT 8825 BY ,3P,9:51:00 AM,10:26:00 AM,119794,135794,LOLI,,
10/30/2026 13:43:59,10/26/2026,BUNKERING A,,23500,16157,KBT,TB Karya Star 38,3P,10:23:00 AM,11:24:00 AM,5474986,5498486,LOLI,50,KASIH
10/30/2026 13:47:34,10/26/2026,BUNKERING A,,6000,16158,KBT,TB Karya Star 15,4P,11:37:00 AM,11:56:00 AM,5498486,5504486,DAYAT,50,KASIH
10/30/2026 13:51:00,10/26/2026,BUNKERING A,,6000,16159,KBT,TB Karya Star 120,4P,1:47:00 PM,2:08:00 PM,5504486,5510486,LOLI,50,KASIH
11/1/2026 12:55:49,10/26/2026,BUNKERING A,,1120,16160,KBT,TB Karya Star 19,4P,2:21:00 PM,2:57:00 PM,5510486,5512986,DAYAT,25,KASIH
11/1/2026 12:58:08,10/26/2026,BUNKERING A,,1380,16160,KBT,TB Karya Star 19,3P,2:21:00 PM,2:57:00 PM,5510486,5512986,DAYAT,,KASIH
11/1/2026 13:12:57,10/26/2026,BUNKERING A,,3000,16161,KBT,TB Karya Star 73,3P,2:58:00 PM,3:09:00 PM,5512986,5515986,DAYAT,,NEXT TRIP
11/1/2026 13:14:50,10/26/2026,BUNKERING A,,37000,16162,KBT,TB Karya Star 71,3P,3:25:00 PM,4:56:00 PM,5515986,5552986,DAYAT,50,KASIH
11/1/2026 13:16:50,10/26/2026,BUNKERING A,,6000,16163,KBT,TB Karya Star 56,3P,5:12:00 PM,5:40:00 PM,5552986,5558986,LOLI,25,KASIH
11/1/2026 13:18:28,10/26/2026,BUNKERING A,,200,16164,KBT,TB Karya Star 99,3P,5:47:00 PM,5:50:00 PM,5558986,5559186,LOLI,,NEXT TRIP
11/1/2026 13:20:02,10/26/2026,BUNKERING A,,7000,16165,KBT,TB Karya Star 66,3P,5:52:00 PM,6:19:00 PM,5559187,5566187,DAYAT,50,KASIH
11/1/2026 13:22:09,10/27/2026,BUNKERING A,,1200,16166,KBT,TB Dayaindo 2,3P,9:56:00 AM,10:05:00 AM,5566186,5567386,LOLI,,NEXT TRIP
11/1/2026 13:24:10,10/27/2026,BUNKERING A,,9500,16167,KBT,TB Karya Star 35,3P,1:17:00 PM,1:47:00 PM,5567387,5576887,DAYAT,50,KASIH
11/1/2026 13:26:15,10/27/2026,BUNKERING A,,3500,16168,KBT,TB Karya Star 33,3P,1:54:00 PM,2:17:00 PM,5576887,5580387,LOLI,50,KASIH
11/1/2026 13:28:19,10/27/2026,BUNKERING A,,3000,16169,GSM,TB Mitrasindo 28,3P,2:32:00 PM,2:41:00 PM,5580387,5583887,DAYAT,,TIDAK KASIH
11/1/2026 13:30:33,10/27/2026,BUNKERING A,,3000,16170,KBT,TB Santoso 30,3P,2:47:00 PM,3:09:00 PM,5583387,5586387,LOLI,50,KASIH
11/1/2026 13:32:19,10/27/2026,BUNKERING A,,12400,16171,KBT,TB Karya Star 101,3P,3:29:00 PM,4:02:00 PM,5586388,5598788,LOLI,25,KASIH
11/1/2026 13:33:46,10/27/2026,BUNKERING A,,1000,16172,KBT,TB Karya Star 73,3P,4:06:00 PM,4:19:00 PM,5598788,5599788,LOLI,,TIDAK KASIH
11/1/2026 13:35:45,10/27/2026,BUNKERING A,,4000,16173,KBT,TB Karya Star 52,3P,4:26:00 PM,4:42:00 PM,5599852,5603852,LOLI,50,KASIH
11/1/2026 13:38:09,10/27/2026,BUNKERING B,,10000,16174,CDM,KT 8129 WA,3P,4:34:00 PM,4:50:00 PM,135794,145794,LOLI,,
11/1/2026 17:36:00,10/27/2026,BUNKERING M,16000,,,APR,KT 8158 MA,4P,5:46:00 PM,6:35:00 PM,13632481,13648488,DAYAT,,
11/1/2026 17:38:15,10/27/2026,BUNKERING B,,10000,16175,CDM,KT 8456 NU,4S,6:42:00 PM,7:02:00 PM,145794,155794,LOLI,,
11/1/2026 17:39:45,10/27/2026,BUNKERING B,,10000,16176,MIL,B 9433 KFU,4S,7:04:00 PM,7:26:00 PM,155794,165794,DAYAT,,
11/1/2026 17:41:39,10/27/2026,BUNKERING B,,10000,16177,MIL,KT 8592 BY,4S,7:32:00 PM,7:50:00 PM,165794,175794,DAYAT,,
11/1/2026 17:43:41,10/27/2026,BUNKERING M,16000,,,APR,KT 8825 BY,4P,7:56:00 PM,8:59:00 PM,13648488,13664510,LOLI,,
11/1/2026 17:45:18,10/27/2026,BUNKERING M,16000,,,APR,KT 8980 BY,4P,9:05:00 PM,10:02:00 PM,13664515,13680522,DAYAT,,
11/1/2026 17:47:08,10/28/2026,BUNKERING A,,1000,16178,KBT,TB Dayaindo 2,3P,9:59:00 AM,10:05:00 AM,5603852,5604852,ELMAN,,TIDAK KASIH
11/1/2026 17:50:07,10/28/2026,BUNKERING A,,5500,16179,KBT,TB Karya Star 25,3P,11:58:00 AM,12:20:00 PM,5604852,5610352,LOLI,50,KASIH
11/1/2026 17:52:17,10/28/2026,BUNKERING A,,4000,16180,KBT,TB Karya Star 60,4S,12:24:00 PM,12:38:00 PM,5610352,5614352,LOLI,50,KASIH
11/1/2026 17:54:19,10/28/2026,BUNKERING A,,3000,16181,KBT,TB Karya Star 37,4S,12:56:00 PM,1:04:00 PM,5614352,5617352,ELMAN,25,KASIH
11/1/2026 17:55:43,10/28/2026,BUNKERING A,,4000,16182,KBT,TB Santoso 16,4S,1:11:00 PM,1:21:00 PM,5617352,5621352,LOLI,50,KASIH
11/1/2026 17:57:39,10/28/2026,BUNKERING A,,4000,16183,KBT,TB Karya Star 8,4S,1:29:00 PM,1:47:00 PM,5621353,5625353,ELMAN,50,KASIH
11/1/2026 17:59:52,10/28/2026,BUNKERING B,,3500,16184,KBT,KT 8178 WA,4S,1:27:00 PM,1:45:00 PM,175794,179294,LOLI,,
11/1/2026 18:01:21,10/28/2026,BUNKERING A,,4000,16185,KBT,TB Karya Star 5,4S,3:07:00 PM,3:17:00 PM,5625353,5629353,ELMAN,,NEXT TRIP
11/1/2026 18:02:50,10/28/2026,BUNKERING A,,600,16186,KBT,TB Nusantara star 31,4S,4:44:00 PM,5:01:00 PM,5629353,5629953,ELMAN,,TIDAK KASIH
11/1/2026 18:04:19,10/28/2026,BUNKERING A,,1500,16187,KBT,TB Karya Star 2,4S,8:04:00 PM,8:11:00 PM,5629953,5631453,ELMAN,,TIDAK KASIH
11/1/2026 18:07:15,10/29/2026,BUNKERING M,16000,,,RJA,KT 8051 ON,4P,1:02:00 AM,2:33:00 AM,13680522,13696588,ELMAN,,
11/1/2026 18:09:08,10/29/2026,BUNKERING A,,2000,16188,KBT,TB Karya Star 52,4S,10:38:00 AM,10:51:00 AM,5631453,5633453,LOLI,,NEXT TRIP
11/1/2026 18:10:34,10/29/2026,BUNKERING A,,2500,16189,KBT,TB Karya Star 16,4S,11:27:00 AM,11:34:00 AM,5633453,5635953,ELMAN,,NEXT TRIP
11/1/2026 18:12:53,10/29/2026,BUNKERING A,,11000,16190,KBT,TB Karya Star 61,4S,11:39:00 AM,12:17:00 PM,5635953,5646953,LOLI,50,KASIH
11/1/2026 18:14:32,10/29/2026,BUNKERING A,,10000,16191,KBT,TB Atlantic star 29,4S,1:49:00 PM,2:16:00 PM,5646954,5656954,LOLI,50,KASIH
11/1/2026 18:16:39,10/29/2026,BUNKERING A,,11000,16192,KBT,TB Karya Star 86,4S,2:21:00 PM,2:48:00 PM,5656954,5667954,ELMAN,50,KASIH
11/1/2026 18:18:26,10/29/2026,BUNKERING A,,5000,16193,KBT,TB Karya Star 65,4S,2:51:00 PM,3:04:00 PM,5667954,5672954,LOLI,50,KASIH
11/1/2026 18:19:46,10/29/2026,BUNKERING A,,500,16194,KBT,TB Karya Star 51,4S,3:10:00 PM,3:13:00 PM,5672954,5673454,ELMAN,,NEXT TRIP
11/1/2026 18:21:21,10/29/2026,BUNKERING A,,7500,16195,KBT,TB Karya Star 85,4S,3:15:00 PM,3:51:00 PM,5673454,5680954,LOLI,50,KASIH
11/1/2026 18:22:47,10/29/2026,BUNKERING A,,14000,16196,KBT,TB Karya Star 72,4S,4:09:00 PM,4:47:00 PM,5680955,5694955,ELMAN,,NEXT TRIP
11/1/2026 18:24:14,10/29/2026,BUNKERING A,,1500,16197,KBT,TB Karya Star 7,4S,5:20:00 PM,5:31:00 PM,5694954,5696454,LOLI,,NEXT TRIP
11/1/2026 18:26:04,10/29/2026,BUNKERING A,,2500,16198,KBT,TB Santoso 28,4S,6:34:00 PM,6:45:00 PM,5696455,5698954,LOLI,50,KASIH
11/1/2026 18:27:40,10/29/2026,BUNKERING A,,2500,16199,KBT,TB Karya Star 6,4S,6:54:00 PM,7:08:00 PM,5698955,5701455,LOLI,,TIDAK KASIH
11/1/2026 18:31:10,10/30/2026,BUNKERING M,15980,,,RJA,KT 8501 ON,4P,7:55:00 AM,8:53:00 AM,13696588,13712568,DAYAT,,
11/1/2026 18:33:14,10/30/2026,BUNKERING A,,2500,16201,KBT,TB Atlantic Star 35,4S,8:58:00 AM,9:13:00 AM,5704455,5706955,ELMAN,,TIDAK KASIH
11/1/2026 18:35:09,10/30/2026,BUNKERING M,15944,,,RJA,KT 8549 ZU,4P,9:01:00 AM,10:00:00 AM,13712568,13728511,ELMAN,,
11/1/2026 18:36:58,10/30/2026,BUNKERING A,,800,16202,KBT,TB Dayaindo 2,4S,11:27:00 AM,11:33:00 AM,5706955,5707755,DAYAT,,TIDAK KASIH
11/1/2026 18:38:50,10/30/2026,BUNKERING A,,3500,16203,KBT,TB Karya Star 75,4S,1:59:00 PM,2:15:00 PM,5707755,5711255,ELMAN,25,KASIH
11/1/2026 18:40:37,10/30/2026,BUNKERING M,15981,,,APR,KT 8734 BV,4P,2:00:00 PM,2:55:00 PM,13728511,13744492,DAYAT,,
11/1/2026 18:42:09,10/30/2026,BUNKERING A,,11000,16204,KBT,TB Karya Star 116,4S,2:51:00 PM,3:21:00 PM,5711256,5722256,DAYAT,50,KASIH
11/1/2026 18:43:53,10/30/2026,BUNKERING A,,4600,,KBT,TB Karya Star 63,4S,3:24:00 PM,4:00:00 PM,5722256,5733256,ELMAN,50,KASIH
11/1/2026 18:45:19,10/30/2026,BUNKERING A,,6400,16205,KBT,TB Karya Star 63,4P,3:24:00 PM,4:00:00 PM,5722256,5733256,ELMAN,,
11/1/2026 18:47:24,10/30/2026,BUNKERING A,,11000,16205,KBT,TB Karya Star 93,4P,4:27:00 PM,4:57:00 PM,5733256,5744256,DAYAT,,TIDAK KASIH
11/1/2026 18:49:21,10/30/2026,BUNKERING M,15974,,,APR,KT 8159 MA,4P,4:15:00 PM,5:19:00 PM,,,ELMAN,,
11/1/2026 18:51:05,10/30/2026,BUNKERING M,,40000,16207,KBL,TB Karya Star 79,4P,5:58:00 PM,7:46:00 PM,13760466,13800466,DAYAT,,TIDAK KASIH
11/1/2026 18:52:48,10/30/2026,BUNKERING A,,3000,16208,KBT,TB Santoso 21,4P,8:55:00 PM,9:06:00 PM,5744257,5757257,DAYAT,,NEXT TRIP
11/1/2026 18:54:49,10/31/2026,BUNKERING A,,4000,16209,KBT,LCT Taurus star 5,4P,9:41:00 AM,9:55:00 AM,5747257,5751257,ELMAN,,TIDAK KASIH`;

/**
 * Robust CSV/TSV Line Parser that handles quotes, commas, and clipboard tabs
 */
export function parseCSVLine(line: string): string[] {
  // If line contains tabs (e.g. copied directly from Google Sheets/Excel table via clipboard)
  const tabCount = (line.match(/\t/g) || []).length;
  const commaCount = (line.match(/,/g) || []).length;
  if (tabCount > commaCount && tabCount > 0) {
    return line.split('\t').map(c => c.trim().replace(/^["']|["']$/g, ''));
  }

  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse full CSV string to BunkeringRecord array
 */
export function parseBunkeringCSV(csvText: string): BunkeringRecord[] {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return [];

  // Find header line
  let headerIndex = -1;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const lower = lines[i].toLowerCase();
    if (lower.includes('tanggal') || lower.includes('keterangan') || lower.includes('pt')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) headerIndex = 0;

  const headers = parseCSVLine(lines[headerIndex]).map(h => h.trim().toUpperCase());

  // Helper to find column index
  const findCol = (terms: string[]): number => {
    return headers.findIndex(h => terms.some(t => h.includes(t)));
  };

  const tsIdx = findCol(['TIMESTAMP']);
  const tglIdx = findCol(['TANGGAL', 'DATE']);
  const ketIdx = findCol(['KETERANGAN', 'KET']);
  const masukIdx = findCol(['MASUK', 'INFLOW', 'IN']);
  const keluarIdx = findCol(['KELUAR', 'OUTFLOW', 'OUT']);
  const dnIdx = findCol(['NOMOR DN', 'DN', 'SURAT JALAN']);
  const ptIdx = findCol(['PT', 'NAMA PT', 'CLIENT', 'CUSTOMER']);
  const kapalIdx = findCol(['KAPAL', 'MOBIL', 'VEHICLE', 'VESSEL']);
  const tangkiIdx = findCol(['TANGKI', 'TANK']);
  const timeStartIdx = findCol(['TIME START', 'START TIME', 'JAM MULAI']);
  const timeStopIdx = findCol(['TIME STOP', 'STOP TIME', 'JAM SELESAI']);
  const flowStartIdx = findCol(['FLOW START', 'AWAL METER']);
  const flowStopIdx = findCol(['FLOW STOP', 'AKHIR METER']);
  const pengawasIdx = findCol(['PENGAWAS', 'SUPERVISOR']);
  const kotakanIdx = findCol(['KOTAKAN']);
  const ketKotakanIdx = headers.findIndex((h, idx) => {
    return (h.includes('KETERANGAN') && idx !== ketIdx) || h.includes('STATUS');
  });

  const records: BunkeringRecord[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine || rawLine.replace(/,/g, '').trim() === '') continue;

    const cols = parseCSVLine(rawLine);
    if (cols.length < 3) continue;

    const tgl = (tglIdx >= 0 ? cols[tglIdx] : '') || '';
    const ket = (ketIdx >= 0 ? cols[ketIdx] : '') || '';
    const masukVal = masukIdx >= 0 ? parseFloat(cols[masukIdx].replace(/[^0-9.-]/g, '')) : 0;
    const keluarVal = keluarIdx >= 0 ? parseFloat(cols[keluarIdx].replace(/[^0-9.-]/g, '')) : 0;
    const dn = (dnIdx >= 0 ? cols[dnIdx] : '') || '';
    const pt = (ptIdx >= 0 ? cols[ptIdx] : '').trim();
    const kapal = (kapalIdx >= 0 ? cols[kapalIdx] : '') || '';
    const tangki = (tangkiIdx >= 0 ? cols[tangkiIdx] : '') || '';
    const tStart = (timeStartIdx >= 0 ? cols[timeStartIdx] : '') || '';
    const tStop = (timeStopIdx >= 0 ? cols[timeStopIdx] : '') || '';
    const fStart = flowStartIdx >= 0 ? parseFloat(cols[flowStartIdx].replace(/[^0-9.-]/g, '')) || 0 : 0;
    const fStop = flowStopIdx >= 0 ? parseFloat(cols[flowStopIdx].replace(/[^0-9.-]/g, '')) || 0 : 0;
    const pengawas = (pengawasIdx >= 0 ? cols[pengawasIdx] : '').trim().toUpperCase();
    
    let kotakanVal: number | null = null;
    if (kotakanIdx >= 0 && cols[kotakanIdx]) {
      const parsedKotak = parseFloat(cols[kotakanIdx].replace(/[^0-9.-]/g, ''));
      if (!isNaN(parsedKotak) && parsedKotak > 0) kotakanVal = parsedKotak;
    }

    const ketKotak = (ketKotakanIdx >= 0 ? cols[ketKotakanIdx] : '').trim().toUpperCase();

    // Skip totally empty entries without date and without volume
    if (!tgl && isNaN(masukVal) && isNaN(keluarVal) && !pt) continue;

    records.push({
      id: `rec-${i}-${Date.now().toString(36)}`,
      timestamp: (tsIdx >= 0 ? cols[tsIdx] : '') || new Date().toLocaleString(),
      tanggal: tgl,
      keterangan: ket.toUpperCase(),
      masuk: isNaN(masukVal) ? 0 : masukVal,
      keluar: isNaN(keluarVal) ? 0 : keluarVal,
      nomorDn: dn,
      pt: pt || 'UNKNOWN PT',
      namaKapalMobil: kapal,
      tangki: tangki.toUpperCase(),
      timeStart: tStart,
      timeStop: tStop,
      flowStart: fStart,
      flowStop: fStop,
      pengawas: pengawas,
      kotakan: kotakanVal,
      keteranganKotakan: ketKotak
    });
  }

  return records;
}

/**
 * Unit Mode & Density Constants for Marine Bunkering
 * Standard conversion: Ton (MT) = (Liter * Density) / 1000
 * Standard Marine Gas Oil / Solar HSD Density at 15°C: 0.840 kg/L (Range 0.820 - 0.860)
 */
export type UnitMode = 'LITER' | 'TONASE';
export const DEFAULT_DENSITY = 0.840;

export function convertLiterToTon(liters: number, density: number = DEFAULT_DENSITY): number {
  if (isNaN(liters)) return 0;
  return (liters * density) / 1000;
}

export function convertTonToLiter(tons: number, density: number = DEFAULT_DENSITY): number {
  if (isNaN(tons) || density <= 0) return 0;
  return (tons * 1000) / density;
}

/**
 * Format metric ton value into Indonesian locale standard: e.g. 107,418 MT
 */
export function formatTonase(valInTon: number, decimals: number = 3): string {
  if (isNaN(valInTon)) return '0 MT';
  const isNeg = valInTon < 0;
  const abs = Math.abs(valInTon);
  const formatted = abs.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  return `${isNeg ? '-' : ''}${formatted} MT`;
}

/**
 * Flexible fuel formatter supporting Liter and Tonase with optional dual-unit preview
 */
export function formatFuel(
  liters: number,
  unit: UnitMode = 'LITER',
  density: number = DEFAULT_DENSITY,
  options?: { showBoth?: boolean; decimals?: number }
): string {
  if (isNaN(liters)) return unit === 'TONASE' ? '0 MT' : '0 L';

  if (unit === 'TONASE') {
    const tons = convertLiterToTon(liters, density);
    const tonStr = formatTonase(tons, options?.decimals ?? 3);
    if (options?.showBoth) {
      return `${tonStr} (${formatLiter(liters)})`;
    }
    return tonStr;
  } else {
    const literStr = formatLiter(liters);
    if (options?.showBoth) {
      const tons = convertLiterToTon(liters, density);
      return `${literStr} (${formatTonase(tons, 2)})`;
    }
    return literStr;
  }
}

/**
 * Format number into Indonesian locale standard: e.g. 15.000 L
 */
export function formatLiter(val: number): string {
  if (isNaN(val)) return '0 L';
  return `${Math.round(val).toLocaleString('id-ID')} L`;
}

export function formatNumber(val: number, decimals: number = 0): string {
  if (isNaN(val)) return '0';
  if (decimals > 0) {
    return val.toLocaleString('id-ID', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }
  return Math.round(val).toLocaleString('id-ID');
}

/**
 * Standardize date string to comparable YYYY-MM-DD
 */
export function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  // Check if MM/DD/YYYY
  const parts = clean.split('/');
  if (parts.length === 3) {
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    return `${year}-${month}-${day}`;
  }
  // Check if YYYY-MM-DD
  if (clean.includes('-')) {
    const p = clean.split('-');
    if (p.length === 3) {
      if (p[0].length === 4) return clean;
      // DD-MM-YYYY
      return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
    }
  }
  return clean;
}

/**
 * Filter records according to user criteria
 */
export function filterRecords(records: BunkeringRecord[], filter: FilterState): BunkeringRecord[] {
  return records.filter(r => {
    // Date filter
    const normRecordDate = normalizeDate(r.tanggal);
    if (filter.startDate) {
      const normStart = normalizeDate(filter.startDate);
      if (normRecordDate < normStart) return false;
    }
    if (filter.endDate) {
      const normEnd = normalizeDate(filter.endDate);
      if (normRecordDate > normEnd) return false;
    }

    // PT Filter
    if (filter.selectedPT && filter.selectedPT !== 'ALL') {
      if (r.pt.toUpperCase() !== filter.selectedPT.toUpperCase()) return false;
    }

    // Supervisor Filter
    if (filter.selectedPengawas && filter.selectedPengawas !== 'ALL') {
      if (r.pengawas.toUpperCase() !== filter.selectedPengawas.toUpperCase()) return false;
    }

    // Tank Filter
    if (filter.selectedTangki && filter.selectedTangki !== 'ALL') {
      if (r.tangki.toUpperCase() !== filter.selectedTangki.toUpperCase()) return false;
    }

    // Category / Keterangan Filter
    if (filter.selectedKeterangan && filter.selectedKeterangan !== 'ALL') {
      if (!r.keterangan.toUpperCase().includes(filter.selectedKeterangan.toUpperCase())) return false;
    }

    // Kotakan Filter
    if (filter.selectedKotakan && filter.selectedKotakan !== 'ALL') {
      if (filter.selectedKotakan === 'EMPTY') {
        if (r.kotakan !== null && r.kotakan !== 0) return false;
      } else {
        const targetVal = parseFloat(filter.selectedKotakan);
        if (r.kotakan !== targetVal) return false;
      }
    }

    // Search query
    if (filter.searchQuery && filter.searchQuery.trim() !== '') {
      const q = filter.searchQuery.toLowerCase();
      const match =
        r.pt.toLowerCase().includes(q) ||
        r.namaKapalMobil.toLowerCase().includes(q) ||
        r.nomorDn.toLowerCase().includes(q) ||
        r.pengawas.toLowerCase().includes(q) ||
        r.tangki.toLowerCase().includes(q) ||
        r.keterangan.toLowerCase().includes(q) ||
        r.keteranganKotakan.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });
}

/**
 * Calculate comprehensive dashboard metrics from active records
 */
export function calculateDashboardMetrics(records: BunkeringRecord[]): DashboardMetrics {
  let totalMasuk = 0;
  let totalKeluar = 0;
  let transaksiMasukCount = 0;
  let transaksiKeluarCount = 0;

  const ptVolumeMap = new Map<string, { pt: string; keluar: number; masuk: number; count: number }>();
  const kotakanMap = new Map<string, { count: number; volume: number; kasih: number; tidakKasih: number; nextTrip: number }>();
  const tangkiMap = new Map<string, { keluar: number; masuk: number; count: number }>();
  const pengawasMap = new Map<string, { volume: number; count: number }>();

  const dateSet = new Set<string>();

  const statusSummary = {
    kasih: 0,
    tidakKasih: 0,
    nextTrip: 0,
    unspecified: 0
  };

  records.forEach(r => {
    if (r.tanggal) {
      dateSet.add(r.tanggal);
    }

    const m = r.masuk || 0;
    const k = r.keluar || 0;

    totalMasuk += m;
    totalKeluar += k;

    if (m > 0) transaksiMasukCount++;
    if (k > 0) transaksiKeluarCount++;

    // PT Aggregation
    const ptKey = r.pt.trim() || 'NONAME';
    const existingPT = ptVolumeMap.get(ptKey) || { pt: ptKey, keluar: 0, masuk: 0, count: 0 };
    existingPT.keluar += k;
    existingPT.masuk += m;
    existingPT.count += 1;
    ptVolumeMap.set(ptKey, existingPT);

    // Kotakan Aggregation
    let kSize = 'Tidak Ada Kotakan';
    if (r.kotakan && r.kotakan > 0) {
      kSize = `${r.kotakan}`;
    }
    const existingKotak = kotakanMap.get(kSize) || { count: 0, volume: 0, kasih: 0, tidakKasih: 0, nextTrip: 0 };
    existingKotak.count += 1;
    existingKotak.volume += (k + m);

    // Kotakan Status
    const status = (r.keteranganKotakan || '').toUpperCase();
    if (status.includes('KASIH') && !status.includes('TIDAK')) {
      existingKotak.kasih += 1;
      statusSummary.kasih += 1;
    } else if (status.includes('TIDAK KASIH')) {
      existingKotak.tidakKasih += 1;
      statusSummary.tidakKasih += 1;
    } else if (status.includes('NEXT TRIP')) {
      existingKotak.nextTrip += 1;
      statusSummary.nextTrip += 1;
    } else {
      statusSummary.unspecified += 1;
    }
    kotakanMap.set(kSize, existingKotak);

    // Tangki Aggregation
    const tKey = r.tangki || 'Lainnya';
    const existingTangki = tangkiMap.get(tKey) || { keluar: 0, masuk: 0, count: 0 };
    existingTangki.keluar += k;
    existingTangki.masuk += m;
    existingTangki.count += 1;
    tangkiMap.set(tKey, existingTangki);

    // Pengawas Aggregation
    const pKey = r.pengawas || 'Belum Diisi';
    const existingPengawas = pengawasMap.get(pKey) || { volume: 0, count: 0 };
    existingPengawas.volume += (k + m);
    existingPengawas.count += 1;
    pengawasMap.set(pKey, existingPengawas);
  });

  const totalKeseluruhan = totalMasuk + totalKeluar;
  const netBalance = totalMasuk - totalKeluar;

  // Transform PTs sorted by Keluar volume primarily, then total volume
  const allPTStats: PTVolumeStat[] = Array.from(ptVolumeMap.values())
    .map(item => {
      const totalVol = item.keluar + item.masuk;
      return {
        pt: item.pt,
        volumeKeluar: item.keluar,
        volumeMasuk: item.masuk,
        totalVolume: totalVol,
        tripCount: item.count,
        percentage: totalKeluar > 0 ? (item.keluar / totalKeluar) * 100 : 0
      };
    })
    .sort((a, b) => b.volumeKeluar - a.volumeKeluar || b.totalVolume - a.totalVolume);

  const top5PT = allPTStats.slice(0, 5);

  // Transform Kotakan sorted by count
  const allKotakanStats: KotakanStat[] = Array.from(kotakanMap.entries())
    .map(([kotakanKey, data]) => {
      return {
        kotakan: kotakanKey,
        count: data.count,
        totalVolumeAssociated: data.volume,
        kasihCount: data.kasih,
        tidakKasihCount: data.tidakKasih,
        nextTripCount: data.nextTrip,
        percentage: records.length > 0 ? (data.count / records.length) * 100 : 0
      };
    })
    .sort((a, b) => b.count - a.count);

  // Specific 5 Top kotakan
  const top5Kotakan = allKotakanStats.slice(0, 5);

  const tangkiStats = Array.from(tangkiMap.entries())
    .map(([tangki, data]) => ({
      tangki,
      keluar: data.keluar,
      masuk: data.masuk,
      count: data.count
    }))
    .sort((a, b) => (b.keluar + b.masuk) - (a.keluar + a.masuk));

  const pengawasStats = Array.from(pengawasMap.entries())
    .map(([pengawas, data]) => ({
      pengawas,
      volume: data.volume,
      tripCount: data.count
    }))
    .sort((a, b) => b.volume - a.volume);

  const sortedDates = Array.from(dateSet).sort((a, b) => normalizeDate(a).localeCompare(normalizeDate(b)));

  return {
    totalMasuk,
    totalKeluar,
    totalKeseluruhan,
    netBalance,
    totalTransaksi: records.length,
    transaksiMasukCount,
    transaksiKeluarCount,
    top5PT,
    allPTStats,
    top5Kotakan,
    allKotakanStats,
    kotakanStatusSummary: statusSummary,
    tangkiStats,
    pengawasStats,
    dateRange: {
      minDate: sortedDates[0] || '',
      maxDate: sortedDates[sortedDates.length - 1] || ''
    },
    availableDates: sortedDates
  };
}

/**
 * Generate Google Sheet CSV export link from standard Google Sheet URL
 */
export function convertGoogleSheetUrlToCsvUrl(inputUrl: string): string {
  const trimmed = inputUrl.trim();
  if (!trimmed) return '';

  // Check if it already looks like an export CSV link
  if (trimmed.includes('output=csv') || trimmed.includes('export?format=csv') || trimmed.includes('tqx=out:csv')) {
    return trimmed;
  }

  // Handle Published to Web link: /pubhtml
  if (trimmed.includes('/spreadsheets/d/e/')) {
    return trimmed.replace(/\/pubhtml.*$/, '/pub?output=csv');
  }

  // Extract Sheet ID: docs.google.com/spreadsheets/d/([a-zA-Z0-9-_]+)
  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch || !idMatch[1]) {
    return trimmed;
  }

  const sheetId = idMatch[1];
  // Check for gid (sheet tab)
  const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
  const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';

  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidParam}`;
}

/**
 * Get multiple candidate URLs for fetching spreadsheet data (handles CORS & GID variations)
 */
export function getGoogleSheetCandidateUrls(inputUrl: string): string[] {
  const trimmed = inputUrl.trim();
  if (!trimmed) return [];

  const candidates: string[] = [];

  // Proxy endpoint on local server first (bypasses browser CORS & header blocks)
  candidates.push(`/api/fetch-sheet?url=${encodeURIComponent(trimmed)}`);

  // Direct CSV link if already one
  if (trimmed.includes('output=csv') || trimmed.includes('tqx=out:csv') || trimmed.includes('export?format=csv')) {
    candidates.push(trimmed);
  }

  // Published to web
  if (trimmed.includes('/spreadsheets/d/e/')) {
    candidates.push(trimmed.replace(/\/pubhtml.*$/, '/pub?output=csv'));
  }

  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (idMatch && idMatch[1]) {
    const sheetId = idMatch[1];
    const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : null;

    // GViz endpoint (CORS-friendly: Access-Control-Allow-Origin: *)
    if (gid) {
      candidates.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`);
      candidates.push(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`);
    }
    candidates.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`);
    candidates.push(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`);
  }

  return [...new Set(candidates)];
}

/**
 * Standard Apps Script template for PT ANGKA PETROLEUM RAYA
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * =========================================================================
 * Google Apps Script - Sinkronisasi Bunkering PT. ANGKA PETROLEUM RAYA
 * =========================================================================
 * CARA PASANG:
 * 1. Buka Google Spreadsheet Anda
 * 2. Klik menu "Ekstensi" (Extensions) -> "Apps Script"
 * 3. Hapus semua kode bawaan, lalu paste (tempel) seluruh kode ini
 * 4. Klik tombol biru "Terapkan" (Deploy) di kanan atas -> "Deployment baru" (New deployment)
 * 5. Pilih jenis: "Aplikasi Web" (Web app)
 *    - Deskripsi: Bunkering Sync Webhook
 *    - Jalankan sebagai: "Saya" (Me)
 *    - Yang memiliki akses: "Siapa saja" (Anyone) -> [PENTING!]
 * 6. Klik "Terapkan" (Deploy) dan salin "URL Aplikasi Web"
 * 7. Tempel URL tersebut ke Dashboard di menu "Koneksi Spreadsheet" -> "Kirim ke Sheet (2-Arah)"
 * =========================================================================
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var data = JSON.parse(e.postData.contents);

    // Format kolom standar PT ANGKA PETROLEUM RAYA:
    // Tanggal | Keterangan | Masuk | Keluar | Nomor DN | PT | Kapal/Mobil | Tangki | Time Start | Time Stop | Flow Start | Flow Stop | Pengawas | Kotakan | Keterangan Kotakan
    var newRow = [
      data.tanggal || Utilities.formatDate(new Date(), "GMT+8", "M/d/yyyy"),
      data.keterangan || "BUNKERING A",
      Number(data.masuk) || "",
      Number(data.keluar) || "",
      data.nomorDn || "",
      data.pt || "",
      data.namaKapalMobil || "",
      data.tangki || "",
      data.timeStart || "",
      data.timeStop || "",
      Number(data.flowStart) || "",
      Number(data.flowStop) || "",
      data.pengawas || "",
      (data.kotakan !== null && data.kotakan !== undefined && data.kotakan !== "") ? Number(data.kotakan) : "",
      data.keteranganKotakan || ""
    ];

    // Jika aksi adalah 'update' dan Nomor DN disertakan, cari baris lama dan perbarui di tempat:
    if (data.action === "update" && data.nomorDn) {
      var lastRow = sheet.getLastRow();
      var dnRange = sheet.getRange(1, 5, lastRow, 1).getValues();
      var targetRow = -1;
      for (var i = lastRow - 1; i >= 1; i--) {
        if (String(dnRange[i][0]).trim() === String(data.nomorDn).trim()) {
          targetRow = i + 1;
          break;
        }
      }
      if (targetRow > 0) {
        sheet.getRange(targetRow, 1, 1, newRow.length).setValues([newRow]);
        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          action: "update",
          message: "Data transaksi DN " + data.nomorDn + " berhasil diperbarui di baris #" + targetRow + " Google Spreadsheet!",
          row: targetRow
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    sheet.appendRow(newRow);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      action: "append",
      message: "Data transaksi baru berhasil masuk ke Google Spreadsheet!",
      row: sheet.getLastRow(),
      pt: data.pt,
      tanggal: data.tanggal
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    message: "Endpoint Webhook Bunkering PT ANGKA PETROLEUM RAYA aktif dan siap menerima data!"
  })).setMimeType(ContentService.MimeType.JSON);
}
`;

/**
 * Send or update transaction record to Google Spreadsheet via Apps Script Webhook
 */
export async function saveOrUpdateRecordToSpreadsheet(
  webhookUrl: string,
  record: BunkeringRecord,
  action: 'append' | 'update' = 'append'
): Promise<{ success: boolean; message: string; row?: number }> {
  const trimmed = webhookUrl.trim();
  if (!trimmed) {
    throw new Error('URL Webhook Google Apps Script belum disetel.');
  }

  // 1. Try server-side proxy endpoint first (bypasses CORS and follow Google 302 redirects)
  try {
    const proxyRes = await fetch('/api/append-to-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl: trimmed, record, action })
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      return {
        success: true,
        message: data.message || (action === 'update' ? 'Data berhasil diperbarui di Google Spreadsheet!' : 'Transaksi berhasil ditambahkan ke Google Spreadsheet!'),
        row: data.details?.row
      };
    } else {
      const errData = await proxyRes.json().catch(() => null);
      throw new Error(errData?.error || `Gagal kirim (HTTP ${proxyRes.status})`);
    }
  } catch (err: any) {
    // 2. Direct browser fallback if proxy unavailable
    try {
      await fetch(trimmed, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ ...record, action }),
        mode: 'no-cors'
      });
      return {
        success: true,
        message: action === 'update'
          ? 'Pembaruan transaksi berhasil dikirim ke Google Spreadsheet!'
          : 'Transaksi berhasil dikirim ke Google Spreadsheet!'
      };
    } catch {
      throw new Error(`Gagal menyimpan ke Google Spreadsheet: ${err.message || 'Koneksi terputus'}`);
    }
  }
}

/**
 * Append transaction record to Google Spreadsheet (Backwards-compatibility wrapper)
 */
export async function appendRecordToSpreadsheet(
  webhookUrl: string,
  record: BunkeringRecord
): Promise<{ success: boolean; message: string; row?: number }> {
  return saveOrUpdateRecordToSpreadsheet(webhookUrl, record, 'append');
}

/**
 * Smart Anomaly & Error Detection for Bunkering Input Records
 */
export function detectTransactionAnomalies(records: BunkeringRecord[]): TransactionAnomaly[] {
  const anomalies: TransactionAnomaly[] = [];

  // Count DN occurrences to spot duplicates
  const dnCounts = new Map<string, number>();
  records.forEach(r => {
    const dn = r.nomorDn?.trim();
    if (dn) {
      dnCounts.set(dn, (dnCounts.get(dn) || 0) + 1);
    }
  });

  records.forEach((r, idx) => {
    // 1. Flow meter difference mismatch with recorded Outflow
    const flowDiff = (r.flowStop || 0) - (r.flowStart || 0);
    if (r.flowStart > 0 && r.flowStop > 0 && r.keluar > 0 && flowDiff > 0 && flowDiff !== r.keluar) {
      anomalies.push({
        id: `anom-flow-${r.id}-${idx}`,
        record: r,
        type: 'flow_mismatch',
        severity: 'warning',
        title: 'Selisih Flow Meter Tidak Cocok dengan Volume Keluar',
        description: `Flow meter awal: ${r.flowStart.toLocaleString('id-ID')}, akhir: ${r.flowStop.toLocaleString('id-ID')} (selisih ${flowDiff.toLocaleString('id-ID')} L), namun volume dicatat ${r.keluar.toLocaleString('id-ID')} L.`,
        field: 'keluar',
        currentValue: r.keluar,
        suggestedValue: flowDiff
      });
    }

    // 2. Duplicate DN
    const dn = r.nomorDn?.trim();
    if (dn && (dnCounts.get(dn) || 0) > 1) {
      anomalies.push({
        id: `anom-dn-dup-${r.id}-${idx}`,
        record: r,
        type: 'duplicate_dn',
        severity: 'warning',
        title: `Nomor DN "${dn}" Tercatat Ganda (${dnCounts.get(dn)} Baris)`,
        description: `Nomor Delivery Note ini digunakan di beberapa baris transaksi. Pastikan bukan transaksi ganda yang tidak sengaja terinput dua kali.`,
        field: 'nomorDn',
        currentValue: dn
      });
    }

    // 3. Zero volume in both Masuk & Keluar
    if ((r.keluar || 0) <= 0 && (r.masuk || 0) <= 0) {
      anomalies.push({
        id: `anom-zero-${r.id}-${idx}`,
        record: r,
        type: 'zero_volume',
        severity: 'error',
        title: 'Volume Masuk dan Keluar Kosong (0 L)',
        description: `Transaksi ini tidak memiliki data volume penyaluran atau penerimaan bahan bakar.`,
        field: 'keluar',
        currentValue: 0
      });
    }

    // 4. Missing DN
    if (!r.nomorDn || !r.nomorDn.trim()) {
      anomalies.push({
        id: `anom-dn-miss-${r.id}-${idx}`,
        record: r,
        type: 'missing_dn',
        severity: 'info',
        title: 'Nomor DN Belum Diisi',
        description: `Delivery Note belum diinput pada transaksi tanggal ${r.tanggal} untuk ${r.pt}.`,
        field: 'nomorDn',
        currentValue: '-'
      });
    }

    // 5. Missing Vessel
    if (!r.namaKapalMobil || !r.namaKapalMobil.trim()) {
      anomalies.push({
        id: `anom-vessel-miss-${r.id}-${idx}`,
        record: r,
        type: 'missing_vessel',
        severity: 'info',
        title: 'Nama Kapal / Mobil Kosong',
        description: `Armada atau nomor plat kendaraan penerima belum diisi pada transaksi DN ${r.nomorDn || '-'}.`,
        field: 'namaKapalMobil',
        currentValue: '-'
      });
    }

    // 6. Kotakan Conflict (size set but status is TIDAK KASIH)
    if (r.kotakan && r.kotakan > 0 && r.keteranganKotakan === 'TIDAK KASIH') {
      anomalies.push({
        id: `anom-kotak-conf-${r.id}-${idx}`,
        record: r,
        type: 'kotakan_conflict',
        severity: 'warning',
        title: 'Ukuran Kotakan Kontradiktif dengan Status "TIDAK KASIH"',
        description: `Tercatat ${r.kotakan} kotak namun status keterangannya "TIDAK KASIH".`,
        field: 'keteranganKotakan',
        currentValue: r.keteranganKotakan,
        suggestedValue: 'KASIH'
      });
    }
  });

  return anomalies;
}


