# 🔮 Omen 2.0 — Reklamsız AI Rüya Günlüğü

Omen, kullanıcıların rüyalarını kaydetmesine, yapay zekâ destekli kişisel farkındalık yorumu almasına ve rüyadan esinlenen güvenli bir görsel oluşturmasına yardımcı olan Android uygulamasıdır.

> Omen çıktıları eğlence ve kişisel farkındalık içindir. Tıbbi tanı, terapi veya kesin gelecek tahmini sunmaz.

## Omen 2.0 yenilikleri

- Reklam ve reklam SDK’sı içermeyen deneyim
- Bütünsel, duygu veya sembol odaklı analiz seçimi
- Sembol haritası ve bağlama göre olası anlamlar
- Kişisel düşünme sorusu ve uygulanabilir küçük adım
- Önceki rüyayla tekrar eden örüntü karşılaştırması
- Anonim hesapta 1 başlangıç kredisi
- Doğrulanmış hesapta en fazla 2 kredi ve günlük 1 kredi yenilemesi
- Zorunlu e-posta doğrulaması ve sunucu taraflı kredi kontrolü

## Mimari

- Mobil: React Native, Expo Router ve TypeScript
- Kimlik/veri: Firebase Authentication ve Cloud Firestore
- API: Cloudflare Worker
- AI: Google Gemini
- Görsel: Worker üzerinden güvenli Pollinations proxy

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
npm run check
```

Yayın öncesi dış servis adımları için [PLAY_RELEASE_CHECKLIST.md](PLAY_RELEASE_CHECKLIST.md) dosyasını kullanın.
