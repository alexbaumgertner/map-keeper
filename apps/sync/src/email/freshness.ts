import { sendDigestEmail } from './digest';

export async function sendFreshnessEmail(to: string | undefined, placeName: string) {
  if (!to) return 'skipped_no_email' as const;
  return sendDigestEmail({
    to,
    subject: 'Please check whether your place is still accurate',
    html: `<p>Please check whether <strong>${placeName}</strong> is still accurate.</p>`,
  });
}
