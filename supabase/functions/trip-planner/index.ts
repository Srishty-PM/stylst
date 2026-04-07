import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;
    const body = await req.json();
    const { action } = body;

    // ACTION: geocode — look up city coordinates
    if (action === "geocode") {
      const { query } = body;
      if (!query) throw new Error("query is required");

      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
      );
      const geoData = await geoRes.json();
      const results = (geoData.results || []).map((r: any) => ({
        name: r.name,
        country: r.country,
        admin1: r.admin1,
        latitude: r.latitude,
        longitude: r.longitude,
      }));

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: weather — fetch forecast
    if (action === "weather") {
      const { latitude, longitude, start_date, end_date } = body;
      if (!latitude || !longitude || !start_date || !end_date) {
        throw new Error("latitude, longitude, start_date, end_date required");
      }

      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max&start_date=${start_date}&end_date=${end_date}&timezone=auto`
      );
      const weatherData = await weatherRes.json();

      // Summarize weather
      const daily = weatherData.daily || {};
      const days = (daily.time || []).map((date: string, i: number) => ({
        date,
        temp_max: daily.temperature_2m_max?.[i],
        temp_min: daily.temperature_2m_min?.[i],
        weather_code: daily.weathercode?.[i],
        rain_chance: daily.precipitation_probability_max?.[i],
      }));

      const avgMax = days.length > 0
        ? Math.round(days.reduce((s: number, d: any) => s + (d.temp_max || 0), 0) / days.length)
        : 0;
      const avgMin = days.length > 0
        ? Math.round(days.reduce((s: number, d: any) => s + (d.temp_min || 0), 0) / days.length)
        : 0;

      // Simple weather code interpretation
      const codes = days.map((d: any) => d.weather_code || 0);
      const rainy = codes.filter((c: number) => c >= 51).length;
      const cloudy = codes.filter((c: number) => c >= 2 && c < 51).length;
      let condition = "sunny throughout";
      if (rainy > days.length / 2) condition = "mostly rainy";
      else if (rainy > 0) condition = "some rain expected";
      else if (cloudy > days.length / 2) condition = "partly cloudy";

      return new Response(
        JSON.stringify({
          summary: `${avgMin}–${avgMax}°C, ${condition}`,
          avg_high: avgMax,
          avg_low: avgMin,
          condition,
          days,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: suggest — generate outfit suggestions
    if (action === "suggest") {
      const { destination, start_date, end_date, weather_summary, activities } = body;
      if (!activities || activities.length === 0) throw new Error("activities required");

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      // Fetch user's closet items
      const { data: closetItems } = await supabase
        .from("closet_items")
        .select("id, name, category, colors, brand, image_url, image_url_cleaned, status")
        .eq("status", "ready")
        .limit(200);

      // Fetch user's inspiration
      const { data: inspirations } = await supabase
        .from("inspiration")
        .select("id, image_url, description, detected_items")
        .limit(50);

      const closetSummary = (closetItems || [])
        .map((item: any) => `${item.name} (${item.category}${item.colors?.length ? ", " + item.colors.join("/") : ""}${item.brand ? ", " + item.brand : ""}) [id:${item.id}]`)
        .join("\n");

      const inspoSummary = (inspirations || [])
        .filter((i: any) => i.detected_items?.length)
        .map((i: any) => `Inspiration: ${i.detected_items.join(", ")}`)
        .join("\n");

      const prompt = `You are a fashion stylist and travel packing expert.

A user is travelling to ${destination} from ${start_date} to ${end_date}.
Weather: ${JSON.stringify(weather_summary)}

Activities planned: ${activities.join(", ")}

USER'S EXISTING WARDROBE:
${closetSummary || "No items in wardrobe yet"}

USER'S STYLE INSPIRATION:
${inspoSummary || "No saved inspiration"}

For EACH activity, suggest one complete outfit. Rules:
1. PRIORITIZE items from the user's existing wardrobe — reference them by name and include their id
2. For items the user doesn't own, suggest what they need (these are "missing" items)
3. Consider the weather when suggesting outfits
4. Each outfit should be practical and stylish for the specific activity
5. Maximize item reuse across outfits to minimize packing`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a fashion-savvy travel packing assistant." },
            { role: "user", content: prompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_trip_looks",
                description: "Return outfit suggestions for each trip activity",
                parameters: {
                  type: "object",
                  properties: {
                    looks: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          activity: { type: "string", description: "The activity this look is for" },
                          look_name: { type: "string", description: "Creative name for this look" },
                          items: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                name: { type: "string" },
                                category: { type: "string" },
                                from_wardrobe: { type: "boolean", description: "true if this item exists in user's wardrobe" },
                                wardrobe_item_id: { type: "string", nullable: true, description: "ID from user's wardrobe if from_wardrobe is true" },
                                description: { type: "string", description: "Brief description or styling note" },
                              },
                              required: ["name", "category", "from_wardrobe", "description"],
                              additionalProperties: false,
                            },
                          },
                          styling_tip: { type: "string", description: "One-line styling tip for this look" },
                        },
                        required: ["activity", "look_name", "items", "styling_tip"],
                        additionalProperties: false,
                      },
                    },
                    packing_list: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          item_name: { type: "string" },
                          category: { type: "string" },
                          from_wardrobe: { type: "boolean" },
                          used_for: { type: "array", items: { type: "string" }, description: "Which activities this item is used in" },
                        },
                        required: ["item_name", "category", "from_wardrobe", "used_for"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["looks", "packing_list"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "return_trip_looks" } },
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI gateway error");
      }

      const aiResult = await response.json();
      const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
      let result: any;

      if (toolCall) {
        result = JSON.parse(toolCall.function.arguments);
      } else {
        const content = aiResult.choices?.[0]?.message?.content || "";
        result = JSON.parse(content.replace(/```json?\n?|\n?```/g, "").trim());
      }

      // Enrich wardrobe items with image URLs
      const itemMap = new Map((closetItems || []).map((i: any) => [i.id, i]));
      if (result.looks) {
        for (const look of result.looks) {
          for (const item of look.items) {
            if (item.from_wardrobe && item.wardrobe_item_id && itemMap.has(item.wardrobe_item_id)) {
              const wardrobeItem = itemMap.get(item.wardrobe_item_id);
              item.image_url = wardrobeItem.image_url_cleaned || wardrobeItem.image_url;
            }
          }
        }
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("trip-planner error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
