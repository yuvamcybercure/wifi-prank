const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const LOGS_FILE = path.join(__dirname, 'scan_logs.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
// Redirect root to admin.html
app.get('/', (req, res) => {
  res.redirect('/admin.html');
});

// Initialize logs file
if (!fs.existsSync(LOGS_FILE)) {
  fs.writeFileSync(LOGS_FILE, JSON.stringify([]));
}

function readLogs() {
  try {
    return JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveLogs(logs) {
  fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
}

// ─── Scan endpoint (what the QR code points to) ───────────────────────────
app.get('/scan', (req, res) => {
  const logs = readLogs();
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'Unknown';

  const entry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    ip,
    userAgent: req.headers['user-agent'] || 'Unknown',
    referer: req.headers['referer'] || 'Direct Scan',
  };

  logs.unshift(entry); // newest first
  saveLogs(logs);

  res.sendFile(path.join(__dirname, 'public', 'reveal.html'));
});

// ─── API: get scan logs ────────────────────────────────────────────────────
app.get('/api/logs', (req, res) => {
  res.json(readLogs());
});

// ─── API: clear logs ───────────────────────────────────────────────────────
app.delete('/api/logs', (req, res) => {
  saveLogs([]);
  res.json({ ok: true });
});

// ─── API: generate QR code as data URL ────────────────────────────────────
app.get('/api/qrcode', async (req, res) => {
  const baseUrl = req.query.url || `http://${req.hostname}:${PORT}`;
  const scanUrl = `${baseUrl}/scan`;

  try {
    const qrDataUrl = await QRCode.toDataURL(scanUrl, {
      errorCorrectionLevel: 'H',
      width: 400,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    });
    res.json({ qr: qrDataUrl, url: scanUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 WiFi Prank Server running!`);
  console.log(`   Admin dashboard : http://localhost:${PORT}/admin.html`);
  console.log(`   Scan landing    : http://localhost:${PORT}/scan`);
  console.log(`\n💡 To share publicly, run: npx ngrok http ${PORT}\n`);
});
