export const ALLOWLISTED_SOURCES = [
  'owner',
  'survey',
  'website',
  'overture',
  'alltheplaces',
  'foursquare_os',
  'government',
  'gbp',
  'local_knowledge',
] as const;

export const PROHIBITED_SOURCES = [
  'google',
  'google_maps',
  'google_places',
  'apple_maps',
  'yandex',
  '2gis',
  'here',
  'tomtom',
  'tripadvisor',
  'yelp',
  'foursquare_commercial',
] as const;

export function isProhibitedSource(source: string): boolean {
  return (PROHIBITED_SOURCES as readonly string[]).includes(source.toLowerCase());
}

export function assertNotProhibited(source: string): void {
  if (isProhibitedSource(source)) {
    throw new Error(`Prohibited data source: ${source}`);
  }
}
