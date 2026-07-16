import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_MODELS = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-3.1-flash-lite"];
const GEMINI_OPENAI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

async function fetchWithRetry(url: string, options: RequestInit, attempts = 2): Promise<Response> {
  let res: Response | undefined;
  for (let i = 0; i < attempts; i++) {
    res = await fetch(url, options);
    if (res.ok || ![429, 500, 502, 503].includes(res.status)) return res;
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 600 * (i + 1)));
  }
  return res!;
}

async function callGeminiWithFallback(apiKey: string, body: Record<string, unknown>): Promise<Response> {
  let lastRes: Response | undefined;
  for (const model of GEMINI_MODELS) {
    const res = await fetchWithRetry(GEMINI_OPENAI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, model }),
    });
    if (res.ok) return res;
    lastRes = res;
    if ([400, 401, 403].includes(res.status)) return res;
    console.error(`Gemini model ${model} unavailable (${res.status}), trying next`);
  }
  return lastRes!;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    // Get user's closet items
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { data: items, error: itemsError } = await supabase
      .from("closet_items")
      .select("id, name, category, colors, brand, status, tags")
      .eq("status", "ready");

    if (itemsError) throw new Error("Failed to fetch closet items");

    // Fetch active influencer styles
    const { data: influencerPrefs } = await supabase
      .from("user_influencer_preferences")
      .select("influencer_styles(influencer_name, style_profile)")
      .eq("user_id", user.id)
      .eq("is_active", true);

    const { prompt } = await req.json();
    if (!prompt) throw new Error("Missing prompt");

    const closetSummary = (items || []).map(
      (i: any) => `- ${i.name} (${i.category}${i.brand ? `, ${i.brand}` : ""}${i.colors?.length ? `, colors: ${i.colors.join("/")}` : ""}${i.tags?.length ? `, tags: ${i.tags.join(", ")}` : ""})`
    ).join("\n");

    // Build influencer context
    let influencerContext = "";
    if (influencerPrefs?.length) {
      const influencerDetails = influencerPrefs
        .map((p: any) => p.influencer_styles)
        .filter(Boolean)
        .map((s: any) => {
          const sp = s.style_profile;
          return `- ${s.influencer_name}: ${sp.aesthetic || ""}. Colors: ${(sp.colors || []).join(", ")}. Key pieces: ${(sp.keyPieces || []).join(", ")}. Style: ${(sp.keywords || []).join(", ")}`;
        })
        .join("\n");

      influencerContext = `\n\nUser's Style Influences (fashion influencers they admire):\n${influencerDetails}\n\nWhen generating outfits, incorporate the aesthetic of these influencers. Match their color palettes, silhouettes, and overall vibe where possible.`;
    }

    const systemPrompt = `You are an expert fashion stylist AI. The user has these items in their closet (only "ready" items shown):

${closetSummary || "The user's closet is empty."}${influencerContext}

Based on the user's request, suggest 1-3 outfit combinations using ONLY items from their closet above. For each outfit:
1. Give it a creative name
2. List the exact item names to combine
3. Explain why they work together (style, color harmony, occasion fit)${influencerPrefs?.length ? "\n4. Mention which influencer's aesthetic inspired this outfit and why" : ""}
4. Rate the outfit match (1-5 stars)

If the closet doesn't have enough items for the request, say so honestly and suggest what items they could add. Be enthusiastic but genuine.`;

    const response = await callGeminiWithFallback(GEMINI_API_KEY, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      stream: true,
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini error (all models):", response.status, t);
      const busyMsg = "Our styling AI is very busy right now. Please try again in a moment.";
      return new Response(JSON.stringify({ error: busyMsg }), {
        status: response.status === 429 ? 429 : 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-stylist error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
