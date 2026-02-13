import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function refreshTokenIfNeeded(
  supabaseAdmin: any,
  userId: string,
  creds: any
) {
  const expiresAt = new Date(creds.pinterest_token_expires_at).getTime();
  // Refresh if token expires within 5 minutes
  if (Date.now() < expiresAt - 5 * 60 * 1000) {
    return creds.pinterest_access_token;
  }

  const appId = Deno.env.get("PINTEREST_APP_ID")!;
  const appSecret = Deno.env.get("PINTEREST_APP_SECRET")!;

  const res = await fetch("https://api.pinterest.com/v5/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${appId}:${appSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: creds.pinterest_refresh_token,
    }),
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${await res.text()}`);
  }

  const tokens = await res.json();
  const newExpires = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabaseAdmin.from("oauth_credentials").update({
    pinterest_access_token: tokens.access_token,
    pinterest_refresh_token: tokens.refresh_token || creds.pinterest_refresh_token,
    pinterest_token_expires_at: newExpires,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);

  return tokens.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to read oauth_credentials (RLS blocks direct access)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: creds } = await supabaseAdmin
      .from("oauth_credentials")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!creds?.pinterest_access_token) {
      return new Response(JSON.stringify({ error: "Pinterest not connected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await refreshTokenIfNeeded(supabaseAdmin, user.id, creds);

    // Fetch user's boards
    const boardsRes = await fetch("https://api.pinterest.com/v5/boards?page_size=25", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!boardsRes.ok) {
      const errText = await boardsRes.text();
      throw new Error(`Pinterest boards API error: ${errText}`);
    }
    const boardsData = await boardsRes.json();

    // Optional: get board_id from request body to sync a specific board
    let boardId: string | null = null;
    try {
      const body = await req.json();
      boardId = body.board_id || null;
    } catch { /* no body */ }

    if (!boardId) {
      // Return boards list for user to pick
      const boards = (boardsData.items || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        pin_count: b.pin_count,
        image_url: b.media?.image_cover_url || null,
      }));
      return new Response(JSON.stringify({ boards }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch pins from the selected board
    const pinsRes = await fetch(
      `https://api.pinterest.com/v5/boards/${boardId}/pins?page_size=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!pinsRes.ok) {
      throw new Error(`Pinterest pins API error: ${await pinsRes.text()}`);
    }
    const pinsData = await pinsRes.json();
    const pins = pinsData.items || [];

    // Upsert an inspiration_source for this board
    const { data: source } = await supabaseAdmin
      .from("inspiration_sources")
      .upsert(
        {
          user_id: user.id,
          source_type: "pinterest",
          external_id: boardId,
          source_name: boardsData.items?.find((b: any) => b.id === boardId)?.name || "Pinterest Board",
          sync_enabled: true,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "user_id,source_type,external_id" }
      )
      .select()
      .single();

    // Save pins as inspirations (skip duplicates by checking source_url)
    let synced = 0;
    for (const pin of pins) {
      const imageUrl =
        pin.media?.images?.["1200x"]?.url ||
        pin.media?.images?.["600x"]?.url ||
        pin.media?.images?.originals?.url;
      if (!imageUrl) continue;

      const pinUrl = `https://www.pinterest.com/pin/${pin.id}/`;

      // Check if already saved
      const { data: existing } = await supabaseAdmin
        .from("inspiration")
        .select("id")
        .eq("user_id", user.id)
        .eq("source_url", pinUrl)
        .maybeSingle();

      if (existing) continue;

      await supabaseAdmin.from("inspiration").insert({
        user_id: user.id,
        image_url: imageUrl,
        source_url: pinUrl,
        source_id: source?.id || null,
        description: pin.description || pin.title || null,
      });
      synced++;
    }

    return new Response(JSON.stringify({ synced, total_pins: pins.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Pinterest sync error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
