'use client';

type Field = { key: string; label: string; type: string };

export function PlaceForm({
  fields,
  values,
  onChange,
  onContinue,
}: {
  fields: Field[];
  values: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-3 rounded border border-stone-200 bg-white p-4">
      {fields.map((f) => (
        <label key={f.key} className="block text-sm">
          <span className="text-stone-600">{f.label}</span>
          {f.type === 'opening_hours' ? (
            <div className="mt-1 flex gap-2">
              <input
                className="flex-1 rounded border px-2 py-1"
                placeholder="Mo-Fr 09:00-17:00"
                value={values[f.key] ?? ''}
                onChange={(e) => onChange({ ...values, [f.key]: e.target.value })}
              />
              <span className="text-xs text-stone-500 self-center">visual builder (MVP text)</span>
            </div>
          ) : (
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={values[f.key] ?? ''}
              onChange={(e) => onChange({ ...values, [f.key]: e.target.value })}
            />
          )}
        </label>
      ))}
      <button type="button" onClick={onContinue} className="rounded bg-emerald-800 px-3 py-2 text-white">
        Continue to diff preview
      </button>
    </div>
  );
}
