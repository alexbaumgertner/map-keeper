import { NextResponse } from 'next/server';
import { z } from 'zod';
import { unprocessable } from '@/lib/api/errors';
import type { DraftFields } from '@/lib/places/store';

const draftBodySchema = z.object({
  vertical: z.enum(['food_drink', 'accommodation', 'other']).optional(),
  displayName: z.string().optional(),
  properName: z.string().optional(),
  businessType: z.string().optional(),
  externalPageUrl: z.union([z.string().url(), z.literal('')]).optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  complete: z.boolean().optional().default(false),
});

function hasIncompletePayload(data: DraftFields): boolean {
  return Boolean(
    data.displayName?.trim() ||
      data.properName?.trim() ||
      data.businessType?.trim() ||
      data.externalPageUrl?.trim() ||
      (data.lat != null && data.lon != null) ||
      data.vertical,
  );
}

export function parseDraftBody(raw: unknown):
  | { ok: true; data: DraftFields; complete: boolean }
  | { ok: false; error: NextResponse } {
  const body = draftBodySchema.safeParse(raw);
  if (!body.success) return { ok: false, error: unprocessable(body.error.message) };

  const { complete, externalPageUrl, displayName, properName, businessType, vertical, lat, lon } =
    body.data;

  const fields: DraftFields = {
    vertical,
    displayName: displayName?.trim() || undefined,
    properName: properName?.trim() || undefined,
    businessType: businessType?.trim() || undefined,
    externalPageUrl: externalPageUrl?.trim() || undefined,
    lat,
    lon,
  };

  if (complete) {
    if (
      !fields.displayName ||
      !fields.properName ||
      !fields.businessType ||
      fields.lat == null ||
      fields.lon == null
    ) {
      return {
        ok: false,
        error: unprocessable('complete draft requires displayName, properName, businessType, lat, lon'),
      };
    }
  } else if (!hasIncompletePayload(fields)) {
    return { ok: false, error: unprocessable('incomplete draft requires at least one field') };
  }

  return { ok: true, data: fields, complete: Boolean(complete) };
}
