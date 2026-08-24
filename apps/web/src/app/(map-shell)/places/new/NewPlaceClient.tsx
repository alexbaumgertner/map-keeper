'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MapView, type MapApi } from '@/components/map/MapView';
import { MapChrome } from '@/components/shell/MapChrome';
import {
  AddBusinessPanel,
  emptyAddBusinessForm,
  formFromPlace,
  verticalForCategory,
  type AddBusinessFormState,
} from '@/components/shell/AddBusinessPanel';

function isDirty(form: AddBusinessFormState) {
  return Boolean(
    form.displayName.trim() ||
      form.properName.trim() ||
      form.externalPageUrl.trim() ||
      form.lat != null ||
      form.lon != null,
  );
}

export default function NewPlacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftIdParam = searchParams.get('draft');
  const mapApiRef = useRef<MapApi | null>(null);
  const [form, setForm] = useState<AddBusinessFormState>(emptyAddBusinessForm);
  const [draftId, setDraftId] = useState<string | null>(draftIdParam);
  const [flyTo, setFlyTo] = useState<{ lng: number; lat: number; zoom?: number } | null>(null);
  const [mapMsg, setMapMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/v1/auth/me').then((r) => {
      if (!r.ok) {
        window.location.href = `/api/v1/auth/osm/start?redirect=${encodeURIComponent('/places/new')}`;
      }
    });
  }, []);

  useEffect(() => {
    if (!draftIdParam) return;
    void fetch(`/api/v1/businesses/${draftIdParam}`)
      .then(async (r) => {
        if (!r.ok) return;
        const place = await r.json();
        setDraftId(place.id);
        setForm(formFromPlace(place));
        if (place.lat != null && place.lon != null) {
          setFlyTo({ lng: place.lon, lat: place.lat, zoom: 14 });
        }
      })
      .catch(() => undefined);
  }, [draftIdParam]);

  async function saveDraft(complete: boolean) {
    const body = {
      vertical: verticalForCategory(form.category),
      displayName: form.displayName.trim() || undefined,
      properName: form.properName.trim() || undefined,
      businessType: form.businessType || undefined,
      externalPageUrl: form.externalPageUrl.trim() || undefined,
      lat: form.lat ?? undefined,
      lon: form.lon ?? undefined,
      complete,
    };
    const url = draftId ? `/api/v1/businesses/${draftId}` : '/api/v1/businesses';
    const method = draftId ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Save failed');
    setDraftId(data.id);
    return data as { id: string };
  }

  async function onClose() {
    setBusy(true);
    setError(null);
    try {
      if (isDirty(form)) {
        await saveDraft(false);
      }
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save draft');
    } finally {
      setBusy(false);
    }
  }

  async function onNext() {
    setBusy(true);
    setError(null);
    try {
      const data = await saveDraft(true);
      router.push(`/places/${data.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not continue');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col md:flex-row">
      <div className="relative h-auto max-h-[55vh] w-full shrink-0 overflow-auto md:h-full md:max-h-none md:w-[400px]">
        <AddBusinessPanel
          value={form}
          onChange={setForm}
          onClose={() => void onClose()}
          onNext={() => void onNext()}
          nextBusy={busy}
        />
        {error ? <p className="px-6 pb-4 text-sm text-red-700">{error}</p> : null}
      </div>
      <div className="relative min-h-0 min-w-0 flex-1">
        <MapView
          className="h-full w-full"
          mapApiRef={mapApiRef}
          flyToRequest={flyTo}
          pin={form.lat != null && form.lon != null ? { lat: form.lat, lng: form.lon } : null}
          onMapClick={(ll) => setForm((f) => ({ ...f, lat: ll.lat, lon: ll.lng }))}
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
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                setForm((f) => ({ ...f, lat, lon }));
                setFlyTo({ lng: lon, lat, zoom: 14 });
              },
              () => setMapMsg('Could not get your location. Check browser permissions.'),
            );
          }}
        />
      </div>
    </div>
  );
}
