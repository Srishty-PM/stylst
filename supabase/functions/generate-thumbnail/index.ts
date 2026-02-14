import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { item_name, category } = await req.json();
    if (!item_name) throw new Error("item_name is required");

    const prompt = `Generate a clean, minimal product photo of a "${item_name}" (${category || "clothing"}) on a plain white background. Fashion e-commerce style, no model, just the item flat-lay or on invisible mannequin. Simple, elegant, high quality.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Failed to generate thumbnail" }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    console.log("AI response structure:", JSON.stringify(result.choices?.[0]?.message).substring(0, 500));

    // Try multiple possible response formats for the image URL
    const message = result.choices?.[0]?.message;
    let imageUrl: string | undefined;

    // Format 1: inline_data in parts
    if (message?.parts) {
      for (const part of message.parts) {
        if (part.inline_data?.data) {
          imageUrl = `data:${part.inline_data.mime_type || 'image/png'};base64,${part.inline_data.data}`;
          break;
        }
      }
    }

    // Format 2: images array
    if (!imageUrl && message?.images?.[0]) {
      const img = message.images[0];
      imageUrl = img.image_url?.url || img.url || img;
    }

    // Format 3: content array with image parts
    if (!imageUrl && Array.isArray(message?.content)) {
      for (const part of message.content) {
        if (part.type === 'image_url') {
          imageUrl = part.image_url?.url;
          break;
        }
        if (part.type === 'image' && part.source?.data) {
          imageUrl = `data:${part.source.media_type || 'image/png'};base64,${part.source.data}`;
          break;
        }
      }
    }

    if (!imageUrl) {
      console.error("No image found in response. Full message:", JSON.stringify(message).substring(0, 1000));
      return new Response(JSON.stringify({ error: "No image generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ thumbnail_url: imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-thumbnail error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
