import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_VISION_MODEL = "gemini-3.5-flash";
const GEMINI_OPENAI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

async function fetchWithRetry(url: string, options: RequestInit, attempts = 4): Promise<Response> {
  let res: Response | undefined;
  for (let i = 0; i < attempts; i++) {
    res = await fetch(url, options);
    if (res.ok || ![429, 500, 502, 503].includes(res.status)) return res;
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 600 * (i + 1)));
  }
  return res!;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function fetchImageDataUrl(url: string): Promise<{ dataUrl: string; bytes: number } | null> {
  const candidates: string[] = [];
  if (url.includes("/storage/v1/object/public/")) {
    candidates.push(
      url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/") +
        (url.includes("?") ? "&" : "?") + "width=512&quality=70"
    );
  }
  candidates.push(url);

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate);
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) continue;
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.length === 0) continue;
      return { dataUrl: `data:${contentType};base64,${bytesToBase64(bytes)}`, bytes: bytes.length };
    } catch (_) {
      continue;
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

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

    // Fetch closet items with images for visual matching
    const { data: items, error: itemsError } = await supabase
      .from("closet_items")
      .select("id, name, category, subcategory, colors, brand, tags, image_url, image_url_cleaned")
      .eq("status", "ready");
    if (itemsError) throw new Error("Failed to fetch closet items");

    if (!items || items.length < 1) {
      return new Response(JSON.stringify({ error: "You need at least 1 item in your closet to auto-match." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build rich closet list with metadata
    const closetList = items.map(
      (i: any, idx: number) =>
        `[${idx}] id:"${i.id}" — ${i.name} (${i.category}${i.subcategory ? "/" + i.subcategory : ""}${i.brand ? ", " + i.brand : ""}${i.colors?.length ? ", colors: " + i.colors.join("/") : ""}${i.tags?.length ? ", tags: " + i.tags.join(", ") : ""})`
    ).join("\n");

    const userContent: any[] = [];

    const inspoImg = await fetchImageDataUrl(inspiration.image_url);
    if (inspoImg) {
      userContent.push({ type: "image_url", image_url: { url: inspoImg.dataUrl } });
    }
    userContent.push({ type: "text", text: "⬆️ INSPIRATION IMAGE — analyze this outfit head-to-toe.\n\n⬇️ Below is the text list of the user's closet items (name, category, colours, tags). Match each inspiration garment against it." });

    userContent.push({
      type: "text",
      text: `\n\nUser's closet items (match against these):\n${closetList}\n\nNow match: for each garment/accessory visible in the INSPIRATION image, find a match ONLY from the closet items above, using the SAME garment type and a close colour. If no genuinely close item of that garment type exists, mark it missing rather than forcing a loose substitute.`,
    });

    const systemPrompt = `You are a precise fashion matching AI. You compare an INSPIRATION outfit photo against the TEXT LIST of the user's ACTUAL closet items (each has name, category, colours, tags).

YOUR TASK:
1. SCAN the inspiration image head-to-toe. List every visible garment and accessory (e.g., trench, blazer, shirt, trousers, jeans, skirt, dress, shoes, bag, belt, sunglasses, hat, jewelry).
2. For EACH inspiration item, look for a GENUINELY CLOSE match in the closet list.
3. Return matched IDs and the truly missing items.

STRICT MATCHING RULES:
- A match requires the SAME garment type AND a close colour/tone. Same-family colours are fine (navy ↔ dark blue, cream ↔ off-white, grey ↔ charcoal); black trousers ↔ black jeans is fine (both bottoms, same colour).
- Do NOT substitute across garment types. A blazer is NOT a trench coat. A cardigan is NOT a blazer. Ankle boots are NOT sneakers. A tote is NOT a clutch. If the inspiration's garment type is absent from the closet, mark it MISSING.
- Do NOT stretch across colours. A beige item does not match a black item.
- When unsure, mark it MISSING. Accuracy matters more than completing the look.

BEFORE RESPONDING, CHECK:
□ Did I identify ALL visible inspiration items?
□ Is every match the SAME garment type AND a close colour? If not, move it to missing.
□ matched_count + missing_count = total identified items.`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ];

    const response = await fetchWithRetry(GEMINI_OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GEMINI_VISION_MODEL,
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
      const t = await response.text();
      console.error("Gemini error:", response.status, t);
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
          missing_items: missingItems,
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
