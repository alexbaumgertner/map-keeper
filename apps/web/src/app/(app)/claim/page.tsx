'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { searchVenues } from '@mapkeeper/osm/overpass';
import { MapView } from '@/components/map/MapView';

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

type Result = {
  osmType: string;
  osmId: number;
  name?: string;
  lat: number;
  lon: number;
};

type Vertical = 'food_drink' | 'accommodation' | 'other';

type LookupPreview = {
  osmType: 'node' | 'way' | 'relation';
  osmId: number;
  displayName: string | null;
  lat: number | null;
  lon: number | null;
  version: number | null;
  tags: Record<string, string> | null;
};

type ClaimResponse = {
  error?: string;
  results?: Result[];
  displayName?: string;
  claimNote?: string;
  alreadyWatched?: boolean;
  id?: string;
};

export default function ClaimPage() {
  const [q, setQ] = useState('');
  const [center, setCenter] = useState({ lat: 51.5074, lon: -0.1278 });
  const [results, setResults] = useState<Result[]>([]);
  const [message, setMessage] = useState('');
  const [searching, setSearching] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const [identityQ, setIdentityQ] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [identityMessage, setIdentityMessage] = useState('');
  const [preview, setPreview] = useState<LookupPreview | null>(null);
  const [vertical, setVertical] = useState<Vertical>('other');
  const [claimingIdentity, setClaimingIdentity] = useState(false);
  const [alreadyWatchedId, setAlreadyWatchedId] = useState<string | null>(null);

  useEffect(() => {
    if (!searching) {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 250);
    return () => window.clearInterval(id);
  }, [searching]);

  async function readJson(res: Response): Promise<ClaimResponse> {
    const text = await res.text();
    if (!text) return { error: res.ok ? undefined : `Request failed (${res.status})` };
    try {
      return JSON.parse(text) as ClaimResponse;
    } catch {
      return { error: `Request failed (${res.status})` };
    }
  }

  async function searchViaApi(): Promise<{ ok: boolean; results?: Result[]; error?: string }> {
    const res = await fetch(
      `/api/v1/discover/search?q=${encodeURIComponent(q)}&lat=${center.lat}&lon=${center.lon}`,
    );
    const data = await readJson(res);
    if (!res.ok) return { ok: false, error: data.error ?? 'Search failed — sign in required' };
    return { ok: true, results: data.results ?? [] };
  }

  async function search() {
    setMessage('Searching OpenStreetMap…');
    setSearching(true);
    setResults([]);
    try {
      const me = await fetch('/api/v1/auth/me');
      if (me.status === 401) {
        setMessage('Search failed — sign in required');
        return;
      }
      try {
        const venues = await searchVenues({ q, lat: center.lat, lon: center.lon });
        setResults(venues);
        setMessage(venues.length ? '' : 'No venues found near the map center.');
        return;
      } catch {
        const fallback = await searchViaApi();
        if (!fallback.ok) {
          setMessage(fallback.error ?? 'OpenStreetMap search is busy. Wait a few seconds and try again.');
          return;
        }
        setResults(fallback.results ?? []);
        setMessage((fallback.results ?? []).length ? '' : 'No venues found near the map center.');
      }
    } finally {
      setSearching(false);
    }
  }

  async function claim(r: Result) {
    const res = await fetch('/api/v1/businesses/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        osmType: r.osmType,
        osmId: r.osmId,
        vertical: 'food_drink',
        name: r.name,
        lat: r.lat,
        lon: r.lon,
        resolveMode: 'default',
      }),
    });
    const data = await readJson(res);
    if (res.ok && data.alreadyWatched && data.id) {
      setMessage(
        `Already watching ${data.displayName ?? r.name ?? 'venue'}.${data.claimNote ? ` ${data.claimNote}` : ''}`,
      );
      return;
    }
    setMessage(
      res.ok
        ? `Claimed ${data.displayName ?? r.name ?? 'venue'}.${data.claimNote ? ` ${data.claimNote}` : ''}`
        : (data.error ?? 'Claim failed'),
    );
  }

  async function lookupIdentity() {
    setIdentityMessage('');
    setAlreadyWatchedId(null);
    setPreview(null);
    setLookingUp(true);
    try {
      const me = await fetch('/api/v1/auth/me');
      if (me.status === 401) {
        setIdentityMessage('Look-up failed — sign in required');
        return;
      }
      const res = await fetch(`/api/v1/osm/lookup?q=${encodeURIComponent(identityQ.trim())}`);
      const data = (await res.json()) as LookupPreview & { error?: string };
      if (!res.ok) {
        setIdentityMessage(data.error ?? 'Object not found on the configured map host');
        return;
      }
      setPreview(data);
      setVertical('other');
    } catch {
      setIdentityMessage('Look-up failed — try again in a moment');
    } finally {
      setLookingUp(false);
    }
  }

  async function claimIdentity() {
    if (!preview) return;
    setClaimingIdentity(true);
    setAlreadyWatchedId(null);
    setIdentityMessage('');
    try {
      const res = await fetch('/api/v1/businesses/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          osmType: preview.osmType,
          osmId: preview.osmId,
          vertical,
          name: preview.displayName ?? undefined,
          lat: preview.lat ?? undefined,
          lon: preview.lon ?? undefined,
          resolveMode: 'editing_host',
        }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        setIdentityMessage(data.error ?? 'Claim failed');
        return;
      }
      if (data.alreadyWatched && data.id) {
        setAlreadyWatchedId(data.id);
        setIdentityMessage(
          `Already watching ${data.displayName ?? preview.displayName ?? `${preview.osmType}/${preview.osmId}`}.`,
        );
        return;
      }
      setIdentityMessage(
        `Claimed ${data.displayName ?? preview.displayName ?? `${preview.osmType}/${preview.osmId}`}.${data.claimNote ? ` ${data.claimNote}` : ''}`,
      );
    } finally {
      setClaimingIdentity(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Find and claim your venue</h1>
      <p className="text-stone-600">
        Search OpenStreetMap via Overpass. Claiming only means Mapkeeper watches the object for
        changes.
      </p>
      <MapView
        center={[center.lon, center.lat]}
        onMove={(ll) => setCenter({ lat: ll.lat, lon: ll.lng })}
      />
      <div className="flex gap-2">
        <input
          className="flex-1 rounded border border-stone-300 px-3 py-2 disabled:bg-stone-100"
          placeholder="Name or address"
          value={q}
          disabled={searching}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !searching && q.trim()) void search();
          }}
        />
        <button
          type="button"
          onClick={search}
          disabled={searching || !q.trim()}
          aria-busy={searching}
          className="inline-flex min-w-28 items-center justify-center gap-2 rounded bg-emerald-800 px-4 py-2 text-white disabled:opacity-80"
        >
          {searching && <Spinner />}
          {searching ? 'Searching…' : 'Search'}
        </button>
      </div>
      {searching && (
        <div
          className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
          role="status"
          aria-live="polite"
        >
          <Spinner className="mt-0.5 h-5 w-5 text-emerald-800" />
          <div>
            <p className="font-medium">Searching OpenStreetMap… {elapsed}s</p>
            <p className="text-emerald-800">
              Overpass can take 5–15 seconds. The spinner means it is still working.
            </p>
          </div>
        </div>
      )}
      {message && !searching && <p className="text-sm text-stone-700">{message}</p>}
      {searching && (
        <ul className="divide-y rounded border border-stone-200 bg-white" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center justify-between gap-4 p-3">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/5 animate-pulse rounded bg-stone-200" />
                <div className="h-3 w-1/4 animate-pulse rounded bg-stone-100" />
              </div>
              <div className="h-7 w-24 animate-pulse rounded bg-stone-100" />
            </li>
          ))}
        </ul>
      )}
      {!searching && (
        <ul className="divide-y rounded border border-stone-200 bg-white">
          {results.map((r) => (
            <li key={`${r.osmType}/${r.osmId}`} className="flex items-center justify-between gap-4 p-3">
              <div>
                <div className="font-medium">{r.name ?? `${r.osmType}/${r.osmId}`}</div>
                <div className="text-xs text-stone-500">
                  {r.osmType}/{r.osmId}
                </div>
              </div>
              <button
                type="button"
                className="rounded border border-emerald-800 px-3 py-1 text-sm text-emerald-900"
                onClick={() => claim(r)}
              >
                Claim / watch
              </button>
            </li>
          ))}
        </ul>
      )}

      <section className="space-y-3 border-t border-stone-200 pt-6">
        <h2 className="text-base font-medium text-stone-800">Claim by map object id</h2>
        <p className="text-sm text-stone-500">
          Secondary path for known OpenStreetMap ids (including sandbox test data). Paste{' '}
          <code className="text-xs">relation/123</code> or an OSM object URL, look up on the
          configured map host, then claim.
        </p>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded border border-stone-300 px-3 py-2 text-sm disabled:bg-stone-100"
            placeholder="relation/4305236658 or https://…/relation/…"
            value={identityQ}
            disabled={lookingUp}
            onChange={(e) => setIdentityQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !lookingUp && identityQ.trim()) void lookupIdentity();
            }}
          />
          <button
            type="button"
            onClick={() => void lookupIdentity()}
            disabled={lookingUp || !identityQ.trim()}
            aria-busy={lookingUp}
            className="inline-flex min-w-24 items-center justify-center gap-2 rounded border border-stone-400 bg-stone-50 px-3 py-2 text-sm text-stone-800 disabled:opacity-80"
          >
            {lookingUp && <Spinner className="h-3.5 w-3.5" />}
            {lookingUp ? 'Looking up…' : 'Look up'}
          </button>
        </div>
        {identityMessage && (
          <p className="text-sm text-stone-700">
            {identityMessage}
            {alreadyWatchedId && (
              <>
                {' '}
                <Link className="text-emerald-900 underline" href={`/places/${alreadyWatchedId}/edit`}>
                  Open place
                </Link>
              </>
            )}
          </p>
        )}
        {preview && (
          <div className="space-y-3 rounded border border-stone-200 bg-stone-50 p-3 text-sm">
            <div>
              <div className="font-medium text-stone-900">
                {preview.displayName ?? `${preview.osmType}/${preview.osmId}`}
              </div>
              <div className="text-xs text-stone-500">
                {preview.osmType}/{preview.osmId}
                {preview.lat != null && preview.lon != null
                  ? ` · ${preview.lat.toFixed(5)}, ${preview.lon.toFixed(5)}`
                  : ''}
              </div>
            </div>
            <label className="flex flex-col gap-1 text-stone-700">
              <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Category
              </span>
              <select
                className="max-w-xs rounded border border-stone-300 bg-white px-2 py-1.5"
                value={vertical}
                onChange={(e) => setVertical(e.target.value as Vertical)}
              >
                <option value="other">Other</option>
                <option value="food_drink">Food &amp; drink</option>
                <option value="accommodation">Accommodation</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => void claimIdentity()}
              disabled={claimingIdentity}
              className="rounded border border-emerald-800 px-3 py-1.5 text-sm text-emerald-900 disabled:opacity-80"
            >
              {claimingIdentity ? 'Claiming…' : 'Claim / watch'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
