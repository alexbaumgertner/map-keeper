'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export type MapLngLat = { lng: number; lat: number };

type Props = {
  center?: [number, number];
  zoom?: number;
  className?: string;
  /** When false, hide MapLibre's built-in nav (use custom MapChrome). Default false for Map Watcher screens. */
  showNativeControls?: boolean;
  pin?: MapLngLat | null;
  onMapClick?: (ll: MapLngLat) => void;
  onMove?: (ll: MapLngLat) => void;
  /** Imperative handle via window CustomEvent bridge — prefer ref API below through callbacks */
  flyToRequest?: { lng: number; lat: number; zoom?: number } | null;
  onZoomIn?: () => void;
  mapApiRef?: React.MutableRefObject<MapApi | null>;
};

export type MapApi = {
  flyTo: (lng: number, lat: number, zoom?: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  getCenter: () => MapLngLat;
};

/** Polygons are not drawable in MVP. Full-bleed MapLibre shell for Map Watcher. */
export function MapView({
  center = [18.07, 59.33],
  zoom = 11,
  className,
  showNativeControls = false,
  pin = null,
  onMapClick,
  onMove,
  flyToRequest,
  mapApiRef,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onMapClickRef = useRef(onMapClick);
  const onMoveRef = useRef(onMove);
  onMapClickRef.current = onMapClick;
  onMoveRef.current = onMove;

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center,
      zoom,
    });
    if (showNativeControls) {
      map.addControl(new maplibregl.NavigationControl(), 'top-right');
    }
    map.on('click', (e) => {
      onMapClickRef.current?.({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    });
    map.on('moveend', () => {
      const c = map.getCenter();
      onMoveRef.current?.({ lng: c.lng, lat: c.lat });
    });
    mapRef.current = map;

    const api: MapApi = {
      flyTo: (lng, lat, z) => {
        map.flyTo({ center: [lng, lat], zoom: z ?? Math.max(map.getZoom(), 12) });
      },
      zoomIn: () => map.zoomIn(),
      zoomOut: () => map.zoomOut(),
      getCenter: () => {
        const c = map.getCenter();
        return { lng: c.lng, lat: c.lat };
      },
    };
    if (mapApiRef) mapApiRef.current = api;

    return () => {
      if (mapApiRef) mapApiRef.current = null;
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!pin) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({ color: '#e11d48' }).setLngLat([pin.lng, pin.lat]).addTo(map);
    } else {
      markerRef.current.setLngLat([pin.lng, pin.lat]);
    }
  }, [pin]);

  useEffect(() => {
    if (!flyToRequest || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [flyToRequest.lng, flyToRequest.lat],
      zoom: flyToRequest.zoom ?? 12,
    });
  }, [flyToRequest]);

  return (
    <div
      ref={containerRef}
      className={className ?? 'h-full w-full'}
      style={{ minHeight: 240 }}
    />
  );
}
