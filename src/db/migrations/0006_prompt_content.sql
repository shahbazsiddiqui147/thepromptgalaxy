CREATE TABLE prompt_steps (
  prompt_id bigint NOT NULL REFERENCES prompts (id) ON DELETE CASCADE,
  position integer NOT NULL,
  label text NOT NULL DEFAULT '',
  text text NOT NULL,
  example_media_id bigint REFERENCES media (id) ON DELETE SET NULL,
  PRIMARY KEY (prompt_id, position)
);
CREATE INDEX prompt_steps_media_idx ON prompt_steps (example_media_id);

CREATE TABLE prompt_faqs (
  prompt_id bigint NOT NULL REFERENCES prompts (id) ON DELETE CASCADE,
  position integer NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  PRIMARY KEY (prompt_id, position)
);

CREATE TABLE similar_prompts (
  prompt_id bigint NOT NULL REFERENCES prompts (id) ON DELETE CASCADE,
  similar_id bigint NOT NULL REFERENCES prompts (id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (prompt_id, similar_id),
  CHECK (prompt_id <> similar_id)
);
