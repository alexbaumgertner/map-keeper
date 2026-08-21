import { Resend } from 'resend';

export async function sendDigestEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<'sent' | 'skipped_no_email' | 'failed'> {
  if (!params.to) return 'skipped_no_email';
  const key = process.env.RESEND_API_KEY;
  if (!key) return 'failed';
  const resend = new Resend(key);
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'Mapkeeper <noreply@example.com>',
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
  return 'sent';
}

export function digestHtml(changes: Array<{ summary: string; who?: string; when?: string }>): string {
  const rows = changes
    .map(
      (c) =>
        `<li>Your data changed — please review. ${c.summary}${c.who ? ` (by ${c.who})` : ''}${c.when ? ` at ${c.when}` : ''}</li>`,
    )
    .join('');
  return `<p>Neutral digest from Mapkeeper</p><ul>${rows}</ul>`;
}
