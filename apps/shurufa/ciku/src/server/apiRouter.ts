import { Router } from 'express';
import { INITIAL_ENTRIES, INITIAL_LIBRARIES, INITIAL_PENDING_SUBMISSIONS, INITIAL_SYNC_STATUS } from '../data/initialData';

export const apiRouter = Router();

// GET /api/ciku/health
apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'shurufa.gyenbox.com',
    version: '4.8.2-express',
    accountIsolation: 'GyenBox Bearer Token Unified',
    shurufaBoundary: 'shurufa.wang isolated'
  });
});

// GET /api/ciku/search
apiRouter.get('/search', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) {
    return res.json(INITIAL_ENTRIES);
  }

  const results = INITIAL_ENTRIES.filter((item) => {
    return (
      item.word.toLowerCase().includes(q) ||
      item.pinyin.toLowerCase().includes(q) ||
      item.definition.toLowerCase().includes(q) ||
      (item.etymology && item.etymology.toLowerCase().includes(q)) ||
      item.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  res.json(results);
});

// GET /api/ciku/entries
apiRouter.get('/entries', (req, res) => {
  const category = req.query.category as string;
  const level = req.query.level as string;

  let filtered = [...INITIAL_ENTRIES];
  if (category && category !== 'ALL') {
    if (category === 'RECENT') {
      filtered.sort((a, b) => b.usageCount - a.usageCount);
    } else if (category === 'FAVORITES') {
      filtered = filtered.filter((e) => e.isFavorited);
    } else {
      filtered = filtered.filter((e) => e.category === category);
    }
  }

  if (level && level !== 'ALL') {
    filtered = filtered.filter((e) => e.level === level);
  }

  res.json(filtered);
});

// GET /api/ciku/entries/:id
apiRouter.get('/entries/:id', (req, res) => {
  const entry = INITIAL_ENTRIES.find((e) => e.id === req.params.id);
  if (!entry) {
    return res.status(404).json({ error: 'Entry not found' });
  }
  res.json(entry);
});

// POST /api/ciku/personal
apiRouter.post('/personal', (req, res) => {
  const body = req.body;
  if (!body || !body.word || !body.pinyin) {
    return res.status(400).json({ error: 'word and pinyin are required' });
  }

  const newEntry = {
    ...body,
    id: `entry-${Date.now()}`,
    lastUsedTime: '刚刚',
    category: 'PERSONAL',
    sourceLibrary: '我的个人词库',
    isSynced: true
  };

  INITIAL_ENTRIES.unshift(newEntry);
  res.status(201).json(newEntry);
});

// PUT /api/ciku/personal/:id
apiRouter.put('/personal/:id', (req, res) => {
  const idx = INITIAL_ENTRIES.findIndex((e) => e.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  INITIAL_ENTRIES[idx] = { ...INITIAL_ENTRIES[idx], ...req.body, lastUsedTime: '刚刚' };
  res.json(INITIAL_ENTRIES[idx]);
});

// DELETE /api/ciku/personal/:id
apiRouter.delete('/personal/:id', (req, res) => {
  const idx = INITIAL_ENTRIES.findIndex((e) => e.id === req.params.id);
  if (idx !== -1) {
    INITIAL_ENTRIES.splice(idx, 1);
  }
  res.json({ success: true, message: 'Deleted from personal dictionary' });
});

// GET /api/ciku/frequency
apiRouter.get('/frequency', (_req, res) => {
  res.json({
    onceCount: INITIAL_ENTRIES.filter((e) => e.level === 'ONCE').length,
    memoryCount: INITIAL_ENTRIES.filter((e) => e.level === 'MEMORY').length,
    highCount: INITIAL_ENTRIES.filter((e) => e.level === 'HIGH').length,
    fixedCount: INITIAL_ENTRIES.filter((e) => e.level === 'FIXED').length,
    totalCount: INITIAL_ENTRIES.length
  });
});
