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

type EditorState = {
  business: {
    displayName: string;
    status: string;
    linkStatus: string;
    osmType?: string;
    osmId?: number;
    osmVersion?: number;
  };
  fields: Array<{ key: string; label: string; type: string }>;
  values: Record<string, string>;
  flags: { missing: string[]; stale: string[] };
  osm: {
    type: string | null;
    id: number | null;
    version: number | null;
    tags: Record<string, string>;
    fetchError: string | null;
  };
  defaultComment: string;
};

export default function EditPlacePage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<EditorState | null>(null);
  const [tags, setTags] = useState<Record<string, string>>({});
  const [baseTags, setBaseTags] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'edit' | 'preview' | 'conflict'>('edit');
  const [loadError, setLoadError] = useState('');
  const [publishError, setPublishError] = useState('');
  const [publishOk, setPublishOk] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [comment, setComment] = useState('');
  const [conflictTriples, setConflictTriples] = useState<
    Array<{ key: string; base?: string; remote?: string; local?: string }>
  >([]);

  useEffect(() => {
    fetch(`/api/v1/businesses/${id}/editor-state`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? 'Cannot load editor');
        setState(d);
        setTags(d.values ?? { name: d.business.displayName });
        setBaseTags(d.osm?.tags ?? {});
        setComment(d.defaultComment ?? '');
      })
      .catch((e) => setLoadError(e.message));
  }, [id]);

  async function publish() {
    setPublishError('');
    setPublishOk('');
    setPublishing(true);
    try {
      const res = await fetch(`/api/v1/businesses/${id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags,
          comment: comment.trim() || `Update via Mapkeeper`,
          source: 'local knowledge',
          confirmedPreview: true,
        }),
      });
      const data = await res.json();
      if (res.status === 409 && data.conflict) {
        const remoteTags = (data.remote?.tags ?? {}) as Record<string, string>;
        const keys = Array.from(new Set([...Object.keys(tags), ...Object.keys(remoteTags)]));
        setConflictTriples(
          keys.map((key) => ({
            key,
            base: baseTags[key],
            remote: remoteTags[key],
            local: tags[key],
          })),
        );
        setStep('conflict');
        setPublishError(data.message ?? 'Conflict with current OpenStreetMap data');
        return;
      }
      if (!res.ok) {
        setPublishError(data.error ?? `Publish failed (${res.status})`);
        return;
      }
      setPublishOk(
        `Published to OpenStreetMap (changeset ${data.changesetId}, version ${data.osmVersion}).`,
      );
      setBaseTags({ ...tags });
      setStep('edit');
      if (state && data.osmVersion != null) {
        setState({
          ...state,
          business: { ...state.business, osmVersion: data.osmVersion },
          osm: { ...state.osm, version: data.osmVersion, tags: { ...tags } },
        });
      }
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  }

  if (loadError) {
    return (
      <p className="text-red-700">
        {loadError}. Editor is only available for places you have claimed.
      </p>
    );
  }
  if (!state) return <p>Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit {state.business.displayName}</h1>
      {state.osm.type && state.osm.id != null && (
        <p className="text-sm text-stone-600">
          {state.osm.type}/{state.osm.id}
          {state.osm.version != null ? ` · v${state.osm.version}` : ''}
        </p>
      )}
      {state.osm.fetchError && (
        <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {state.osm.fetchError}. You can still edit locally; publish will fail until the object
          exists on the map host.
        </p>
      )}
      <FreshnessBanner businessId={id} />
      <PlaceSummary flags={state.flags} status={state.business.linkStatus} />
      <CandidateFields businessId={id} />
      {publishError && <p className="text-sm text-red-700">{publishError}</p>}
      {publishOk && <p className="text-sm text-emerald-800">{publishOk}</p>}
      {step === 'edit' && (
        <PlaceForm
          fields={state.fields}
          values={tags}
          onChange={setTags}
          onContinue={() => {
            setPublishError('');
            setPublishOk('');
            setStep('preview');
          }}
        />
      )}
      {step === 'preview' && (
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-stone-600">Changeset comment (required)</span>
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </label>
          <DiffPreview
            tags={tags}
            onBack={() => setStep('edit')}
            onPublish={() => {
              if (!comment.trim()) {
                setPublishError('Add a changeset comment before publishing');
                return;
              }
              void publish();
            }}
            publishing={publishing}
          />
        </div>
      )}
      {step === 'conflict' && (
        <ConflictMerge
          triples={conflictTriples}
          onResolve={() => {
            setStep('preview');
            setPublishError('');
          }}
        />
      )}
      <NotesFallback placeName={state.business.displayName} />
    </div>
  );
}
