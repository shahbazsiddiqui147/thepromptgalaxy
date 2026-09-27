-- A short, plain-text answer admins can write specifically for AI/answer engines to quote
-- (separate from the human-facing summary and quick answer).
ALTER TABLE prompts ADD COLUMN ai_answer text NOT NULL DEFAULT '';
ALTER TABLE pages ADD COLUMN ai_answer text NOT NULL DEFAULT '';

-- Recreate the search index: quick_answer can now hold simple HTML from the rich-text editor,
-- so its tags are stripped before indexing, and ai_answer is folded in at the same weight.
DROP INDEX prompts_search_idx;
ALTER TABLE prompts DROP COLUMN search_vector;
ALTER TABLE prompts ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A')
  || setweight(to_tsvector('english', coalesce(summary, '')), 'B')
  || setweight(to_tsvector('english',
       coalesce(regexp_replace(quick_answer, '<[^>]+>', ' ', 'g'), '') || ' ' || coalesce(ai_answer, '')), 'C')
) STORED;
CREATE INDEX prompts_search_idx ON prompts USING gin (search_vector);
