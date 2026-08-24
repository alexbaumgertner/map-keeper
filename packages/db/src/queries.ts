import { and, desc, eq } from 'drizzle-orm';
import type { Db } from './client';
import { attributes, businesses, placeLinks, users } from './schema/index';

export type ApiVertical = 'food_drink' | 'accommodation' | 'other';
export type DbVertical = 'food_drink' | 'accommodation' | 'other';

export type WatchedPlace = {
  id: string;
  ownerUserId: string;
  vertical: ApiVertical;
  status: string;
  displayName: string;
  properName?: string;
  businessType?: string;
  externalPageUrl?: string;
  osmType?: string;
  osmId?: number;
  osmVersion?: number;
  lat?: number;
  lon?: number;
  fingerprint?: {
    name?: string;
    brand?: string;
    address?: string;
    phone?: string;
  };
  linkStatus: string;
};

export type UpsertUserInput = {
  osmUserId: number;
  displayName: string;
  email?: string;
  emailUsable: boolean;
  accessToken?: string;
};

function toDbVertical(vertical: ApiVertical): DbVertical {
  return vertical === 'food_drink' ? 'food_drink' : vertical;
}

function toApiVertical(vertical: DbVertical): ApiVertical {
  return vertical === 'food_drink' ? 'food_drink' : vertical;
}

