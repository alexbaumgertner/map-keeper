export function deliveryStatus(emailUsable: boolean): 'ok' | 'skipped_no_email' {
  return emailUsable ? 'ok' : 'skipped_no_email';
}
