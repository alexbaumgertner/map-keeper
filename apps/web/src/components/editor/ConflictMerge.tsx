'use client';

import type { FieldTriple } from '@mapkeeper/osm';

export function ConflictMerge({
  triples,
  onResolve,
}: {
  triples: FieldTriple[];
  onResolve: () => void;
}) {
  return (
    <div className="space-y-3 rounded border border-red-300 bg-red-50 p-4">
      <h2 className="font-medium">Version conflict — resolve per field (no last-write-wins)</h2>
      {triples.map((t) => (
        <div key={t.key} className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="font-semibold">You saw</div>
            {t.base}
          </div>
          <div>
            <div className="font-semibold">On map now</div>
            {t.remote}
          </div>
          <div>
            <div className="font-semibold">Your proposal</div>
            {t.local}
          </div>
        </div>
      ))}
      <button type="button" onClick={onResolve} className="rounded bg-emerald-800 px-3 py-1 text-white">
        Apply resolutions
      </button>
    </div>
  );
}
