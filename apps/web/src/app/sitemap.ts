import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3000';
  const apps = ['organic-maps', 'osmand', 'komoot'];
  const types = ['restaurant', 'cafe', 'hotel'];
  const entries: MetadataRoute.Sitemap = [{ url: base, lastModified: new Date() }];
  for (const app of apps) {
    for (const businessType of types) {
      entries.push({
        url: `${base}/en/guides/${app}/${businessType}`,
        lastModified: new Date(),
      });
    }
  }
  return entries;
}
