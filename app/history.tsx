import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { db } from "../utils/firebaseConfig";

interface HistoryItem {
  id: string;
  dream: string;
  interpretation: string;
  primaryEmotion: string;
  symbolNames: string[];
  createdAt: string;
}

export default function HistoryScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const snapshot = await getDocs(query(
        collection(db, "dream_history"),
        where("uid", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(100),
      ));
      setItems(snapshot.docs.map((entry) => {
        const data = entry.data();
        const analysis = data.aiAnalysis as {
          interpretation?: string;
          primaryEmotion?: string;
          symbols?: { name?: string }[];
        } | undefined;
        return {
          id: entry.id,
          dream: String(data.dreamInputText ?? ""),
          interpretation: String(analysis?.interpretation ?? ""),
          primaryEmotion: String(analysis?.primaryEmotion ?? ""),
          symbolNames: (analysis?.symbols ?? []).map((symbol) => String(symbol.name ?? "")).filter(Boolean).slice(0, 3),
          createdAt: String(data.createdAt ?? ""),
        };
      }));
    } catch {
      Alert.alert("Geçmiş yüklenemedi", "Firestore birleşik indeksinin yayımlandığından emin olun.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const removeItem = (item: HistoryItem) => {
    Alert.alert("Rüyayı sil", "Bu rüyayı geçmişinden kalıcı olarak silmek istiyor musun?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: async () => {
        await deleteDoc(doc(db, "dream_history", item.id));
        setItems((current) => current.filter((entry) => entry.id !== item.id));
      } },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="Geri" onPress={() => router.back()}><Ionicons name="arrow-back" size={27} color="#c084fc" /></TouchableOpacity>
        <Text style={styles.title}>Rüya Geçmişim</Text>
        <View style={{ width: 27 }} />
      </View>
      {loading ? <ActivityIndicator style={styles.loader} size="large" color="#c084fc" /> : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Henüz kaydedilmiş bir rüyan yok.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.date}>{item.createdAt.slice(0, 10)}</Text>
                <TouchableOpacity accessibilityLabel="Rüyayı sil" onPress={() => removeItem(item)}><Ionicons name="trash-outline" size={19} color="#ff7096" /></TouchableOpacity>
              </View>
              <Text style={styles.dream} numberOfLines={3}>{item.dream}</Text>
              {(item.primaryEmotion || item.symbolNames.length > 0) && (
                <View style={styles.insightRow}>
                  {item.primaryEmotion ? <Text style={styles.insightTag}>{item.primaryEmotion}</Text> : null}
                  {item.symbolNames.map((symbol) => <Text key={symbol} style={styles.symbolTag}>#{symbol}</Text>)}
                </View>
              )}
              <Text style={styles.interpretation} numberOfLines={5}>{item.interpretation}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#120a1f" },
  header: { paddingTop: 52, paddingHorizontal: 22, paddingBottom: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "rgba(192,132,252,.2)" },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },
  loader: { flex: 1 },
  list: { padding: 18, paddingBottom: 40, flexGrow: 1 },
  empty: { color: "rgba(255,255,255,.55)", textAlign: "center", marginTop: 80 },
  card: { backgroundColor: "rgba(26,11,46,.8)", borderWidth: 1, borderColor: "rgba(192,132,252,.25)", borderRadius: 16, padding: 17, marginBottom: 14 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  date: { color: "#c084fc", fontSize: 12, fontWeight: "700" },
  dream: { color: "#fff", fontSize: 16, fontWeight: "700", lineHeight: 22 },
  insightRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingTop: 10 },
  insightTag: { color: "#120a1f", backgroundColor: "#c084fc", borderRadius: 9, overflow: "hidden", paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontWeight: "800" },
  symbolTag: { color: "rgba(232,220,248,.7)", backgroundColor: "rgba(192,132,252,.1)", borderRadius: 9, overflow: "hidden", paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontWeight: "700" },
  interpretation: { color: "rgba(255,255,255,.62)", fontSize: 13, lineHeight: 19, marginTop: 10 },
});
