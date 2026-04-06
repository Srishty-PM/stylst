import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") || "30");
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Unique visitors
    const { data: visitors } = await supabase
      .from("analytics_events")
      .select("user_id")
      .not("user_id", "is", null)
      .gte("created_at", since);
    const uniqueUserIds = new Set(visitors?.map((v: any) => v.user_id)).size;

    // Unique devices
    const { data: devices } = await supabase
      .from("analytics_events")
      .select("device_id")
      .gte("created_at", since);
    const uniqueDeviceCount = new Set(devices?.map((d: any) => d.device_id)).size;

    // Signups
    const { count: signupCount } = await supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "signup")
      .gte("created_at", since);

    // Logins
    const { count: loginCount } = await supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "login")
      .gte("created_at", since);

    // Outfits created
    const { count: outfitCount } = await supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "outfit_created")
      .gte("created_at", since);

    // Photos uploaded
    const { count: photoCount } = await supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "photo_uploaded")
      .gte("created_at", since);

    // Steps completed
    const { count: stepCount } = await supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "step_completed")
      .gte("created_at", since);

    // Session durations
    const { data: sessions } = await supabase
      .from("analytics_events")
      .select("event_data")
      .eq("event_type", "session_end")
      .gte("created_at", since);

    const durations = sessions
      ?.map((s: any) => s.event_data?.duration_seconds)
      .filter((d: any) => typeof d === "number") || [];
    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length)
      : 0;

    // Page views breakdown
    const { data: pageViews } = await supabase
      .from("analytics_events")
      .select("event_data")
      .eq("event_type", "page_view")
      .gte("created_at", since);

    const pageCounts: Record<string, number> = {};
    pageViews?.forEach((pv: any) => {
      const page = pv.event_data?.page || "unknown";
      pageCounts[page] = (pageCounts[page] || 0) + 1;
    });

    const result = {
      period_days: days,
      unique_visitors: uniqueUserIds,
      unique_devices: uniqueDeviceCount,
      signups: signupCount || 0,
      logins: loginCount || 0,
      outfits_created: outfitCount || 0,
      photos_uploaded: photoCount || 0,
      steps_completed: stepCount || 0,
      avg_session_duration_seconds: avgDuration,
      page_views: pageCounts,
      total_sessions: sessions?.length || 0,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Analytics error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
