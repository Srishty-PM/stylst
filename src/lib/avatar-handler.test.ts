import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAvatarHandler, type AvatarDependencies } from '../../supabase/functions/avatar-try-on/handler';
import { CONSENT_VERSION } from '../../supabase/functions/avatar-try-on/core';

const photo = { mimeType: 'image/png', data: btoa('\x89PNG\r\n\x1a\nsynthetic') };
const body = () => ({ requestId: 'f9d1ae54-121c-4f8c-975d-878f3916c339', action: 'avatar', person: photo, settings: { build: 'as-photographed', hair: 'as-photographed' }, garments: [], consent: { allowed: true, adultAndOwnPhoto: true, version: CONSENT_VERSION } });
let deps: AvatarDependencies;
function req(method = 'POST', input: unknown = body(), headers: Record<string, string> = {}) {
  return new Request('https://project.example/functions/v1/avatar-try-on', { method, headers: { Origin: 'https://stylst.shop', Authorization: 'Bearer test-token', 'Content-Type': 'application/json', ...headers }, ...(method === 'POST' ? { body: JSON.stringify(input) } : {}) });
}
beforeEach(() => {
  deps = {
    origins: ['https://stylst.shop'], apiKeyConfigured: true,
    authenticate: vi.fn(async () => 'server-verified-user'),
    configuration: vi.fn(async () => ({ enabled: true, paid_services_verified: true, model: 'gemini-3.1-flash-image' })),
    availability: vi.fn(async () => ({ enabled: true, remaining: 3, dailyLimit: 3, globalAvailable: true, resetsAt: '2026-10-23T00:00:00Z' })),
    reserve: vi.fn(async () => ({ allowed: true, remaining: 2 })), finish: vi.fn(async () => undefined),
    generate: vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ inlineData: photo }] } }] }) })),
  };
});
describe('production avatar endpoint', () => {
  it('rejects unauthenticated requests and foreign origins before any provider use', async () => {
    const handler = createAvatarHandler(deps);
    expect((await handler(req('POST', body(), { Authorization: '' }))).status).toBe(401);
    expect((await handler(req('POST', body(), { Origin: 'https://foreign.example' }))).status).toBe(403);
    vi.mocked(deps.authenticate).mockResolvedValue(null);
    expect((await handler(req())).status).toBe(401);
    expect(deps.reserve).not.toHaveBeenCalled(); expect(deps.generate).not.toHaveBeenCalled();
  });
  it('returns authenticated availability without generating or reserving an image', async () => {
    const response = await createAvatarHandler(deps)(req('GET'));
    expect(await response.json()).toMatchObject({ enabled: true, remaining: 3 });
    expect(deps.availability).toHaveBeenCalledWith('server-verified-user');
    expect(deps.reserve).not.toHaveBeenCalled(); expect(deps.generate).not.toHaveBeenCalled();
  });
  it('fails closed without paid-service verification even if the API key works', async () => {
    vi.mocked(deps.configuration).mockResolvedValue({ enabled: true, paid_services_verified: false, model: 'gemini-3.1-flash-image' });
    const handler = createAvatarHandler(deps);
    expect((await handler(req())).status).toBe(503);
    expect(await (await handler(req('GET'))).json()).toMatchObject({ enabled: false });
    expect(deps.generate).not.toHaveBeenCalled();
  });
  it('rejects missing consent and oversized requests before reserving quota', async () => {
    const handler = createAvatarHandler(deps);
    expect((await handler(req('POST', { ...body(), consent: { ...body().consent, allowed: false } }))).status).toBe(400);
    expect((await handler(req('POST', body(), { 'Content-Length': String(19 * 1024 * 1024) }))).status).toBe(413);
    expect(deps.reserve).not.toHaveBeenCalled(); expect(deps.generate).not.toHaveBeenCalled();
  });
  it('does not accept an account ID or limit from the caller and records a successful reservation', async () => {
    const response = await createAvatarHandler(deps)(req('POST', { ...body(), userId: 'another-user', limit: 100000 }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ image: photo, remaining: 2 });
    expect(deps.reserve).toHaveBeenCalledWith('server-verified-user', body().requestId);
    expect(deps.finish).toHaveBeenCalledExactlyOnceWith(body().requestId, true);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
  it('does not contact Gemini when quota is exhausted or the request ID was already used', async () => {
    const handler = createAvatarHandler(deps);
    for (const reason of ['user_limit', 'global_limit', 'duplicate', 'already_running', 'busy']) {
      vi.mocked(deps.reserve).mockResolvedValue({ allowed: false, reason });
      expect((await handler(req())).status).toBe(429);
    }
    expect(deps.generate).not.toHaveBeenCalled(); expect(deps.finish).not.toHaveBeenCalled();
  });
  it('marks rejected or empty provider outputs as failures instead of showing a fabricated preview', async () => {
    vi.mocked(deps.generate).mockResolvedValue({ ok: true, status: 200, json: async () => ({ candidates: [{ finishReason: 'SAFETY' }] }) });
    const response = await createAvatarHandler(deps)(req());
    expect(response.status).toBe(422);
    expect(deps.finish).toHaveBeenCalledExactlyOnceWith(body().requestId, false);
    expect(await response.json()).not.toHaveProperty('image');
  });
  it('handles provider errors without leaking tokens, request bodies or internal errors', async () => {
    vi.mocked(deps.generate).mockRejectedValue(new Error('secret-provider-detail'));
    const response = await createAvatarHandler(deps)(req());
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('secret-provider-detail');
    expect(deps.finish).toHaveBeenCalledExactlyOnceWith(body().requestId, false);
  });
});
