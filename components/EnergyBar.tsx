import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";

interface EnergyBarProps {
  credits: number | null;
  currentAdProgress: number;
  requiredAds: number;
  isDeveloper: boolean;
}

export function EnergyBar({ credits, currentAdProgress, requiredAds, isDeveloper }: EnergyBarProps) {
  const { user } = useAuth();
  const fillAnim = useRef(new Animated.Value(0)).current;

  // Calculate the progress percentage safely
  const progressPercentage = requiredAds > 0 ? (currentAdProgress / requiredAds) * 100 : 0;

  useEffect(() => {
    // Animate the progress bar smoothly whenever progress changes
    Animated.spring(fillAnim, {
      toValue: isDeveloper ? 100 : progressPercentage,
      useNativeDriver: false, // width animation requires false
      bounciness: 10,
    }).start();
  }, [progressPercentage, isDeveloper]);

  if (!user || credits === null) return null;

  // Use interpolated value for width percentage
  const widthInterpolated = fillAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.energyLabel}>
          MİSTİK ENERJİ
        </Text>
        <Text style={styles.creditsText}>
          {isDeveloper ? "♾️ Sınırsız (Dev)" : `${credits} Kehanet`}
        </Text>
      </View>

      <View style={styles.barBackground}>
        <Animated.View
          style={[
            styles.barFill,
            { width: widthInterpolated },
            isDeveloper && { backgroundColor: "#03dac6" } // Developer gets full cyan bar
          ]}
        />
        {/* We deliberately removed hard numbers/fractions here to preserve immersion */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
    paddingHorizontal: 5,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  energyLabel: {
    color: "rgba(232, 220, 248, 0.7)",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1.5,
  },
  creditsText: {
    color: "#e8dcf8",
    fontSize: 16,
    fontWeight: "900",
  },
  barBackground: {
    height: 18,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(108, 46, 156, 0.5)",
    overflow: "hidden",
    justifyContent: "center",
  },
  barFill: {
    height: "100%",
    backgroundColor: "#6c2e9c", // Base purple
    position: "absolute",
    left: 0,
    top: 0,
    shadowColor: "#03dac6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5, // Android glow
  },
});
