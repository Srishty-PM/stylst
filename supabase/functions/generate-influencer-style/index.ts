import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { influencer_name, instagram_handle } = await req.json();
    if (!influencer_name?.trim()) throw new Error("Missing influencer_name");

    // Check cache first (case-insensitive)
    const { data: cached } = await supabase
      .from("influencer_styles")
      .select("*")
      .ilike("influencer_name", influencer_name.trim())
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({ success: true, profile: cached.style_profile, id: cached.id, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate with AI
    const prompt = `You are a fashion expert. Describe the style of fashion influencer "${influencer_name.trim()}"${instagram_handle ? ` (Instagram: @${instagram_handle})` : ""}.

Provide:
1. Overall aesthetic (one sentence)
2. Top 5 signature colors they wear
3. Common silhouettes (oversized, fitted, etc.)
4. Key pieces they're known for (5-7 items)
5. Occasions/vibes (3-5 descriptors)
6. Style keywords (5 adjectives)
7. 2-3 similar influencers
8. Confidence score (0.0-1.0) based on how well-known they are as a fashion influencer

If you don't recognize this influencer or they're not a fashion influencer, return confidence: 0.0.

Return ONLY valid JSON in this exact format:
{
  "aesthetic": "string",
  "colors": ["color1", "color2"],
  "silhouettes": ["silhouette1"],
  "keyPieces": ["piece1"],
  "occasions": ["occasion1"],
  "keywords": ["keyword1"],
  "similarInfluencers": ["name1", "name2"],
  "confidence": 0.85,
  "generatedBy": "AI"
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI service unavailable");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse AI response");

    const styleProfile = JSON.parse(jsonMatch[0]);

    if (styleProfile.confidence < 0.3) {
      return new Response(JSON.stringify({ success: false, error: "unknown_influencer", message: `AI couldn't find reliable style information for "${influencer_name}".` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache in database (use service role for insert since any authenticated user can insert)
    const { data: inserted, error: insertError } = await supabase
      .from("influencer_styles")
      .insert({
        influencer_name: influencer_name.trim(),
        instagram_handle: instagram_handle?.trim() || null,
        style_profile: styleProfile,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Cache insert error:", insertError);
      // Return profile anyway even if cache fails
      return new Response(JSON.stringify({ success: true, profile: styleProfile, cached: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, profile: styleProfile, id: inserted.id, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-influencer-style error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
