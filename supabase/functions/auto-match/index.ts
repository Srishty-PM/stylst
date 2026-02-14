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
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { inspiration_id, scheduled_date, save_look } = await req.json();
    if (!inspiration_id) throw new Error("Missing inspiration_id");

    // Fetch inspiration
    const { data: inspiration, error: inspoError } = await supabase
      .from("inspiration")
      .select("*")
      .eq("id", inspiration_id)
      .single();
    if (inspoError || !inspiration) throw new Error("Inspiration not found");

    // Fetch closet items
    const { data: items, error: itemsError } = await supabase
      .from("closet_items")
      .select("id, name, category, subcategory, colors, brand, tags, image_url")
      .eq("status", "ready");
    if (itemsError) throw new Error("Failed to fetch closet items");

    if (!items || items.length < 1) {
      return new Response(JSON.stringify({ error: "You need at least 1 item in your closet to auto-match." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const closetList = items.map(
      (i: any, idx: number) =>
        `[${idx}] id:"${i.id}" — ${i.name} (${i.category}${i.subcategory ? "/" + i.subcategory : ""}${i.brand ? ", " + i.brand : ""}${i.colors?.length ? ", colors: " + i.colors.join("/") : ""}${i.tags?.length ? ", tags: " + i.tags.join(", ") : ""})`
    ).join("\n");

    const systemPrompt = `You are an expert fashion stylist AI with keen visual analysis skills. You will be shown an inspiration image and a list of clothing items from the user's closet.

CRITICAL INSTRUCTIONS:
1. Carefully examine the ENTIRE inspiration image from head to toe
2. List EVERY visible clothing item and accessory: tops, bottoms (pants, skirts, shorts), dresses, outerwear, shoes, bags, belts, jewelry, hats, scarves, etc.
3. Do NOT skip any item — even partially visible ones must be included
4. For each identified item, check if a similar item exists in the user's closet
5. If a match exists → add to matched_item_ids
6. If NO match exists → add to missing_items with a descriptive name and category

Common categories: tops, bottoms, dresses, outerwear, shoes, accessories, bags

User's closet items:
${closetList}

IMPORTANT: Every garment/accessory visible in the image MUST appear in either matched_item_ids or missing_items. The total count should equal all visible items.`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: inspiration.image_url } },
          { type: "text", text: "Analyze this inspiration look. Match items from my closet and identify any missing pieces I'd need to buy to complete the look." },
        ],
      },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "create_matched_look",
              description: "Create a matched look identifying both matched closet items and missing items needed to complete the look",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Creative outfit name" },
                  matched_item_ids: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of closet item IDs that match items in the inspiration",
                  },
                  missing_items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Descriptive name of the missing item (e.g. 'Black Leather Ankle Boots')" },
                        category: { type: "string", description: "Category: tops, bottoms, dresses, outerwear, shoes, accessories, bags" },
                        description: { type: "string", description: "Brief description of the ideal item to buy" },
                      },
                      required: ["name", "category"],
                    },
                    description: "Items visible in the inspiration but missing from the user's closet",
                  },
                  occasion: { type: "string", description: "Best occasion for this outfit (casual, work, date night, formal, weekend, party)" },
                  season: { type: "string", description: "Best season (spring, summer, fall, winter, all-season)" },
                  reasoning: { type: "string", description: "Brief explanation of the look and how the pieces work together" },
                },
                required: ["name", "matched_item_ids", "missing_items", "occasion", "reasoning"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_matched_look" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return a valid match");
    }

    const match = JSON.parse(toolCall.function.arguments);

    // Validate item IDs exist in closet
    const validIds = items.map((i: any) => i.id);
    const matchedIds = (match.matched_item_ids || match.item_ids || []).filter((id: string) => validIds.includes(id));
    const missingItems = match.missing_items || [];

    // Get matched items details for response
    const matchedItems = items.filter((i: any) => matchedIds.includes(i.id));

    // No thumbnail generation — keeps response under 5s

    // If save_look is true, persist the look to the database
    let look = null;
    let scheduledOutfit = null;

    if (save_look && matchedIds.length >= 1) {
      const { data: savedLook, error: lookError } = await supabase
        .from("matched_looks")
        .insert({
          user_id: user.id,
          name: match.name,
          closet_item_ids: matchedIds,
          inspiration_id: inspiration_id,
          occasion: match.occasion || null,
          season: match.season || null,
          notes: match.reasoning || null,
          created_by_ai: true,
        })
        .select()
        .single();

      if (lookError) throw new Error("Failed to save matched look: " + lookError.message);
      look = savedLook;

      // Schedule on calendar if date provided
      if (scheduled_date && look) {
        const { data: outfit, error: schedError } = await supabase
          .from("scheduled_outfits")
          .insert({
            user_id: user.id,
            matched_look_id: look.id,
            scheduled_date,
            event_name: match.name,
          })
          .select()
          .single();
        if (schedError) console.error("Failed to schedule outfit:", schedError.message);
        else scheduledOutfit = outfit;
      }
    }

    return new Response(JSON.stringify({
      look,
      matched_items: matchedItems,
      missing_items: missingItems,
      match_name: match.name,
      occasion: match.occasion,
      season: match.season,
      reasoning: match.reasoning,
      scheduled_outfit: scheduledOutfit,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-match error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
