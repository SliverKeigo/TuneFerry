import { describe, expect, it } from 'vitest';
import { HttpError } from './httpError';
import { LIBRARY_ADD_TYPES, parseAddToLibraryBody } from './validators';

describe('parseAddToLibraryBody', () => {
  it('accepts a valid body', () => {
    const out = parseAddToLibraryBody({ type: 'songs', ids: ['123', '456'] });
    expect(out).toEqual({ type: 'songs', ids: ['123', '456'] });
  });

  it.each(LIBRARY_ADD_TYPES)('accepts every documented type (%s)', (type) => {
    const out = parseAddToLibraryBody({ type, ids: ['abc'] });
    expect(out.type).toBe(type);
  });

  it('rejects a non-object body with 400', () => {
    expect(() => parseAddToLibraryBody(null)).toThrow(HttpError);
    expect(() => parseAddToLibraryBody('not json')).toThrow(/must be a JSON object/);
  });

  it('rejects an unknown type with 400 + listing the accepted values', () => {
    try {
      parseAddToLibraryBody({ type: 'artists', ids: ['1'] });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).status).toBe(400);
      expect((err as HttpError).message).toContain('songs');
      expect((err as HttpError).message).toContain('albums');
    }
  });

  it('rejects an empty ids array', () => {
    expect(() => parseAddToLibraryBody({ type: 'songs', ids: [] })).toThrow(/non-empty array/);
  });

  it('rejects ids containing a non-string element', () => {
    expect(() => parseAddToLibraryBody({ type: 'songs', ids: ['ok', 42] })).toThrow(
      /non-empty string/,
    );
  });

  it('rejects ids containing an empty string — regression test for review item I7', () => {
    expect(() => parseAddToLibraryBody({ type: 'songs', ids: ['ok', ''] })).toThrow(
      /non-empty string/,
    );
  });

  it('rejects when ids is missing entirely', () => {
    expect(() => parseAddToLibraryBody({ type: 'songs' })).toThrow(/non-empty array/);
  });
});
