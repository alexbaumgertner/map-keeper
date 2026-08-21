'use client';

import { useState } from 'react';

export function CandidateFields({ businessId }: { businessId: string }) {
  const [msg, setMsg] = useState('');

  async function fromWebsite() {
    const url = prompt('Your business website URL (you confirm it is yours)');
    if (!url) return;
    const res = await fetch(`/api/v1/businesses/${businessId}/candidates/website`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const d = await res.json();
    setMsg(res.ok ? 'Website candidates stored (unconfirmed).' : d.error);
  }

  return (
    <div className="rounded border border-dashed border-stone-300 p-3 text-sm">
      <div className="font-medium">Autofill candidates (never auto-published)</div>
      <button type="button" className="mt-2 underline" onClick={fromWebsite}>
        Parse my website
      </button>
      {msg && <p className="mt-1 text-stone-600">{msg}</p>}
    </div>
  );
}
