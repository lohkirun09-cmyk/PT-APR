import React, { useState } from 'react';
import { X, Copy, Check, Download, Code2, FileSpreadsheet, Globe, AlertTriangle, Terminal, Info, Wrench } from 'lucide-react';

interface AppsScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppsScriptModal: React.FC<AppsScriptModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'solution' | 'codegs' | 'indexhtml' | 'guide'>('solution');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  // Ultra-robust Code.gs with auto-fallback, error diagnostics, and ID support
  const codeGsContent = `/**
 * ====================================================================
 * SISTEM DASHBOARD BUNKERING BBM - PT. ANGKA PETROLEUM RAYA
 * Google Apps Script Server Engine (Code.gs) - Versi 2.0 (Anti-Error)
 * ====================================================================
 */

// CATATAN PENTING:
// Jika script ini dibuat langsung dari Google Sheets (menu Ekstensi -> Apps Script), 
// biarkan SPREADSHEET_ID kosong "".
// Jika dibuat sebagai script terpisah di script.google.com, tempelkan ID Spreadsheet Anda di bawah ini:
var SPREADSHEET_ID = ""; 

function doGet(e) {
  if (e && e.parameter && e.parameter.api === '1') {
    var result = getBunkeringData();
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Dashboard Bunkering - PT. ANGKA PETROLEUM RAYA')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getSpreadsheetSafely() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== '') {
    return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) return ss;
  
  throw new Error("Spreadsheet tidak terdeteksi! Pastikan Anda membuka script dari menu 'Ekstensi -> Apps Script' di dalam file Google Spreadsheet, atau isi variabel SPREADSHEET_ID di baris paling atas Code.gs.");
}

function getBunkeringData() {
  try {
    var ss = getSpreadsheetSafely();
    var sheets = ss.getSheets();
    if (sheets.length === 0) {
      throw new Error("Spreadsheet tidak memiliki tab lembar kerja.");
    }

    // Cari tab yang memiliki data bunkering
    var targetSheet = null;
    var allValues = [];
    var headerRowIdx = -1;

    for (var s = 0; s < sheets.length; s++) {
      var current = sheets[s];
      var raw = current.getDataRange().getValues();
      if (raw.length < 1) continue;

      // Cari baris header (periksa 5 baris pertama)
      for (var r = 0; r < Math.min(5, raw.length); r++) {
        var rowText = raw[r].join(' ').toUpperCase();
        if (rowText.indexOf('TANGGAL') !== -1 || (rowText.indexOf('BUNKERING') !== -1 && rowText.indexOf('MASUK') !== -1) || rowText.indexOf('NOMOR DN') !== -1) {
          targetSheet = current;
          allValues = raw;
          headerRowIdx = r;
          break;
        }
      }
      if (targetSheet) break;
    }

    // Jika tidak ditemukan header spesifik, gunakan sheet pertama
    if (!targetSheet) {
      targetSheet = sheets[0];
      allValues = targetSheet.getDataRange().getValues();
      headerRowIdx = 0;
    }

    if (allValues.length <= headerRowIdx + 1) {
      return {
        status: 'success',
        sheetName: targetSheet.getName(),
        totalRows: 0,
        records: []
      };
    }

    var headers = allValues[headerRowIdx].map(function(h) { 
      return String(h || '').trim().toUpperCase(); 
    });

    var findCol = function(terms) {
      for (var i = 0; i < headers.length; i++) {
        for (var t = 0; t < terms.length; t++) {
          if (headers[i].indexOf(terms[t]) !== -1) return i;
        }
      }
      return -1;
    };

    var idxTgl = findCol(['TANGGAL', 'DATE']);
    var idxKet = findCol(['KETERANGAN']);
    var idxMasuk = findCol(['MASUK']);
    var idxKeluar = findCol(['KELUAR']);
    var idxDn = findCol(['NOMOR DN', 'DN']);
    var idxPt = findCol(['PT', 'NAMA PT']);
    var idxKapal = findCol(['KAPAL', 'MOBIL']);
    var idxTangki = findCol(['TANGKI']);
    var idxTStart = findCol(['TIME START', 'START']);
    var idxTStop = findCol(['TIME STOP', 'STOP']);
    var idxFStart = findCol(['FLOW START']);
    var idxFStop = findCol(['FLOW STOP']);
    var idxPengawas = findCol(['PENGAWAS']);
    var idxKotakan = findCol(['KOTAKAN']);
    var idxKetKotak = -1;

    for (var k = 0; k < headers.length; k++) {
      if ((headers[k].indexOf('KETERANGAN') !== -1 && k !== idxKet) || headers[k].indexOf('STATUS') !== -1) {
        idxKetKotak = k;
        break;
      }
    }

    var cleanRecords = [];
    var tz = Session.getScriptTimeZone() || 'Asia/Jakarta';

    for (var row = headerRowIdx + 1; row < allValues.length; row++) {
      var d = allValues[row];
      if (!d || d.length === 0) continue;

      var rawTgl = idxTgl >= 0 ? d[idxTgl] : '';
      var strTgl = '';
      if (Object.prototype.toString.call(rawTgl) === '[object Date]') {
        strTgl = Utilities.formatDate(rawTgl, tz, 'MM/dd/yyyy');
      } else {
        strTgl = String(rawTgl || '').trim();
      }

      var masukVal = idxMasuk >= 0 ? parseFloat(String(d[idxMasuk]).replace(/[^0-9.-]/g, '')) || 0 : 0;
      var keluarVal = idxKeluar >= 0 ? parseFloat(String(d[idxKeluar]).replace(/[^0-9.-]/g, '')) || 0 : 0;
      var ptVal = idxPt >= 0 ? String(d[idxPt] || '').trim() : '';

      // Skip baris kosong
      if (!strTgl && masukVal === 0 && keluarVal === 0 && !ptVal) continue;

      var fStart = idxFStart >= 0 ? parseFloat(String(d[idxFStart]).replace(/[^0-9.-]/g, '')) || 0 : 0;
      var fStop = idxFStop >= 0 ? parseFloat(String(d[idxFStop]).replace(/[^0-9.-]/g, '')) || 0 : 0;
      var kotak = idxKotakan >= 0 ? parseFloat(String(d[idxKotakan]).replace(/[^0-9.-]/g, '')) || '' : '';

      // Semua nilai dipastikan PRIMITIVE (string / number), TANPA objek Date agar tidak gagal kirim ke browser
      cleanRecords.push({
        tanggal: strTgl,
        keterangan: idxKet >= 0 ? String(d[idxKet] || '') : '',
        masuk: masukVal,
        keluar: keluarVal,
        nomorDn: idxDn >= 0 ? String(d[idxDn] || '') : '',
        pt: ptVal || 'UNKNOWN',
        namaKapalMobil: idxKapal >= 0 ? String(d[idxKapal] || '') : '',
        tangki: idxTangki >= 0 ? String(d[idxTangki] || '').toUpperCase() : '',
        timeStart: idxTStart >= 0 ? String(d[idxTStart] || '') : '',
        timeStop: idxTStop >= 0 ? String(d[idxTStop] || '') : '',
        flowStart: fStart,
        flowStop: fStop,
        pengawas: idxPengawas >= 0 ? String(d[idxPengawas] || '').toUpperCase() : '',
        kotakan: kotak,
        keteranganKotakan: idxKetKotak >= 0 ? String(d[idxKetKotak] || '').toUpperCase() : ''
      });
    }

    return {
      status: 'success',
      sheetName: targetSheet.getName(),
      totalRows: cleanRecords.length,
      records: cleanRecords
    };
  } catch (err) {
    return {
      status: 'error',
      errorMessage: err.message || String(err)
    };
  }
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⛽ Sistem Bunkering')
    .addItem('📊 Buka Dashboard Bunkering', 'showSidebarDashboard')
    .addToUi();
}

function showSidebarDashboard() {
  var html = HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Dashboard Bunkering BBM')
    .setWidth(450);
  SpreadsheetApp.getUi().showSidebar(html);
}
`;

  // Enhanced Index.html with explicit error diagnostics and zero-crash handling
  const indexHtmlContent = `<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
    <meta charset="UTF-8">
    <title>Dashboard Bunkering - PT. ANGKA PETROLEUM RAYA</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      body { background-color: #030712; color: #f3f4f6; font-family: ui-sans-serif, system-ui, sans-serif; }
    </style>
  </head>
  <body class="p-4 sm:p-6">
    <div class="max-w-6xl mx-auto space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-800 pb-4 gap-3">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-black text-amber-400">PT. ANGKA PETROLEUM RAYA</h1>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">GAS v2.0</span>
          </div>
          <p class="text-xs text-gray-400">Dashboard Google Apps Script Terhubung Otomatis ke Spreadsheet</p>
        </div>
        <div class="flex items-center gap-2">
          <span id="sync-status" class="text-xs text-gray-400">Menghubungkan...</span>
          <button onclick="loadDataFromSheets()" class="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl cursor-pointer transition-all shadow-md">
            🔄 Muat Ulang Data
          </button>
        </div>
      </div>

      <!-- Alert Box jika ada kendala -->
      <div id="error-alert" class="hidden p-4 rounded-2xl bg-rose-950/40 border border-rose-500 text-rose-300 text-xs space-y-2">
        <div class="font-bold text-rose-200 text-sm flex items-center gap-2">
          ⚠️ Gagal Memuat Data dari Google Spreadsheet
        </div>
        <div id="error-message" class="font-mono bg-black/50 p-2.5 rounded-lg text-rose-300 text-[11px]"></div>
        <div class="text-[11px] text-gray-300">
          <strong>Solusi Cepat:</strong>
          <ul class="list-disc list-inside mt-1 space-y-1">
            <li>Pastikan script dibuka dari menu <b>Ekstensi → Apps Script</b> di dalam file Google Spreadsheet yang berisi data.</li>
            <li>Saat pertama kali deploy, pastikan Anda telah menyetujui izin akses Google (<b>Review Permissions → Advanced → Go to...</b>).</li>
          </ul>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-gray-900 border border-gray-800 p-4 rounded-2xl">
          <div class="text-xs text-emerald-400 font-semibold uppercase">Total Masuk</div>
          <div class="text-2xl font-bold text-white mt-1" id="val-masuk">Memuat...</div>
          <div class="text-[10px] text-gray-500 mt-0.5" id="cnt-masuk">-</div>
        </div>
        <div class="bg-gray-900 border border-gray-800 p-4 rounded-2xl">
          <div class="text-xs text-amber-400 font-semibold uppercase">Total Keluar</div>
          <div class="text-2xl font-bold text-white mt-1" id="val-keluar">Memuat...</div>
          <div class="text-[10px] text-gray-500 mt-0.5" id="cnt-keluar">-</div>
        </div>
        <div class="bg-gray-900 border border-gray-800 p-4 rounded-2xl">
          <div class="text-xs text-blue-400 font-semibold uppercase">Total Keseluruhan</div>
          <div class="text-2xl font-bold text-white mt-1" id="val-total">Memuat...</div>
          <div class="text-[10px] text-gray-500 mt-0.5" id="cnt-total">-</div>
        </div>
      </div>

      <!-- Top 5 PT & Kotakan -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
          <div class="flex justify-between items-center mb-3">
            <h2 class="text-xs font-bold text-amber-400 uppercase tracking-wider">5 Top Nama PT Terbanyak</h2>
            <span class="text-[10px] text-gray-500">Volume Keluar</span>
          </div>
          <div id="top-pt-list" class="space-y-2 text-xs">
            <div class="text-gray-500 italic py-4 text-center">Memuat daftar PT...</div>
          </div>
        </div>
        <div class="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
          <div class="flex justify-between items-center mb-3">
            <h2 class="text-xs font-bold text-blue-400 uppercase tracking-wider">5 Top Kotakan Terbanyak</h2>
            <span class="text-[10px] text-gray-500">Frekuensi</span>
          </div>
          <div id="top-kotak-list" class="space-y-2 text-xs">
            <div class="text-gray-500 italic py-4 text-center">Memuat daftar kotakan...</div>
          </div>
        </div>
      </div>

      <!-- Data Table -->
      <div class="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden p-4">
        <div class="flex justify-between items-center mb-3">
          <h2 class="text-sm font-bold text-gray-200">Data Transaksi Terkini (<span id="sheet-source-name">-</span>)</h2>
          <span class="text-xs text-gray-400" id="row-count-badge">0 Baris</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="text-gray-400 border-b border-gray-800 text-[11px] uppercase">
              <tr>
                <th class="py-2.5">Tanggal</th>
                <th class="py-2.5">Kategori</th>
                <th class="py-2.5 text-right">Keluar (L)</th>
                <th class="py-2.5">No DN</th>
                <th class="py-2.5">Nama PT</th>
                <th class="py-2.5">Kapal / Mobil</th>
                <th class="py-2.5">Tangki</th>
                <th class="py-2.5">Pengawas</th>
                <th class="py-2.5">Kotakan</th>
              </tr>
            </thead>
            <tbody id="table-body" class="divide-y divide-gray-800 font-medium">
              <tr><td colspan="9" class="py-8 text-center text-gray-500">Memuat data dari Google Sheets...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <script>
      function loadDataFromSheets() {
        document.getElementById('sync-status').innerText = 'Mengambil data...';
        document.getElementById('error-alert').classList.add('hidden');

        if (typeof google === 'undefined' || !google.script || !google.script.run) {
          showError("Koneksi google.script.run tidak tersedia. Jika Anda menguji di luar Google Apps Script, buka melalui tautan Web App Apps Script resmi.");
          return;
        }

        google.script.run
          .withSuccessHandler(onDataReceived)
          .withFailureHandler(onDataError)
          .getBunkeringData();
      }

      function onDataReceived(res) {
        if (!res || res.status === 'error') {
          showError(res ? res.errorMessage : 'Terjadi kegagalan server tanpa pesan kesalahan.');
          return;
        }

        var records = res.records || [];
        document.getElementById('sync-status').innerText = 'Aktif (' + records.length + ' data)';
        document.getElementById('sheet-source-name').innerText = res.sheetName || 'Sheet';
        document.getElementById('row-count-badge').innerText = records.length + ' Baris';

        var totalMasuk = 0;
        var totalKeluar = 0;
        var masukCount = 0;
        var keluarCount = 0;
        var ptMap = {};
        var kotakMap = {};

        records.forEach(function(r) {
          var m = Number(r.masuk) || 0;
          var k = Number(r.keluar) || 0;
          totalMasuk += m;
          totalKeluar += k;
          if (m > 0) masukCount++;
          if (k > 0) keluarCount++;

          var p = r.pt || 'NONAME';
          ptMap[p] = (ptMap[p] || 0) + k;

          var kotakKey = (r.kotakan && r.kotakan > 0) ? 'Kotakan ' + r.kotakan : 'Tanpa Kotakan';
          kotakMap[kotakKey] = (kotakMap[kotakKey] || 0) + 1;
        });

        document.getElementById('val-masuk').innerText = totalMasuk.toLocaleString('id-ID') + ' L';
        document.getElementById('cnt-masuk').innerText = masukCount + ' Pengisian';

        document.getElementById('val-keluar').innerText = totalKeluar.toLocaleString('id-ID') + ' L';
        document.getElementById('cnt-keluar').innerText = keluarCount + ' Distribusi';

        document.getElementById('val-total').innerText = (totalMasuk + totalKeluar).toLocaleString('id-ID') + ' L';
        document.getElementById('cnt-total').innerText = records.length + ' Total Transaksi';

        // 5 Top PT
        var sortedPT = Object.keys(ptMap).map(function(k) { return { pt: k, vol: ptMap[k] }; })
          .sort(function(a, b) { return b.vol - a.vol; }).slice(0, 5);
        
        var ptHtml = sortedPT.map(function(item, idx) {
          return '<div class="flex justify-between items-center p-2 rounded-xl bg-gray-950 border border-gray-800/80"><span><strong class="text-amber-400 mr-2">' + (idx+1) + '.</strong> ' + item.pt + '</span><span class="font-bold text-amber-400">' + item.vol.toLocaleString('id-ID') + ' L</span></div>';
        }).join('');
        document.getElementById('top-pt-list').innerHTML = ptHtml || '<div class="text-gray-500 py-2">Belum ada data PT</div>';

        // 5 Top Kotakan
        var sortedKotak = Object.keys(kotakMap).map(function(k) { return { name: k, count: kotakMap[k] }; })
          .sort(function(a, b) { return b.count - a.count; }).slice(0, 5);

        var kotakHtml = sortedKotak.map(function(item) {
          return '<div class="flex justify-between items-center p-2 rounded-xl bg-gray-950 border border-gray-800/80"><span>' + item.name + '</span><span class="font-bold text-blue-400">' + item.count + 'x</span></div>';
        }).join('');
        document.getElementById('top-kotak-list').innerHTML = kotakHtml || '<div class="text-gray-500 py-2">Belum ada data Kotakan</div>';

        // Table Rows
        if (records.length === 0) {
          document.getElementById('table-body').innerHTML = '<tr><td colspan="9" class="py-6 text-center text-gray-500">Tidak ada baris data transaksi pada spreadsheet ini.</td></tr>';
          return;
        }

        var tableHtml = records.slice(0, 15).map(function(r) {
          return '<tr class="hover:bg-gray-800/40 transition-colors">' +
            '<td class="py-2.5 font-semibold text-white">' + r.tanggal + '</td>' +
            '<td class="py-2.5"><span class="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 text-[10px] font-bold">' + r.keterangan + '</span></td>' +
            '<td class="py-2.5 text-right font-bold text-amber-400">' + (r.keluar > 0 ? r.keluar.toLocaleString('id-ID') + ' L' : '-') + '</td>' +
            '<td class="py-2.5 font-mono text-gray-400">' + r.nomorDn + '</td>' +
            '<td class="py-2.5 font-bold text-white">' + r.pt + '</td>' +
            '<td class="py-2.5 text-gray-300">' + r.namaKapalMobil + '</td>' +
            '<td class="py-2.5"><span class="px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">' + r.tangki + '</span></td>' +
            '<td class="py-2.5 text-teal-400">' + r.pengawas + '</td>' +
            '<td class="py-2.5 font-bold text-blue-300">' + (r.kotakan || '-') + '</td>' +
          '</tr>';
        }).join('');
        document.getElementById('table-body').innerHTML = tableHtml;
      }

      function onDataError(err) {
        showError(err && err.message ? err.message : String(err));
      }

      function showError(msg) {
        document.getElementById('sync-status').innerText = 'Gagal';
        document.getElementById('error-message').innerText = msg;
        document.getElementById('error-alert').classList.remove('hidden');
        document.getElementById('val-masuk').innerText = 'Error';
        document.getElementById('val-keluar').innerText = 'Error';
        document.getElementById('val-total').innerText = 'Error';
      }

      window.onload = loadDataFromSheets;
    </script>
  </body>
</html>
`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl relative my-6 max-h-[90vh] flex flex-col">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-blue-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <Code2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">Panduan Solusi & Kode Google Apps Script (GAS)</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Update v2.0 (Solusi "Memuat...")
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Perbaikan penyebab status "Memuat..." macet dan kode baru yang langsung membaca sheet Anda
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('solution')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'solution'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Penyebab & Solusi "Memuat..."</span>
          </button>

          <button
            onClick={() => setActiveTab('codegs')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'codegs'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>1. Code.gs (Kode Baru)</span>
          </button>

          <button
            onClick={() => setActiveTab('indexhtml')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'indexhtml'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>2. Index.html (Kode Baru)</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'guide'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Cara Deploy Ulang</span>
          </button>
        </div>

        {/* Tab 0: Solution explanation */}
        {activeTab === 'solution' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
            <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-4">
              <h4 className="font-bold text-amber-300 text-sm mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Kenapa di Layar Muncul "Memuat..." dan Tidak Muncul Data?
              </h4>
              <p className="text-slate-300 leading-relaxed">
                Pada tangkapan layar yang Anda kirimkan, dashboard tertahan di teks <strong>"Memuat..."</strong> karena 2 penyebab utama pada Google Apps Script:
              </p>
              <div className="mt-3 space-y-2.5">
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <strong className="text-rose-400 block mb-1">1. Script dibuka secara "Mandiri" (Bukan dari Sheet langsung):</strong>
                  <span className="text-slate-300">
                    Jika script dibuat di <code>script.google.com</code> secara terpisah (bukan melalui menu <strong>Ekstensi → Apps Script</strong> di dalam file Spreadsheet data Anda), perintah <code>SpreadsheetApp.getActiveSpreadsheet()</code> akan bernilai <code>null</code> karena script tidak tahu file spreadsheet mana yang harus dibaca.
                  </span>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <strong className="text-rose-400 block mb-1">2. Izin Akses (Permissions) Belum Diizinkan:</strong>
                  <span className="text-slate-300">
                    Google Apps Script mewajibkan persetujuan akses lembar kerja (<em>Authorization Required</em>). Jika saat deploy belum diizinkan, fungsi server akan error secara diam-diam.
                  </span>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <strong className="text-emerald-400 block mb-1">3. Solusi yang Sudah Disiapkan (Versi 2.0):</strong>
                  <span className="text-slate-300">
                    Kami telah memperbarui kode <strong>Code.gs</strong> dan <strong>Index.html</strong> di tab sebelah:
                    <ul className="list-disc list-inside mt-1 space-y-1 text-slate-300">
                      <li>Otomatis mendeteksi tab sheet yang berisi data bunkering.</li>
                      <li>Menampilkan pesan error yang jelas di layar jika ada masalah koneksi.</li>
                      <li>Menyediakan opsi memasukkan <code>SPREADSHEET_ID</code> jika Anda menggunakan script terpisah.</li>
                    </ul>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveTab('codegs')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer shadow-md"
              >
                Salin Kode Code.gs Baru →
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Code.gs */}
        {activeTab === 'codegs' && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <span className="text-xs text-slate-400 font-mono">File: Code.gs (Ganti seluruh isi Code.gs Anda dengan ini)</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadFile(codeGsContent, 'Code.gs')}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh File</span>
                </button>
                <button
                  onClick={() => copyToClipboard(codeGsContent, 'codegs')}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  {copiedCode === 'codegs' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'codegs' ? 'Tersalin!' : 'Salin Kode Code.gs'}</span>
                </button>
              </div>
            </div>
            <pre className="flex-1 bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-auto select-all leading-relaxed">
              {codeGsContent}
            </pre>
          </div>
        )}

        {/* Tab 2: Index.html */}
        {activeTab === 'indexhtml' && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <span className="text-xs text-slate-400 font-mono">File: Index.html (Ganti seluruh isi file Index.html di Apps Script)</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadFile(indexHtmlContent, 'Index.html')}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh File</span>
                </button>
                <button
                  onClick={() => copyToClipboard(indexHtmlContent, 'indexhtml')}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  {copiedCode === 'indexhtml' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'indexhtml' ? 'Tersalin!' : 'Salin Kode Index.html'}</span>
                </button>
              </div>
            </div>
            <pre className="flex-1 bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-[11px] text-blue-300 overflow-auto select-all leading-relaxed">
              {indexHtmlContent}
            </pre>
          </div>
        )}

        {/* Tab 3: Guide */}
        {activeTab === 'guide' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
              <h4 className="font-bold text-amber-400 text-sm mb-2">
                Langkah Cepat Memperbarui (Anti Macet):
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-slate-300 leading-relaxed">
                <li>
                  Buka file <strong>Google Spreadsheet</strong> yang berisi data operasional bunkering Anda.
                </li>
                <li>
                  Klik menu <strong>Ekstensi (Extensions) → Apps Script</strong> (pastikan membuka dari dalam Spreadsheet ini, bukan dari tab browser baru).
                </li>
                <li>
                  Buka file <strong>Code.gs</strong>, hapus semua kodenya, lalu <strong>Paste</strong> kode dari tab <em>1. Code.gs (Kode Baru)</em>.
                </li>
                <li>
                  Buka file <strong>Index.html</strong>, hapus semua kodenya, lalu <strong>Paste</strong> kode dari tab <em>2. Index.html (Kode Baru)</em>.
                </li>
                <li>
                  Klik tombol <strong>💾 Simpan Proyek</strong> (Ctrl + S).
                </li>
                <li>
                  Klik tombol biru <strong>Terapkan (Deploy)</strong> di kanan atas → pilih <strong>Kelola Penerapan (Manage deployments)</strong> → klik ikon pensil (Edit) → pada versi pilih <strong>Versi Baru (New version)</strong> → klik <strong>Terapkan</strong>.
                </li>
                <li>
                  Buka link Web App tersebut. Data dan metrik langsung tampil secara instan!
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            Diverifikasi untuk Google Apps Script V8 Engine & kompatibel dengan seluruh tab Google Sheets
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
