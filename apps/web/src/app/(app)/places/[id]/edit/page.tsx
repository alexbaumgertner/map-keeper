'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PlaceSummary } from '@/components/editor/PlaceSummary';
import { PlaceForm } from '@/components/editor/PlaceForm';
import { DiffPreview } from '@/components/editor/DiffPreview';
import { ConflictMerge } from '@/components/editor/ConflictMerge';
import { NotesFallback } from '@/components/editor/NotesFallback';
import { CandidateFields } from '@/components/editor/CandidateFields';
import { FreshnessBanner } from '@/components/places/FreshnessBanner';

export default function EditPlacePage() {
  const params = useParams<{ id: string }>();
  const [state, setState] = useState<{
    business: { displayName: string; status: string; linkStatus: string };
    fields: Array<{ key: string; label: string; type: string }>;
    flags: { missing: string[]; stale: string[] };
  } | null>(null);
  const [tags, setTags] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'edit' | 'preview' | 'conflict'>('edit');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/v1/businesses/${params.id}/editor-state`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? 'Cannot load editor');
        setState(d);
        setTags({ name: d.business.displayName });
      })
      .catch((e) => setError(e.message));
  }, [params.id]);

  if (error) {
    return (
      <p className="text-red-700">
        {error}. Editor is only available for places you have claimed.
      </p>
    );
  }
  if (!state) return <p>Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit {state.business.displayName}</h1>
      <FreshnessBanner businessId={params.id} />
      <PlaceSummary flags={state.flags} status={state.business.linkStatus} />
      <CandidateFields businessId={params.id} />
      {step === 'edit' && (
        <PlaceForm
          fields={state.fields}
          values={tags}
          onChange={setTags}
          onContinue={() => setStep('preview')}
        />
      )}
      {step === 'preview' && (
        <DiffPreview
          tags={tags}
          onBack={() => setStep('edit')}
          onPublish={async () => {
            // Client publish happens via packages/osm when OAuth token present;
            // record outcome for drafts without OSM write until real upload wired.
            setError(
              'Publish requires OSM OAuth token and preview confirmation. Wire client-publish against OSM dev before production.',
            );
          }}
        />
      )}
      {step === 'conflict' && (
        <ConflictMerge
          triples={Object.keys(tags).map((key) => ({
            key,
            base: tags[key],
            remote: tags[key],
            local: tags[key],
          }))}
          onResolve={() => setStep('preview')}
        />
      )}
      <NotesFallback placeName={state.business.displayName} />
    </div>
  );
}
