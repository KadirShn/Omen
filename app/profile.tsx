import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Href, useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Linking, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAds } from "../context/AdsContext";
import { useAuth } from "../context/AuthContext";
import { useCredits } from "../hooks/useCredits";
import { deleteAccountAndData, legalUrls } from "../utils/api";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { credits } = useCredits();
  const { showPrivacyOptions } = useAds();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLogout = () => {
    Alert.alert("Çıkış Yap", "Hesabından çıkmak istediğine emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Çıkış Yap", style: "destructive", onPress: async () => {
        await logout();
        router.replace("/");
      } },
    ]);
  };

  const deleteAccount = async () => {
    if (!user || user.isAnonymous) return;
    setIsDeleting(true);
    try {
      await deleteAccountAndData(user);
      await logout();
      Alert.alert("Hesap silindi", "Hesabın ve rüya geçmişin kalıcı olarak silindi.");
      router.replace("/");
    } catch {
      Alert.alert("Silme tamamlanamadı", "Bağlantını kontrol edip tekrar dene. Sorun sürerse web silme sayfasını kullanabilirsin.");
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeletion = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Hesabı ve tüm verileri sil",
      "Bu işlem hesabını, profilini ve tüm rüya geçmişini kalıcı olarak siler. Geri alınamaz.",
      [
        { text: "Vazgeç", style: "cancel" },
        { text: "Devam Et", style: "destructive", onPress: () => {
          Alert.alert("Son onay", "Tüm verilerinin kalıcı olarak silinmesini onaylıyor musun?", [
            { text: "Vazgeç", style: "cancel" },
            { text: "Kalıcı Olarak Sil", style: "destructive", onPress: deleteAccount },
          ]);
        } },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={["#1a0b2e", "#0d0417", "#000"]} style={StyleSheet.absoluteFill} />
      <TouchableOpacity accessibilityLabel="Geri" style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={27} color="#c084fc" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <Ionicons name="person-circle" size={88} color="#e8dcf8" />
        <Text style={styles.title}>Rüya Gözcüsü</Text>
        <Text style={styles.email}>{user?.email}</Text>

        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>MİSTİK ENERJİ</Text>
          <Text style={styles.statsValue}>{credits ?? "…"} ✨</Text>
        </View>

        <MenuButton icon="book-outline" label="Rüya Geçmişim" onPress={() => router.push("/history" as Href)} />
        <MenuButton icon="shield-checkmark-outline" label="Gizlilik Politikası" onPress={() => Linking.openURL(legalUrls.privacy)} />
        <MenuButton icon="options-outline" label="Reklam Gizlilik Seçenekleri" onPress={() => showPrivacyOptions().catch(() => Alert.alert("Bilgi", "Bu bölgede ek reklam gizlilik seçeneği gerekmiyor."))} />
        <MenuButton icon="log-out-outline" label="Çıkış Yap" onPress={handleLogout} />

        <TouchableOpacity style={styles.deleteButton} onPress={confirmDeletion} disabled={isDeleting}>
          {isDeleting ? <ActivityIndicator color="#ff4d7d" /> : <>
            <Ionicons name="trash-outline" size={20} color="#ff4d7d" />
            <Text style={styles.deleteText}>Hesabımı ve Verilerimi Sil</Text>
          </>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL(legalUrls.deletion)}>
          <Text style={styles.webDelete}>Web üzerinden silme talebi</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function MenuButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity accessibilityRole="button" style={styles.menuButton} onPress={onPress}>
      <Ionicons name={icon} size={21} color="#c084fc" />
      <Text style={styles.menuText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,.35)" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  backButton: { position: "absolute", top: 42, left: 22, zIndex: 10, width: 42, height: 42, justifyContent: "center", alignItems: "center", borderRadius: 21, backgroundColor: "rgba(26,11,46,.75)", borderWidth: 1, borderColor: "rgba(192,132,252,.3)" },
  content: { alignItems: "center", paddingHorizontal: 28, paddingTop: 105, paddingBottom: 50 },
  title: { fontSize: 29, fontFamily: "serif", color: "#fff", letterSpacing: 3, marginTop: 6 },
  email: { fontSize: 14, color: "rgba(255,255,255,.55)", marginTop: 8, marginBottom: 24 },
  statsCard: { width: "100%", backgroundColor: "rgba(20,10,30,.75)", borderWidth: 1, borderColor: "rgba(192,132,252,.35)", borderRadius: 18, paddingVertical: 18, alignItems: "center", marginBottom: 22 },
  statsLabel: { color: "rgba(255,255,255,.5)", fontSize: 11, letterSpacing: 3 },
  statsValue: { color: "#c084fc", fontSize: 34, fontWeight: "900", marginTop: 7 },
  menuButton: { width: "100%", minHeight: 54, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 17, marginBottom: 10, borderRadius: 14, backgroundColor: "rgba(26,11,46,.65)", borderWidth: 1, borderColor: "rgba(192,132,252,.2)" },
  menuText: { flex: 1, color: "#eee", fontSize: 15, fontWeight: "600" },
  deleteButton: { width: "100%", minHeight: 54, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 9, marginTop: 18, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,0,85,.45)", backgroundColor: "rgba(255,0,85,.08)" },
  deleteText: { color: "#ff4d7d", fontWeight: "700" },
  webDelete: { color: "rgba(255,255,255,.5)", textDecorationLine: "underline", padding: 16, fontSize: 12 },
});