function toNumber(value: string | number | null | undefined): number | undefined {
  if (value == null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function mapPlace(
  business: typeof businesses.$inferSelect,
  link: typeof placeLinks.$inferSelect | null,
  attrs?: { properName?: string; businessType?: string; externalPageUrl?: string },
): WatchedPlace {
  return {
    id: business.id,
    ownerUserId: business.ownerUserId,
    vertical: toApiVertical(business.vertical),
    status: business.status,
    displayName: business.displayName,
    properName: attrs?.properName,
    businessType: attrs?.businessType,
    externalPageUrl: attrs?.externalPageUrl,
    osmType: link?.osmType ?? undefined,
    osmId: link?.osmId ?? undefined,
    osmVersion: link?.osmVersion ?? undefined,
    lat: toNumber(link?.lat),
    lon: toNumber(link?.lon),
    fingerprint: link?.fingerprint ?? undefined,
    linkStatus: link?.status ?? 'draft',
  };
}

async function loadDraftAttrs(
  db: Db,
  businessId: string,
): Promise<{ properName?: string; businessType?: string; externalPageUrl?: string }> {
  const rows = await db.select().from(attributes).where(eq(attributes.businessId, businessId));
  const out: { properName?: string; businessType?: string; externalPageUrl?: string } = {};
  for (const row of rows) {
    if (row.key === 'name') out.properName = row.value;
    if (row.key === 'business_type') out.businessType = row.value;
    if (row.key === 'external_page_url') out.externalPageUrl = row.value;
  }
  return out;
}

async function upsertOwnerAttr(db: Db, businessId: string, key: string, value: string | undefined) {
  if (value == null || value === '') {
    await db.delete(attributes).where(and(eq(attributes.businessId, businessId), eq(attributes.key, key)));
    return;
  }
  await db
    .insert(attributes)
    .values({
      businessId,
      key,
      value,
      source: 'owner',
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [attributes.businessId, attributes.key],
      set: { value, source: 'owner', updatedAt: new Date() },
    });
}

export async function upsertUser(db: Db, input: UpsertUserInput) {
  const [row] = await db
    .insert(users)
    .values({
      osmUserId: input.osmUserId,
      osmDisplayName: input.displayName,
      osmEmail: input.email,
      emailUsable: input.emailUsable,
      accessToken: input.accessToken,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: users.osmUserId,
      set: {
        osmDisplayName: input.displayName,
        osmEmail: input.email,
        emailUsable: input.emailUsable,
        accessToken: input.accessToken,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}

export async function listWatchedPlaces(db: Db, ownerUserId: string): Promise<WatchedPlace[]> {
  const rows = await db
    .select({ business: businesses, link: placeLinks })
    .from(businesses)
    .leftJoin(placeLinks, eq(placeLinks.businessId, businesses.id))
    .where(eq(businesses.ownerUserId, ownerUserId))
    .orderBy(desc(businesses.createdAt));
  return Promise.all(
    rows.map(async (row) => mapPlace(row.business, row.link, await loadDraftAttrs(db, row.business.id))),
  );
}

export async function getPlaceById(db: Db, id: string): Promise<WatchedPlace | undefined> {
  const [row] = await db
    .select({ business: businesses, link: placeLinks })
    .from(businesses)
    .leftJoin(placeLinks, eq(placeLinks.businessId, businesses.id))
    .where(eq(businesses.id, id))
    .limit(1);
  if (!row) return undefined;
  return mapPlace(row.business, row.link, await loadDraftAttrs(db, id));
}

export async function findClaimedPlace(
  db: Db,
  ownerUserId: string,
  osmType: string,
  osmId: number,
): Promise<WatchedPlace | undefined> {
  const [row] = await db
    .select({ business: businesses, link: placeLinks })
    .from(businesses)
    .innerJoin(placeLinks, eq(placeLinks.businessId, businesses.id))
    .where(
      and(
        eq(businesses.ownerUserId, ownerUserId),
        eq(placeLinks.osmType, osmType),
        eq(placeLinks.osmId, osmId),
      ),
    )
    .limit(1);
  return row ? mapPlace(row.business, row.link) : undefined;
}

export type DraftPlaceInput = {
  ownerUserId: string;
  vertical?: ApiVertical;
  displayName?: string;
  properName?: string;
  businessType?: string;
  externalPageUrl?: string;
  lat?: number;
  lon?: number;
};

function draftDisplayName(input: {
  displayName?: string;
  properName?: string;
}): string {
  const name = input.displayName?.trim() || input.properName?.trim();
  return name && name.length > 0 ? name : 'Untitled draft';
}

export async function insertDraftPlace(db: Db, input: DraftPlaceInput): Promise<WatchedPlace> {
  return db.transaction(async (tx) => {
    const [business] = await tx
      .insert(businesses)
      .values({
        ownerUserId: input.ownerUserId,
        vertical: toDbVertical(input.vertical ?? 'accommodation'),
        status: 'draft',
        displayName: draftDisplayName(input),
      })
      .returning();
    const [link] = await tx
      .insert(placeLinks)
      .values({
        businessId: business.id,
        lat: input.lat != null ? String(input.lat) : null,
        lon: input.lon != null ? String(input.lon) : null,
        status: 'draft',
      })
      .returning();
    await upsertOwnerAttr(tx as unknown as Db, business.id, 'name', input.properName);
    await upsertOwnerAttr(tx as unknown as Db, business.id, 'business_type', input.businessType);
    await upsertOwnerAttr(tx as unknown as Db, business.id, 'external_page_url', input.externalPageUrl);
    return mapPlace(business, link, {
      properName: input.properName,
      businessType: input.businessType,
      externalPageUrl: input.externalPageUrl,
    });
  });
}

export async function updateDraftPlace(
  db: Db,
  id: string,
  input: Omit<DraftPlaceInput, 'ownerUserId'>,
): Promise<WatchedPlace | undefined> {
  const current = await getPlaceById(db, id);
  if (!current) return undefined;

  const displayName =
    input.displayName !== undefined || input.properName !== undefined
      ? draftDisplayName({ ...input, displayName: input.displayName ?? current.displayName, properName: input.properName ?? current.properName })
      : undefined;

  await db.transaction(async (tx) => {
    const businessSet: Partial<typeof businesses.$inferInsert> = { updatedAt: new Date() };
    if (input.vertical) businessSet.vertical = toDbVertical(input.vertical);
    if (displayName) businessSet.displayName = displayName;
    await tx.update(businesses).set(businessSet).where(eq(businesses.id, id));

    if (input.lat !== undefined || input.lon !== undefined) {
      await tx
        .update(placeLinks)
        .set({
          lat: input.lat !== undefined ? (input.lat != null ? String(input.lat) : null) : undefined,
          lon: input.lon !== undefined ? (input.lon != null ? String(input.lon) : null) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(placeLinks.businessId, id));
    }

    if (input.properName !== undefined) {
      await upsertOwnerAttr(tx as unknown as Db, id, 'name', input.properName);
    }
    if (input.businessType !== undefined) {
      await upsertOwnerAttr(tx as unknown as Db, id, 'business_type', input.businessType);
    }
    if (input.externalPageUrl !== undefined) {
      await upsertOwnerAttr(tx as unknown as Db, id, 'external_page_url', input.externalPageUrl);
    }
  });

  return getPlaceById(db, id);
}

export async function insertClaimedPlace(
  db: Db,
  input: {
    ownerUserId: string;
    vertical: ApiVertical;
    displayName: string;
    osmType: string;
    osmId: number;
    osmVersion?: number;
    lat?: number;
    lon?: number;
    fingerprint?: WatchedPlace['fingerprint'];
  },
): Promise<WatchedPlace> {
  const existing = await findClaimedPlace(db, input.ownerUserId, input.osmType, input.osmId);
  if (existing) return existing;

  return db.transaction(async (tx) => {
    const [business] = await tx
      .insert(businesses)
      .values({
        ownerUserId: input.ownerUserId,
        vertical: toDbVertical(input.vertical),
        status: 'published',
        displayName: input.displayName,
      })
      .returning();
    const [link] = await tx
      .insert(placeLinks)
      .values({
        businessId: business.id,
        osmType: input.osmType,
        osmId: input.osmId,
        osmVersion: input.osmVersion,
        lat: input.lat != null ? String(input.lat) : undefined,
        lon: input.lon != null ? String(input.lon) : undefined,
        fingerprint: input.fingerprint,
        status: 'active',
        lastSeenAt: new Date(),
      })
      .returning();
    return mapPlace(business, link);
  });
}

export async function recordPublishedPlace(
  db: Db,
  input: {
    id: string;
    osmType: string;
    osmId: number;
    osmVersion: number;
  },
): Promise<WatchedPlace | undefined> {
  const current = await getPlaceById(db, input.id);
  if (!current) return undefined;

  await db
    .update(businesses)
    .set({ status: 'published', updatedAt: new Date() })
    .where(eq(businesses.id, input.id));
  await db
    .update(placeLinks)
    .set({
      osmType: input.osmType,
      osmId: input.osmId,
      osmVersion: input.osmVersion,
      status: 'active',
      updatedAt: new Date(),
    })
    .where(eq(placeLinks.businessId, input.id));
  return getPlaceById(db, input.id);
}
