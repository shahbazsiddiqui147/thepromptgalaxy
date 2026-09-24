CREATE TABLE prompts (
  id bigserial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  category_id bigint NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  prompt_text text NOT NULL DEFAULT '',
  is_chain boolean NOT NULL DEFAULT false,
  is_premium boolean NOT NULL DEFAULT false,
  reference_required boolean NOT NULL DEFAULT false,
  reference_note text NOT NULL DEFAULT '',
  article_html text NOT NULL DEFAULT '',
  quick_answer text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'published', 'rejected', 'archived')),
  rejection_reason text NOT NULL DEFAULT '',
  author_id bigint REFERENCES users (id) ON DELETE SET NULL,
  reviewed_by bigint REFERENCES users (id) ON DELETE SET NULL,
  published_at timestamptz,
  save_count integer NOT NULL DEFAULT 0,
  seo_title text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, category_id)
);
CREATE INDEX prompts_status_idx ON prompts (status);
CREATE INDEX prompts_category_idx ON prompts (category_id);

-- A prompt may only use tools that are valid for its category. The composite foreign keys make the
-- database enforce it, including when the category of the prompt changes (ON UPDATE CASCADE re-checks the pair).
CREATE TABLE prompt_tools (
  prompt_id bigint NOT NULL,
  category_id bigint NOT NULL,
  tool_id bigint NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  fit text NOT NULL DEFAULT 'good' CHECK (fit IN ('great', 'good')),
  PRIMARY KEY (prompt_id, tool_id),
  FOREIGN KEY (prompt_id, category_id) REFERENCES prompts (id, category_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (category_id, tool_id) REFERENCES category_tools (category_id, tool_id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX prompt_tools_one_primary_idx ON prompt_tools (prompt_id) WHERE is_primary;
CREATE INDEX prompt_tools_tool_idx ON prompt_tools (tool_id);

CREATE TABLE prompt_styles (
  prompt_id bigint NOT NULL,
  category_id bigint NOT NULL,
  style_id bigint NOT NULL,
  PRIMARY KEY (prompt_id, style_id),
  FOREIGN KEY (prompt_id, category_id) REFERENCES prompts (id, category_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (category_id, style_id) REFERENCES category_styles (category_id, style_id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX prompt_styles_style_idx ON prompt_styles (style_id);

-- Rule: styles can only be linked to categories that support styles.
CREATE FUNCTION enforce_category_supports_styles() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM categories WHERE id = NEW.category_id AND supports_styles) THEN
    RAISE EXCEPTION 'This category does not support styles' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER category_styles_supported BEFORE INSERT OR UPDATE ON category_styles
  FOR EACH ROW EXECUTE FUNCTION enforce_category_supports_styles();
CREATE TRIGGER prompt_styles_supported BEFORE INSERT OR UPDATE ON prompt_styles
  FOR EACH ROW EXECUTE FUNCTION enforce_category_supports_styles();

-- Rule: styles cannot be switched off for a category while prompts in it still use styles.
CREATE FUNCTION forbid_disabling_styles_in_use() RETURNS trigger AS $$
BEGIN
  IF OLD.supports_styles AND NOT NEW.supports_styles
     AND EXISTS (SELECT 1 FROM prompt_styles WHERE category_id = NEW.id) THEN
    RAISE EXCEPTION 'Cannot turn off styles: prompts in this category still use styles' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER categories_styles_in_use BEFORE UPDATE OF supports_styles ON categories
  FOR EACH ROW EXECUTE FUNCTION forbid_disabling_styles_in_use();
