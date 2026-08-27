import {
  findClaimedPlace,
  getPlaceById,
  insertClaimedPlace,
  insertDraftPlace,
  listWatchedPlaces,
  recordPublishedPlace,
  updateDraftPlace,
  upsertUser,
  type ApiVertical,
  type DraftPlaceInput,
  type WatchedPlace,
} from '@mapkeeper/db';
import { getDb, getMemoryStore, isMemoryDbMode } from '@/lib/db';
import type { SessionData } from '@/lib/auth/session';

export type { WatchedPlace };

type SessionWithSave = SessionData & { save: () => Promise<void> };

export type PlaceAccess =
  | { ok: true; place: WatchedPlace }
  | { ok: false; status: 403 | 404 };

export type DraftFields = {
  vertical?: ApiVertical;
  displayName?: string;
  properName?: string;
  businessType?: string;
  externalPageUrl?: string;
  lat?: number;
  lon?: number;
};

export async function persistSessionUser(
  session: SessionWithSave,
  input: {
    osmUserId: number;
    displayName: string;
    email?: string;
    emailUsable: boolean;
    accessToken?: string;
  },
): Promise<string> {
  if (isMemoryDbMode()) {
    const mem = getMemoryStore();
    const existing = [...mem.users.values()].find((u) => u.osmUserId === input.osmUserId);
    const id = existing?.id ?? session.userId ?? crypto.randomUUID();
    mem.users.set(id, {
      id,
      osmUserId: input.osmUserId,
      displayName: input.displayName,
      email: input.email,
      emailUsable: input.emailUsable,
      accessToken: input.accessToken,
    });
    session.userId = id;
    return id;
  }

  const user = await upsertUser(getDb(), {
    osmUserId: input.osmUserId,
    displayName: input.displayName,
    email: input.email,
    emailUsable: input.emailUsable,
    accessToken: input.accessToken,
  });
  session.userId = user.id;
  return user.id;
}

export async function listOwnedPlaces(ownerUserId: string): Promise<WatchedPlace[]> {
  if (isMemoryDbMode()) {
    return [...getMemoryStore().businesses.values()].filter((b) => b.ownerUserId === ownerUserId);
  }
  return listWatchedPlaces(getDb(), ownerUserId);
}

export async function lookupOwnedPlace(ownerUserId: string, id: string): Promise<PlaceAccess> {
  const place = isMemoryDbMode()
    ? getMemoryStore().businesses.get(id)
    : await getPlaceById(getDb(), id);

  if (!place) return { ok: false, status: 404 };
  if (place.ownerUserId !== ownerUserId) return { ok: false, status: 403 };
  return { ok: true, place };
}

function memoryDraftName(input: DraftFields): string {
  const name = input.displayName?.trim() || input.properName?.trim();
  return name && name.length > 0 ? name : 'Untitled draft';
}

/** Create local draft only — never fetches externalPageUrl (no scraper). */
export async function createDraftPlace(
  ownerUserId: string,
  input: DraftFields,
): Promise<WatchedPlace> {
  if (isMemoryDbMode()) {
    const id = crypto.randomUUID();
    const record: WatchedPlace = {
      id,
      ownerUserId,
      vertical: input.vertical ?? 'accommodation',
      status: 'draft',
      displayName: memoryDraftName(input),
      properName: input.properName,
      businessType: input.businessType,
      externalPageUrl: input.externalPageUrl,
      lat: input.lat,
      lon: input.lon,
      linkStatus: 'draft',
    };
    getMemoryStore().businesses.set(id, record);
    return record;
  }
  const payload: DraftPlaceInput = {
    ownerUserId,
    vertical: input.vertical,
    displayName: input.displayName,
    properName: input.properName,
    businessType: input.businessType,
    externalPageUrl: input.externalPageUrl,
    lat: input.lat,
    lon: input.lon,
  };
  return insertDraftPlace(getDb(), payload);
}

/** Update owned draft — stores externalPageUrl as text only; never HTTP-fetches it. */
export async function patchDraftPlace(
  ownerUserId: string,
  id: string,
  input: DraftFields,
): Promise<PlaceAccess> {
  const access = await lookupOwnedPlace(ownerUserId, id);
  if (!access.ok) return access;

  if (isMemoryDbMode()) {
    const next: WatchedPlace = {
      ...access.place,
      vertical: input.vertical ?? access.place.vertical,
      displayName:
        input.displayName !== undefined || input.properName !== undefined
          ? memoryDraftName({
              displayName: input.displayName ?? access.place.displayName,
              properName: input.properName ?? access.place.properName,
            })
          : access.place.displayName,
      properName: input.properName !== undefined ? input.properName : access.place.properName,
      businessType: input.businessType !== undefined ? input.businessType : access.place.businessType,
      externalPageUrl:
        input.externalPageUrl !== undefined ? input.externalPageUrl : access.place.externalPageUrl,
      lat: input.lat !== undefined ? input.lat : access.place.lat,
      lon: input.lon !== undefined ? input.lon : access.place.lon,
    };
    getMemoryStore().businesses.set(id, next);
    return { ok: true, place: next };
  }

  const place = await updateDraftPlace(getDb(), id, input);
  if (!place) return { ok: false, status: 404 };
  return { ok: true, place };
}

export async function createClaimedPlace(
  ownerUserId: string,
  input: {
    vertical: ApiVertical;
    displayName: string;
    osmType: string;
    osmId: number;
    osmVersion?: number;
    lat?: number;
    lon?: number;
    fingerprint?: WatchedPlace['fingerprint'];
  },
): Promise<{ place: WatchedPlace; alreadyWatched: boolean }> {
  if (isMemoryDbMode()) {
    const existing = [...getMemoryStore().businesses.values()].find(
      (b) => b.ownerUserId === ownerUserId && b.osmType === input.osmType && b.osmId === input.osmId,
    );
    if (existing) return { place: existing, alreadyWatched: true };
    const id = crypto.randomUUID();
    const record: WatchedPlace = {
      id,
      ownerUserId,
      vertical: input.vertical,
      status: 'published',
      displayName: input.displayName,
      osmType: input.osmType,
      osmId: input.osmId,
      osmVersion: input.osmVersion,
      lat: input.lat,
      lon: input.lon,
      fingerprint: input.fingerprint,
      linkStatus: 'active',
    };
    getMemoryStore().businesses.set(id, record);
    return { place: record, alreadyWatched: false };
  }

  const existing = await findClaimedPlace(getDb(), ownerUserId, input.osmType, input.osmId);
  if (existing) return { place: existing, alreadyWatched: true };
  const place = await insertClaimedPlace(getDb(), { ownerUserId, ...input });
  return { place, alreadyWatched: false };
}

export async function recordPlacePublish(
  ownerUserId: string,
  id: string,
  input: { osmType: string; osmId: number; osmVersion: number },
): Promise<PlaceAccess> {
  const access = await lookupOwnedPlace(ownerUserId, id);
  if (!access.ok) return access;

  if (isMemoryDbMode()) {
    const place: WatchedPlace = {
      ...access.place,
      osmType: input.osmType,
      osmId: input.osmId,
      osmVersion: input.osmVersion,
      status: 'published',
      linkStatus: 'active',
    };
    getMemoryStore().businesses.set(id, place);
    return { ok: true, place };
  }

  const place = await recordPublishedPlace(getDb(), { id, ...input });
  if (!place) return { ok: false, status: 404 };
  return { ok: true, place };
}
