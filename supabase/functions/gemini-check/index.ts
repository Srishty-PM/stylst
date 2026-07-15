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

    async function testText(model: string) {
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: "Reply with the single word OK." }] }] }),
        });
        const j = await r.json();
        return { status: r.status, ok: r.status === 200, text: j?.candidates?.[0]?.content?.parts?.[0]?.text ?? null, error: j?.error?.message ?? null };
      } catch (e) {
        return { error: String(e) };
      }
    }

    async function testImage(model: string) {
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "A plain red circle centered on a white background." }] }],
            generationConfig: { responseModalities: ["IMAGE"] },
          }),
        });
        const j = await r.json();
        const parts = j?.candidates?.[0]?.content?.parts || [];
        return { status: r.status, ok: r.status === 200, hasImage: parts.some((p: any) => (p.inlineData || p.inline_data)?.data), error: j?.error?.message ?? null };
      } catch (e) {
        return { error: String(e) };
      }
    }

    const textModels = ["gemini-3.5-flash", "gemini-2.5-flash-lite", "gemini-3-flash-preview", "gemini-2.0-flash"];
    const imageModelsToTest = ["gemini-2.5-flash-image", "gemini-3.1-flash-image"];
    const textTests: Record<string, any> = {};
    const imageTests: Record<string, any> = {};
    for (const m of textModels) textTests[m] = await testText(m);
    for (const m of imageModelsToTest) imageTests[m] = await testImage(m);

    return json({
      ok: listRes.status === 200,
      listStatus: listRes.status,
      listError: listData?.error?.message ?? null,
      modelCount: models.length,
      textTests,
      imageTests,
      hasLovable,
      imageModels: models.filter((m: string) => m.includes("image")),
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
