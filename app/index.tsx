import { Ionicons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { addDoc, collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import React, { useState } from "react";
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
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { DreamResultCard } from "../components/DreamResultCard";
import { EnergyBar } from "../components/EnergyBar";
import { MysticLoader } from "../components/MysticLoader";
import { useAuth } from "../context/AuthContext";
import { useCredits } from "../hooks/useCredits";
import { analyzeDreamApi, ApiError, DreamAnalysis, reportAiContent } from "../utils/api";
import { db } from "../utils/firebaseConfig";

export default function IndexScreen() {
  const { user, isAnonymous } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const {
    credits,
    currentAdProgress,
    requiredAds,
    isDeveloper,
    showAdToEarnCredit,
    isAdLoaded,
    isWatchingAd,
    adMessage,
  } = useCredits();

  const [dream, setDream] = useState("");
  const [result, setResult] = useState<DreamAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isCooldown, setIsCooldown] = useState(false);

  const getPreviousDream = async (uid: string) => {
    try {
      const historyQuery = query(
        collection(db, "dream_history"),
        where("uid", "==", uid),
        orderBy("createdAt", "desc"),
        limit(1),
      );
      const snapshot = await getDocs(historyQuery);
      return snapshot.empty ? "" : String(snapshot.docs[0].data().dreamInputText ?? "");
    } catch (error) {
      console.warn("[History] Previous dream unavailable", error);
      return "";
    }
  };

  const friendlyApiError = (error: unknown) => {
    if (!(error instanceof ApiError)) return t("index.errors.fallback");
    const messages: Record<string, string> = {
      NO_CREDITS: t("index.errors.outOfEnergy"),
      CONTENT_BLOCKED: "Bu içerik güvenlik nedeniyle analiz edilemedi.",
      RATE_LIMITED: "Çok hızlı istek gönderildi. Lütfen biraz bekle.",
      TIMEOUT: "Yanıt zaman aşımına uğradı. Kredin iade edildi; tekrar deneyebilirsin.",
      INVALID_DREAM: "Rüyan 10–3000 karakter arasında olmalı.",
      UNAUTHORIZED: "Oturum doğrulanamadı. Uygulamayı yeniden açıp tekrar dene.",
      NETWORK_ERROR: "Bağlantı kurulamadı. İnternetini kontrol et.",
    };
    return messages[error.code] ?? t("index.errors.fallback");
  };

  const analyzeDream = async () => {
    setErrorMsg("");
    const normalizedDream = dream.trim();

    if (isCooldown) {
      setErrorMsg("Yeni bir analiz için birkaç saniye beklemelisin.");
      return;
    }
    if (normalizedDream.length < 10) {
      setErrorMsg("Rüyanı en az 10 karakterle anlatmalısın.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (normalizedDream.length > 3000) {
      setErrorMsg("Rüya metni en fazla 3000 karakter olabilir.");
      return;
    }
    if (!user) {
      setErrorMsg(t("index.errors.noConnection"));
      return;
    }
    const network = await NetInfo.fetch();
    if (!network.isConnected) {
      setErrorMsg("İnternet bağlantını kontrol et.");
      return;
    }

    setIsLoading(true);
    setResult(null);
    setIsCooldown(true);
    setTimeout(() => setIsCooldown(false), 10_000);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const startedAt = Date.now();

    try {
      const previousDream = await getPreviousDream(user.uid);
      const analysis = await analyzeDreamApi(user, normalizedDream, previousDream);
      setResult(analysis);

      try {
        await addDoc(collection(db, "dream_history"), {
          uid: user.uid,
          createdAt: new Date().toISOString(),
          dreamInputText: normalizedDream,
          aiAnalysis: {
            interpretation: analysis.interpretation,
            primaryEmotion: analysis.primaryEmotion,
            moodScore: analysis.moodScore,
            archetypes: analysis.archetypes,
          },
          imageUrl: analysis.gorsel_url ?? null,
          requestId: analysis.requestId,
          isThreaded: Boolean(previousDream),
        });
      } catch (historyError) {
        console.warn("[History] Analysis could not be saved", historyError);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      const message = friendlyApiError(error);
      setErrorMsg(message);
      Alert.alert("Analiz tamamlanamadı", message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      const remaining = 1800 - (Date.now() - startedAt);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
      setIsLoading(false);
    }
  };

  const reportResult = (reason: string) => {
    if (!user || !result?.requestId) return;
    reportAiContent(user, result.requestId, reason)
      .then(() => Alert.alert("Teşekkürler", "Bildirimini aldık ve inceleme kuyruğuna ekledik."))
      .catch(() => Alert.alert("Bildirim gönderilemedi", "Bağlantını kontrol edip tekrar dene."));
  };

  const openReportMenu = () => {
    Alert.alert("AI çıktısını bildir", "Bu çıktıda ne sorun var?", [
      { text: "Uygunsuz / saldırgan", onPress: () => reportResult("offensive") },
      { text: "Tehlikeli yönlendirme", onPress: () => reportResult("unsafe") },
      { text: "Yanıltıcı içerik", onPress: () => reportResult("misleading") },
      { text: "Vazgeç", style: "cancel" },
    ]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
      <MysticLoader visible={isLoading || isWatchingAd} />
      <StatusBar barStyle="light-content" />

      <TouchableOpacity
        accessibilityLabel="Profil"
        accessibilityRole="button"
        style={styles.profileButton}
        onPress={() => router.push(user && !user.isAnonymous ? "/profile" : "/auth")}
      >
        <Ionicons name="person-circle-outline" size={38} color="#e8dcf8" />
        {isAnonymous && <View style={styles.notificationDot} />}
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.headerTitle}>🔮 Omen</Text>
        <Text style={styles.subtitle}>Bilinçaltının derinliklerine yolculuk…</Text>

        <View style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={18} color="#c084fc" />
          <Text style={styles.noticeText}>
            AI yorumları eğlence ve kişisel farkındalık içindir; tıbbi tanı veya kesin kehanet değildir.
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            accessibilityLabel="Rüya anlatımı"
            style={styles.input}
            placeholder="Ne gördün? Rüyanı anlat…"
            placeholderTextColor="rgba(255,255,255,0.35)"
            multiline
            maxLength={3000}
            value={dream}
            onChangeText={(text) => {
              setDream(text);
              if (errorMsg) setErrorMsg("");
            }}
          />
          <Text style={styles.counter}>{dream.length}/3000</Text>
        </View>

        {errorMsg || adMessage ? (
          <View style={styles.messageContainer}>
            <Ionicons name="alert-circle" size={16} color="#ff7096" />
            <Text style={styles.messageText}>{errorMsg || adMessage}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={analyzeDream}
          disabled={isLoading}
        >
          {isLoading ? <ActivityIndicator color="#120a1f" /> : <Text style={styles.buttonText}>Kehaneti Al ✨</Text>}
        </TouchableOpacity>

        <EnergyBar
          credits={credits}
          currentAdProgress={currentAdProgress}
          requiredAds={requiredAds}
          isDeveloper={isDeveloper}
        />

        {credits === 0 && !isDeveloper && (
          <View style={styles.outOfEnergyContainer}>
            {isAnonymous ? (
              <View style={styles.guestBox}>
                <Text style={styles.guestText}>Hesabını bağla; geçmişini koru ve günlük ücretsiz enerji kazan.</Text>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push("/auth")}>
                  <Text style={styles.secondaryButtonText}>Hesabını Bağla</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={showAdToEarnCredit} disabled={!isAdLoaded}>
                <Text style={[styles.rewardLink, !isAdLoaded && styles.linkDisabled]}>
                  {isAdLoaded ? "Ödüllü Reklam İzle (Enerji Topla)" : "Reklam hazırlanıyor…"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {result && <DreamResultCard result={result} onReport={openReportMenu} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#120a1f" },
  scrollContainer: { flexGrow: 1, padding: 24, paddingTop: 62, paddingBottom: 48 },
  profileButton: { position: "absolute", top: 48, right: 24, zIndex: 10 },
  notificationDot: { position: "absolute", top: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: "#ff0055", borderWidth: 2, borderColor: "#120a1f" },
  headerTitle: { fontSize: 36, fontWeight: "900", color: "#e8dcf8", textAlign: "center", letterSpacing: 2, textShadowColor: "rgba(108,46,156,.8)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 },
  subtitle: { fontSize: 14, color: "rgba(232,220,248,.65)", textAlign: "center", marginBottom: 20, fontStyle: "italic" },
  noticeCard: { flexDirection: "row", gap: 8, backgroundColor: "rgba(192,132,252,.08)", borderColor: "rgba(192,132,252,.25)", borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  noticeText: { flex: 1, color: "rgba(232,220,248,.75)", fontSize: 12, lineHeight: 17 },
  inputContainer: { backgroundColor: "rgba(0,0,0,.3)", borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: "rgba(108,46,156,.4)" },
  input: { color: "#fff", fontSize: 17, padding: 20, paddingBottom: 32, minHeight: 130, textAlignVertical: "top" },
  counter: { position: "absolute", right: 14, bottom: 10, color: "rgba(255,255,255,.35)", fontSize: 11 },
  messageContainer: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(255,64,129,.1)", padding: 12, borderRadius: 9, borderWidth: 1, borderColor: "rgba(255,64,129,.3)", marginBottom: 16 },
  messageText: { color: "#ff8aaa", fontSize: 13, fontWeight: "600", flex: 1 },
  button: { backgroundColor: "#e8dcf8", paddingVertical: 18, borderRadius: 50, alignItems: "center", elevation: 8 },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: "#120a1f", fontSize: 18, fontWeight: "900", letterSpacing: 1 },
  outOfEnergyContainer: { marginTop: 8, alignItems: "center" },
  guestBox: { backgroundColor: "rgba(108,46,156,.15)", padding: 18, borderRadius: 15, borderWidth: 1, borderColor: "rgba(108,46,156,.5)", alignItems: "center", width: "100%" },
  guestText: { color: "#e8dcf8", fontSize: 13, textAlign: "center", marginBottom: 12, lineHeight: 18 },
  secondaryButton: { backgroundColor: "#6c2e9c", paddingVertical: 12, paddingHorizontal: 25, borderRadius: 25 },
  secondaryButtonText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  rewardLink: { color: "#03dac6", textDecorationLine: "underline", fontWeight: "700", padding: 10 },
  linkDisabled: { opacity: 0.45, textDecorationLine: "none" },
});
