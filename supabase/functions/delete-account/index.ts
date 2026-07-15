import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const USER_TABLES_CHILD_FIRST = [
  "user_influencer_preferences",
  "scheduled_outfits",
  "matched_looks",
  "inspiration",
  "influencer_styles",
  "inspiration_sources",
  "closet_items",
  "trips",
  "oauth_credentials",
  "analytics_events",
  "profiles",
];

const STORAGE_BUCKETS = ["closet-images", "inspiration-images"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = authData.user.id;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    for (const bucket of STORAGE_BUCKETS) {
      const { data: files, error: listErr } = await admin.storage.from(bucket).list(userId, { limit: 1000 });
      if (listErr) {
        console.error(`list ${bucket} failed:`, listErr.message);
        continue;
      }
      if (files && files.length) {
        const paths = files.map((f) => `${userId}/${f.name}`);
        const { error: removeErr } = await admin.storage.from(bucket).remove(paths);
        if (removeErr) console.error(`remove from ${bucket} failed:`, removeErr.message);
      }
    }

    for (const table of USER_TABLES_CHILD_FIRST) {
      const column = table === "profiles" ? "id" : "user_id";
      const { error } = await admin.from(table).delete().eq(column, userId);
      if (error) console.error(`delete from ${table} failed:`, error.message);
    }

    const { error: deleteUserErr } = await admin.auth.admin.deleteUser(userId);
    if (deleteUserErr) {
      console.error("auth.admin.deleteUser failed:", deleteUserErr.message);
      return json({ error: "Failed to delete account" }, 500);
    }

    return json({ success: true });
  } catch (e) {
    console.error("delete-account error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
