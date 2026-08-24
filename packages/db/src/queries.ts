import { and, desc, eq } from 'drizzle-orm';
import type { Db } from './client';
import { businesses, placeLinks, users } from './schema/index';

export type ApiVertical = 'food_drink' | 'accommodation' | 'other';
export type DbVertical = 'food_drink' | 'accommodation' | 'other';

export type WatchedPlace = {
  id: string;
  ownerUserId: string;
  vertical: ApiVertical;
  status: string;
  displayName: string;
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
): WatchedPlace {
  return {
    id: business.id,
    ownerUserId: business.ownerUserId,
    vertical: toApiVertical(business.vertical),
    status: business.status,
    displayName: business.displayName,
    osmType: link?.osmType ?? undefined,
    osmId: link?.osmId ?? undefined,
    osmVersion: link?.osmVersion ?? undefined,
    lat: toNumber(link?.lat),
    lon: toNumber(link?.lon),
    fingerprint: link?.fingerprint ?? undefined,
    linkStatus: link?.status ?? 'draft',
  };
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
  return rows.map((row) => mapPlace(row.business, row.link));
}

export async function getPlaceById(db: Db, id: string): Promise<WatchedPlace | undefined> {
  const [row] = await db
    .select({ business: businesses, link: placeLinks })
    .from(businesses)
    .leftJoin(placeLinks, eq(placeLinks.businessId, businesses.id))
    .where(eq(businesses.id, id))
    .limit(1);
  return row ? mapPlace(row.business, row.link) : undefined;
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

export async function insertDraftPlace(
  db: Db,
  input: {
    ownerUserId: string;
    vertical: ApiVertical;
    displayName: string;
    lat: number;
    lon: number;
  },
): Promise<WatchedPlace> {
  return db.transaction(async (tx) => {
    const [business] = await tx
      .insert(businesses)
      .values({
        ownerUserId: input.ownerUserId,
        vertical: toDbVertical(input.vertical),
        status: 'draft',
        displayName: input.displayName,
      })
      .returning();
    const [link] = await tx
      .insert(placeLinks)
      .values({
        businessId: business.id,
        lat: String(input.lat),
        lon: String(input.lon),
        status: 'draft',
      })
      .returning();
    return mapPlace(business, link);
  });
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
