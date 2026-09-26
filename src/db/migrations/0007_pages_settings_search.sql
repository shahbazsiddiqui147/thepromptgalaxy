CREATE TABLE pages (
  id bigserial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  is_published boolean NOT NULL DEFAULT false,
  show_in_footer boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  seo_title text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE site_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Full-text search over what a visitor can see for free. The prompt text is left out on purpose so premium
-- prompts cannot be found by searching for words that only appear in their locked text.
ALTER TABLE prompts ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A')
  || setweight(to_tsvector('english', coalesce(summary, '')), 'B')
  || setweight(to_tsvector('english', coalesce(quick_answer, '')), 'C')
) STORED;
CREATE INDEX prompts_search_idx ON prompts USING gin (search_vector);
