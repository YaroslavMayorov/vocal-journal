PRAGMA foreign_keys = ON;

CREATE TABLE songs (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  artist TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'learning'
    CHECK (status IN ('learning', 'learned', 'postponed')),
  youtube_url TEXT,
  minus_media_id TEXT,
  lyrics_document TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE lyrics_comments (
  id TEXT PRIMARY KEY NOT NULL,
  song_id TEXT NOT NULL,
  text TEXT NOT NULL CHECK (length(trim(text)) > 0),
  quoted_text TEXT NOT NULL CHECK (length(quoted_text) > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
);

CREATE INDEX songs_created_idx ON songs(created_at, id);
CREATE INDEX lyrics_comments_song_idx ON lyrics_comments(song_id, created_at, id);
