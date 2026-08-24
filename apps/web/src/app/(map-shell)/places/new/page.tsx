import { Suspense } from 'react';
import NewPlacePage from './NewPlaceClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <NewPlacePage />
    </Suspense>
  );
}
