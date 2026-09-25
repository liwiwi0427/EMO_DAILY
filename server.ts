import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));

// Cloud backup storage directory
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const BACKUPS_FILE = path.join(DATA_DIR, 'cloud_backups.json');

interface BackupRecord {
  id: string;
  timestamp: string;
  title: string;
  entryCount: number;
  isEncrypted: boolean;
  sizeBytes: number;
  device?: string;
  payload: any;
}

function readBackups(): BackupRecord[] {
  try {
    if (fs.existsSync(BACKUPS_FILE)) {
      const content = fs.readFileSync(BACKUPS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('Error reading backups file', e);
  }
  return [];
}

function writeBackups(data: BackupRecord[]) {
  try {
    fs.writeFileSync(BACKUPS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing backups file', e);
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Mindful Journal Cloud Sync', timestamp: new Date().toISOString() });
});

// List backup history
app.get('/api/backup/history', (req, res) => {
  const backups = readBackups();
  const list = backups.map(b => ({
    id: b.id,
    timestamp: b.timestamp,
    title: b.title,
    entryCount: b.entryCount,
    isEncrypted: b.isEncrypted,
    sizeBytes: b.sizeBytes,
    device: b.device || '網頁端 (Web Client)',
  })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json({ success: true, backups: list });
});

// Get latest backup
app.get('/api/backup/latest', (req, res) => {
  const backups = readBackups();
  if (backups.length === 0) {
    return res.status(404).json({ success: false, message: '目前尚無雲端備份' });
  }
  const latest = backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  res.json({ success: true, backup: latest });
});

// Get specific backup by ID
app.get('/api/backup/:id', (req, res) => {
  const backups = readBackups();
  const backup = backups.find(b => b.id === req.params.id);
  if (!backup) {
    return res.status(404).json({ success: false, message: '找不到此備份檔案' });
  }
  res.json({ success: true, backup });
});

// Upload new cloud backup
app.post('/api/backup', (req, res) => {
  const { title, payload, entryCount, isEncrypted, device } = req.body;
  if (!payload) {
    return res.status(400).json({ success: false, message: '備份資料不能為空' });
  }

  const backups = readBackups();
  const newBackup: BackupRecord = {
    id: 'bk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    title: title || `雲端同步備份 (${new Date().toLocaleDateString('zh-TW')} ${new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })})`,
    entryCount: Number(entryCount) || 0,
    isEncrypted: !!isEncrypted,
    sizeBytes: Buffer.byteLength(JSON.stringify(payload), 'utf8'),
    device: device || '瀏覽器雲端同步',
    payload,
  };

  backups.unshift(newBackup);
  // Keep up to 25 recent backups
  if (backups.length > 25) {
    backups.length = 25;
  }
  writeBackups(backups);

  res.json({
    success: true,
    message: '雲端備份儲存成功',
    backup: {
      id: newBackup.id,
      timestamp: newBackup.timestamp,
      title: newBackup.title,
      entryCount: newBackup.entryCount,
      isEncrypted: newBackup.isEncrypted,
      sizeBytes: newBackup.sizeBytes,
    },
  });
});

// Delete a backup
app.delete('/api/backup/:id', (req, res) => {
  let backups = readBackups();
  const initialLen = backups.length;
  backups = backups.filter(b => b.id !== req.params.id);
  if (backups.length === initialLen) {
    return res.status(404).json({ success: false, message: '未找到欲刪除的備份' });
  }
  writeBackups(backups);
  res.json({ success: true, message: '已成功移除此雲端備份' });
});

// Start dev Vite or static serving
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
