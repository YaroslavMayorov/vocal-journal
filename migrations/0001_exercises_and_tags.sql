PRAGMA foreign_keys = ON;

CREATE TABLE exercises (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  notes TEXT NOT NULL DEFAULT '',
  plus_media_id TEXT,
  minus_media_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE tags (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  normalized_name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE exercise_tags (
  exercise_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (exercise_id, tag_id),
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX exercises_title_idx ON exercises(title COLLATE NOCASE);
CREATE INDEX tags_name_idx ON tags(name COLLATE NOCASE);
CREATE INDEX exercise_tags_tag_idx ON exercise_tags(tag_id);
