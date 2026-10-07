import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('permission before AI transmission', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    localStorage.clear();
  });

  it('denies by default and does not transmit when the user declines', async () => {
    const consent = await import('./ai-consent');
    const ask = vi.fn(async () => false);
    const send = vi.fn(async () => 'sent');
    consent.registerAIConsentPrompt(ask, 'alice');
    expect(await consent.ensureAIConsent('alice')).toBe(false);
    await expect(consent.runAIRequest('alice', send)).rejects.toThrow('paused');
    expect(send).not.toHaveBeenCalled();
    expect(consent.hasAIConsent('alice')).toBe(false);
  });

  it('persists a versioned grant for one account and transmits only after that grant', async () => {
    const consent = await import('./ai-consent');
    const ask = vi.fn(async () => true);
    const send = vi.fn(async () => 'sent');
    consent.registerAIConsentPrompt(ask, 'alice');
    expect(await consent.ensureAIConsent('alice')).toBe(true);
    expect(await consent.runAIRequest('alice', send)).toBe('sent');
    expect(await consent.ensureAIConsent('alice')).toBe(true);
    expect(ask).toHaveBeenCalledTimes(1);
    expect(consent.hasAIConsent('bob')).toBe(false);
    expect(await consent.ensureAIConsent('bob')).toBe(false);
  });

  it('does not reuse the old disclosure or accept corrupt storage', async () => {
    const consent = await import('./ai-consent');
    localStorage.setItem('stylst_ai_consent_2026-09-29_alice', 'true');
    expect(consent.hasAIConsent('alice')).toBe(false);
    localStorage.setItem(`stylst_ai_consent_${consent.AI_CONSENT_VERSION}_alice`, 'true');
    expect(consent.hasAIConsent('alice')).toBe(false);
    localStorage.setItem(`stylst_ai_consent_${consent.AI_CONSENT_VERSION}_alice`, '{broken');
    expect(consent.hasAIConsent('alice')).toBe(false);
  });

  it('fails closed when the permission cannot be saved', async () => {
    const consent = await import('./ai-consent');
    consent.registerAIConsentPrompt(async () => true, 'alice');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('unavailable'); });
    expect(await consent.ensureAIConsent('alice')).toBe(false);
    expect(consent.hasAIConsent('alice')).toBe(false);
  });

  it('shows only one prompt for simultaneous requests', async () => {
    const consent = await import('./ai-consent');
    let decide!: (allowed: boolean) => void;
    const ask = vi.fn(() => new Promise<boolean>(resolve => { decide = resolve; }));
    consent.registerAIConsentPrompt(ask, 'alice');
    const first = consent.ensureAIConsent('alice');
    const second = consent.ensureAIConsent('alice');
    expect(ask).toHaveBeenCalledTimes(1);
    decide(true);
    expect(await Promise.all([first, second])).toEqual([true, true]);
  });

  it('stops the AI call when permission is withdrawn during an upload', async () => {
    const consent = await import('./ai-consent');
    consent.registerAIConsentPrompt(async () => true, 'alice');
    await consent.ensureAIConsent('alice');
    let finishUpload!: () => void;
    const upload = new Promise<void>(resolve => { finishUpload = resolve; });
    const send = vi.fn(async () => 'sent');
    const operation = (async () => { await upload; return consent.runAIRequest('alice', send); })();
    consent.setAIConsent('alice', false);
    finishUpload();
    await expect(operation).rejects.toThrow('paused');
    expect(send).not.toHaveBeenCalled();
  });

  it('blocks new requests immediately even if withdrawal storage fails', async () => {
    const consent = await import('./ai-consent');
    consent.registerAIConsentPrompt(async () => true, 'alice');
    await consent.ensureAIConsent('alice');
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('unavailable'); });
    expect(consent.setAIConsent('alice', false)).toBe(false);
    expect(consent.hasAIConsent('alice')).toBe(false);
  });

  it('does not grant or transmit for an account after the signed-in account changes', async () => {
    const consent = await import('./ai-consent');
    let decide!: (allowed: boolean) => void;
    const unregister = consent.registerAIConsentPrompt(() => new Promise(resolve => { decide = resolve; }), 'alice');
    const request = consent.ensureAIConsent('alice');
    unregister();
    consent.registerAIConsentPrompt(async () => true, 'bob');
    decide(true);
    expect(await request).toBe(false);
    expect(consent.hasAIConsent('alice')).toBe(false);
    const send = vi.fn(async () => 'sent');
    await expect(consent.runAIRequest('alice', send)).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
});
