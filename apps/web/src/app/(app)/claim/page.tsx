'use client';

import { useState } from 'react';
import { MapView } from '@/components/map/MapView';

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

  async function search() {
    const res = await fetch(
      `/api/v1/discover/search?q=${encodeURIComponent(q)}&lat=${center.lat}&lon=${center.lon}`,
    );
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? 'Search failed — sign in required');
      return;
    }
    setResults(data.results ?? []);
  }

  async function claim(r: Result) {
    const res = await fetch('/api/v1/businesses/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ osmType: r.osmType, osmId: r.osmId, vertical: 'food_drink' }),
    });
    const data = await res.json();
    setMessage(res.ok ? `Claimed ${data.displayName}. ${data.claimNote}` : data.error);
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
          className="flex-1 rounded border border-stone-300 px-3 py-2"
          placeholder="Name or address"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" onClick={search} className="rounded bg-emerald-800 px-4 py-2 text-white">
          Search
        </button>
      </div>
      {message && <p className="text-sm text-stone-700">{message}</p>}
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
    </div>
  );
}
