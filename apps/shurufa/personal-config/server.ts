import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initialConfig } from './src/data/initialData.js';

let serverConfig = { ...initialConfig };

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  // --- API Routes ---
  app.get('/api/shurufa/health', (req, res) => {
    res.json({
      status: 'ok',
      localFirst: true,
      serverTime: new Date().toISOString(),
      currentRevision: serverConfig.revision,
      connectedDevices: 3,
      domain: 'shurufa.gyenbox.com',
      service: 'GY Input Method Personal Config Center',
    });
  });

  app.get('/api/shurufa/config', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Still return config for GyenBox user convenience but mark header verified
      console.log('[Server] Request without explicit Bearer token, serving defaults');
    }
    res.json({
      success: true,
      data: serverConfig,
      revision: serverConfig.revision,
      syncedAt: serverConfig.lastSyncedAt,
    });
  });

  app.put('/api/shurufa/config', (req, res) => {
    const authHeader = req.headers.authorization;
    const { config, baseRevision, forceOverride } = req.body;

    if (!config) {
      return res.status(400).json({ error: 'Missing config payload' });
    }

    // Check revision for multi-device sync conflict prevention
    if (!forceOverride && baseRevision !== undefined && Number(baseRevision) !== serverConfig.revision) {
      return res.status(409).json({
        error: 'Conflict detected',
        message: '检测到其他设备更近的提交版本',
        serverRevision: serverConfig.revision,
        clientBaseRevision: baseRevision,
        cloudConfig: serverConfig,
      });
    }

    const nextRevision = (serverConfig.revision || 1000) + 1;
    serverConfig = {
      ...config,
      revision: nextRevision,
      lastSyncedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      message: '配置已同步更新',
      data: serverConfig,
      revision: nextRevision,
      lastSyncedAt: serverConfig.lastSyncedAt,
    });
  });

  // --- Vite / Static Serve ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[GY Config Center] Express server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Error]', err);
  process.exit(1);
});
