import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  // Support Cloud Run port injection (PORT env var), defaulting to 3000 for local dev
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Health check endpoint for Cloud Run container rollout & load balancer
  app.get(['/healthz', '/api/health'], (_req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime(), port: PORT });
  });

  // Proxy endpoint to fetch Google Sheet content server-side without CORS or GID issues
  app.get('/api/fetch-sheet', async (req, res) => {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).json({ error: 'Parameter url wajib diisi' });
    }

    try {
      const targetUrl = decodeURIComponent(rawUrl).trim();
      const candidateUrls: string[] = [];

      // Check if it's already an export link
      if (targetUrl.includes('output=csv') || targetUrl.includes('tqx=out:csv')) {
        candidateUrls.push(targetUrl);
      }

      // Check published to web link (/pubhtml)
      if (targetUrl.includes('/spreadsheets/d/e/')) {
        const cleanPub = targetUrl.replace(/\/pubhtml.*$/, '/pub?output=csv');
        candidateUrls.push(cleanPub);
      }

      // Extract Sheet ID
      const idMatch = targetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (idMatch && idMatch[1]) {
        const sheetId = idMatch[1];
        const gidMatch = targetUrl.match(/[#&?]gid=([0-9]+)/);
        const gid = gidMatch ? gidMatch[1] : null;

        if (gid) {
          candidateUrls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`);
          candidateUrls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`);
        }
        // Fallback without GID (reads the first active sheet)
        candidateUrls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`);
        candidateUrls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`);
      } else {
        candidateUrls.push(targetUrl);
      }

      let fetchedCsv = '';
      let lastErrorStatus = 0;

      for (const candUrl of candidateUrls) {
        try {
          const fetchRes = await fetch(candUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            redirect: 'follow'
          });

          if (fetchRes.ok) {
            const text = await fetchRes.text();
            // Verify it looks like CSV or tabular data, not HTML login page
            if (text && text.trim().length > 0 && !text.includes('<!DOCTYPE html>') && !text.includes('<html')) {
              fetchedCsv = text;
              break;
            }
          } else {
            lastErrorStatus = fetchRes.status;
          }
        } catch {
          // try next candidate
        }
      }

      if (!fetchedCsv) {
        return res.status(400).json({
          error: `Gagal mengunduh data dari Google Spreadsheet (${lastErrorStatus || 400}). Pastikan Google Sheet disetel ke: "Siapa saja yang memiliki link" (Anyone with link can view).`
        });
      }

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(fetchedCsv);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Server error saat mengambil spreadsheet' });
    }
  });

  // Proxy endpoint to send/append record to Google Spreadsheet via Apps Script Webhook
  app.post('/api/append-to-sheet', async (req, res) => {
    const { webhookUrl, record } = req.body;
    if (!webhookUrl || !record) {
      return res.status(400).json({ error: 'webhookUrl dan data record wajib diisi' });
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Bunkering-Dashboard/1.0',
        },
        body: JSON.stringify(record),
        redirect: 'follow',
      });

      const responseText = await response.text();
      let responseJson: any = null;
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        // raw text response
      }

      if (response.ok) {
        if (responseJson && (responseJson.status === 'error' || responseJson.success === false)) {
          return res.status(400).json({
            error: responseJson.message || 'Google Apps Script melaporkan kesalahan saat menulis ke spreadsheet',
            details: responseJson,
          });
        }
        return res.json({
          success: true,
          message: 'Data transaksi berhasil terkirim dan tercatat di Google Spreadsheet!',
          details: responseJson || responseText,
        });
      } else {
        return res.status(response.status).json({
          error: `Google Apps Script mengembalikan status ${response.status}`,
          details: responseText,
        });
      }
    } catch (err: any) {
      return res.status(500).json({
        error: `Gagal mengirim data ke Google Spreadsheet: ${err.message || 'Koneksi error'}`,
      });
    }
  });

  const distPath = path.join(__dirname, 'dist');
  let hasDist = fs.existsSync(path.join(distPath, 'index.html'));

  if (!hasDist && process.env.NODE_ENV === 'production') {
    try {
      const { execSync } = await import('child_process');
      console.log('Production mode detected with missing dist. Running vite build...');
      execSync('npx vite build', { stdio: 'inherit' });
      hasDist = fs.existsSync(path.join(distPath, 'index.html'));
    } catch (e) {
      console.error('Failed to auto-build dist:', e);
    }
  }

  if (process.env.NODE_ENV === 'production' || hasDist) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
