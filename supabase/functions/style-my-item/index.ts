import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OCCASIONS = ["casual", "formal", "date-night", "beach", "brunch", "travel", "party"];

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

    const { image_url, occasion, item_analysis } = await req.json();

    if (!image_url) {
      return new Response(JSON.stringify({ error: "image_url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Step 1: If no item_analysis provided, analyze the item first
    let analysis = item_analysis;
    if (!analysis) {
      const analyzeResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                  text: `Analyze this clothing item image. Return ONLY a JSON object with:
- "type": the item type (e.g. "trousers", "blouse", "sneakers", "jacket")
- "color": primary color (e.g. "black", "navy blue", "cream")
- "fabric": detected fabric/material if possible (e.g. "denim", "silk", "cotton", "leather") or null
- "style_notes": brief style description (e.g. "high-waisted wide-leg", "oversized fitted")
Return ONLY valid JSON, no markdown.`,
                },
                { type: "image_url", image_url: { url: image_url } },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "analyze_item",
                description: "Analyze a clothing item",
                parameters: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    color: { type: "string" },
                    fabric: { type: "string", nullable: true },
                    style_notes: { type: "string" },
                  },
                  required: ["type", "color", "style_notes"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "analyze_item" } },
        }),
      });

      if (!analyzeResponse.ok) throw new Error("Failed to analyze item");
      const analyzeData = await analyzeResponse.json();
      const toolCall = analyzeData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        analysis = JSON.parse(toolCall.function.arguments);
      } else {
        const content = analyzeData.choices?.[0]?.message?.content || "";
        analysis = JSON.parse(content.replace(/```json?\n?|\n?```/g, "").trim());
      }
    }

    // Step 2: Generate outfit suggestions
    const selectedOccasion = occasion || "casual";
    const prompt = `You are a fashion stylist. A user has a ${analysis.color} ${analysis.type}${analysis.fabric ? ` made of ${analysis.fabric}` : ""}${analysis.style_notes ? ` (${analysis.style_notes})` : ""}.

They want ${selectedOccasion} outfit ideas built around this piece.

Generate exactly 8 complete outfit suggestions. For each outfit:
1. Give it a creative name
2. Describe ALL pieces in the outfit (including the hero item)
3. Describe the overall vibe/mood
4. Provide a detailed visual description for generating an outfit image (describe the full outfit laid out flat-lay style, with the hero ${analysis.color} ${analysis.type} prominently featured)`;

    const suggestResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert fashion stylist. Return structured outfit suggestions." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_outfits",
              description: "Return outfit suggestions styled around the hero item",
              parameters: {
                type: "object",
                properties: {
                  outfits: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Creative outfit name" },
                        pieces: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              item_type: { type: "string" },
                              description: { type: "string" },
                              is_hero: { type: "boolean" },
                            },
                            required: ["item_type", "description", "is_hero"],
                            additionalProperties: false,
                          },
                        },
                        vibe: { type: "string", description: "Overall mood/vibe of the outfit" },
                        image_prompt: { type: "string", description: "Detailed visual description for AI image generation of this outfit in flat-lay style" },
                      },
                      required: ["name", "pieces", "vibe", "image_prompt"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["outfits"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_outfits" } },
      }),
    });

    if (!suggestResponse.ok) {
      if (suggestResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (suggestResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Failed to generate outfit suggestions");
    }

    const suggestData = await suggestResponse.json();
    const outfitToolCall = suggestData.choices?.[0]?.message?.tool_calls?.[0];
    let outfits: any;

    if (outfitToolCall) {
      outfits = JSON.parse(outfitToolCall.function.arguments);
    } else {
      const content = suggestData.choices?.[0]?.message?.content || "";
      outfits = JSON.parse(content.replace(/```json?\n?|\n?```/g, "").trim());
    }

    // Step 3: Generate images for each outfit
    const outfitsWithImages = await Promise.all(
      (outfits.outfits || []).slice(0, 8).map(async (outfit: any, idx: number) => {
        try {
          const imgResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3.1-flash-image-preview",
              messages: [
                {
                  role: "user",
                  content: `Generate a beautiful fashion flat-lay photograph of this outfit: ${outfit.image_prompt}. Style: clean white background, editorial fashion photography, items arranged aesthetically. The ${analysis.color} ${analysis.type} should be the central prominent piece. High-end fashion magazine quality.`,
                },
              ],
              modalities: ["image", "text"],
            }),
          });

          if (!imgResponse.ok) {
            console.error(`Image gen failed for outfit ${idx}:`, imgResponse.status);
            return { ...outfit, image_url: null };
          }

          const imgData = await imgResponse.json();
          const imageUrl = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

          if (imageUrl) {
            // Upload to storage
            const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
            const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
            const filePath = `style-my-item/${authData.user.id}/${crypto.randomUUID()}.png`;

            const { error: uploadError } = await supabase.storage
              .from("inspiration-images")
              .upload(filePath, binaryData, { contentType: "image/png" });

            if (uploadError) {
              console.error("Upload error:", uploadError);
              return { ...outfit, image_url: null };
            }

            const { data: urlData } = supabase.storage
              .from("inspiration-images")
              .getPublicUrl(filePath);

            return { ...outfit, image_url: urlData.publicUrl };
          }

          return { ...outfit, image_url: null };
        } catch (err) {
          console.error(`Image gen error for outfit ${idx}:`, err);
          return { ...outfit, image_url: null };
        }
      })
    );

    return new Response(
      JSON.stringify({
        item_analysis: analysis,
        outfits: outfitsWithImages,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("style-my-item error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
