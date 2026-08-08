import { Ionicons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { addDoc, collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
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
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { DreamResultCard } from "../components/DreamResultCard";
import { EnergyBar } from "../components/EnergyBar";
import { MysticLoader } from "../components/MysticLoader";
import { useAuth } from "../context/AuthContext";
import { useCredits } from "../hooks/useCredits";
import { AnalysisFocus, analyzeDreamApi, ApiError, DreamAnalysis, reportAiContent } from "../utils/api";
import { db } from "../utils/firebaseConfig";

export default function IndexScreen() {
  const {
    user,
    loading: isAuthLoading,
    authError,
    isAnonymous,
    retryAnonymousSignIn,
  } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const {
    credits,
    isDeveloper,
    nextRefreshAt,
  } = useCredits();

  const [dream, setDream] = useState("");
  const [result, setResult] = useState<DreamAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isCooldown, setIsCooldown] = useState(false);
  const [focus, setFocus] = useState<AnalysisFocus>("general");

  useEffect(() => {
    if (user && !user.isAnonymous && !user.emailVerified) {
      router.replace("/auth");
    }
  }, [router, user]);

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
      EMAIL_NOT_VERIFIED: t("auth.verificationRequired"),
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
      const analysis = await analyzeDreamApi(user, normalizedDream, previousDream, focus);
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
            symbols: analysis.symbols,
            reflectionQuestion: analysis.reflectionQuestion,
            actionStep: analysis.actionStep,
            recurringPattern: analysis.recurringPattern,
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
      <MysticLoader visible={isLoading} />
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
        <View style={styles.brandRow}>
          <Text style={styles.headerTitle}>🔮 Omen</Text>
          <Text style={styles.versionBadge}>2.0</Text>
        </View>
        <Text style={styles.subtitle}>Daha derin, reklamsız rüya farkındalığı</Text>

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

        <Text style={styles.focusTitle}>ANALİZ ODAĞI</Text>
        <View style={styles.focusRow}>
          {([
            ["general", "Bütünsel", "sparkles-outline"],
            ["emotions", "Duygular", "heart-outline"],
            ["symbols", "Semboller", "shapes-outline"],
          ] as const).map(([value, label, icon]) => (
            <TouchableOpacity
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: focus === value }}
              style={[styles.focusChip, focus === value && styles.focusChipActive]}
              onPress={() => {
                setFocus(value);
                Haptics.selectionAsync();
              }}
            >
              <Ionicons name={icon} size={16} color={focus === value ? "#120a1f" : "#c084fc"} />
              <Text style={[styles.focusChipText, focus === value && styles.focusChipTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {errorMsg || authError ? (
          <View style={styles.messageContainer}>
            <Ionicons name="alert-circle" size={16} color="#ff7096" />
            <Text style={styles.messageText}>{errorMsg || authError}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: isLoading || isAuthLoading }}
          style={[styles.button, (isLoading || isAuthLoading) && styles.buttonDisabled]}
          onPress={user ? analyzeDream : retryAnonymousSignIn}
          disabled={isLoading || isAuthLoading}
        >
          {isLoading || isAuthLoading ? (
            <View style={styles.buttonLoadingContent}>
              <ActivityIndicator color="#120a1f" />
              <Text style={styles.buttonText}>
                {isAuthLoading ? "Oturum hazırlanıyor…" : "Rüyan yorumlanıyor…"}
              </Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>
              {user ? "Kehaneti Al ✨" : "Oturumu Yeniden Dene"}
            </Text>
          )}
        </TouchableOpacity>

        <EnergyBar
          credits={credits}
          isDeveloper={isDeveloper}
          nextRefreshAt={nextRefreshAt}
          isAnonymous={isAnonymous}
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
              <View style={styles.refillBox}>
                <Ionicons name="moon-outline" size={22} color="#c084fc" />
                <Text style={styles.refillText}>Kredin her gün otomatik yenilenir. Yarın yeni bir analiz hakkın hazır olacak.</Text>
              </View>
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
  brandRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 9 },
  versionBadge: { color: "#120a1f", backgroundColor: "#c084fc", borderRadius: 9, overflow: "hidden", paddingHorizontal: 8, paddingVertical: 3, fontSize: 11, fontWeight: "900" },
  subtitle: { fontSize: 14, color: "rgba(232,220,248,.65)", textAlign: "center", marginBottom: 20, fontStyle: "italic" },
  noticeCard: { flexDirection: "row", gap: 8, backgroundColor: "rgba(192,132,252,.08)", borderColor: "rgba(192,132,252,.25)", borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  noticeText: { flex: 1, color: "rgba(232,220,248,.75)", fontSize: 12, lineHeight: 17 },
  inputContainer: { backgroundColor: "rgba(0,0,0,.3)", borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: "rgba(108,46,156,.4)" },
  input: { color: "#fff", fontSize: 17, padding: 20, paddingBottom: 32, minHeight: 130, textAlignVertical: "top" },
  counter: { position: "absolute", right: 14, bottom: 10, color: "rgba(255,255,255,.35)", fontSize: 11 },
  focusTitle: { color: "rgba(232,220,248,.52)", fontSize: 10, fontWeight: "900", letterSpacing: 1.4, marginBottom: 9 },
  focusRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  focusChip: { flex: 1, minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 13, borderWidth: 1, borderColor: "rgba(192,132,252,.3)", backgroundColor: "rgba(26,11,46,.6)" },
  focusChipActive: { backgroundColor: "#c084fc", borderColor: "#c084fc" },
  focusChipText: { color: "#e8dcf8", fontSize: 12, fontWeight: "700" },
  focusChipTextActive: { color: "#120a1f" },
  messageContainer: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(255,64,129,.1)", padding: 12, borderRadius: 9, borderWidth: 1, borderColor: "rgba(255,64,129,.3)", marginBottom: 16 },
  messageText: { color: "#ff8aaa", fontSize: 13, fontWeight: "600", flex: 1 },
  button: { backgroundColor: "#e8dcf8", paddingVertical: 18, borderRadius: 50, alignItems: "center", elevation: 8 },
  buttonDisabled: { opacity: 0.55 },
  buttonLoadingContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  buttonText: { color: "#120a1f", fontSize: 18, fontWeight: "900", letterSpacing: 1 },
  outOfEnergyContainer: { marginTop: 8, alignItems: "center" },
  guestBox: { backgroundColor: "rgba(108,46,156,.15)", padding: 18, borderRadius: 15, borderWidth: 1, borderColor: "rgba(108,46,156,.5)", alignItems: "center", width: "100%" },
  guestText: { color: "#e8dcf8", fontSize: 13, textAlign: "center", marginBottom: 12, lineHeight: 18 },
  secondaryButton: { backgroundColor: "#6c2e9c", paddingVertical: 12, paddingHorizontal: 25, borderRadius: 25 },
  secondaryButtonText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  refillBox: { width: "100%", flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(192,132,252,.08)", borderWidth: 1, borderColor: "rgba(192,132,252,.22)", padding: 14, borderRadius: 14 },
  refillText: { flex: 1, color: "rgba(232,220,248,.72)", fontSize: 12, lineHeight: 18 },
});
