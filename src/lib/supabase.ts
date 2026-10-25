import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    !supabaseUrl.includes('placeholder') &&
    !supabaseAnonKey.includes('placeholder')
  );
};

// Create a singleton Supabase client
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export interface CloudBookProgress {
  user_id?: string;
  book_id: string;
  current_chapter_index: number;
  current_paragraph_index: number;
  current_word_index: number;
  current_audio_timestamp: number;
  reading_progress: number;
  last_read_at: number;
  updated_at?: string;
}

/**
 * Pushes reading/listening progress to Supabase
 */
export async function pushProgressToCloud(progress: Omit<CloudBookProgress, 'user_id' | 'updated_at'>): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured()) return false;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('user_book_progress')
      .upsert({
        user_id: user.id,
        book_id: progress.book_id,
        current_chapter_index: progress.current_chapter_index,
        current_paragraph_index: progress.current_paragraph_index,
        current_word_index: progress.current_word_index,
        current_audio_timestamp: progress.current_audio_timestamp,
        reading_progress: progress.reading_progress,
        last_read_at: progress.last_read_at,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,book_id'
      });

    if (error) {
      console.warn('Supabase progress push error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Failed to push progress to cloud:', err);
    return false;
  }
}

/**
 * Fetches the latest reading progress for a specific book from Supabase
 */
export async function fetchProgressFromCloud(bookId: string): Promise<CloudBookProgress | null> {
  if (!supabase || !isSupabaseConfigured()) return null;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_book_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      book_id: data.book_id,
      current_chapter_index: data.current_chapter_index,
      current_paragraph_index: data.current_paragraph_index,
      current_word_index: data.current_word_index,
      current_audio_timestamp: data.current_audio_timestamp,
      reading_progress: data.reading_progress,
      last_read_at: data.last_read_at,
    };
  } catch (err) {
    console.warn('Failed to fetch progress from cloud:', err);
    return null;
  }
}

/**
 * Fetches all book progress for the logged-in user (useful on library load)
 */
export async function fetchAllProgressFromCloud(): Promise<Record<string, CloudBookProgress>> {
  if (!supabase || !isSupabaseConfigured()) return {};

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    const { data, error } = await supabase
      .from('user_book_progress')
      .select('*')
      .eq('user_id', user.id);

    if (error || !data) return {};

    const progressMap: Record<string, CloudBookProgress> = {};
    for (const item of data) {
      progressMap[item.book_id] = {
        book_id: item.book_id,
        current_chapter_index: item.current_chapter_index,
        current_paragraph_index: item.current_paragraph_index,
        current_word_index: item.current_word_index,
        current_audio_timestamp: item.current_audio_timestamp,
        reading_progress: item.reading_progress,
        last_read_at: item.last_read_at,
      };
    }
    return progressMap;
  } catch (err) {
    console.warn('Failed to fetch all progress from cloud:', err);
    return {};
  }
}
