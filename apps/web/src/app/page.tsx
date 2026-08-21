import Link from 'next/link';

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-stone-100 via-emerald-50 to-sky-100">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(6,95,70,0.15), transparent 40%), radial-gradient(circle at 80% 60%, rgba(12,74,110,0.12), transparent 35%)',
        }}
      />
      <main className="relative mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
        <p className="font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight text-emerald-950 sm:text-6xl">
          Mapkeeper
        </p>
        <h1 className="mt-4 max-w-xl text-xl text-stone-800 sm:text-2xl">
          Keep your business on the map.
        </h1>
        <p className="mt-3 max-w-lg text-stone-600">
          Claim your venue on OpenStreetMap, publish corrections under your own account, and get
          notified when the map changes — compliance as a service, not a bulk editor.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/api/v1/auth/osm/start?redirect=/claim"
            className="rounded bg-emerald-900 px-5 py-2.5 text-white"
          >
            Sign in with OpenStreetMap
          </Link>
          <Link href="/en/guides/organic-maps/restaurant" className="rounded border border-emerald-900 px-5 py-2.5 text-emerald-950">
            Read a guide
          </Link>
        </div>
      </main>
    </div>
  );
}
