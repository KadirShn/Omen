# Omen — Google Play Yayın Kontrol Listesi

Uygulama kimliği: `com.kadirshn.omenn`  
Hedef platform: Android  
Target SDK: 36

## 1. Cloudflare Worker

1. `cloudflare-worker/wrangler.toml` içindeki `SUPPORT_EMAIL` değerini gerçek ve takip edilen destek e-postasıyla değiştirin.
2. Cloudflare'da mümkün olan en düşük yetkili bir Firebase servis hesabı kullanın. Ana kişisel servis hesabını kullanmayın.
3. Aşağıdaki değerleri kaynak koda yazmadan secret olarak ekleyin:

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

`IMAGE_TOKEN_KEY` en az 32 rastgele karakter olmalıdır. Production ortamında `ALLOW_INSECURE_REWARDS` tanımlanmayacaktır.

Dağıtımdan sonra doğrulayın:

- `https://WORKER_URL/health`
- `https://WORKER_URL/privacy`
- `https://WORKER_URL/delete-account`

Mobil `.env` içindeki `EXPO_PUBLIC_API_URL` değerini dağıtılan Worker URL'sine ayarlayın.

## 2. Firebase

1. Anonymous ve Email/Password Authentication yöntemlerini etkinleştirin.
2. Android Firebase uygulamasının paket adı `com.kadirshn.omenn` olmalıdır.
3. Kuralları ve birleşik indeksi yayımlayın:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

4. Play incelemesi için ayrı bir test hesabı oluşturun. Firestore Console'dan yalnız bu hesabın `users/{uid}.isDeveloper` değerini `true` yapın.
5. `content_reports` koleksiyonunu düzenli inceleyin. Uygunsuz çıktıları prompt/filtre iyileştirmesine dönüştürün.
6. `deletion_requests` kayıtlarını e-posta sahipliği doğrulandıktan sonra en geç 30 gün içinde işleyin.

## 3. AdMob

1. Android App ID: `ca-app-pub-9093667472808260~1160438960`
2. Rewarded Ad Unit ID: `ca-app-pub-9093667472808260/8819666043`
3. AdMob uygulamasını `com.kadirshn.omenn` Play kaydıyla eşleştirin.
4. Privacy & messaging bölümünde EEA/UK/Switzerland için European regulations mesajı oluşturun.
5. Ödüllü reklam biriminde Server-Side Verification callback URL'sini ayarlayın:

```text
https://WORKER_URL/admob-ssv
```

6. Test cihazlarında yalnız Google test reklamı veya AdMob test-device yapılandırması kullanın. Kendi canlı reklamlarınıza tıklamayın.

## 4. Play Console beyanları

- App category: Lifestyle veya Health & Fitness içinden mağaza metnine en uygun olanı seçin; tıbbi fayda iddiasında bulunmayın.
- Ads: “Uygulama reklam içeriyor” seçeneğini işaretleyin.
- Privacy policy: `https://WORKER_URL/privacy`
- Account deletion URL: `https://WORKER_URL/delete-account`
- App access: `isDeveloper=true` yapılmış inceleme hesabının e-posta/şifresini ve kısa kullanım adımlarını sağlayın.
- Target audience: yalnız yetişkinleri hedefleyin; çocukları hedefleyen görsel/metin kullanmayın.
- Content rating: AI üretimi, korku/mistik temalar ve reklam sorularını dürüst yanıtlayın.
- Data Safety formunda uygulama kodu ve üçüncü taraf SDK'lar birlikte değerlendirilmelidir. En az şu sınıfları kontrol edin:
  - E-posta adresi
  - User IDs
  - Other user-generated content (rüya metni ve analiz)
  - App interactions
  - Device or other IDs / Advertising ID
  - Approximate location ve diagnostics (AdMob SDK beyanına göre)
- Verilerin aktarım sırasında şifrelendiğini ve hesap silme talebi sunulduğunu beyan edin.
- Store açıklamasında “eğlence ve kişisel farkındalık” ifadesi bulunmalı; tıbbi tanı, terapi, kesin gelecek tahmini veya bilimsel doğruluk iddiası bulunmamalı.

## 5. Kapalı test ve üretim erişimi

Kişisel hesap 13 Kasım 2023 sonrasında açıldıysa:

1. En az 12 gerçek test kullanıcısını closed testing listesine ekleyin.
2. Kullanıcılar 14 gün boyunca kesintisiz opt-in kalmalıdır.
3. Yalnız opt-in yeterli görülmeyebilir. Testçilere kayıt, analiz, reklam ödülü, geçmiş, içerik bildirimi ve hesap silme akışlarını gerçekten kullandırın.
4. Geri bildirimleri ve yaptığınız düzeltmeleri kaydedin; production access sorularında somut biçimde açıklayın.

## 6. Son teknik doğrulama

```bash
npm ci
npm run check
npx expo prebuild --platform android --clean
eas build --platform android --profile production
```

Play'e yerel debug imzalı `android/app/build/outputs` dosyasını değil, EAS production build sonucunu yükleyin. Internal testing'de en az iki fiziksel Android cihazda ve farklı ekran boyutlarında smoke test yapın.
