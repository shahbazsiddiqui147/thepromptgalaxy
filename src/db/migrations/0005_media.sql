CREATE TABLE media (
  id bigserial PRIMARY KEY,
  original_name text NOT NULL,
  -- Directory under the uploads dir, e.g. 2026-09/3f9c...; holds original.<ext>, card.webp and thumb.webp.
  dir text NOT NULL UNIQUE,
  mime text NOT NULL,
  ext text NOT NULL,
  size_bytes integer NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  alt text NOT NULL DEFAULT '',
  created_by bigint REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE prompts ADD COLUMN example_media_id bigint REFERENCES media (id) ON DELETE SET NULL;
CREATE INDEX prompts_example_media_idx ON prompts (example_media_id);
