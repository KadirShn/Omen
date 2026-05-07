import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Dimensions, Image, ActivityIndicator } from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface DreamResultCardProps {
  result: {
    yorum: string;
    mood: string;
    renk: string;
    semboller: string[];
    gorsel_betimleme: string;
    gorsel_url?: string;
  };
}

export function DreamResultCard({ result }: DreamResultCardProps) {
  const [typedText, setTypedText] = useState("");
  const [isImageLoading, setIsImageLoading] = useState(true);

  // Typewriter effect
  useEffect(() => {
    if (result?.yorum) {
      let index = 0;
      setTypedText("");
      const textToType = result.yorum;

      const interval = setInterval(() => {
        setTypedText(textToType.slice(0, index + 1));
        index++;
        if (index >= textToType.length) {
          clearInterval(interval);
        }
      }, 30);

      return () => clearInterval(interval);
    }
  }, [result]);

  return (
    <View style={styles.resultCard}>
      {/* Symbol Tags */}
      <View style={styles.tagRow}>
        {result.semboller.map((s, i) => (
          <View key={i} style={styles.tag}>
            <Text style={styles.tagText}>#{s.toUpperCase()}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.resultHeader}>RUHUNUN SESİ DİYOR Kİ:</Text>

      <View style={styles.interpretationScrollContainer}>
        <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
          <Text style={styles.resultText}>{typedText}</Text>
        </ScrollView>
      </View>

      <View style={styles.divider} />

      <Text style={styles.aiArtHeader}>🖼️ Rüya Vizyonu Betimlemesi:</Text>
      <Text style={styles.aiArtText}>{result.gorsel_betimleme}</Text>

      {result.gorsel_url && (
        <View style={styles.imageContainer}>
          {isImageLoading && (
            <View style={styles.imageLoaderContainer}>
              <ActivityIndicator color="#6c2e9c" size="large" />
              <Text style={styles.loadingText}>Rüya vizyonu şekilleniyor...</Text>
            </View>
          )}
          <Image 
            source={{ uri: result.gorsel_url }} 
            style={styles.dreamImage} 
            resizeMode="cover" 
            onLoad={() => setIsImageLoading(false)}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  resultCard: {
    marginTop: 30,
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
  interpretationScrollContainer: {
    maxHeight: SCREEN_HEIGHT * 0.15,
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
    marginBottom: 15,
  },
  imageContainer: {
    width: "100%",
    height: 200,
    borderRadius: 15,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(0,0,0,0.3)", // Yüklenirken arkası koyu dursun
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
    marginTop: 10,
    fontStyle: "italic",
  },
  dreamImage: {
    width: "100%",
    height: "100%",
    position: "absolute", // Yüklenirken spinnner'ı ezmesin
    zIndex: 2,
  },
});
