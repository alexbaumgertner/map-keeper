export type LocalBusinessParse = {
  name?: string;
  telephone?: string;
  url?: string;
  openingHours?: string;
  address?: string;
};

export function parseLocalBusinessJsonLd(html: string): LocalBusinessParse | null {
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of scripts) {
    try {
      const json = JSON.parse(m[1]) as Record<string, unknown> | Array<Record<string, unknown>>;
      const nodes = Array.isArray(json) ? json : [json];
      for (const node of nodes) {
        const type = String(node['@type'] ?? '');
        if (/LocalBusiness|Restaurant|Hotel|FoodEstablishment/i.test(type)) {
          const addr = node.address as Record<string, string> | undefined;
          return {
            name: typeof node.name === 'string' ? node.name : undefined,
            telephone: typeof node.telephone === 'string' ? node.telephone : undefined,
            url: typeof node.url === 'string' ? node.url : undefined,
            openingHours: typeof node.openingHours === 'string' ? node.openingHours : undefined,
            address: addr
              ? [addr.streetAddress, addr.addressLocality, addr.postalCode].filter(Boolean).join(', ')
              : undefined,
          };
        }
      }
    } catch {
      /* skip bad json-ld */
    }
  }
  return null;
}
