import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import "../utils/i18n";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="auth"
          options={{ headerShown: false, animation: 'fade' }}
        />
        <Stack.Screen
          name="profile"
          options={{ headerShown: false, animation: 'fade' }}
        />
      </Stack>
    </AuthProvider>
  );
}
