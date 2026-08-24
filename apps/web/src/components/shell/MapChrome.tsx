'use client';

import { useState } from 'react';
import { IconButton, TextInput, Text } from '@epam/loveship';
import { iconMinus, iconPlus, iconSearch, iconTarget } from './icons';

export type MapChromeProps = {
  onSearchResult?: (r: { lat: number; lon: number; label: string }) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onLocate?: () => void;
  message?: string | null;
};

export function MapChrome({ onSearchResult, onZoomIn, onZoomOut, onLocate, message }: MapChromeProps) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [localMsg, setLocalMsg] = useState<string | null>(null);

  async function runSearch() {
    const query = q.trim();
    if (!query) return;
    setBusy(true);
    setLocalMsg(null);
    try {
      const res = await fetch(`/api/v1/geo/search?q=${encodeURIComponent(query)}`);
      const data = (await res.json()) as { results?: { lat: number; lon: number; label: string }[]; error?: string };
      if (!res.ok) {
        setLocalMsg(data.error ?? 'Search unavailable. Try again or pan the map.');
        return;
      }
      const first = data.results?.[0];
      if (!first) {
        setLocalMsg('No results. Try another query or coordinates.');
        return;
      }
      onSearchResult?.(first);
    } catch {
      setLocalMsg('Search unavailable. Try again or pan the map.');
    } finally {
      setBusy(false);
    }
  }

  const shown = message ?? localMsg;

  return (
    <>
      <div className="pointer-events-auto absolute left-5 top-5 z-10 w-[min(352px,calc(100%-2.5rem))]">
        <TextInput
          value={q}
          onValueChange={(v) => setQ(v ?? '')}
          placeholder="Country, region, city, coordinates, etc."
          icon={iconSearch}
          size="48"
          isDisabled={busy}
          onKeyDown={(e) => {
            if (e?.key === 'Enter') void runSearch();
          }}
        />
        {shown ? (
          <Text fontSize="14" color="tertiary" cx="mt-2 rounded bg-white/90 px-2 py-1 shadow">
            {shown}
          </Text>
        ) : null}
      </div>
      <div className="pointer-events-auto absolute right-5 top-5 z-10 flex flex-col gap-3">
        <div className="flex flex-col gap-3">
          <IconButton icon={iconPlus} color="secondary" onClick={onZoomIn} cx="bg-white shadow" />
          <IconButton icon={iconMinus} color="secondary" onClick={onZoomOut} cx="bg-white shadow" />
        </div>
        <IconButton icon={iconTarget} color="secondary" onClick={onLocate} cx="mt-9 bg-white shadow" />
      </div>
    </>
  );
}
