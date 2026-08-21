export function PlaceSummary({
  flags,
  status,
}: {
  flags: { missing: string[]; stale: string[] };
  status: string;
}) {
  return (
    <div className="rounded border border-stone-200 bg-white p-4 text-sm">
      <div className="font-medium">How OSM currently looks (look-then-edit)</div>
      <p className="text-stone-600">Link status: {status}</p>
      {flags.missing.length > 0 && (
        <p className="text-amber-800">Missing: {flags.missing.join(', ')}</p>
      )}
      {flags.stale.length > 0 && <p className="text-amber-800">Stale: {flags.stale.join(', ')}</p>}
    </div>
  );
}
