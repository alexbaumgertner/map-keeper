'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Biz = {
  id: string;
  displayName: string;
  status: string;
  linkStatus: string;
  osmType?: string;
  osmId?: number;
};

export default function PlacesPage() {
  const [businesses, setBusinesses] = useState<Biz[]>([]);

  useEffect(() => {
    fetch('/api/v1/businesses')
      .then((r) => r.json())
      .then((d) => setBusinesses(d.businesses ?? []))
      .catch(() => setBusinesses([]));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Watched places</h1>
        <Link href="/places/new" className="rounded bg-emerald-800 px-3 py-2 text-sm text-white">
          Add missing place (draft)
        </Link>
      </div>
      <p className="text-sm text-stone-600">You can watch multiple places. No chain/bulk tools in MVP.</p>
      <ul className="divide-y rounded border border-stone-200 bg-white">
        {businesses.length === 0 && (
          <li className="p-4 text-stone-500">No watched places yet. Start from Claim.</li>
        )}
        {businesses.map((b) => (
          <li key={b.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-medium">{b.displayName}</div>
              <div className="text-xs text-stone-500">
                {b.status} · link {b.linkStatus}
                {b.osmId ? ` · ${b.osmType}/${b.osmId}` : ' · draft (not on OSM yet)'}
              </div>
            </div>
            <Link href={`/places/${b.id}/edit`} className="text-sm text-emerald-900 underline">
              Edit
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
