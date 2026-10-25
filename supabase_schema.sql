-- ==============================================================================
-- Audbook: Supabase Realtime Cross-Device Sync Schema
-- Run this in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Create table for reading & listening progress
create table if not exists public.user_book_progress (
  user_id uuid references auth.users(id) on delete cascade not null,
  book_id text not null,
  current_chapter_index int not null default 0,
  current_paragraph_index int not null default 0,
  current_word_index int not null default 0,
  current_audio_timestamp double precision not null default 0,
  reading_progress int not null default 0,
  last_read_at bigint not null default extract(epoch from now()) * 1000,
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

-- 2. Create index for fast lookups
create index if not exists idx_user_book_progress_user on public.user_book_progress(user_id);

-- 3. Enable Row Level Security (RLS)
alter table public.user_book_progress enable row level security;

-- 4. RLS Policies: users can only view, insert, update, or delete their own progress
create policy "Users can view own book progress"
  on public.user_book_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own book progress"
  on public.user_book_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own book progress"
  on public.user_book_progress for update
  using (auth.uid() = user_id);

create policy "Users can delete own book progress"
  on public.user_book_progress for delete
  using (auth.uid() = user_id);

-- 5. Enable Realtime updates (so progress syncs instantly between open phone & laptop)
alter publication supabase_realtime add table public.user_book_progress;

-- (Optional) 6. User Bookmarks Table for cross-device bookmark sync
create table if not exists public.user_bookmarks (
  id text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  book_id text not null,
  chapter_index int not null,
  chapter_title text not null,
  paragraph_index int not null,
  snippet text,
  created_at bigint not null,
  primary key (user_id, id)
);

alter table public.user_bookmarks enable row level security;

create policy "Users can manage own bookmarks"
  on public.user_bookmarks for all
  using (auth.uid() = user_id);
