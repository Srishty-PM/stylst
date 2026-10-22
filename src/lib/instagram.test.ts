import { describe, expect, it } from 'vitest';
import { normalizeInstagramHandle } from './instagram';

describe('Instagram profile input', () => {
  it.each([
    ['sophielouise', 'sophielouise'],
    ['@SophieLouise', 'sophielouise'],
    ['https://www.instagram.com/sophielouise/', 'sophielouise'],
    ['instagram.com/sophielouise?igsh=abc123', 'sophielouise'],
    ['https://m.instagram.com/sophielouise/reels/', 'sophielouise'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeInstagramHandle(input)).toBe(expected);
  });

  it('allows the optional field to remain empty', () => {
    expect(normalizeInstagramHandle('')).toBe('');
  });

  it.each([
    ['https://example.com/sophielouise', 'instagram.com'],
    ['https://www.instagram.com/reel/abc123', 'not a post'],
    [`@${'a'.repeat(31)}`, 'up to 30'],
    ['name with spaces', 'up to 30'],
  ])('rejects invalid input %s', (input, message) => {
    expect(() => normalizeInstagramHandle(input)).toThrow(message);
  });
});
