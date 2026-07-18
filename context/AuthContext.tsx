import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../utils/firebaseConfig";
import { 
  signInAnonymously, 
  onAuthStateChanged, 
  User, 
  signOut
} from "firebase/auth";

interface AuthContextData {
  user: User | null;
  loading: boolean;
  isAuthReady: boolean;
  isAnonymous: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({
  user: null,
  loading: true,
  isAuthReady: false,
  isAnonymous: true,
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setLoading(false);
        setIsAuthReady(true);
        return;
      } else {
        setUser(null);
        try {
          await signInAnonymously(auth);
          // onAuthStateChanged will run again with the anonymous user. The
          // Worker initializes the profile and credits; the client never owns
          // economy writes.
          return;
        } catch (error) {
          console.error("Anonymous login failed:", error);
        }
      }
      setLoading(false);
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      // It will automatically trigger onAuthStateChanged and log in anonymously
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        isAuthReady,
        isAnonymous: user?.isAnonymous ?? true,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
