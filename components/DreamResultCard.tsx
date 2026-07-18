import React, { useEffect, useState, useRef } from "react";
import { View, Text, ScrollView, StyleSheet, Dimensions, Image, ActivityIndicator, Animated, TouchableOpacity } from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface DreamResultCardProps {
  result: {
    interpretation: string;
    primaryEmotion: string;
    moodScore: number;
    archetypes: string[];
    gorsel_betimleme: string;
    gorsel_url?: string;
    requestId?: string;
  };
  onReport?: () => void;
}

export function DreamResultCard({ result, onReport }: DreamResultCardProps) {
  const [typedText, setTypedText] = useState("");
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);
  
  // Fade in animation for the whole card
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (result?.interpretation) {
      let index = 0;
      setTypedText("");
      setIsImageLoading(true);
      setImageFailed(false);
      const textToType = result.interpretation;

      const interval = setInterval(() => {
        setTypedText(textToType.slice(0, index + 1));
        index++;
        if (index >= textToType.length) {
          clearInterval(interval);
        }
      }, 25); // Slightly faster typing

      // Trigger fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

      return () => clearInterval(interval);
    }
  }, [result, fadeAnim]);

  // Safely compute mood score percentage (max 100%)
  const scorePercentage = Math.min(Math.max((result.moodScore / 10) * 100, 0), 100);

  // Gradient-like color based on score
  const getScoreColor = (score: number) => {
    if (score >= 8) return "#00e676"; // Positive green
    if (score >= 5) return "#ffea00"; // Neutral yellow
    return "#ff1744"; // Negative red
  };

  return (
    <Animated.View style={[styles.resultCard, { opacity: fadeAnim }]}>
      
      {/* 1. Jungian Archetypes Tags */}
      {result.archetypes && result.archetypes.length > 0 && (
        <View style={styles.tagRow}>
          {result.archetypes.map((archetype, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>✨ {archetype.toUpperCase()}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 2. Primary Emotion & Mood Score (Premium UI) */}
      <View style={styles.statsContainer}>
        <View style={styles.emotionBox}>
          <Text style={styles.statLabel}>BASKIN DUYGU</Text>
          <Text style={styles.emotionText}>{result.primaryEmotion}</Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.statLabel}>RUH HALİ ({result.moodScore}/10)</Text>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${scorePercentage}%`, backgroundColor: getScoreColor(result.moodScore) }
              ]} 
            />
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* 3. The Interpretation (Typewriter effect) */}
      <Text style={styles.resultHeader}>RUHUNUN SESİ DİYOR Kİ:</Text>
      <View style={styles.interpretationScrollContainer}>
        <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
          <Text style={styles.resultText}>{typedText}</Text>
        </ScrollView>
      </View>

      <View style={styles.divider} />

      {/* 4. Cinematic Dream Vision (Image) */}
      <Text style={styles.aiArtHeader}>🖼️ Rüya Vizyonu:</Text>
      {result.gorsel_url && !imageFailed && (
        <View style={styles.imageContainer}>
          {isImageLoading && (
            <View style={styles.imageLoaderContainer}>
              <ActivityIndicator color="#03dac6" size="large" />
              <Text style={styles.loadingText}>Rüya vizyonu şekilleniyor...</Text>
            </View>
          )}
          <Image 
            source={{ uri: result.gorsel_url }} 
            style={styles.dreamImage} 
            resizeMode="cover" 
            onLoad={() => setIsImageLoading(false)}
            onError={() => {
              setIsImageLoading(false);
              setImageFailed(true);
            }}
          />
        </View>
      )}
      {imageFailed && (
        <Text style={styles.imageError}>Rüya görseli şu anda yüklenemedi.</Text>
      )}

      {onReport && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="AI çıktısını bildir"
          style={styles.reportButton}
          onPress={onReport}
        >
          <Text style={styles.reportText}>⚑ AI çıktısını bildir</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  resultCard: {
    marginTop: 20,
    backgroundColor: "rgba(18, 10, 31, 0.7)", // Deep mystic dark
    padding: 25,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(108, 46, 156, 0.5)", // Glowing purple border
    shadowColor: "#6c2e9c",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
    marginBottom: 40,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 20 },
  tag: {
    backgroundColor: "rgba(108, 46, 156, 0.2)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(108, 46, 156, 0.6)",
  },
  tagText: { color: "#e8dcf8", fontSize: 11, fontWeight: "bold", letterSpacing: 1 },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  emotionBox: {
    flex: 1,
    marginRight: 15,
  },
  scoreBox: {
    flex: 1,
  },
  statLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 6,
    letterSpacing: 1,
  },
  emotionText: {
    color: "#03dac6", // Cyber neon cyan
    fontSize: 18,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  progressBarBg: {
    height: 8,
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 4,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(108, 46, 156, 0.3)",
    marginVertical: 20,
  },
  resultHeader: {
    color: "rgba(232, 220, 248, 0.7)",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 10,
    letterSpacing: 1.5,
  },
  interpretationScrollContainer: {
    maxHeight: SCREEN_HEIGHT * 0.2,
    marginBottom: 10,
  },
  resultText: {
    color: "#fff",
    fontSize: 17,
    lineHeight: 28,
    fontWeight: "400",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  aiArtHeader: {
    color: "rgba(232, 220, 248, 0.7)",
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 15,
    letterSpacing: 1,
  },
  imageContainer: {
    width: "100%",
    height: 250,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(108, 46, 156, 0.4)",
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageLoaderContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  loadingText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: 12,
    fontStyle: "italic",
  },
  dreamImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
    zIndex: 2,
  },
  imageError: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 24,
  },
  reportButton: {
    alignSelf: "center",
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  reportText: {
    color: "rgba(232,220,248,0.65)",
    fontSize: 12,
    textDecorationLine: "underline",
  },
});
