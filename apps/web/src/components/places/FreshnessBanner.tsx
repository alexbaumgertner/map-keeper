'use client';

export function FreshnessBanner({ businessId }: { businessId: string }) {
  async function confirm() {
    await fetch(`/api/v1/businesses/${businessId}/freshness/confirm`, { method: 'POST' });
    alert('Marked all correct');
  }
  return (
    <div className="flex items-center justify-between rounded bg-sky-50 px-3 py-2 text-sm text-sky-950">
      <span>Please check whether this place is still accurate.</span>
      <button type="button" onClick={confirm} className="underline">
        All correct
      </button>
    </div>
  );
}
