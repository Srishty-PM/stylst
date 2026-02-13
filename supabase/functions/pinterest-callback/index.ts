import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");

    if (!code || !stateParam) {
      return new Response("Missing code or state", { status: 400 });
    }

    const { user_id } = JSON.parse(atob(decodeURIComponent(stateParam)));
    if (!user_id) {
      return new Response("Invalid state", { status: 400 });
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
    const appOrigin = Deno.env.get("APP_ORIGIN") || "https://stylst.lovable.app";
    return new Response(null, {
      status: 302,
      headers: { Location: `${appOrigin}/pinterest-callback?success=true` },
    });
  } catch (err) {
    console.error("Pinterest callback error:", err);
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
});
