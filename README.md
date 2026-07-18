# 🔮 Omen — AI Destekli Rüya Günlüğü

Omen, kullanıcıların rüyalarını kaydetmesine, yapay zekâ destekli bir kişisel farkındalık yorumu almasına ve rüyadan esinlenen güvenli bir görsel oluşturmasına yardımcı olan Android uygulamasıdır.

> Omen çıktıları eğlence ve kişisel farkındalık içindir. Tıbbi tanı, terapi veya kesin gelecek tahmini sunmaz.

## Özellikler

- Firebase anonim kullanım ve e-posta hesabı
- Gemini ile şema doğrulamalı ve güvenlik filtreli rüya analizi
- Promptu açık URL'de göstermeyen görsel proxy
- Rüya geçmişini görüntüleme ve tek tek silme
- Hesap ve tüm verileri uygulama içinden silme
- AI çıktısını uygulama içinden bildirme
- AdMob ödüllü reklam, UMP rıza akışı ve imzalı SSV ödülü
- Sunucu taraflı kredi, günlük ödül ve hız sınırı
- Türkçe Android deneyimi

## Mimari

- Mobil: React Native, Expo Router, TypeScript
- Kimlik/veri: Firebase Authentication ve Cloud Firestore
- API: Cloudflare Worker
- AI: Google Gemini
- Görsel: Worker üzerinden güvenli Pollinations proxy
- Reklam: Google AdMob Rewarded Ads + UMP + SSV

Mobil istemci Gemini anahtarına veya Firebase yönetici yetkisine sahip değildir. Worker Firebase ID tokenını doğrular, kredi işlemlerini optimistic concurrency ile yapar ve AI hatasında krediyi iade eder.

## Yerel kurulum

```bash
npm install
copy .env.example .env
npm run android
```

Worker:

```bash
cd cloudflare-worker
pnpm install
copy .dev.vars.example .dev.vars
pnpm run dev
```

Kalite kontrolleri:

```bash
npm run typecheck
npm run lint
cd cloudflare-worker
pnpm run typecheck
pnpm run test
```

Yayın öncesi zorunlu dış servis adımları için [PLAY_RELEASE_CHECKLIST.md](PLAY_RELEASE_CHECKLIST.md) dosyasını kullanın.
