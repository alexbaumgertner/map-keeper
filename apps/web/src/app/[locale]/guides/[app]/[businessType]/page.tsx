import Link from 'next/link';
import { GuideCta } from '@/components/seo/GuideCta';

type Props = { params: Promise<{ locale: string; app: string; businessType: string }> };

export default async function GuidePage({ params }: Props) {
  const { locale, app, businessType } = await params;
  const title = `How to add your ${businessType.replace(/-/g, ' ')} to ${app.replace(/-/g, ' ')}`;

  return (
    <article className="mx-auto max-w-2xl space-y-6 px-4 py-12">
      <p className="text-xs uppercase tracking-wide text-stone-500">{locale}</p>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-stone-700">
        Many apps — including {app.replace(/-/g, ' ')} — show places from OpenStreetMap. Mapkeeper
        helps you claim your venue, keep details accurate, and notice when the map changes. This is
        a walkthrough, not doorway spam.
      </p>
      <ol className="list-decimal space-y-2 pl-5 text-stone-700">
        <li>Sign in with your OpenStreetMap account (Mapkeeper does not create separate passwords).</li>
        <li>Find your venue on the map or start a draft if it is missing.</li>
        <li>Confirm each field, preview the diff, then publish under your own OSM identity.</li>
        <li>Watch for change digests so your listing does not silently break.</li>
      </ol>
      <GuideCta />
      <p className="text-sm text-stone-500">
        <Link href="/">Back to Mapkeeper</Link>
      </p>
    </article>
  );
}
