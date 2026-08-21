'use client';

import { suggestedNoteText } from '@mapkeeper/osm';

export function NotesFallback({ placeName }: { placeName: string }) {
  const text = suggestedNoteText({
    placeName,
    lat: 0,
    lon: 0,
    issue: 'Unsure about a conflict — please help from local mappers.',
  });
  return (
    <details className="text-sm text-stone-600">
      <summary>Leave an OpenStreetMap note instead</summary>
      <pre className="mt-2 whitespace-pre-wrap rounded bg-stone-100 p-2 text-xs">{text}</pre>
    </details>
  );
}
