'use client';

import { useEffect, useState } from 'react';

export default function NotificationsPage() {
  const [items, setItems] = useState<Array<{ kind: string; message?: string; status: string }>>([]);

  useEffect(() => {
    fetch('/api/v1/notifications')
      .then((r) => r.json())
      .then((d) => setItems(d.notifications ?? []));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Notifications</h1>
      <p className="text-sm text-stone-600">
        Digests use your OpenStreetMap account email when available. At most one change digest per
        day.
      </p>
      <ul className="space-y-2">
        {items.map((n, i) => (
          <li key={i} className="rounded border bg-white p-3 text-sm">
            <div className="font-medium">
              {n.kind} · {n.status}
            </div>
            {n.message}
          </li>
        ))}
        {items.length === 0 && <li className="text-stone-500">No notifications yet.</li>}
      </ul>
    </div>
  );
}
