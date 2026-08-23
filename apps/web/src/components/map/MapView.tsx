'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

type Props = {
  center?: [number, number];
  onMove?: (lngLat: { lng: number; lat: number }) => void;
  drawEnabled?: boolean;
};

/** Polygons are not drawable in MVP (drawEnabled ignored for areas). */
export function MapView({ center = [-0.12, 51.5], onMove, drawEnabled = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
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
      zoom: 14,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    if (onMove) {
      map.on('moveend', () => {
        const c = map.getCenter();
        onMove({ lng: c.lng, lat: c.lat });
      });
    }
    void drawEnabled; // points only — no polygon draw tools
    return () => map.remove();
    // Recreate the map only when the initial center changes, not on every pan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={ref} className="h-[420px] w-full rounded-lg border border-stone-300" />;
}
