export interface Env {
  GEMINI_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // 1. CORS Ayarları (React Native'den istek alabilmek için)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Only POST requests are allowed", { status: 405, headers: corsHeaders });
    }

    try {
      const body: any = await request.json();
      const dreamText = body.dream;

      if (!dreamText) {
        return new Response(JSON.stringify({ error: "Rüya metni eksik" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Gemini API İstek Gövdesi (Prompt gizlenmiş oldu!)
      const prompt = `Sen mistik bir rüya kahinisin. 
      Kullanıcının rüyası: "${dreamText}"
      Lütfen yanıtını SADECE aşağıdaki JSON formatında ver, başka hiçbir metin veya markdown işareti ekleme. Renk kodu her zaman #6c2e9c (Mistik Mor) olsun.
      {
        "yorum": "Rüyanın mistik, biraz absürt ve eğlenceli yorumu (3-4 cümle)",
        "mood": "korku" | "huzur" | "macera" | "gizem",
        "renk": "#6c2e9c",
        "semboller": ["sembol1", "sembol2"],
        "gorsel_betimleme": "Bu rüyayı anlatan sanatsal bir resim betimlemesi (tek cümle)"
      }`;

      // Gemini 1.5 Flash kullanımı
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;

      const geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json" // Gemini'yi JSON dönmeye zorlar
          }
        }),
      });

      if (!geminiResponse.ok) {
        // Hata detayını yakala ve Cloudflare Logs (wrangler tail) içine yazdır
        const errorText = await geminiResponse.text();
        console.error("Gemini API Error Details:", errorText, "Status:", geminiResponse.status);
        throw new Error(`Gemini API Hatası: ${geminiResponse.status} - ${errorText}`);
      }

      const geminiData: any = await geminiResponse.json();
      let rawText = geminiData.candidates[0].content.parts[0].text;

      // JSON'u temizleme ve ayrıştırma işlemi (React Native'in yükünü aldık)
      const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsedResult = JSON.parse(cleanJson);

      // 3. Pollinations.ai ile Görsel URL'si Üretme (Kural 2: Ücretsiz Image AI)
      const imagePrompt = encodeURIComponent(parsedResult.gorsel_betimleme + " mystical, dreamlike, digital art, high quality");
      const imageUrl = `https://image.pollinations.ai/prompt/${imagePrompt}?width=800&height=800&nologo=true`;

      // 4. Sonuçları React Native'e (Frontend) Gönder
      return new Response(JSON.stringify({
        ...parsedResult,
        gorsel_url: imageUrl
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
