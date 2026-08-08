import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { auth } from "../utils/firebaseConfig";
import { FirebaseError } from "firebase/app";
import {
  onAuthStateChanged,
  signInAnonymously,
  signOut,
  User,
} from "firebase/auth";

interface AuthContextData {
  user: User | null;
  loading: boolean;
  isAuthReady: boolean;
  authError: string | null;
  isAnonymous: boolean;
  retryAnonymousSignIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({
  user: null,
  loading: true,
  isAuthReady: false,
  authError: null,
  isAnonymous: true,
  retryAnonymousSignIn: async () => {},
  logout: async () => {},
});

const retryableAuthErrors = new Set([
  "auth/internal-error",
  "auth/network-request-failed",
  "auth/too-many-requests",
]);

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const signInPromise = useRef<Promise<void> | null>(null);

  const prepareAnonymousSession = useCallback(async () => {
    if (auth.currentUser) {
      setUser(auth.currentUser);
      setAuthError(null);
      setLoading(false);
      setIsAuthReady(true);
      return;
    }

    if (signInPromise.current) return signInPromise.current;

    const attemptSignIn = async () => {
      setLoading(true);
      setAuthError(null);

      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const credential = await signInAnonymously(auth);
          setUser(credential.user);
          setAuthError(null);
          setLoading(false);
          setIsAuthReady(true);
          return;
        } catch (error) {
          lastError = error;
          const code = error instanceof FirebaseError ? error.code : "";
          if (!retryableAuthErrors.has(code) || attempt === 2) break;
          await wait(600 * 2 ** attempt);
        }
      }

      console.warn("[Auth] Anonymous session could not be prepared", lastError);
      setUser(null);
      setAuthError(
        "Oturum kurulamadı. İnternet bağlantını kontrol edip yeniden dene.",
      );
      setLoading(false);
      setIsAuthReady(true);
    };

    signInPromise.current = attemptSignIn().finally(() => {
      signInPromise.current = null;
    });
    return signInPromise.current;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setAuthError(null);
        setLoading(false);
        setIsAuthReady(true);
        return;
      }
      setUser(null);
      void prepareAnonymousSession();
    });

    return () => unsubscribe();
  }, [prepareAnonymousSession]);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
      setAuthError("Çıkış işlemi tamamlanamadı. Lütfen yeniden dene.");
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        isAuthReady,
        authError,
        isAnonymous: user?.isAnonymous ?? true,
        retryAnonymousSignIn: prepareAnonymousSession,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
