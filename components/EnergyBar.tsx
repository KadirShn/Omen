import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

interface EnergyBarProps {
  credits: number | null;
  currentAdProgress: number;
  requiredAds: number;
  isDeveloper: boolean;
}

export function EnergyBar({ credits, currentAdProgress, requiredAds, isDeveloper }: EnergyBarProps) {
  const fillAnim = useRef(new Animated.Value(0)).current;
  const progress = isDeveloper
    ? 100
    : Math.min(100, requiredAds > 0 ? (currentAdProgress / requiredAds) * 100 : 0);

  useEffect(() => {
    Animated.spring(fillAnim, {
      toValue: progress,
      useNativeDriver: false,
      bounciness: 8,
    }).start();
  }, [fillAnim, progress]);

  if (credits === null) return null;
  const width = fillAnim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.energyLabel}>MİSTİK ENERJİ</Text>
        <Text style={styles.creditsText}>
          {isDeveloper ? "∞ Sınırsız" : `${credits} Kehanet`}
        </Text>
      </View>
      <View style={styles.barBackground}>
        <Animated.View style={[styles.barFill, { width }, isDeveloper && styles.developerFill]} />
      </View>
      {!isDeveloper && credits === 0 && (
        <Text style={styles.progressText}>Ödül ilerlemesi: {currentAdProgress}/{requiredAds}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 15, paddingHorizontal: 5 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 },
  energyLabel: { color: "rgba(232,220,248,.7)", fontSize: 12, fontWeight: "bold", letterSpacing: 1.5 },
  creditsText: { color: "#e8dcf8", fontSize: 16, fontWeight: "900" },
  barBackground: { height: 14, width: "100%", backgroundColor: "rgba(0,0,0,.4)", borderRadius: 9, borderWidth: 1, borderColor: "rgba(108,46,156,.5)", overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: "#6c2e9c" },
  developerFill: { backgroundColor: "#03dac6" },
  progressText: { color: "rgba(255,255,255,.45)", fontSize: 11, textAlign: "right", marginTop: 5 },
});
