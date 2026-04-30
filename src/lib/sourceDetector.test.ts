import { describe, expect, it } from 'vitest';
import { detectSource } from './sourceDetector';

const SPOTIFY_ID = '2mZkGiUygMLEzNnawpo0Ya';
const NETEASE_ID = '1234567';

describe('detectSource', () => {
  // --- Spotify URLs --------------------------------------------------------
  it('detects a canonical Spotify playlist URL with ?si= tracking', () => {
    expect(
      detectSource(`https://open.spotify.com/playlist/${SPOTIFY_ID}?si=abcdef1234567890`),
    ).toEqual({
      sourceType: 'spotify',
      id: SPOTIFY_ID,
      input: `https://open.spotify.com/playlist/${SPOTIFY_ID}?si=abcdef1234567890`,
    });
  });

  it('detects a Spotify embed URL', () => {
    expect(detectSource(`https://open.spotify.com/embed/playlist/${SPOTIFY_ID}`)).toEqual({
      sourceType: 'spotify',
      id: SPOTIFY_ID,
      input: `https://open.spotify.com/embed/playlist/${SPOTIFY_ID}`,
    });
  });

  it('detects a Spotify locale-prefixed URL', () => {
    expect(detectSource(`https://open.spotify.com/intl-ja/playlist/${SPOTIFY_ID}`)).toEqual({
      sourceType: 'spotify',
      id: SPOTIFY_ID,
      input: `https://open.spotify.com/intl-ja/playlist/${SPOTIFY_ID}`,
    });
  });

  // --- NetEase URLs --------------------------------------------------------
  it('detects a canonical NetEase playlist URL', () => {
    expect(detectSource(`https://music.163.com/playlist?id=${NETEASE_ID}&userid=678`)).toEqual({
      sourceType: 'netease',
      id: NETEASE_ID,
      input: `https://music.163.com/playlist?id=${NETEASE_ID}&userid=678`,
    });
  });

  it('detects a NetEase URL with legacy hash routing', () => {
    expect(detectSource(`https://music.163.com/#/playlist?id=${NETEASE_ID}`)).toEqual({
      sourceType: 'netease',
      id: NETEASE_ID,
      input: `https://music.163.com/#/playlist?id=${NETEASE_ID}`,
    });
  });

  it('detects a NetEase mobile subdomain URL', () => {
    expect(detectSource(`https://y.music.163.com/m/playlist?id=${NETEASE_ID}`)).toEqual({
      sourceType: 'netease',
      id: NETEASE_ID,
      input: `https://y.music.163.com/m/playlist?id=${NETEASE_ID}`,
    });
  });

  it('detects a NetEase mobile path on the main host', () => {
    expect(detectSource(`https://music.163.com/m/playlist?id=${NETEASE_ID}`)).toEqual({
      sourceType: 'netease',
      id: NETEASE_ID,
      input: `https://music.163.com/m/playlist?id=${NETEASE_ID}`,
    });
  });

  it('detects a NetEase URL with deep hash routing path', () => {
    expect(detectSource(`https://music.163.com/#/my/m/music/playlist?id=${NETEASE_ID}`)).toEqual({
      sourceType: 'netease',
      id: NETEASE_ID,
      input: `https://music.163.com/#/my/m/music/playlist?id=${NETEASE_ID}`,
    });
  });

  // --- Bare IDs ------------------------------------------------------------
  it('detects a bare 22-char Spotify ID', () => {
    expect(detectSource(SPOTIFY_ID)).toEqual({
      sourceType: 'spotify',
      id: SPOTIFY_ID,
      input: SPOTIFY_ID,
    });
  });

  it('detects a bare numeric NetEase ID (≥6 digits)', () => {
    expect(detectSource(NETEASE_ID)).toEqual({
      sourceType: 'netease',
      id: NETEASE_ID,
      input: NETEASE_ID,
    });
  });

  it('detects a long numeric NetEase ID (11 digits)', () => {
    const longId = '12345678901';
    expect(detectSource(longId)).toEqual({
      sourceType: 'netease',
      id: longId,
      input: longId,
    });
  });

  // --- Whitespace / negative paths -----------------------------------------
  it('trims surrounding whitespace before parsing', () => {
    const padded = `  https://open.spotify.com/playlist/${SPOTIFY_ID}  `;
    expect(detectSource(padded)).toEqual({
      sourceType: 'spotify',
      id: SPOTIFY_ID,
      input: `https://open.spotify.com/playlist/${SPOTIFY_ID}`,
    });
  });

  it('returns null for an empty string', () => {
    expect(detectSource('')).toBeNull();
  });

  it('returns null for a whitespace-only string', () => {
    expect(detectSource('   ')).toBeNull();
  });

  it('returns null for an unrelated URL', () => {
    expect(detectSource('https://example.com/playlist/abc?id=12345')).toBeNull();
  });

  it('returns null for a non-numeric short string', () => {
    expect(detectSource('abc')).toBeNull();
  });

  it('returns null for a malformed URL', () => {
    expect(detectSource('http://')).toBeNull();
  });

  it('returns null for a too-short numeric string (< 6 digits)', () => {
    expect(detectSource('12345')).toBeNull();
  });

  it('returns null for a non-22-char alphanumeric string', () => {
    expect(detectSource('shortAlphaNum123')).toBeNull();
  });

  it('returns null for a NetEase URL with no id query param', () => {
    expect(detectSource('https://music.163.com/playlist')).toBeNull();
  });

  it('returns null for a Spotify URL without a /playlist/ segment', () => {
    expect(detectSource('https://open.spotify.com/track/abc123')).toBeNull();
  });
});
