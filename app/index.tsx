import * as Haptics from "expo-haptics";
import React, { useState, useEffect, useRef } from "react";
import NetInfo from '@react-native-community/netinfo';
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
import { collection, query, where, orderBy, limit, getDocs, addDoc } from "firebase/firestore";
import { DreamResultCard } from "../components/DreamResultCard";
import { EnergyBar } from "../components/EnergyBar";
import { MysticLoader } from "../components/MysticLoader";
import { useAuth } from "../context/AuthContext";
import { useCredits } from "../hooks/useCredits";
import { db } from "../utils/firebaseConfig";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

// Cloudflare Worker API adresiniz (bunu daha sonra .env üzerinden çekeceğiz)
const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://omen-proxy.shnkadir.workers.dev"; // Güncelledik

export default function IndexScreen() {
  const { user, isAnonymous } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { credits, currentAdProgress, requiredAds, isDeveloper, deductCredit, showAdToEarnCredit, isAdLoaded, isWatchingAd } = useCredits();
  
  const [dream, setDream] = useState("");
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isCooldown, setIsCooldown] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const analyzeDream = async () => {
    setErrorMsg("");
    
    if (isCooldown) {
      setErrorMsg("Mistik enerjilerin dengelenmesi için biraz beklemelisin.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      setErrorMsg("Ruhsal alemle bağlantın kesildi. Lütfen internetini kontrol et.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!dream.trim()) {
      setErrorMsg(t("index.errors.emptyDream"));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (!user) {
      setErrorMsg(t("index.errors.noConnection"));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsLoading(true);
    setResult(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    setIsCooldown(true);
    setTimeout(() => setIsCooldown(false), 10000);

    // Kredi Düşürme Mantığı (Bypass dahil)
    const canProceed = await deductCredit();
    if (!canProceed) {
      setErrorMsg(t("index.errors.outOfEnergy"));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setIsLoading(false);
      return;
    }

    const startTime = Date.now();

    try {
      // Önceki Rüyayı Çekme (Dream Threading)
      let previousDreamText = "";
      try {
        const historyRef = collection(db, "dream_history");
        const q = query(historyRef, where("uid", "==", user.uid), orderBy("createdAt", "desc"), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          previousDreamText = querySnapshot.docs[0].data().dreamInputText;
        }
      } catch (err) {
        console.error("Geçmiş rüya çekilirken hata:", err);
      }

      // Cloudflare Worker İsteği
      abortControllerRef.current = new AbortController();
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, 15000); // 15 seconds timeout

      let data;
      try {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dream: dream, previousDream: previousDreamText }),
          signal: abortControllerRef.current.signal,
        });

        clearTimeout(timeoutId);

        const responseText = await response.text();
        try {
          data = JSON.parse(responseText);
        } catch (jsonErr) {
          throw new Error("Ruhsal alemden gelen mesaj anlaşılamadı. Lütfen tekrar dene.");
        }

        if (!response.ok) {
          throw new Error(data?.error || "Mistisizmde bir kırılma yaşandı.");
        }
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        throw fetchErr;
      }

      setResult(data);

      // Sonucu History Koleksiyonuna Kaydetme
      try {
        await addDoc(collection(db, "dream_history"), {
          uid: user.uid,
          createdAt: new Date().toISOString(),
          dreamInputText: dream,
          aiAnalysis: {
            interpretation: data.interpretation,
            primaryEmotion: data.primaryEmotion,
            moodScore: data.moodScore,
            archetypes: data.archetypes,
          },
          imageUrl: data.gorsel_url,
          isThreaded: !!previousDreamText
        });
      } catch (err) {
        console.log("[Dream History Log]: Gelecek için saklandı.");
      }

    } catch (error: any) {
      console.log("[Analyze Error Handled Gracefully]:", error.message || error.code);
      let alertMsg = error.message || t("index.errors.fallback");
      
      if (error.name === "AbortError" || error.message?.includes("aborted")) {
        alertMsg = "Ruhsal alemden yanıt alınamadı (Zaman aşımı). Lütfen tekrar dene.";
      }

      setErrorMsg(alertMsg);
      Alert.alert(
        "Ruhsal Bağlantı Sorunu",
        alertMsg,
        [{ text: "Tamam", style: "cancel" }]
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      const elapsedTime = Date.now() - startTime;
      const minWait = 2500;

      if (elapsedTime < minWait) {
        await new Promise((resolve) => setTimeout(resolve, minWait - elapsedTime));
      }

      setIsLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: "#120a1f" }]}
    >
      <MysticLoader visible={isLoading || isWatchingAd} />
      <StatusBar barStyle="light-content" />
      
      {/* HEADER: Profile Icon */}
      <View style={styles.headerBar}>
        <TouchableOpacity 
          style={styles.profileButton} 
          onPress={() => {
            if (user && !user.isAnonymous) {
              router.push('/profile');
            } else {
              router.push('/auth');
            }
          }}
        >
          <Ionicons name="person-circle-outline" size={36} color="#e8dcf8" />
          {isAnonymous && <View style={styles.notificationDot} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.headerTitle}>🔮 Omen</Text>
        <Text style={styles.subtitle}>
          Bilinçaltının derinliklerine yolculuk...
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ne gördün? Anlat bakalım..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            multiline
            numberOfLines={4}
            value={dream}
            onChangeText={(text) => {
              setDream(text);
              if (errorMsg) setErrorMsg('');
            }}
          />
        </View>

        {errorMsg ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color="#ff4081" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              (!dream.trim() || isLoading) && styles.buttonDisabled,
            ]}
            onPress={analyzeDream}
            disabled={!dream.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#120a1f" size="small" />
            ) : (
              <Text style={styles.buttonText}>Kehaneti Al ✨</Text>
            )}
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
                <View style={styles.guestPremiumBox}>
                  <Text style={styles.guestPremiumText}>
                    Misafirlerin enerji depolama yeteneği kısıtlıdır. Hesabını bağla ve her gün ücretsiz enerji kazan!
                  </Text>
                  <TouchableOpacity 
                    style={styles.premiumButton}
                    onPress={() => router.push('/auth')}
                  >
                    <Text style={styles.premiumButtonText}>Kayıt Ol & Enerji Kazan</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={showAdToEarnCredit} style={{marginTop: 10}}>
                   <Text style={[styles.quotaText, { color: '#03dac6', textDecorationLine: 'underline' }]}>
                     Gölgeyle Yüzleş (Enerji Topla)
                   </Text>
                </TouchableOpacity>
              )}
            </View>
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
    color: "#e8dcf8",
    textAlign: "center",
    letterSpacing: 2,
    textShadowColor: "rgba(108, 46, 156, 0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(232, 220, 248, 0.6)",
    textAlign: "center",
    marginBottom: 30,
    fontStyle: "italic",
  },
  inputContainer: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(108, 46, 156, 0.3)",
  },
  input: {
    color: "#fff",
    fontSize: 18,
    padding: 20,
    minHeight: 120,
    textAlignVertical: "top",
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 64, 129, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 64, 129, 0.3)',
    marginBottom: 16,
  },
  errorText: {
    color: '#ff4081',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    flex: 1,
  },
  button: {
    backgroundColor: "#e8dcf8",
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: "center",
    shadowColor: "#6c2e9c",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#120a1f", fontSize: 18, fontWeight: "900", letterSpacing: 1 },
  buttonContainer: {
    marginBottom: 10,
  },
  quotaText: {
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    marginTop: 15,
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  headerBar: {
    position: 'absolute',
    top: 55, 
    right: 25,
    zIndex: 10,
  },
  profileButton: {
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 0,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ff0055',
    borderWidth: 2,
    borderColor: '#120a1f',
    shadowColor: '#ff0055',
    shadowOpacity: 0.8,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  outOfEnergyContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  guestPremiumBox: {
    backgroundColor: 'rgba(108, 46, 156, 0.15)',
    padding: 18,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(108, 46, 156, 0.5)',
    alignItems: 'center',
    width: '100%',
  },
  guestPremiumText: {
    color: '#e8dcf8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  premiumButton: {
    backgroundColor: '#6c2e9c',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    shadowColor: '#6c2e9c',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  premiumButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
