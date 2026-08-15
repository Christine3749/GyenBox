import { CikuEntry, FrequencyStats, ImportPreviewResult, KeepCard, PendingSubmission, SyncStatus } from '../types/ciku';
import { INITIAL_ENTRIES, INITIAL_LIBRARIES, INITIAL_PENDING_SUBMISSIONS, INITIAL_SYNC_STATUS } from '../data/initialData';

const LOCAL_STORAGE_KEY = 'gy_ciku_entries_v1';
const LOCAL_STORAGE_SUBMISSIONS = 'gy_ciku_submissions_v1';
const LOCAL_STORAGE_KEEP = 'gy_ciku_keep_cards_v1';
const LOCAL_STORAGE_SYNC = 'gy_ciku_sync_v1';

// Helper to get local data
function getStoredEntries(): CikuEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_ENTRIES));
      return INITIAL_ENTRIES;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse local entries, resetting to initial', e);
    return INITIAL_ENTRIES;
  }
}

function saveStoredEntries(entries: CikuEntry[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('Failed to save entries to localStorage', e);
  }
}

function getStoredSubmissions(): PendingSubmission[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SUBMISSIONS);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_SUBMISSIONS, JSON.stringify(INITIAL_PENDING_SUBMISSIONS));
      return INITIAL_PENDING_SUBMISSIONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_PENDING_SUBMISSIONS;
  }
}

function saveStoredSubmissions(list: PendingSubmission[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_SUBMISSIONS, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save submissions', e);
  }
}

function getStoredKeepCards(): KeepCard[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEEP);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveStoredKeepCards(cards: KeepCard[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEEP, JSON.stringify(cards));
  } catch (e) {
    console.error('Failed to save keep cards', e);
  }
}

