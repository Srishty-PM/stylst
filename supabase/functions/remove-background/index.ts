import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image";

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

function detectMime(bytes: Uint8Array): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) return "image/jpeg";
  return "image/jpeg";
}

function extractInlineImage(data: any): string | null {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  for (const part of parts) {
    const inline = part?.inlineData || part?.inline_data;
    if (inline?.data) {
      const mime = inline.mimeType || inline.mime_type || "image/png";
      return `data:${mime};base64,${inline.data}`;
    }
  }
  return null;
}

/** Read width & height from PNG IHDR chunk (bytes 16-23) or JPEG SOF marker */
function getImageDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  // PNG: bytes 0-7 = signature, 8-15 = IHDR length+type, 16-19 = width, 20-23 = height
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
    const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
    return { width, height };
  }
  // JPEG: scan for SOF0 (0xFFC0) or SOF2 (0xFFC2) marker
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
    let i = 2;
    while (i < bytes.length - 9) {
      if (bytes[i] === 0xFF) {
        const marker = bytes[i + 1];
        if (marker === 0xC0 || marker === 0xC2) {
          const height = (bytes[i + 5] << 8) | bytes[i + 6];
          const width = (bytes[i + 7] << 8) | bytes[i + 8];
          return { width, height };
        }
        const segLen = (bytes[i + 2] << 8) | bytes[i + 3];
        i += 2 + segLen;
      } else {
        i++;
      }
    }
  }
  return null;
}

function isPortrait(dims: { width: number; height: number }): boolean {
  return dims.height > dims.width;
}

async function fetchImageBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

async function callAICleanup(apiKey: string, imageBytes: Uint8Array, mimeType: string, orientationHint: string): Promise<string | null> {
  const response = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Remove the background from this clothing item image. Make the background pure white (#FFFFFF). CRITICAL RULES: The output image MUST be in ${orientationHint} orientation. Do NOT rotate, flip, or change the aspect ratio. Do NOT make a square image. Keep the exact same proportions. Center the clothing item. Professional product photo style.`,
              },
              {
                inline_data: { mime_type: mimeType, data: bytesToBase64(imageBytes) },
              },
            ],
          },
        ],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("Gemini image error:", response.status, errText);
    return null;
  }

  const data = await response.json();
  return extractInlineImage(data);
}

function base64ToBytes(b64: string): Uint8Array {
  const raw = b64.replace(/^data:image\/\w+;base64,/, "");
  const bin = atob(raw);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

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

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: authData, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user_id = authData.user.id;

    const { image_url } = await req.json();
    if (!image_url) {
      return new Response(JSON.stringify({ error: "image_url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    // Fetch original image to detect orientation
    const originalBytes = await fetchImageBytes(image_url);
    const mimeType = detectMime(originalBytes);
    const originalDims = getImageDimensions(originalBytes);
    const originalIsPortrait = originalDims ? isPortrait(originalDims) : true; // default to portrait for clothing
    const orientationHint = originalIsPortrait ? "PORTRAIT (taller than wide)" : "LANDSCAPE (wider than tall)";

    console.log("Original dimensions:", originalDims, "isPortrait:", originalIsPortrait);

    // First attempt
    let imageData = await callAICleanup(GEMINI_API_KEY, originalBytes, mimeType, orientationHint);

    if (!imageData) {
      return new Response(JSON.stringify({ cleaned_url: image_url, cleaned: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let outputBytes = base64ToBytes(imageData);
    let outputDims = getImageDimensions(outputBytes);

    console.log("Output dimensions (attempt 1):", outputDims);

    // Check if orientation was flipped
    if (outputDims && originalDims) {
      const outputIsPortrait = isPortrait(outputDims);
      if (originalIsPortrait !== outputIsPortrait) {
        console.log("Orientation mismatch detected! Retrying...");
        // Retry with stronger hint
        const retryData = await callAICleanup(
          GEMINI_API_KEY,
          originalBytes,
          mimeType,
          originalIsPortrait
            ? "PORTRAIT (vertical, height MUST be greater than width)"
            : "LANDSCAPE (horizontal, width MUST be greater than height)"
        );

        if (retryData) {
          const retryBytes = base64ToBytes(retryData);
          const retryDims = getImageDimensions(retryBytes);
          console.log("Output dimensions (attempt 2):", retryDims);

          if (retryDims) {
            const retryIsPortrait = isPortrait(retryDims);
            if (retryIsPortrait === originalIsPortrait) {
              // Retry succeeded
              outputBytes = retryBytes;
              outputDims = retryDims;
              imageData = retryData;
            }
          }
        }

        // If retry also failed orientation, fall back to original
        const finalDims = getImageDimensions(outputBytes);
        if (finalDims && isPortrait(finalDims) !== originalIsPortrait) {
          console.log("Both attempts produced wrong orientation, using original image");
          return new Response(JSON.stringify({ cleaned_url: image_url, cleaned: false }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Upload the cleaned image to storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const cleanPath = `${user_id}/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("closet-images")
      .upload(cleanPath, outputBytes, { contentType: "image/png", upsert: true });

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
