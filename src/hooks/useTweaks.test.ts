import { describe, expect, it } from 'vitest';
import { DEFAULT_TWEAKS, sanitizeTweaks } from './useTweaks';

describe('sanitizeTweaks', () => {
  it('falls back to defaults for null / non-object input', () => {
    expect(sanitizeTweaks(null)).toEqual(DEFAULT_TWEAKS);
    expect(sanitizeTweaks(undefined)).toEqual(DEFAULT_TWEAKS);
    expect(sanitizeTweaks('not-an-object')).toEqual(DEFAULT_TWEAKS);
    expect(sanitizeTweaks(42)).toEqual(DEFAULT_TWEAKS);
    expect(sanitizeTweaks([])).toEqual(DEFAULT_TWEAKS);
  });

  it('keeps every valid value through unchanged', () => {
    expect(
      sanitizeTweaks({
        theme: 'light',
        surface: 'flat',
        nav: 'topnav',
        accentHue: 295,
        locale: 'zh',
      }),
    ).toEqual({
      theme: 'light',
      surface: 'flat',
      nav: 'topnav',
      accentHue: 295,
      locale: 'zh',
    });
  });

  it('coerces unknown enum values back to defaults', () => {
    const result = sanitizeTweaks({
      theme: 'midnight',
      surface: 'fluid',
      nav: 'cards',
      accentHue: 999,
      locale: 'fr',
    });
    expect(result).toEqual(DEFAULT_TWEAKS);
  });

  it('keeps valid fields and replaces only invalid ones', () => {
    const result = sanitizeTweaks({
      theme: 'light',
      // surface, nav, locale, accentHue are all bad
      surface: 'fluid',
      nav: 'cards',
      accentHue: 'red',
      locale: 'fr',
    });
    expect(result).toEqual({
      theme: 'light',
      surface: DEFAULT_TWEAKS.surface,
      nav: DEFAULT_TWEAKS.nav,
      accentHue: DEFAULT_TWEAKS.accentHue,
      locale: DEFAULT_TWEAKS.locale,
    });
  });

  it('rejects accentHue values not in the allow-list, even if numeric', () => {
    expect(sanitizeTweaks({ accentHue: 0 }).accentHue).toBe(DEFAULT_TWEAKS.accentHue);
    expect(sanitizeTweaks({ accentHue: -1 }).accentHue).toBe(DEFAULT_TWEAKS.accentHue);
    expect(sanitizeTweaks({ accentHue: 360 }).accentHue).toBe(DEFAULT_TWEAKS.accentHue);
    // Whitelisted hues survive.
    expect(sanitizeTweaks({ accentHue: 30 }).accentHue).toBe(30);
    expect(sanitizeTweaks({ accentHue: 340 }).accentHue).toBe(340);
  });

  it('rejects non-number accentHue', () => {
    expect(sanitizeTweaks({ accentHue: '135' as unknown as number }).accentHue).toBe(
      DEFAULT_TWEAKS.accentHue,
    );
    expect(sanitizeTweaks({ accentHue: null as unknown as number }).accentHue).toBe(
      DEFAULT_TWEAKS.accentHue,
    );
  });

  it('drops unknown keys instead of preserving them', () => {
    // The hook reads `Partial<Tweaks>` from localStorage but a stale entry
    // could carry fields we no longer support. They must not survive sanitize.
    const dirty = {
      theme: 'dark',
      futureKey: 'should-not-survive',
      __proto__shenanigans: true,
    } as unknown;
    const result = sanitizeTweaks(dirty) as unknown as Record<string, unknown>;
    expect(result).toEqual(DEFAULT_TWEAKS);
    expect(result).not.toHaveProperty('futureKey');
    expect(result).not.toHaveProperty('__proto__shenanigans');
  });

  it('mirrors the setTweak self-heal write path: a single legitimate write scrubs dirty siblings', () => {
    // Mirrors `setStored((prev) => ({ ...sanitizeTweaks(prev), [key]: value }))`
    // — one well-formed write rewrites localStorage as a fully clean object.
    const dirtyPrev = {
      theme: 'midnight', // invalid → default
      surface: 'glass', // valid → kept
      nav: 'cards', // invalid → default
      accentHue: 999, // invalid → default
      locale: 'fr', // invalid → default
    };
    const newValue: { key: keyof typeof DEFAULT_TWEAKS; value: unknown } = {
      key: 'locale',
      value: 'zh',
    };
    const next = { ...sanitizeTweaks(dirtyPrev), [newValue.key]: newValue.value };
    expect(next).toEqual({
      theme: DEFAULT_TWEAKS.theme,
      surface: 'glass',
      nav: DEFAULT_TWEAKS.nav,
      accentHue: DEFAULT_TWEAKS.accentHue,
      locale: 'zh',
    });
  });
});
