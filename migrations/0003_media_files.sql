PRAGMA foreign_keys = ON;

CREATE TABLE media_files (
  id TEXT PRIMARY KEY NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  original_filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  storage_provider TEXT NOT NULL CHECK (storage_provider IN ('local', 'b2')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'recoverable', 'failed')),
  exercise_id TEXT,
  song_id TEXT,
  slot TEXT NOT NULL CHECK (slot IN ('plus', 'minus', 'backing')),
  replaces_media_id TEXT,
  created_at TEXT NOT NULL,
  verified_at TEXT,
  CHECK (
    (exercise_id IS NOT NULL AND song_id IS NULL AND slot IN ('plus', 'minus')) OR
    (exercise_id IS NULL AND song_id IS NOT NULL AND slot = 'backing')
  ),
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
  FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
  FOREIGN KEY (replaces_media_id) REFERENCES media_files(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX media_active_exercise_slot_idx
  ON media_files(exercise_id, slot)
  WHERE status = 'active' AND exercise_id IS NOT NULL;

CREATE UNIQUE INDEX media_active_song_slot_idx
  ON media_files(song_id, slot)
  WHERE status = 'active' AND song_id IS NOT NULL;

CREATE INDEX media_exercise_versions_idx
  ON media_files(exercise_id, slot, created_at DESC);

CREATE INDEX media_song_versions_idx
  ON media_files(song_id, slot, created_at DESC);
