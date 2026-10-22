import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';
import { buildGeminiBody, parseRenderRequest, readGeminiImage } from './core.ts';

const MAX_BODY = 18 * 1024 * 1024;
const attempts = new Map<string, number[]>(); // Test-only throttle; persistent quotas required before production.
const json = (body: unknown, status: number, origin: string) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } });

Deno.serve(async req => {
  const origin = req.headers.get('Origin') ?? '';
  const origins = (Deno.env.get('TRY_ON_ALLOWED_ORIGINS') ?? '').split(',').map(v => v.trim()).filter(Boolean);
  const allowedOrigin = origins.includes(origin) ? origin : '';
  if (origin && !allowedOrigin) return json({ error: 'This preview origin is not allowed.' }, 403, 'null');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Vary': 'Origin' } });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405, allowedOrigin);
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  // A new endpoint cannot accidentally activate against STYLST's existing production project.
  if (Deno.env.get('TRY_ON_PREVIEW_ENABLED') !== 'true' || new URL(supabaseUrl || 'https://invalid.example').hostname === 'dzhhrtxlmmmbhggwsbrh.supabase.co') return json({ error: 'Image rendering is disabled. Configure a separate test backend.' }, 503, allowedOrigin);
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Sign in to the test account.' }, 401, allowedOrigin);
  const client = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return json({ error: 'Sign in to the test account again.' }, 401, allowedOrigin);
  const testers = (Deno.env.get('TRY_ON_TEST_USER_IDS') ?? '').split(',').map(v => v.trim());
  if (!testers.includes(user.id)) return json({ error: 'Try-on is available only to configured test accounts.' }, 403, allowedOrigin);
  const recent = (attempts.get(user.id) ?? []).filter(time => Date.now() - time < 60 * 60 * 1000);
  if (recent.length >= 6) return json({ error: 'The preview limit has been reached. Try again in an hour.' }, 429, allowedOrigin);
  const model = Deno.env.get('GEMINI_TRY_ON_MODEL'), apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!model || !/^[a-z0-9.-]+$/.test(model) || !apiKey || Deno.env.get('GEMINI_PAID_SERVICES_VERIFIED') !== 'true') return json({ error: 'The test image service is not configured.' }, 503, allowedOrigin);
  try {
    if (Number(req.headers.get('Content-Length')) > MAX_BODY) return json({ error: 'The photos are too large.' }, 413, allowedOrigin);
    const reader = req.body?.getReader();
    if (!reader) return json({ error: 'Choose a photo first.' }, 400, allowedOrigin);
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) { const { value, done } = await reader.read(); if (done) break; length += value.length; if (length > MAX_BODY) { await reader.cancel(); return json({ error: 'The photos are too large.' }, 413, allowedOrigin); } chunks.push(value); }
    const bytes = new Uint8Array(length); let position = 0;
    for (const chunk of chunks) { bytes.set(chunk, position); position += chunk.length; }
    let request;
    try { request = parseRenderRequest(JSON.parse(new TextDecoder().decode(bytes))); }
    catch (error) { return json({ error: error instanceof Error ? error.message : 'Invalid preview request.' }, 400, allowedOrigin); }
    attempts.set(user.id, [...recent, Date.now()]);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify(buildGeminiBody(request)), signal: AbortSignal.timeout(90000) });
    if (!response.ok) return json({ error: response.status === 429 ? 'The image service is busy. Please try again later.' : 'The image service could not create this preview. Please try again.' }, response.status === 429 ? 429 : 502, allowedOrigin);
    try { return json({ image: readGeminiImage(await response.json()) }, 200, allowedOrigin); }
    catch (error) { return json({ error: error instanceof Error ? error.message : 'No image was returned.' }, 422, allowedOrigin); }
  } catch { return json({ error: 'Your preview could not be completed. Please try again.' }, 502, allowedOrigin); }
});
