import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../utils/firebaseConfig';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  linkWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function AuthScreen() {
  const { user, isAnonymous } = useAuth();
  const router = useRouter();

  const [isLoginMode, setIsLoginMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const toggleMode = () => {
    Haptics.selectionAsync();
    setIsLoginMode((prev) => !prev);
  };

  const handleAuthentication = async () => {
    if (!email || !password) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldur.');
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/');
      } else {
        if (isAnonymous && user) {
          const credential = EmailAuthProvider.credential(email, password);
          await linkWithCredential(user, credential);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Başarılı', 'Hesabın kalıcı hale getirildi ve rüya geçmişin korundu!');
        } else {
          await createUserWithEmailAndPassword(auth, email, password);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        router.replace('/');
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Hata', error.message || 'Bir sorun oluştu.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
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
        colors={['rgba(192, 132, 252, 0.1)', 'transparent']}
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.title}>OMEN</Text>
          <View style={styles.glowUnderline} />
          <Text style={styles.subtitle}>
            {isLoginMode
              ? 'Rüya alemine geri dön.'
              : 'Kayıt ol, günlük enerjini al ve rüya geçmişini sonsuza dek sakla.'}
          </Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="E-posta"
            placeholderTextColor="rgba(192, 132, 252, 0.4)"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Şifre"
            placeholderTextColor="rgba(192, 132, 252, 0.4)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleAuthentication}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#6c2e9c', '#c084fc']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {isLoginMode ? 'Giriş Yap' : 'Kayıt Ol & Bağla'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchModeButton} onPress={toggleMode}>
            <Text style={styles.switchModeText}>
              {isLoginMode
                ? 'Hesabın yok mu? Kayıt Ol'
                : 'Zaten hesabın var mı? Giriş Yap'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    opacity: 0.8,
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
    paddingHorizontal: 32,
    zIndex: 10,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 48,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: '#fff',
    letterSpacing: 8,
    textShadowColor: 'rgba(192, 132, 252, 0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 25,
  },
  glowUnderline: {
    width: 40,
    height: 2,
    backgroundColor: '#c084fc',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#c084fc',
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  formContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: 'rgba(20, 10, 30, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.3)',
    borderRadius: 12,
    padding: 18,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    shadowColor: '#c084fc',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 15,
    elevation: 10,
    shadowColor: '#c084fc',
    shadowOpacity: 0.6,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 },
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  switchModeButton: {
    marginTop: 30,
    alignItems: 'center',
    padding: 10,
  },
  switchModeText: {
    color: '#c084fc',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
    textDecorationLine: 'underline',
  },
});
