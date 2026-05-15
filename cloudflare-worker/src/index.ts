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
      const previousDream = body.previousDream;

      if (!dreamText) {
        return new Response(JSON.stringify({ error: "Rüya metni eksik" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Gemini API İstek Gövdesi & Prompt Mühendisliği
      const previousDreamContext = previousDream 
        ? `Kullanıcının bir önceki rüyası veya analizi: "${previousDream}". Lütfen bu önceki rüya ile şu anki rüya arasında gizli bağlantılar veya sembolik bir devamlılık var mı analiz et ve yorumunda belirt.`
        : "";

      const prompt = `Sen mistik bir rüya kahini ve usta bir Jungçu psikanalistsin. 
      Kullanıcının şu anki rüyası: "${dreamText}"
      ${previousDreamContext}
      
      Lütfen yanıtını SADECE aşağıdaki JSON formatında ver, başka hiçbir metin veya markdown işareti ekleme:
      {
        "interpretation": "Rüyanın mistik ve derin psikolojik yorumu, arketipleri ve (varsa) önceki rüya ile bağlantısını içeren 3-4 cümle.",
        "primaryEmotion": "Rüyadaki ana duygu (örn: Korku, Awe, Huzur, Heyecan)",
        "moodScore": 8,
        "archetypes": ["Gölge", "Anima", "Kahraman"],
        "gorsel_betimleme": "Bu rüyayı anlatan sanatsal, mistik, sürreal bir dijital resim betimlemesi (İngilizce ve tek cümle)"
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
