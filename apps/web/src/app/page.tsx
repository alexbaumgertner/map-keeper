'use client';

import { useEffect, useRef, useState } from 'react';
import { MapView, type MapApi } from '@/components/map/MapView';
import { MapChrome } from '@/components/shell/MapChrome';
import { StartHomePanel } from '@/components/shell/StartHomePanel';

type Me = { isLoggedIn?: boolean; displayName?: string };

export default function Home() {
  const mapApiRef = useRef<MapApi | null>(null);
  const [me, setMe] = useState<Me>({ isLoggedIn: false });
  const [flyTo, setFlyTo] = useState<{ lng: number; lat: number; zoom?: number } | null>(null);
  const [mapMsg, setMapMsg] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/v1/auth/me')
      .then(async (r) => {
        if (!r.ok) {
          setMe({ isLoggedIn: false });
          return;
        }
        const data = (await r.json()) as Me;
        setMe({ isLoggedIn: true, displayName: data.displayName });
      })
      .catch(() => setMe({ isLoggedIn: false }));
  }, []);

  function goAuth(redirect: string) {
    window.location.href = `/api/v1/auth/osm/start?redirect=${encodeURIComponent(redirect)}`;
  }

  async function logout() {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    setMe({ isLoggedIn: false });
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col md:flex-row">
      <div className="h-auto max-h-[45vh] w-full shrink-0 md:h-full md:max-h-none md:w-[400px]">
        <StartHomePanel
          isLoggedIn={Boolean(me.isLoggedIn)}
          displayName={me.displayName}
          onAddBusiness={() => {
            if (me.isLoggedIn) {
              window.location.href = '/places/new';
            } else {
              goAuth('/places/new');
            }
          }}
          onSignUp={() => goAuth('/')}
          onLogin={() => goAuth('/')}
          onLogout={() => void logout()}
        />
      </div>
      <div className="relative min-h-0 min-w-0 flex-1">
        <MapView
          className="h-full w-full"
          mapApiRef={mapApiRef}
          flyToRequest={flyTo}
        />
        <MapChrome
          message={mapMsg}
          onSearchResult={(r) => {
            setMapMsg(null);
            setFlyTo({ lng: r.lon, lat: r.lat, zoom: 12 });
          }}
          onZoomIn={() => mapApiRef.current?.zoomIn()}
          onZoomOut={() => mapApiRef.current?.zoomOut()}
          onLocate={() => {
            if (!navigator.geolocation) {
              setMapMsg('Geolocation is not available in this browser.');
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                setMapMsg(null);
                setFlyTo({ lng: pos.coords.longitude, lat: pos.coords.latitude, zoom: 14 });
              },
              () => setMapMsg('Could not get your location. Check browser permissions.'),
            );
          }}
        />
      </div>
    </div>
  );
}
