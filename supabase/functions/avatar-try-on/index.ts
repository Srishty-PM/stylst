import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';
import { createAvatarHandler } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const apiKey = Deno.env.get('GEMINI_API_KEY') ?? '';
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const origins = ['https://stylst.shop', 'https://www.stylst.shop', 'https://stylst.lovable.app', 'https://id-preview--0b454f61-27b0-41ee-820d-e70c6c07f718.lovable.app', ...(Deno.env.get('TRY_ON_ALLOWED_ORIGINS') ?? '').split(',').map(value => value.trim()).filter(Boolean)];

Deno.serve(createAvatarHandler({
  origins,
  apiKeyConfigured: Boolean(apiKey),
  authenticate: async authorization => {
    const client = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error } = await client.auth.getUser();
    return error ? null : user?.id ?? null;
  },
  configuration: async () => {
    const { data, error } = await admin.from('avatar_service_config').select('enabled,paid_services_verified,model').eq('id', 1).single();
    if (error || !data) throw new Error('Avatar configuration unavailable');
    return data;
  },
  availability: async userId => {
    const { data, error } = await admin.rpc('avatar_render_status', { p_user_id: userId });
    if (error) throw new Error('Avatar usage unavailable');
    return data;
  },
  reserve: async (userId, requestId) => {
    const { data, error } = await admin.rpc('reserve_avatar_render', { p_user_id: userId, p_request_id: requestId });
    if (error) throw new Error('Avatar usage unavailable');
    return data;
  },
  finish: async (requestId, success) => {
    const { error } = await admin.rpc('finish_avatar_render', { p_request_id: requestId, p_success: success });
    if (error) throw new Error('Avatar usage could not be recorded');
  },
  generate: async (model, body) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body), signal: AbortSignal.timeout(90000),
  }),
}));
