export type OsmApiBase = string;

export const DEV_OSM_API = 'https://master.apis.dev.openstreetmap.org';
export const PROD_OSM_API = 'https://api.openstreetmap.org';

export const MINIMAL_SCOPES = ['write_api', 'read_prefs'] as const;
export const NOTES_SCOPE = 'write_notes' as const;

export function getOsmApiBase(): OsmApiBase {
  return process.env.OSM_API_BASE ?? DEV_OSM_API;
}

export function buildAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
}): string {
  const base = getOsmApiBase();
  const scopes = (params.scopes ?? [...MINIMAL_SCOPES]).join(' ');
  const url = new URL(`${base}/oauth2/authorize`);
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scopes);
  url.searchParams.set('state', params.state);
  return url.toString();
}

export async function exchangeCode(params: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}): Promise<{ access_token: string; token_type: string; scope: string }> {
  const base = getOsmApiBase();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  });
  const res = await fetch(`${base}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    throw new Error(`OAuth token exchange failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchOsmUser(accessToken: string): Promise<{
  id: number;
  display_name: string;
  email?: string;
}> {
  const base = getOsmApiBase();
  const res = await fetch(`${base}/api/0.6/user/details.json`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Failed to fetch OSM user: ${res.status}`);
  const data = (await res.json()) as {
    user: { id: number; display_name: string; email?: string };
  };
  return data.user;
}
