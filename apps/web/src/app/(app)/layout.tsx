import Link from 'next/link';
import { getSession } from '@/lib/auth/get-session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Mapkeeper
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/claim">Claim</Link>
            <Link href="/places">Places</Link>
            <Link href="/notifications">Notifications</Link>
            {session.isLoggedIn ? (
              <form action="/api/v1/auth/logout" method="post">
                <button type="submit" className="text-stone-600 underline">
                  Sign out ({session.displayName})
                </button>
              </form>
            ) : (
              <Link
                href="/api/v1/auth/osm/start"
                className="rounded bg-emerald-800 px-3 py-1.5 text-white"
              >
                Sign in with OpenStreetMap
              </Link>
            )}
          </nav>
        </div>
        <p className="mx-auto max-w-5xl px-4 pb-3 text-xs text-stone-500">
          A claim is a watch link only — it does not grant ownership or exclusivity on OpenStreetMap.
          Keep your business on the map.
        </p>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
