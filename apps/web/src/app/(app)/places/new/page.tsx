'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapView } from '@/components/map/MapView';

export default function NewPlacePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [center, setCenter] = useState({ lat: 51.5074, lon: -0.1278 });
  const [msg, setMsg] = useState('');

  async function saveDraft() {
    const res = await fetch('/api/v1/businesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: name,
        lat: center.lat,
        lon: center.lon,
        vertical: 'food_drink',
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? 'Failed');
      return;
    }
    setMsg('Draft saved locally — nothing written to OpenStreetMap until you publish.');
    router.push(`/places/${data.id}/edit`);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">New place (draft)</h1>
      <p className="text-sm text-stone-600">
        This stays in Mapkeeper until you complete the editor and explicitly publish after a diff
        preview.
      </p>
      <MapView center={[center.lon, center.lat]} onMove={(ll) => setCenter({ lat: ll.lat, lon: ll.lng })} />
      <input
        className="w-full rounded border px-3 py-2"
        placeholder="Business name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button type="button" onClick={saveDraft} className="rounded bg-emerald-800 px-4 py-2 text-white">
        Save draft
      </button>
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}
