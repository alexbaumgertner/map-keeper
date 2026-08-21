import { pgEnum, pgTable, text, timestamp, uuid, bigint, integer, boolean, jsonb, numeric, date, uniqueIndex } from 'drizzle-orm/pg-core';

export const attributeSourceEnum = pgEnum('attribute_source', [
  'owner',
  'survey',
  'website',
  'overture',
  'alltheplaces',
  'foursquare_os',
  'government',
  'gbp',
  'local_knowledge',
]);

export const businessStatusEnum = pgEnum('business_status', [
  'draft',
  'published',
  'unlinked',
  'archived',
]);

export const placeLinkStatusEnum = pgEnum('place_link_status', [
  'draft',
  'active',
  'broken',
  'pending_relink',
]);

export const changeTypeEnum = pgEnum('change_type', [
  'tag_edit',
  'relocation',
  'deletion',
  'type_change',
  'confirmed_conflict',
]);

export const notificationKindEnum = pgEnum('notification_kind', [
  'change_digest',
  'freshness',
  'email_unavailable',
]);

export const notificationStatusEnum = pgEnum('notification_status', [
  'queued',
  'sent',
  'skipped_no_email',
  'failed',
]);

export const verticalEnum = pgEnum('vertical', ['food_drink', 'accommodation', 'other']);

export const ALLOWED_ATTRIBUTE_SOURCES = attributeSourceEnum.enumValues;
export const FORBIDDEN_SOURCES = ['google'] as const;

export function assertAllowlistedSource(source: string): asserts source is (typeof ALLOWED_ATTRIBUTE_SOURCES)[number] {
  if ((FORBIDDEN_SOURCES as readonly string[]).includes(source)) {
    throw new Error(`Prohibited source: ${source}`);
  }
  if (!(ALLOWED_ATTRIBUTE_SOURCES as readonly string[]).includes(source)) {
    throw new Error(`Source not on allowlist: ${source}`);
  }
}

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  osmUserId: bigint('osm_user_id', { mode: 'number' }).notNull().unique(),
  osmDisplayName: text('osm_display_name').notNull(),
  osmEmail: text('osm_email'),
  emailUsable: boolean('email_usable').notNull().default(false),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  notificationPrefs: jsonb('notification_prefs').$type<{ digest: boolean; freshness: boolean }>().default({
    digest: true,
    freshness: true,
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const chains = pgTable('chains', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandWikidata: text('brand_wikidata'),
  nsiId: text('nsi_id'),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const businesses = pgTable('businesses', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerUserId: uuid('owner_user_id')
    .notNull()
    .references(() => users.id),
  vertical: verticalEnum('vertical').notNull().default('other'),
  status: businessStatusEnum('status').notNull().default('draft'),
  displayName: text('display_name').notNull(),
  chainId: uuid('chain_id').references(() => chains.id),
  lastFreshnessAt: timestamp('last_freshness_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const placeLinks = pgTable(
  'place_links',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id)
      .unique(),
    osmType: text('osm_type'),
    osmId: bigint('osm_id', { mode: 'number' }),
    osmVersion: integer('osm_version'),
    lon: numeric('lon'),
    lat: numeric('lat'),
    fingerprint: jsonb('fingerprint').$type<{
      name?: string;
      brand?: string;
      address?: string;
      phone?: string;
    }>(),
    status: placeLinkStatusEnum('status').notNull().default('draft'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('place_links_osm_idx').on(t.osmType, t.osmId)],
);

export const attributes = pgTable(
  'attributes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    key: text('key').notNull(),
    value: text('value').notNull(),
    source: attributeSourceEnum('source').notNull(),
    confidence: numeric('confidence'),
    confirmedByUserId: uuid('confirmed_by_user_id').references(() => users.id),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('attributes_business_key_idx').on(t.businessId, t.key)],
);

export const candidates = pgTable('candidates', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id')
    .notNull()
    .references(() => businesses.id),
  source: attributeSourceEnum('source').notNull(),
  externalId: text('external_id'),
  payload: jsonb('payload').$type<Record<string, string>>().notNull(),
  confidence: numeric('confidence'),
  status: text('status').notNull().default('proposed'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const changeEvents = pgTable('change_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  placeLinkId: uuid('place_link_id')
    .notNull()
    .references(() => placeLinks.id),
  businessId: uuid('business_id')
    .notNull()
    .references(() => businesses.id),
  changeType: changeTypeEnum('change_type').notNull(),
  fromVersion: integer('from_version'),
  toVersion: integer('to_version'),
  changesetId: bigint('changeset_id', { mode: 'number' }),
  authorOsmUser: text('author_osm_user'),
  diffSummary: jsonb('diff_summary'),
  detectedAt: timestamp('detected_at', { withTimezone: true }).defaultNow().notNull(),
  notifiedIn: uuid('notified_in'),
});

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    kind: notificationKindEnum('kind').notNull(),
    status: notificationStatusEnum('status').notNull().default('queued'),
    payload: jsonb('payload'),
    digestDay: date('digest_day'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('notifications_digest_day_idx').on(t.userId, t.kind, t.digestDay)],
);

export const relinkProposals = pgTable('relink_proposals', {
  id: uuid('id').defaultRandom().primaryKey(),
  placeLinkId: uuid('place_link_id')
    .notNull()
    .references(() => placeLinks.id),
  candidateOsmType: text('candidate_osm_type').notNull(),
  candidateOsmId: bigint('candidate_osm_id', { mode: 'number' }).notNull(),
  score: numeric('score').notNull(),
  evidence: jsonb('evidence'),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
});
