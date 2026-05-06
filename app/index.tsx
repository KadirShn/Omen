import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MysticLoader } from '../components/MysticLoader';
import { getRemainingRequests, incrementRequestCount } from '../utils/storage';

// 🚨 API Anahtarı artık .env dosyasından çekiliyor. (EXPO_PUBLIC_GEMINI_API_KEY)
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function IndexScreen() {
  const [dream, setDream] = useState("");
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [remainingRequests, setRemainingRequests] = useState<number | null>(null);

  useEffect(() => {
    const loadQuota = async () => {
      const remaining = await getRemainingRequests();
      setRemainingRequests(remaining);
    };
    loadQuota();
  }, []);

  // ✍️ Yazma Efekti (Typewriter) - Harf Yutmayan Slice Versiyonu
  useEffect(() => {
    if (result?.yorum) {
      let index = 0;
      setTypedText("");
      const textToType = result.yorum;

      const interval = setInterval(() => {
        // ÇÖZÜM: Slice ile metni her seferinde baştan alıyoruz, harf yutulmuyor
        setTypedText(textToType.slice(0, index + 1));
        index++;
        if (index >= textToType.length) {
          clearInterval(interval);
        }
      }, 30); // Yazma hızı

      return () => clearInterval(interval);
    }
  }, [result]);

  const analyzeDream = async () => {
    if (remainingRequests !== null && remainingRequests <= 0) {
      Alert.alert(
        "🔮 Sınır Aşıldı", 
        "Bugünlük ruhsal enerjin tükendi. Yarın tekrar gel mistik yolcu..."
      );
      return;
    }

    if (!dream.trim()) {
      Alert.alert("Hata", "Önce rüyanı fısılda bro!");
      return;
    }

    // 1. DÜZELTME: Butona basıldığında loading'i hemen aç
    setIsLoading(true);
    setResult(null);
    setTypedText("");

    // Haptik Geribildirim (Daha premium hissettirir)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Minimum görünürlük süresi (Animasyonun tadını çıkarmak için)
    const startTime = Date.now();

    // API anahtarını temizleyelim
    const cleanApiKey = API_KEY.trim();

    const prompt = `Sen mistik bir rüya kahinisin. 
    Kullanıcının rüyası: "${dream}"
    Lütfen yanıtını SADECE aşağıdaki JSON formatında ver, başka hiçbir metin veya markdown işareti ekleme. Renk kodu her zaman #6c2e9c (Mistik Mor) olsun.
    {
      "yorum": "Rüyanın mistik, biraz absürt ve eğlenceli yorumu (3-4 cümle)",
      "mood": "korku" | "huzur" | "macera" | "gizem",
      "renk": "#6c2e9c",
      "semboller": ["sembol1", "sembol2"],
      "gorsel_betimleme": "Bu rüyayı anlatan sanatsal bir resim betimlemesi (tek cümle)"
    }`;

    try {
      // Modeli en stabil olan 1.5-flash'a çektim. 3-flash-preview kota hatası verebilir.
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${cleanApiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      const data = await response.json();

      // Hata Ayıklama (Gelen ham veriyi görelim)
      console.log("API YANITI:", JSON.stringify(data, null, 2));

      // 🛡️ JSON Temizleme (Hata almanı engelleyen kritik kısım)
      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        let rawText = data.candidates[0].content.parts[0].text;
        const cleanJson = rawText
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();

        const jsonResponse = JSON.parse(cleanJson);
        setResult(jsonResponse);
        
        // Kotayı 1 düşür ve UI'a yansıt
        const newRemaining = await incrementRequestCount();
        setRemainingRequests(newRemaining);
      } else {
        throw new Error("Veri yapısı beklenen formatta gelmedi.");
      }
    } catch (error) {
      console.error("ANALİZ HATASI:", error);
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen bir hata.";
      Alert.alert("Hata Detayı", errorMessage);
    } finally {
      // 2. DÜZELTME: Animasyonun yarım kalmaması için en az 2 saniye bekle
      const elapsedTime = Date.now() - startTime;
      const minWait = 2500; // 2.5 saniye mistik bir bekleme

      if (elapsedTime < minWait) {
        await new Promise(resolve => setTimeout(resolve, minWait - elapsedTime));
      }

      setIsLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: "#6c2e9c" }]}
    >
      <MysticLoader visible={isLoading} />
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.headerTitle}>🔮 Omen</Text>
        <Text style={styles.subtitle}>
          Bilinçaltının derinliklerine yolculuk...
        </Text>

        {/* 4. DÜZELTME: Input container mor temaya uygun şekilde revize edildi */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ne gördün? Anlat bakalım..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            multiline
            numberOfLines={4}
            value={dream}
            onChangeText={setDream}
          />
        </View>

        {/* 1. DÜZELTME: Loading butonu eklendi */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              (!dream.trim() || isLoading || (remainingRequests !== null && remainingRequests <= 0)) && styles.buttonDisabled,
            ]}
            onPress={analyzeDream}
            disabled={!dream.trim() || isLoading || (remainingRequests !== null && remainingRequests <= 0)}
          >
            {isLoading ? (
              // Düzeltme: Bekleme sırasında dönen yükleme simgesi (Rengi Mor yapıldı ki görünsün!)
              <ActivityIndicator color="#6c2e9c" size="small" />
            ) : (
              <Text style={styles.buttonText}>Kehaneti Al ✨</Text>
            )}
          </TouchableOpacity>
          {remainingRequests !== null && (
            <Text style={styles.quotaText}>
              Günlük Kehanet Hakkı: {remainingRequests}/3
            </Text>
          )}
        </View>

        {result && (
          <View style={styles.resultCard}>
            {/* Sembol Etiketleri */}
            <View style={styles.tagRow}>
              {result.semboller.map((s: string, i: number) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>#{s.toUpperCase()}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.resultHeader}>RUHUNUN SESİ DİYOR Kİ:</Text>

            {/* 2. & 3. DÜZELTME: Metni ScrollView içine aldık ve maksimum yükseklik verdik */}
            <View style={styles.interpretationScrollContainer}>
              <ScrollView
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                <Text style={styles.resultText}>{typedText}</Text>
              </ScrollView>
            </View>

            <View style={styles.divider} />

            <Text style={styles.aiArtHeader}>🖼️ Rüya Vizyonu Betimlemesi:</Text>
            <Text style={styles.aiArtText}>{result.gorsel_betimleme}</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "flex-start",
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: "900",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginBottom: 30,
    fontStyle: "italic",
  },
  inputContainer: {
    // Düzeltme: Mor temaya uygun semi-transparan input kutusu
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  input: {
    color: "#fff",
    fontSize: 18,
    padding: 20,
    minHeight: 120,
    textAlignVertical: "top",
  },
  button: {
    // Düzeltme: Mor temanın üstüne şık, beyaz, eliptik buton
    backgroundColor: "#fff",
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    elevation: 6,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#6c2e9c", fontSize: 18, fontWeight: "bold" },
  buttonContainer: {
    marginBottom: 10,
  },
  quotaText: {
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginTop: 15,
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  resultCard: {
    marginTop: 30,
    // Düzeltme: Sonuç kartı daha koyu, morun üstünde parlayan kart
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 25,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 15 },
  tag: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: { color: "#03dac6", fontSize: 11, fontWeight: "bold" },
  resultHeader: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 10,
    letterSpacing: 1,
  },

  // 3. DÜZELTME: Metin yorumunun scroll olacağı alanın maksimum yüksekliğini belirledik
  interpretationScrollContainer: {
    maxHeight: SCREEN_HEIGHT * 0.15, // Ekranın %30'undan fazla büyümesin, scroll olsun
    marginBottom: 10,
  },
  resultText: {
    color: "#fff",
    fontSize: 18,
    lineHeight: 28,
    fontWeight: "500",
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 20,
  },
  aiArtHeader: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 5,
  },
  aiArtText: {
    color: "#aaa",
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 20,
  },
});
