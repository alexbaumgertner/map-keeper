import { createDb } from '@mapkeeper/db';

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not configured');
    }
    _db = createDb();
  }
  return _db;
}

/** In-memory fallback for local UI demos without Neon. */
export type MemoryStore = {
  users: Map<string, { id: string; osmUserId: number; displayName: string; email?: string; emailUsable: boolean; accessToken?: string }>;
  businesses: Map<
    string,
    {
      id: string;
      ownerUserId: string;
      vertical: 'food_drink' | 'accommodation' | 'other';
      status: string;
      displayName: string;
      osmType?: string;
      osmId?: number;
      osmVersion?: number;
      lat?: number;
      lon?: number;
      fingerprint?: Record<string, string>;
      linkStatus: string;
    }
  >;
};

const g = globalThis as unknown as { __mapkeeperMemory?: MemoryStore };

export function getMemoryStore(): MemoryStore {
  if (!g.__mapkeeperMemory) {
    g.__mapkeeperMemory = { users: new Map(), businesses: new Map() };
  }
  return g.__mapkeeperMemory;
}

export function isMemoryDbMode(): boolean {
  return !process.env.DATABASE_URL;
}
