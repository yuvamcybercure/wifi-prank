# 📶 WiFi Prank QR System

A prank QR poster that looks like "Free WiFi" but reveals a funny image — with full scan logs!

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Add your funny image
Drop your funny image into the `public/` folder and rename it to:
```
public/funny.jpg
```
(Supports `.jpg`, `.png`, `.gif` — just rename to `funny.jpg`)

### 3. Start the server
```bash
node server.js
```

### 4. Make it public (so QR works from phones)

**Option A — Same WiFi network:**
Find your local IP with `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
Use: `http://192.168.x.x:3000`

**Option B — Internet (anyone can scan):**
```bash
npx ngrok http 3000
```
Copy the `https://xxxxx.ngrok.io` URL.

### 5. Open Admin Dashboard
```
http://localhost:3000/admin.html
```
- Paste your public URL
- Click **Generate QR**
- Click **Print Poster** to print the "Free WiFi" sign
- Watch scans come in live!

---

## 📋 Scan Logs

Every scan is logged with:
| Field | Info |
|-------|------|
| Time | Exact date & time |
| IP | Scanner's IP address |
| Device | iPhone / Android / etc. |
| User Agent | Full browser info |

Logs are saved to `scan_logs.json` and survive server restarts.

---

## 📁 File Structure
```
wifi-prank/
├── server.js          ← Express backend
├── scan_logs.json     ← Auto-created scan log
├── public/
│   ├── admin.html     ← Admin dashboard
│   ├── reveal.html    ← Funny image page (what scanner sees)
│   └── funny.jpg      ← YOUR funny image goes here ← ADD THIS
└── README.md
```
