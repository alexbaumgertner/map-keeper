import { NextResponse } from 'next/server';

export function jsonError(status: number, message: string, code?: string) {
  return NextResponse.json({ error: message, code }, { status });
}

export function unauthorized(message = 'Not signed in') {
  return jsonError(401, message);
}

export function forbidden(message = 'Forbidden') {
  return jsonError(403, message);
}

export function unprocessable(message: string) {
  return jsonError(422, message);
}

export function serviceUnavailable(message: string) {
  return jsonError(503, message);
}
