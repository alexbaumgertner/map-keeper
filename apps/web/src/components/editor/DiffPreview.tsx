export function DiffPreview({
  tags,
  onBack,
  onPublish,
}: {
  tags: Record<string, string>;
  onBack: () => void;
  onPublish: () => void;
}) {
  return (
    <div className="space-y-3 rounded border border-amber-300 bg-amber-50 p-4">
      <h2 className="font-medium">Diff preview — what will change on the map</h2>
      <ul className="font-mono text-sm">
        {Object.entries(tags).map(([k, v]) => (
          <li key={k}>
            {k} = {v}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <button type="button" onClick={onBack} className="rounded border px-3 py-1">
          Back
        </button>
        <button type="button" onClick={onPublish} className="rounded bg-emerald-800 px-3 py-1 text-white">
          Publish to OpenStreetMap
        </button>
      </div>
    </div>
  );
}
