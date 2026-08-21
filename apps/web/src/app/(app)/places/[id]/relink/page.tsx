'use client';

import { useParams } from 'next/navigation';

export default function RelinkPage() {
  const params = useParams<{ id: string }>();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Identity re-link</h1>
      <p className="text-sm text-stone-600">
        If your object appears to have moved, confirm or reject candidates. Re-linking is never
        automatic. Business {params.id}
      </p>
      <p className="text-stone-500">No pending proposals.</p>
    </div>
  );
}
