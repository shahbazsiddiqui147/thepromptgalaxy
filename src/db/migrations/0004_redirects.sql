CREATE TABLE redirects (
  id bigserial PRIMARY KEY,
  from_path text NOT NULL UNIQUE,
  to_path text NOT NULL,
  status_code integer NOT NULL DEFAULT 301 CHECK (status_code IN (301, 302)),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_path <> to_path)
);
