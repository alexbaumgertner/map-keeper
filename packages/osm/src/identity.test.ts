import { describe, expect, it } from 'vitest';
import { OsmIdentityParseError, parseOsmIdentity } from './identity';

describe('parseOsmIdentity', () => {
  it('parses compact type/id', () => {
    expect(parseOsmIdentity('relation/4305236658')).toEqual({
      osmType: 'relation',
      osmId: 4305236658,
    });
    expect(parseOsmIdentity('  Node / 42 ')).toEqual({ osmType: 'node', osmId: 42 });
  });

  it('parses public and sandbox object URLs', () => {
    expect(
      parseOsmIdentity('https://www.openstreetmap.org/relation/4305236658'),
    ).toEqual({ osmType: 'relation', osmId: 4305236658 });
    expect(
      parseOsmIdentity('https://api06.dev.openstreetmap.org/relation/4305236658#map=15/1/2'),
    ).toEqual({ osmType: 'relation', osmId: 4305236658 });
    expect(
      parseOsmIdentity('https://master.apis.dev.openstreetmap.org/way/99'),
    ).toEqual({ osmType: 'way', osmId: 99 });
  });

  it('rejects unknown hosts and bad input', () => {
    expect(() => parseOsmIdentity('https://example.com/relation/1')).toThrow(OsmIdentityParseError);
    expect(() => parseOsmIdentity('relation/0')).toThrow(OsmIdentityParseError);
    expect(() => parseOsmIdentity('place/1')).toThrow(OsmIdentityParseError);
    expect(() => parseOsmIdentity('')).toThrow(OsmIdentityParseError);
  });
});
