import Link from 'next/link';

export function GuideCta() {
  return (
    <Link
      href="/api/v1/auth/osm/start?redirect=/claim"
      className="inline-block rounded bg-emerald-800 px-4 py-2 text-white"
    >
      Keep your business on the map — get started
    </Link>
  );
}
