import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORIES = ["tops", "bottoms", "outerwear", "dresses", "shoes", "accessories"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image_urls } = await req.json();
    if (!image_urls || !Array.isArray(image_urls) || image_urls.length === 0) {
      return new Response(JSON.stringify({ error: "image_urls array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const results = await Promise.all(
      image_urls.map(async (url: string, index: number) => {
        try {
          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: `Analyze this clothing item image. Return ONLY a JSON object with these fields:
- "name": a short descriptive name (e.g. "Black Leather Jacket", "Blue Denim Jeans")
- "category": one of ${JSON.stringify(CATEGORIES)}
- "colors": array of hex color codes detected (e.g. ["#000000"])
- "brand": detected brand name or null
- "confidence": a number 0-1 indicating how confident you are this is a clothing/accessory item and the category is correct. Use < 0.6 if unsure.

If this is NOT a clothing/fashion item, set confidence to 0 and category to "unknown".
Return ONLY valid JSON, no markdown.`,
                    },
                    {
                      type: "image_url",
                      image_url: { url },
                    },
                  ],
                },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "classify_clothing",
                    description: "Classify a clothing item from an image",
                    parameters: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        category: { type: "string", enum: [...CATEGORIES, "unknown"] },
                        colors: { type: "array", items: { type: "string" } },
                        brand: { type: "string", nullable: true },
                        confidence: { type: "number" },
                      },
                      required: ["name", "category", "colors", "confidence"],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: { type: "function", function: { name: "classify_clothing" } },
            }),
          });

          if (!response.ok) {
            console.error(`AI error for image ${index}:`, response.status);
            return { index, image_url: url, error: "AI analysis failed", needs_review: true };
          }

          const data = await response.json();
          const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall) {
            const parsed = JSON.parse(toolCall.function.arguments);
            return {
              index,
              image_url: url,
              ...parsed,
              needs_review: parsed.confidence < 0.6 || parsed.category === "unknown",
            };
          }

          // Fallback: try parsing content as JSON
          const content = data.choices?.[0]?.message?.content || "";
          try {
            const parsed = JSON.parse(content.replace(/```json?\n?|\n?```/g, "").trim());
            return {
              index,
              image_url: url,
              ...parsed,
              needs_review: (parsed.confidence || 0) < 0.6 || parsed.category === "unknown",
            };
          } catch {
            return { index, image_url: url, error: "Could not parse response", needs_review: true };
          }
        } catch (err) {
          console.error(`Error analyzing image ${index}:`, err);
          return { index, image_url: url, error: String(err), needs_review: true };
        }
      })
    );

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-clothing error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
