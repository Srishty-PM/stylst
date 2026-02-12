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
    const { image_url, user_id } = await req.json();
    if (!image_url || !user_id) {
      return new Response(JSON.stringify({ error: "image_url and user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Use Gemini image generation to create a clean, background-removed version
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Remove the background from this clothing item image. Make the background pure white (#FFFFFF). Keep the clothing item crisp, clean, and high quality. Center the item in the frame. The result should look like a professional product photo on a white background.",
              },
              {
                type: "image_url",
                image_url: { url: image_url },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI image error:", response.status, errText);
      // If background removal fails, return the original image
      return new Response(JSON.stringify({ cleaned_url: image_url, cleaned: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("No image in AI response");
      return new Response(JSON.stringify({ cleaned_url: image_url, cleaned: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload the cleaned image to storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Convert base64 to Uint8Array
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const cleanPath = `${user_id}/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("closet-images")
      .upload(cleanPath, bytes, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ cleaned_url: image_url, cleaned: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: publicUrlData } = supabase.storage
      .from("closet-images")
      .getPublicUrl(cleanPath);

    return new Response(
      JSON.stringify({ cleaned_url: publicUrlData.publicUrl, cleaned: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("remove-background error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
