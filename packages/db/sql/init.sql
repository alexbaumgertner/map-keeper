-- Idempotent bootstrap for Mapkeeper core tables (Neon/Postgres).

DO $$ BEGIN
  CREATE TYPE attribute_source AS ENUM (
    'owner', 'survey', 'website', 'overture', 'alltheplaces',
    'foursquare_os', 'government', 'gbp', 'local_knowledge'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE business_status AS ENUM ('draft', 'published', 'unlinked', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE place_link_status AS ENUM ('draft', 'active', 'broken', 'pending_relink');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE change_type AS ENUM (
    'tag_edit', 'relocation', 'deletion', 'type_change', 'confirmed_conflict'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_kind AS ENUM ('change_digest', 'freshness', 'email_unavailable');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_status AS ENUM ('queued', 'sent', 'skipped_no_email', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vertical AS ENUM ('food_drink', 'accommodation', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  osm_user_id bigint NOT NULL UNIQUE,
  osm_display_name text NOT NULL,
  osm_email text,
  email_usable boolean NOT NULL DEFAULT false,
  access_token text,
  refresh_token text,
  notification_prefs jsonb DEFAULT '{"digest": true, "freshness": true}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_wikidata text,
  nsi_id text,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id),
  vertical vertical NOT NULL DEFAULT 'other',
  status business_status NOT NULL DEFAULT 'draft',
  display_name text NOT NULL,
  chain_id uuid REFERENCES chains(id),
  last_freshness_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS place_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES businesses(id),
  osm_type text,
  osm_id bigint,
  osm_version integer,
  lon numeric,
  lat numeric,
  fingerprint jsonb,
  status place_link_status NOT NULL DEFAULT 'draft',
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP INDEX IF EXISTS place_links_osm_idx;
CREATE INDEX IF NOT EXISTS place_links_osm_idx ON place_links (osm_type, osm_id);

CREATE TABLE IF NOT EXISTS attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id),
  key text NOT NULL,
  value text NOT NULL,
  source attribute_source NOT NULL,
  confidence numeric,
  confirmed_by_user_id uuid REFERENCES users(id),
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, key)
);

CREATE TABLE IF NOT EXISTS candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id),
  source attribute_source NOT NULL,
  external_id text,
  payload jsonb NOT NULL,
  confidence numeric,
  status text NOT NULL DEFAULT 'proposed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS change_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_link_id uuid NOT NULL REFERENCES place_links(id),
  business_id uuid NOT NULL REFERENCES businesses(id),
  change_type change_type NOT NULL,
  from_version integer,
  to_version integer,
  changeset_id bigint,
  author_osm_user text,
  diff_summary jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  notified_in uuid
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  kind notification_kind NOT NULL,
  status notification_status NOT NULL DEFAULT 'queued',
  payload jsonb,
  digest_day date,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS relink_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_link_id uuid NOT NULL REFERENCES place_links(id),
  candidate_osm_type text NOT NULL,
  candidate_osm_id bigint NOT NULL,
  score numeric NOT NULL,
  evidence jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
