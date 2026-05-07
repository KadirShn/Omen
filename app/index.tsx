import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { DreamResultCard } from "../components/DreamResultCard";
import { MysticLoader } from "../components/MysticLoader";
import { useAuth } from "../context/AuthContext";
import { checkAndIncrementQuota, getRemainingQuota } from "../utils/quota";

// Cloudflare Worker API adresiniz (bunu daha sonra .env üzerinden çekeceğiz)
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:8787";

export default function IndexScreen() {
  const { user, isDeveloper } = useAuth();
  const [dream, setDream] = useState("");
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [remainingRequests, setRemainingRequests] = useState<number | null>(
    null,
  );

  useEffect(() => {
    const loadQuota = async () => {
      if (user) {
        const remaining = await getRemainingQuota(user.uid, isDeveloper);
        setRemainingRequests(remaining);
      }
    };
    loadQuota();
  }, [user, isDeveloper]);

  const analyzeDream = async () => {
    if (!dream.trim()) {
      Alert.alert("Hata", "Önce rüyanı fısılda bro!");
      return;
    }

    if (!user) {
      Alert.alert("Hata", "Mistik bağ kurulamadı, lütfen bekle...");
      return;
    }

    setIsLoading(true);
    setResult(null);

    // Haptik Geribildirim (Daha premium hissettirir)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Kotayı Firestore üzerinden kontrol et ve düş
    const canProceed = await checkAndIncrementQuota(user.uid, isDeveloper);
    if (!canProceed) {
      Alert.alert(
        "🔮 Sınır Aşıldı",
        "Bugünlük ruhsal enerjin tükendi. Yarın tekrar gel mistik yolcu...",
      );
      setIsLoading(false);
      return;
    }

    // Kota düştükten sonra UI'ı güncelle
    const newRemaining = await getRemainingQuota(user.uid, isDeveloper);
    setRemainingRequests(newRemaining);

    // Minimum görünürlük süresi (Animasyonun tadını çıkarmak için)
    const startTime = Date.now();

    try {
      // İstek direkt olarak bizim Cloudflare Worker'ımıza atılıyor (Kural 1 Güvenliği)
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dream: dream }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Mistisizmde bir kırılma yaşandı.");
      }

      setResult(data);
    } catch (error) {
      console.error("ANALİZ HATASI:", error);
      console.log("Gidilecek URL:", process.env.EXPO_PUBLIC_API_URL);
      const errorMessage =
        error instanceof Error ? error.message : "Bilinmeyen bir hata.";
      Alert.alert("Hata Detayı", errorMessage);
    } finally {
      // 2. DÜZELTME: Animasyonun yarım kalmaması için en az 2 saniye bekle
      const elapsedTime = Date.now() - startTime;
      const minWait = 2500; // 2.5 saniye mistik bir bekleme

      if (elapsedTime < minWait) {
        await new Promise((resolve) =>
          setTimeout(resolve, minWait - elapsedTime),
        );
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
              (!dream.trim() ||
                isLoading ||
                (remainingRequests !== null && remainingRequests <= 0)) &&
              styles.buttonDisabled,
            ]}
            onPress={analyzeDream}
            disabled={
              !dream.trim() ||
              isLoading ||
              (remainingRequests !== null && remainingRequests <= 0)
            }
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

        {result && <DreamResultCard result={result} />}
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
});
