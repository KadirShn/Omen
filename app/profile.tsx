import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useCredits } from '../hooks/useCredits';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { credits } = useCredits();
  const router = useRouter();

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Gerçekliğe Dön", "Mistik alemden ayrılmak istediğine emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      { 
        text: "Çıkış Yap", 
        style: "destructive", 
        onPress: async () => {
          await logout();
          router.replace('/');
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Cinematic Deep Violet to Pure Black Gradient */}
      <LinearGradient
        colors={['#1a0b2e', '#0d0417', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Subtle Mist/Glow Overlay */}
      <LinearGradient
        colors={['rgba(192, 132, 252, 0.05)', 'transparent']}
        style={styles.mistOverlay}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Integrated Back Navigation */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <Ionicons name="arrow-back" size={28} color="#c084fc" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Ionicons name="person-circle" size={100} color="#e8dcf8" style={styles.profileIcon} />
        <Text style={styles.title}>Rüya Gözcüsü</Text>
        <View style={styles.glowUnderline} />
        <Text style={styles.email}>{user?.email}</Text>

        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>MİSTİK ENERJİ</Text>
          <Text style={styles.statsValue}>{credits} ✨</Text>
        </View>

        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['rgba(255, 0, 85, 0.15)', 'rgba(255, 0, 85, 0.05)']}
            style={styles.logoutGradient}
          >
            <Ionicons name="log-out-outline" size={22} color="#ff0055" style={{marginRight: 8}} />
            <Text style={styles.logoutText}>Çıkış Yap</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  mistOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 24,
    zIndex: 50,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(26, 11, 46, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.3)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 10,
  },
  profileIcon: {
    marginBottom: 10,
    textShadowColor: 'rgba(192, 132, 252, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  title: {
    fontSize: 32,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: '#fff',
    letterSpacing: 4,
    textShadowColor: 'rgba(192, 132, 252, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  glowUnderline: {
    width: 60,
    height: 2,
    backgroundColor: '#c084fc',
    marginTop: 12,
    marginBottom: 20,
    shadowColor: '#c084fc',
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  email: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1,
    marginBottom: 40,
  },
  statsCard: {
    backgroundColor: 'rgba(20, 10, 30, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.4)',
    borderRadius: 20,
    paddingVertical: 25,
    paddingHorizontal: 50,
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#c084fc',
    shadowOpacity: 0.2,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 0 },
  },
  statsLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    letterSpacing: 3,
    marginBottom: 10,
  },
  statsValue: {
    color: '#c084fc',
    fontSize: 42,
    fontWeight: '900',
    textShadowColor: 'rgba(192, 132, 252, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  logoutButton: {
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 85, 0.4)',
    width: '100%',
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  logoutText: {
    color: '#ff0055',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
});
