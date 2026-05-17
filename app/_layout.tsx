import { Stack } from "expo-router";
import { AuthProvider, useAuth } from "../context/AuthContext";
import "../utils/i18n";
import { View, ActivityIndicator, StyleSheet } from "react-native";

function RootLayoutNav() {
  const { isAuthReady } = useAuth();

  // Router Guard
  if (!isAuthReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#c084fc" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="profile" options={{ headerShown: false, animation: 'fade' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000', // Mystical dark background
    justifyContent: 'center',
    alignItems: 'center',
  }
});
