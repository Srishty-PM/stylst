import { buildGeminiBody, parseRenderRequest, readGeminiImage, type Image } from './core.ts';

export interface AvatarConfig { enabled: boolean; paid_services_verified: boolean; model: string }
export interface Availability { enabled: boolean; remaining: number; dailyLimit: number; globalAvailable: boolean; resetsAt: string }
export interface AvatarDependencies {
  origins: string[];
  apiKeyConfigured: boolean;
  authenticate: (authorization: string) => Promise<string | null>;
  configuration: () => Promise<AvatarConfig>;
  availability: (userId: string) => Promise<Availability>;
  reserve: (userId: string, requestId: string) => Promise<{ allowed: boolean; reason?: string; remaining?: number }>;
  finish: (requestId: string, success: boolean) => Promise<void>;
  generate: (model: string, body: ReturnType<typeof buildGeminiBody>) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;
}
const MAX_BODY = 18 * 1024 * 1024;
const unavailable = 'Avatar generation is temporarily unavailable. Please try again later.';
const quotaMessages: Record<string, string> = {
  user_limit: 'You’ve reached today’s preview limit. Come back after midnight UTC.',
  global_limit: 'Today’s fitting-room previews have been used. Please try again tomorrow.',
  already_running: 'Your previous preview is still processing. Please wait before trying again.',
  duplicate: 'This preview request has already been received. Please wait before trying again.',
  busy: 'The fitting room is busy. Please try again in a moment.',
  disabled: unavailable,
};
export function createAvatarHandler(deps: AvatarDependencies) {
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get('Origin') ?? '';
    const allowedOrigin = deps.origins.includes(origin) ? origin : '';
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': allowedOrigin || 'null', 'Vary': 'Origin' };
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (origin && !allowedOrigin) return json({ error: 'This origin is not allowed.' }, 403);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...headers, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version' } });
    if (!['GET', 'POST'].includes(req.method)) return json({ error: 'Use GET or POST.' }, 405);
    let reservation: string | null = null;
    try {
      const auth = req.headers.get('Authorization');
      if (!auth?.startsWith('Bearer ')) return json({ error: 'Please sign in to use the fitting room.' }, 401);
      const userId = await deps.authenticate(auth);
      if (!userId) return json({ error: 'Please sign in again to use the fitting room.' }, 401);
      const config = await deps.configuration();
      const ready = config.enabled && config.paid_services_verified && deps.apiKeyConfigured && /^[a-z0-9.-]+$/.test(config.model);
      if (!ready) return req.method === 'GET' ? json({ enabled: false, message: unavailable }) : json({ error: unavailable }, 503);
      if (req.method === 'GET') return json(await deps.availability(userId));
      if (Number(req.headers.get('Content-Length')) > MAX_BODY) return json({ error: 'The photos are too large.' }, 413);
      const reader = req.body?.getReader();
      if (!reader) return json({ error: 'Choose a photo first.' }, 400);
      const chunks: Uint8Array[] = []; let length = 0;
      while (true) { const { value, done } = await reader.read(); if (done) break; length += value.length; if (length > MAX_BODY) { await reader.cancel(); return json({ error: 'The photos are too large.' }, 413); } chunks.push(value); }
      const bytes = new Uint8Array(length); let position = 0;
      for (const chunk of chunks) { bytes.set(chunk, position); position += chunk.length; }
      let request; let requestId: string;
      try {
        const body = JSON.parse(new TextDecoder().decode(bytes));
        if (typeof body.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId)) throw new Error('A valid preview request ID is required.');
        requestId = body.requestId;
        request = parseRenderRequest(body);
      } catch (error) { return json({ error: error instanceof Error ? error.message : 'Invalid preview request.' }, 400); }
      const quota = await deps.reserve(userId, requestId);
      if (!quota.allowed) return json({ error: quotaMessages[quota.reason ?? ''] ?? unavailable }, quota.reason === 'disabled' ? 503 : 429);
      reservation = requestId;
      const response = await deps.generate(config.model, buildGeminiBody(request));
      if (!response.ok) return json({ error: response.status === 429 ? 'The image service is busy. Please try again later.' : 'Your preview could not be generated. Please try another photo.' }, response.status === 429 ? 429 : 502);
      let image: Image;
      try { image = readGeminiImage(await response.json()); }
      catch (error) { return json({ error: error instanceof Error ? error.message : 'No preview was returned.' }, 422); }
      await deps.finish(requestId, true);
      reservation = null;
      return json({ image, remaining: quota.remaining });
    } catch { return json({ error: 'Your preview could not be completed. Please try again.' }, 502); }
    finally {
      if (reservation) { try { await deps.finish(reservation, false); } catch { /* A stale pending reservation remains counted conservatively. Never log image bodies. */ } }
    }
  };
}
