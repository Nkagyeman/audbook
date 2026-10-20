import Dexie, { type Table } from 'dexie';
import { Book, Chapter, Bookmark, Highlight, AudioCacheEntry, UserSettings } from './types';

export class AudbookDatabase extends Dexie {
  books!: Table<Book, string>;
  chapters!: Table<Chapter, string>;
  bookmarks!: Table<Bookmark, string>;
  highlights!: Table<Highlight, string>;
  audioCache!: Table<AudioCacheEntry, string>;
  settings!: Table<UserSettings, string>;

  constructor() {
    super('audbook_db');

    this.version(1).stores({
      books: 'id, title, author, status, readingProgress, lastReadAt, createdAt',
      chapters: 'id, bookId, order, [bookId+order]',
      bookmarks: 'id, bookId, chapterIndex, createdAt',
      highlights: 'id, bookId, chapterIndex, createdAt',
      audioCache: 'id, bookId, chapterIndex, voiceId',
      settings: 'id'
    });
  }
}

export const db = new AudbookDatabase();

export const DEFAULT_SETTINGS: UserSettings = {
  id: 'user_settings',
  theme: 'light',
  fontFamily: 'literata',
  fontSize: 18,
  lineHeight: 1.75,
  columnWidth: 'standard',
  textAlign: 'left',
  ttsProvider: 'browser',
  elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel
  openAiVoice: 'alloy',
  playbackSpeed: 1.0,
  pitch: 1.0,
  autoScroll: true,
  highlightMode: 'both',
};

export async function getStoredSettings(): Promise<UserSettings> {
  try {
    const existing = await db.settings.get('user_settings');
    if (existing) {
      return { ...DEFAULT_SETTINGS, ...existing };
    }
    await db.settings.put(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  } catch (err) {
    console.error('Failed to get stored settings:', err);
    return DEFAULT_SETTINGS;
  }
}

export async function saveStoredSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
  const current = await getStoredSettings();
  const updated: UserSettings = { ...current, ...settings };
  await db.settings.put(updated);
  return updated;
}
