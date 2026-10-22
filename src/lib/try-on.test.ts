import { describe, it, expect } from 'vitest';
import { canRenderTryOn, isWebRelease } from './next-release';
import { avatarSettingsSchema, TRY_ON_CONSENT_VERSION } from './try-on';
import { parseRenderRequest, buildGeminiBody, readGeminiImage, CONSENT_VERSION } from '../../supabase/functions/avatar-try-on/core';

const image = { mimeType: 'image/png' as const, data: btoa('\x89PNG\r\n\x1a\nreference') };
const request = () => ({ action: 'avatar', person: image, settings: { build: 'as-photographed', hair: 'as-photographed' }, garments: [], consent: { version: TRY_ON_CONSENT_VERSION, allowed: true, adultAndOwnPhoto: true } });

describe('try-on isolation and input contract', () => {
  it('enables the new navigation only on web, never in packaged iOS or Android', () => {
    expect(isWebRelease('web')).toBe(true);
    expect(isWebRelease('ios')).toBe(false);
    expect(isWebRelease('android')).toBe(false);
  });
  it('requires affirmative server readiness and available quota before sending photos', () => {
    expect(canRenderTryOn(true)).toBe(false);
    expect(canRenderTryOn(true, { enabled: false, remaining: 3 })).toBe(false);
    expect(canRenderTryOn(false, { enabled: true, remaining: 3 })).toBe(false);
    expect(canRenderTryOn(true, { enabled: true, remaining: 0 })).toBe(false);
    expect(canRenderTryOn(true, { enabled: true, remaining: 3, globalAvailable: false })).toBe(false);
    expect(canRenderTryOn(true, { enabled: true, remaining: 3, globalAvailable: true })).toBe(true);
  });
  it('requires the dedicated current photo consent, independently of old styling consent', () => {
    expect(TRY_ON_CONSENT_VERSION).toBe(CONSENT_VERSION);
    for (const consent of [null, { allowed: true }, { ...request().consent, version: 'old' }, { ...request().consent, adultAndOwnPhoto: false }, { ...request().consent, allowed: false }]) {
      expect(() => parseRenderRequest({ ...request(), consent })).toThrow();
    }
  });
  it('accepts the default unchanged likeness but rejects invalid edits and mislabelled images', () => {
    expect(parseRenderRequest(request()).settings.build).toBe('as-photographed');
    expect(avatarSettingsSchema.safeParse({ ...request().settings, heightCm: 163 }).success).toBe(true);
    for (const heightCm of [0, 119, 221, 163.5, NaN]) expect(() => parseRenderRequest({ ...request(), settings: { ...request().settings, heightCm } })).toThrow();
    expect(() => parseRenderRequest({ ...request(), person: { mimeType: 'image/jpeg', data: image.data } })).toThrow();
    expect(() => parseRenderRequest({ ...request(), person: { mimeType: 'image/png', data: 'https://untrusted.example/image' } })).toThrow();
  });
  it('requires garment images and enforces the four clothing piece limit', () => {
    expect(() => parseRenderRequest({ ...request(), action: 'try-on' })).toThrow();
    const garment = { name: 'Blue shirt', category: 'tops', image };
    const parsed = parseRenderRequest({ ...request(), action: 'try-on', garments: [garment] });
    expect(buildGeminiBody(parsed).contents[0].parts).toHaveLength(3);
    expect(() => parseRenderRequest({ ...request(), action: 'try-on', garments: Array(5).fill(garment) })).toThrow();
    expect(() => parseRenderRequest({ ...request(), action: 'try-on', garments: [{ ...garment, category: 'shoes' }] })).toThrow();
  });
  it('does not reapply avatar changes during garment try-on and never returns thought images', () => {
    const parsed = parseRenderRequest({ ...request(), action: 'try-on', garments: [{ name: 'Shirt', category: 'tops', image }] });
    expect(buildGeminiBody(parsed).contents[0].parts[0]).toHaveProperty('text', expect.stringContaining('Do not apply build or hair changes during try-on'));
    expect(readGeminiImage({ candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, inlineData: { ...image, data: btoa('thought') } }, { inlineData: image }] } }] })).toEqual(image);
    expect(() => readGeminiImage({ candidates: [{ finishReason: 'SAFETY' }] })).toThrow();
    expect(() => readGeminiImage({ candidates: [{ content: { parts: [{ text: 'No image' }] } }] })).toThrow();
  });
});
