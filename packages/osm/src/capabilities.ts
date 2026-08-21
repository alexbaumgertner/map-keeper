import { getOsmApiBase } from './oauth';

export type OsmCapabilities = {
  status: 'online' | 'readonly' | 'offline';
  imageryBlacklist: string[];
};

export async function fetchCapabilities(): Promise<OsmCapabilities> {
  const base = getOsmApiBase();
  const res = await fetch(`${base}/api/0.6/capabilities`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    // XML fallback parse minimal status
    const text = await res.text();
    const offline = /status=["']offline["']/i.test(text);
    const readonly = /status=["']readonly["']/i.test(text);
    return {
      status: offline ? 'offline' : readonly ? 'readonly' : 'online',
      imageryBlacklist: extractBlacklist(text),
    };
  }
  const text = await res.text();
  const offline = /status=["']offline["']/i.test(text);
  const readonly = /status=["']readonly["']/i.test(text);
  return {
    status: offline ? 'offline' : readonly ? 'readonly' : 'online',
    imageryBlacklist: extractBlacklist(text),
  };
}

function extractBlacklist(xml: string): string[] {
  const matches = [...xml.matchAll(/<regex>([^<]+)<\/regex>/gi)];
  return matches.map((m) => m[1]);
}

export function isImageryAllowed(url: string, blacklist: string[]): boolean {
  return !blacklist.some((pattern) => {
    try {
      return new RegExp(pattern).test(url);
    } catch {
      return url.includes('google');
    }
  });
}

export function assertWritable(caps: OsmCapabilities): void {
  if (caps.status !== 'online') {
    throw new Error(`OSM API is ${caps.status}; writes paused`);
  }
}
