import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const key = Deno.env.get("GEMINI_API_KEY");
    const hasLovable = !!Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ ok: false, error: "GEMINI_API_KEY not set", hasLovable });

    const listRes = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", {
      headers: { "x-goog-api-key": key },
    });
    const listData = await listRes.json();
    const models = (listData.models || []).map((m: any) => m.name);

    const want = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-flash-image"];
    const availability: Record<string, boolean> = {};
    for (const w of want) availability[w] = models.includes(`models/${w}`);

    let textTest: any = null;
    try {
      const tr = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Reply with the single word OK." }] }] }),
      });
      const tj = await tr.json();
      textTest = { status: tr.status, text: tj?.candidates?.[0]?.content?.parts?.[0]?.text ?? null, error: tj?.error?.message ?? null };
    } catch (e) {
      textTest = { error: String(e) };
    }

    let imageTest: any = null;
    try {
      const ir = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent", {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "A plain red circle centered on a white background." }] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
      });
      const ij = await ir.json();
      const parts = ij?.candidates?.[0]?.content?.parts || [];
      const hasImage = parts.some((p: any) => (p.inlineData || p.inline_data)?.data);
      imageTest = { status: ir.status, hasImage, error: ij?.error?.message ?? null };
    } catch (e) {
      imageTest = { error: String(e) };
    }

    return json({
      ok: listRes.status === 200,
      listStatus: listRes.status,
      listError: listData?.error?.message ?? null,
      modelCount: models.length,
      availability,
      textTest,
      imageTest,
      hasLovable,
      imageModels: models.filter((m: string) => m.includes("image")),
      flashModels: models.filter((m: string) => m.includes("flash")),
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
