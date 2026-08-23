'use client';

import { useEffect, useState } from 'react';
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

export default function ClaimPage() {
  const [q, setQ] = useState('');
  const [center, setCenter] = useState({ lat: 51.5074, lon: -0.1278 });
  const [results, setResults] = useState<Result[]>([]);
  const [message, setMessage] = useState('');
  const [searching, setSearching] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!searching) {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 250);
    return () => window.clearInterval(id);
  }, [searching]);

  async function readJson(res: Response): Promise<{ error?: string; results?: Result[]; displayName?: string; claimNote?: string }> {
    const text = await res.text();
    if (!text) return { error: res.ok ? undefined : `Request failed (${res.status})` };
    try {
      return JSON.parse(text) as { error?: string; results?: Result[]; displayName?: string; claimNote?: string };
    } catch {
      return { error: `Request failed (${res.status})` };
    }
  }

  async function search() {
    setMessage('Searching OpenStreetMap…');
    setSearching(true);
    setResults([]);
    try {
      const res = await fetch(
        `/api/v1/discover/search?q=${encodeURIComponent(q)}&lat=${center.lat}&lon=${center.lon}`,
      );
      const data = await readJson(res);
      if (!res.ok) {
        setMessage(data.error ?? 'Search failed — sign in required');
        return;
      }
      setResults(data.results ?? []);
      setMessage((data.results ?? []).length ? '' : 'No venues found near the map center.');
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
      }),
    });
    const data = await readJson(res);
    setMessage(
      res.ok
        ? `Claimed ${data.displayName ?? r.name ?? 'venue'}.${data.claimNote ? ` ${data.claimNote}` : ''}`
        : (data.error ?? 'Claim failed'),
    );
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
    </div>
  );
}
