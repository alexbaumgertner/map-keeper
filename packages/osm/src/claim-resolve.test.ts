import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('./read', () => ({
  fetchElement: vi.fn(),
  fetchPublicElement: vi.fn(),
}));

import { fetchElement, fetchPublicElement } from './read';
import { resolveElementForClaim } from './claim-resolve';

const fetchElementMock = vi.mocked(fetchElement);
const fetchPublicMock = vi.mocked(fetchPublicElement);

describe('resolveElementForClaim', () => {
  beforeEach(() => {
    fetchElementMock.mockReset();
    fetchPublicMock.mockReset();
  });

  it('editing_host never calls fetchPublicElement', async () => {
    fetchElementMock.mockResolvedValue(null);
    const el = await resolveElementForClaim({
      osmType: 'relation',
      osmId: 4305236658,
      resolveMode: 'editing_host',
      fallback: { name: 'Nope', lat: 1, lon: 2 },
    });
    expect(el).toBeNull();
    expect(fetchPublicMock).not.toHaveBeenCalled();
  });

  it('default may fall back to public API', async () => {
    fetchElementMock.mockResolvedValue(null);
    fetchPublicMock.mockResolvedValue({
      type: 'node',
      id: 1,
      lat: 0,
      lon: 0,
      tags: { name: 'Cafe' },
    });
    const el = await resolveElementForClaim({
      osmType: 'node',
      osmId: 1,
      resolveMode: 'default',
    });
    expect(el?.tags?.name).toBe('Cafe');
    expect(fetchPublicMock).toHaveBeenCalledOnce();
  });
});
