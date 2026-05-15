import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";

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
