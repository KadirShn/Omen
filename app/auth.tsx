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
  StatusBar,
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
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function AuthScreen() {
  const { user, isAnonymous, logout } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  const [isLoginMode, setIsLoginMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [verificationEmail, setVerificationEmail] = useState(
    user && !user.isAnonymous && !user.emailVerified ? user.email ?? '' : '',
  );
  const [verificationMessage, setVerificationMessage] = useState('');

  const toggleMode = () => {
    Haptics.selectionAsync();
    setIsLoginMode((prev) => !prev);
    setErrorMsg('');
  };

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return t('auth.errors.invalid-email');
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return t('auth.errors.invalid-credential');
      case 'auth/email-already-in-use':
        return t('auth.errors.email-already-in-use');
      case 'auth/weak-password':
        return t('auth.errors.weak-password');
      case 'auth/network-request-failed':
        return t('auth.errors.network-request-failed');
      default:
        return t('auth.errors.fallback');
    }
  };

  const handleAuthentication = async () => {
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg(t('auth.missingInfo'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (isLoginMode) {
        const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (!credential.user.emailVerified) {
          setVerificationEmail(credential.user.email ?? email.trim());
          setVerificationMessage(t('auth.verificationRequired'));
          return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/');
      } else {
        let account;
        if (isAnonymous && user) {
          const credential = EmailAuthProvider.credential(email.trim(), password);
          account = (await linkWithCredential(user, credential)).user;
        } else {
          account = (await createUserWithEmailAndPassword(auth, email.trim(), password)).user;
        }
        await sendEmailVerification(account);
        setVerificationEmail(account.email ?? email.trim());
        setVerificationMessage(t('auth.verificationSent'));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      // Swallowing console.error to prevent Expo LogBox from showing raw bottom toasts.
      console.log('[Auth Error Handled Gracefully]:', error.code);
      const translatedError = getErrorMessage(error.code);
      setErrorMsg(translatedError);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationCheck = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setIsLoading(true);
    setVerificationMessage('');
    try {
      await reload(currentUser);
      if (!currentUser.emailVerified) {
        setVerificationMessage(t('auth.verificationNotComplete'));
        return;
      }
      await currentUser.getIdToken(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } catch (error: any) {
      setVerificationMessage(getErrorMessage(error.code));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationResend = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setIsLoading(true);
    try {
      await sendEmailVerification(currentUser);
      setVerificationMessage(t('auth.verificationSent'));
    } catch (error: any) {
      setVerificationMessage(getErrorMessage(error.code));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationLogout = async () => {
    await logout();
    setVerificationEmail('');
    setVerificationMessage('');
    setIsLoginMode(true);
  };

  const handlePasswordReset = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setErrorMsg(t('auth.enterEmailForReset'));
      return;
    }
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      setErrorMsg(t('auth.resetEmailSent'));
    } catch (error: any) {
      setErrorMsg(getErrorMessage(error.code));
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <LinearGradient
        colors={['#1a0b2e', '#0d0417', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      
      <LinearGradient
        colors={['rgba(192, 132, 252, 0.1)', 'transparent']}
        style={styles.mistOverlay}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <Ionicons name="arrow-back" size={28} color="#c084fc" />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.content}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.title}>{t('auth.title')}</Text>
          <View style={styles.glowUnderline} />
          <Text style={styles.subtitle}>
            {verificationEmail
              ? t('auth.verificationSubtitle')
              : isLoginMode
                ? t('auth.subtitleLogin')
                : t('auth.subtitleSignup')}
          </Text>
        </View>

        {verificationEmail ? (
          <View style={styles.formContainer}>
            <View style={styles.verificationIcon}>
              <Ionicons name="mail-unread-outline" size={42} color="#c084fc" />
            </View>
            <Text style={styles.verificationEmail}>{verificationEmail}</Text>
            {verificationMessage ? (
              <Text style={styles.verificationMessage}>{verificationMessage}</Text>
            ) : null}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleVerificationCheck}
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
                  <Text style={styles.buttonText}>{t('auth.iVerified')}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.switchModeButton}
              onPress={handleVerificationResend}
              disabled={isLoading}
            >
              <Text style={styles.switchModeText}>{t('auth.resendVerification')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetButton} onPress={handleVerificationLogout}>
              <Text style={styles.resetText}>{t('auth.useAnotherAccount')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder={t('auth.emailPlaceholder')}
            placeholderTextColor="rgba(192, 132, 252, 0.4)"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errorMsg) setErrorMsg('');
            }}
          />

          <TextInput
            style={styles.input}
            placeholder={t('auth.passwordPlaceholder')}
            placeholderTextColor="rgba(192, 132, 252, 0.4)"
            secureTextEntry
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errorMsg) setErrorMsg('');
            }}
          />

          {errorMsg ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#ff4081" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

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
                  {isLoginMode ? t('auth.loginBtn') : t('auth.signupLinkBtn')}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchModeButton} onPress={toggleMode}>
            <Text style={styles.switchModeText}>
              {isLoginMode ? t('auth.switchSignup') : t('auth.switchLogin')}
            </Text>
          </TouchableOpacity>
          {isLoginMode && (
            <TouchableOpacity style={styles.resetButton} onPress={handlePasswordReset}>
              <Text style={styles.resetText}>{t('auth.forgotPassword')}</Text>
            </TouchableOpacity>
          )}
        </View>
        )}
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
  verificationIcon: {
    alignItems: 'center',
    marginBottom: 18,
  },
  verificationEmail: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  verificationMessage: {
    color: 'rgba(255,255,255,.7)',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 18,
  },
  input: {
    backgroundColor: 'rgba(20, 10, 30, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.3)',
    borderRadius: 12,
    padding: 18,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
    shadowColor: '#c084fc',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 64, 129, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 64, 129, 0.3)',
    marginBottom: 16,
  },
  errorText: {
    color: '#ff4081',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 5,
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
  resetButton: {
    alignItems: 'center',
    padding: 10,
  },
  resetText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
