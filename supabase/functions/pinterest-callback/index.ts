import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToString(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function verifyState(stateParam: string, secret: string): Promise<string | null> {
  const dot = stateParam.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = stateParam.slice(0, dot);
  const sig = stateParam.slice(dot + 1);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  if (!timingSafeEqual(sig, b64url(new Uint8Array(expected)))) return null;
  try {
    const { user_id, iat } = JSON.parse(b64urlToString(payload));
    if (!user_id || typeof iat !== "number" || Date.now() - iat > 10 * 60 * 1000) return null;
    return user_id as string;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");

    if (!code || !stateParam) {
      return new Response("Missing code or state", { status: 400 });
    }

    const user_id = await verifyState(stateParam, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (!user_id) {
      return new Response("Invalid or expired state", { status: 401 });
    }

    const appId = Deno.env.get("PINTEREST_APP_ID")!;
    const appSecret = Deno.env.get("PINTEREST_APP_SECRET")!;
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/pinterest-callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://api.pinterest.com/v5/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${appId}:${appSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Pinterest token exchange failed:", errText);
      return new Response(`Token exchange failed: ${errText}`, { status: 502 });
    }

    const tokens = await tokenRes.json();

    // Store tokens securely using service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { error: upsertError } = await supabase
      .from("oauth_credentials")
      .upsert(
        {
          user_id,
          pinterest_access_token: tokens.access_token,
          pinterest_refresh_token: tokens.refresh_token,
          pinterest_token_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("Failed to store tokens:", upsertError);
      return new Response("Failed to store credentials", { status: 500 });
    }

    // Mark profile as pinterest_connected
    await supabase
      .from("profiles")
      .update({ pinterest_connected: true })
      .eq("id", user_id);

    // Redirect back to the app
    const appOrigin = Deno.env.get("APP_ORIGIN") || "https://stylst.shop";
    return new Response(null, {
      status: 302,
      headers: { Location: `${appOrigin}/pinterest-callback?success=true` },
    });
  } catch (err) {
    console.error("Pinterest callback error:", err);
    return new Response(`Error: ${err instanceof Error ? err.message : String(err)}`, { status: 500 });
  }
});
