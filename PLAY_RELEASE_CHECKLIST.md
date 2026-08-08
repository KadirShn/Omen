# Omen 2.0 — Google Play Yayın Kontrol Listesi

Uygulama kimliği: `com.kadirshn.omenn`  
Hedef platform: Android  
Sürüm: `2.0.0` (`versionCode: 2`)

## 1. Cloudflare Worker

1. `cloudflare-worker/wrangler.toml` içindeki `SUPPORT_EMAIL` değerini takip edilen destek e-postasıyla değiştirin.
2. En düşük yetkili Firebase servis hesabını kullanın.
3. Secret değerlerini kaynak koda yazmadan ekleyin:

```bash
cd cloudflare-worker
pnpm exec wrangler secret put GEMINI_API_KEY
pnpm exec wrangler secret put FIREBASE_API_KEY
pnpm exec wrangler secret put FIREBASE_PROJECT_ID
pnpm exec wrangler secret put FIREBASE_CLIENT_EMAIL
pnpm exec wrangler secret put FIREBASE_PRIVATE_KEY
pnpm exec wrangler secret put IMAGE_TOKEN_KEY
pnpm run deploy
```

`IMAGE_TOKEN_KEY` en az 32 rastgele karakter olmalıdır.

Dağıtımdan sonra `/health`, `/privacy` ve `/delete-account` yollarını doğrulayın. Mobil `.env` içindeki `EXPO_PUBLIC_API_URL` değerini dağıtılan Worker URL’sine ayarlayın.

## 2. Firebase

1. Anonymous ve Email/Password Authentication yöntemlerini etkinleştirin.
2. Android paket adının `com.kadirshn.omenn` olduğunu doğrulayın.
3. Kuralları ve indeksi yayımlayın:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

4. Play incelemesi için e-postası doğrulanmış ayrı bir test hesabı oluşturun.
5. `content_reports` ve `deletion_requests` koleksiyonlarını düzenli işleyin.

## 3. Play Console beyanları

- Ads: “Uygulama reklam içeriyor” seçeneğini **Hayır** olarak güncelleyin.
- Privacy policy: `https://WORKER_URL/privacy`
- Account deletion URL: `https://WORKER_URL/delete-account`
- App access: doğrulanmış inceleme hesabının e-posta/şifresini sağlayın.
- Uygulama kategorisini Lifestyle veya Health & Fitness içinden mağaza metnine göre seçin; tıbbi fayda iddiasında bulunmayın.
- Data Safety formunda e-posta, User ID, rüya metni, analiz ve uygulama etkileşimlerini değerlendirin.
- Reklam SDK’sı kaldırıldığı için Advertising ID, reklam konumu ve UMP kaynaklı veri beyanlarını yeni AAB üzerinde tekrar kontrol edin.

## 4. V2 smoke testi

- Anonim kullanıcı 1 krediyle başlayabilmeli.
- E-posta hesabı doğrulanmadan analiz yapılamamalı.
- Doğrulanmış hesap en fazla 2 kredi taşımalı ve UTC gün değişiminde 1 kredi yenilenmeli.
- Üç analiz odağı da farklı ve geçerli sonuç üretmeli.
- Sembol haritası, düşünme sorusu, küçük adım ve örüntü izi görünmeli.
- Rüya geçmişi, içerik bildirimi ve hesap silme çalışmalı.
- Uygulamada reklam, reklam gizlilik menüsü veya reklam ağı isteği bulunmamalı.

## 5. Son teknik doğrulama

```bash
npm ci
npm run check
npx expo prebuild --platform android --clean
eas build --platform android --profile production
```

Internal testing’de en az iki fiziksel Android cihazda ve farklı ekran boyutlarında smoke test yapın.
