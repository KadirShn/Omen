import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

interface EnergyBarProps {
  credits: number | null;
  isDeveloper: boolean;
  nextRefreshAt: string | null;
  isAnonymous: boolean;
}

export function EnergyBar({ credits, isDeveloper, nextRefreshAt, isAnonymous }: EnergyBarProps) {
  if (credits === null) return null;

  const refreshLabel = nextRefreshAt
    ? new Date(nextRefreshAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    : "00:00";

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Ionicons name="sparkles" size={16} color="#c084fc" />
          <Text style={styles.energyLabel}>ANALİZ KREDİSİ</Text>
        </View>
        <Text style={styles.creditsText}>
          {isDeveloper ? "∞" : `${credits} / ${isAnonymous ? 1 : 2}`}
        </Text>
      </View>

      {!isDeveloper && (
        <View style={styles.creditRow}>
          {Array.from({ length: isAnonymous ? 1 : 2 }, (_, index) => (
            <View key={index} style={[styles.creditDot, index < credits && styles.creditDotActive]} />
          ))}
        </View>
      )}

      <Text style={styles.helperText}>
        {isDeveloper
          ? "Geliştirici hesabı: sınırsız analiz"
          : isAnonymous
            ? "Hesabını doğrula; günlük yenilenen kredilere eriş."
            : `Her gün 1 kredi yenilenir · sonraki yenileme ${refreshLabel}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 16, padding: 16, borderRadius: 18, backgroundColor: "rgba(26,11,46,.68)", borderWidth: 1, borderColor: "rgba(192,132,252,.28)" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  energyLabel: { color: "rgba(232,220,248,.78)", fontSize: 12, fontWeight: "800", letterSpacing: 1.2 },
  creditsText: { color: "#fff", fontSize: 19, fontWeight: "900", fontVariant: ["tabular-nums"] },
  creditRow: { flexDirection: "row", gap: 8, paddingTop: 13 },
  creditDot: { flex: 1, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,.1)" },
  creditDotActive: { backgroundColor: "#9f67d2" },
  helperText: { color: "rgba(232,220,248,.55)", fontSize: 11, lineHeight: 16, paddingTop: 10 },
});
