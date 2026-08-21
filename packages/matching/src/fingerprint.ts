export type Fingerprint = {
  name?: string;
  brand?: string;
  address?: string;
  phone?: string;
};

export function buildFingerprint(tags: Record<string, string>): Fingerprint {
  const address = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']]
    .filter(Boolean)
    .join(' ')
    .trim();
  return {
    name: tags.name?.trim().toLowerCase(),
    brand: tags.brand?.trim().toLowerCase() || tags['brand:wikidata'],
    address: address.toLowerCase() || undefined,
    phone: tags.phone?.replace(/\s+/g, '') || tags['contact:phone']?.replace(/\s+/g, ''),
  };
}

export function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  return phone.replace(/[^\d+]/g, '');
}
