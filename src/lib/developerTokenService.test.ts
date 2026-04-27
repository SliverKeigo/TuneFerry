import { afterEach, describe, expect, it, vi } from 'vitest';

// `developerTokenService` reads from `./env`, which is frozen at module load
// (dotenv runs once). To test both branches (prebaked / signing path) without
// touching the real `.env`, we reset the module registry and re-mock `./env`
// for each case.

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('./env');
});

describe('getDeveloperToken', () => {
  it('returns the prebaked token verbatim when configured', async () => {
    vi.doMock('./env', () => ({
      env: {
        prebakedDeveloperToken: 'preset-token-abc',
        teamId: undefined,
        keyId: undefined,
        privateKeyPath: undefined,
        privateKeyInline: undefined,
        tokenTtlSeconds: 15_777_000,
        nodeEnv: 'test',
        isVercel: false,
      },
    }));
    const { getDeveloperToken } = await import('./developerTokenService');
    expect(getDeveloperToken()).toBe('preset-token-abc');
  });

  it('throws HttpError(500) when nothing is configured', async () => {
    vi.doMock('./env', () => ({
      env: {
        prebakedDeveloperToken: undefined,
        teamId: undefined,
        keyId: undefined,
        privateKeyPath: undefined,
        privateKeyInline: undefined,
        tokenTtlSeconds: 15_777_000,
        nodeEnv: 'test',
        isVercel: false,
      },
    }));
    const { getDeveloperToken } = await import('./developerTokenService');
    const { HttpError } = await import('./httpError');
    try {
      getDeveloperToken();
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as InstanceType<typeof HttpError>).status).toBe(500);
      // Error message should fail at signing-prereqs since teamId/keyId are missing
      expect((err as InstanceType<typeof HttpError>).message).toMatch(
        /APPLE_TEAM_ID|APPLE_KEY_ID|MVP/,
      );
    }
  });

  it('errors point at APPLE_PRIVATE_KEY when team/key are set but no key material is', async () => {
    vi.doMock('./env', () => ({
      env: {
        prebakedDeveloperToken: undefined,
        teamId: 'TEAM123456',
        keyId: 'KEY1234567',
        privateKeyPath: undefined,
        privateKeyInline: undefined,
        tokenTtlSeconds: 15_777_000,
        nodeEnv: 'test',
        isVercel: false,
      },
    }));
    const { getDeveloperToken } = await import('./developerTokenService');
    const { HttpError } = await import('./httpError');
    try {
      getDeveloperToken();
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as InstanceType<typeof HttpError>).message).toMatch(/APPLE_PRIVATE_KEY/);
    }
  });
});