export class CikuApiService {
  // GET /api/ciku/health
  static async getHealth(): Promise<{ status: string; timestamp: string; version: string; tokenValid: boolean }> {
    try {
      const res = await fetch('/api/ciku/health');
      if (res.ok) return await res.json();
    } catch (e) {
      // Fallback
    }
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '4.8.2-client',
      tokenValid: true
    };
  }

  // GET /api/ciku/entries
  static async getEntries(category?: string, level?: string): Promise<CikuEntry[]> {
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (level) params.set('level', level);
      const res = await fetch(`/api/ciku/entries?${params.toString()}`);
      if (res.ok) return await res.json();
    } catch (e) {
      // Fallback to client state
    }
    let entries = getStoredEntries();
    if (category && category !== 'ALL') {
      if (category === 'RECENT') {
        entries = [...entries].sort((a, b) => b.usageCount - a.usageCount);
      } else if (category === 'FAVORITES') {
        entries = entries.filter((e) => e.isFavorited);
      } else {
        entries = entries.filter((e) => e.category === category);
      }
    }
    if (level && level !== 'ALL') {
      entries = entries.filter((e) => e.level === level);
    }
    return entries;
  }

  // GET /api/ciku/search
  static async search(query: string): Promise<CikuEntry[]> {
    const q = query.trim().toLowerCase();
    if (!q) return this.getEntries();

    try {
      const res = await fetch(`/api/ciku/search?q=${encodeURIComponent(q)}`);
      if (res.ok) return await res.json();
    } catch (e) {
      // Fallback
    }

    const entries = getStoredEntries();
    return entries.filter((item) => {
      return (
        item.word.toLowerCase().includes(q) ||
        item.pinyin.toLowerCase().includes(q) ||
        item.definition.toLowerCase().includes(q) ||
        (item.etymology && item.etymology.toLowerCase().includes(q)) ||
        item.tags.some((t) => t.toLowerCase().includes(q)) ||
        item.exampleSentences.some((s) => s.toLowerCase().includes(q))
      );
    });
  }

  // GET /api/ciku/entries/:id
  static async getEntryById(id: string): Promise<CikuEntry | null> {
    try {
      const res = await fetch(`/api/ciku/entries/${id}`);
      if (res.ok) return await res.json();
    } catch (e) {
      // Fallback
    }
    const entries = getStoredEntries();
    return entries.find((e) => e.id === id) || null;
  }

  // POST /api/ciku/personal
  static async createPersonalEntry(payload: Omit<CikuEntry, 'id' | 'lastUsedTime' | 'isSynced'>): Promise<CikuEntry> {
    const newEntry: CikuEntry = {
      ...payload,
      id: `entry-${Date.now()}`,
      lastUsedTime: '刚刚',
      isSynced: true,
      category: 'PERSONAL',
      sourceLibrary: '我的个人词库'
    };

    try {
      const res = await fetch('/api/ciku/personal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer gyenbox_bearer_token_demo'
        },
        body: JSON.stringify(newEntry)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      // Fallback
    }

    const entries = getStoredEntries();
    const updated = [newEntry, ...entries];
    saveStoredEntries(updated);
    return newEntry;
  }

  // PUT /api/ciku/personal/:id
  static async updatePersonalEntry(id: string, updates: Partial<CikuEntry>): Promise<CikuEntry> {
    const entries = getStoredEntries();
    const idx = entries.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error('Entry not found');

    const updated = { ...entries[idx], ...updates, lastUsedTime: '刚刚' };
    entries[idx] = updated;

    try {
      await fetch(`/api/ciku/personal/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer gyenbox_bearer_token_demo'
        },
        body: JSON.stringify(updates)
      });
    } catch (e) {
      // Fallback
    }

    saveStoredEntries(entries);
    return updated;
  }

  // DELETE /api/ciku/personal/:id
  static async deletePersonalEntry(id: string): Promise<boolean> {
    const entries = getStoredEntries();
    const filtered = entries.filter((e) => e.id !== id);

    try {
      await fetch(`/api/ciku/personal/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer gyenbox_bearer_token_demo'
        }
      });
    } catch (e) {
      // Fallback
    }

    saveStoredEntries(filtered);
    return true;
  }

  // GET /api/ciku/frequency
  static async getFrequencyStats(): Promise<FrequencyStats> {
    try {
      const res = await fetch('/api/ciku/frequency');
      if (res.ok) return await res.json();
    } catch (e) {
      // Fallback
    }

    const entries = getStoredEntries();
    return {
      onceCount: entries.filter((e) => e.level === 'ONCE').length,
      memoryCount: entries.filter((e) => e.level === 'MEMORY').length,
      highCount: entries.filter((e) => e.level === 'HIGH').length,
      fixedCount: entries.filter((e) => e.level === 'FIXED').length,
      totalCount: entries.length
    };
  }

  // Submit to public pending
  static async submitPublicEntry(term: { word: string; pinyin: string; pos: string; definition: string; category: any }): Promise<PendingSubmission> {
    const newSub: PendingSubmission = {
      id: `sub-${Date.now()}`,
      word: term.word,
      pinyin: term.pinyin,
      pos: term.pos,
      definition: term.definition,
      category: term.category || 'TECH',
      submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'PENDING'
    };

    const current = getStoredSubmissions();
    const updated = [newSub, ...current];
    saveStoredSubmissions(updated);
    return newSub;
  }

  static getSubmissions(): PendingSubmission[] {
    return getStoredSubmissions();
  }

  // Keep cards
  static addToKeep(entry: CikuEntry): KeepCard {
    const cards = getStoredKeepCards();
    const newCard: KeepCard = {
      id: `keep-${Date.now()}`,
      entryId: entry.id,
      word: entry.word,
      pinyin: entry.pinyin,
      definition: entry.definition,
      createdAt: new Date().toISOString(),
      nextReviewAt: '明早 09:00 (根据艾宾浩斯记忆曲线)'
    };
    saveStoredKeepCards([newCard, ...cards]);
    return newCard;
  }

  static getKeepCards(): KeepCard[] {
    return getStoredKeepCards();
  }

  // Import preview calculation
  static parseImportFile(content: string, fileName: string): ImportPreviewResult {
    const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
    const existing = getStoredEntries();
    const existingWords = new Set(existing.map((e) => e.word));

    let newCount = 0;
    let duplicateCount = 0;
    let conflictCount = 0;
    let invalidCount = 0;
    const sampleEntries: Partial<CikuEntry>[] = [];

    lines.forEach((line, idx) => {
      // Basic line parsing (word pinyin [pos] [definition])
      const parts = line.split(/[\t,,\s]+/);
      if (parts.length < 1 || line.length < 2) {
        invalidCount++;
        return;
      }

      const word = parts[0];
      const pinyin = parts[1] || '';
      if (!/^[\u4e00-\u9fa5]+$/.test(word)) {
        invalidCount++;
        return;
      }

      if (existingWords.has(word)) {
        duplicateCount++;
        if (Math.random() > 0.6) conflictCount++;
      } else {
        newCount++;
      }

      if (sampleEntries.length < 5) {
        sampleEntries.push({
          word,
          pinyin: pinyin || 'pinyin',
          category: 'PERSONAL',
          sourceLibrary: '导入词库'
        });
      }
    });

    return {
      fileName,
      format: fileName.endsWith('.json') ? 'JSON' : fileName.endsWith('.csv') ? 'CSV' : 'TXT',
      totalParsed: lines.length,
      newCount: Math.max(0, newCount),
      duplicateCount,
      conflictCount,
      invalidCount,
      sampleEntries
    };
  }

  // Perform import
  static executeImport(preview: ImportPreviewResult): number {
    const existing = getStoredEntries();
    const existingWords = new Set(existing.map((e) => e.word));
    let added = 0;

    preview.sampleEntries.forEach((s) => {
      if (s.word && !existingWords.has(s.word)) {
        existing.unshift({
          id: `imp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          word: s.word,
          pinyin: s.pinyin || 'pinyin',
          pos: 'n. 导入词库',
          definition: '从用户外部词库导入的专属词条',
          exampleSentences: [],
          relatedTerms: [],
          usageCount: 1,
          lastUsedTime: '刚刚导入',
          category: 'PERSONAL',
          sourceLibrary: '我的个人词库',
          level: 'MEMORY',
          isFavorited: false,
          isPinned: false,
          isSynced: true,
          tags: ['导入', '个人'],
          trend7d: 0,
          trend30d: 0
        });
        existingWords.add(s.word);
        added++;
      }
    });

    saveStoredEntries(existing);
    return added;
  }

  static getSyncStatus(): SyncStatus {
    return INITIAL_SYNC_STATUS;
  }
}
