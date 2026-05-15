import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../utils/firebaseConfig";
import { 
  signInAnonymously, 
  onAuthStateChanged, 
  User, 
  signOut
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface AuthContextData {
  user: User | null;
  loading: boolean;
  isDeveloper: boolean;
  isAnonymous: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({
  user: null,
  loading: true,
  isDeveloper: false,
  isAnonymous: true,
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeveloper, setIsDeveloper] = useState(false);

  useEffect(() => {
    // Listen to Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        try {
          // Check or create user document in Firestore
          const userRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userRef);
          
          if (!userDoc.exists()) {
            // Guest gets 2 welcome credits, Permanent user gets 5
            const initialCredits = firebaseUser.isAnonymous ? 2 : 5;
            await setDoc(userRef, {
              createdAt: new Date().toISOString(),
              credits: initialCredits,
              isDeveloper: false,
            });
            setIsDeveloper(false);
          } else {
            setIsDeveloper(userDoc.data().isDeveloper || false);
          }
        } catch (error) {
          console.error("Firestore read/write error:", error);
        }
      } else {
        setUser(null);
        // Automatic Guest Mode
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Anonymous login failed:", error);
        }
      }
      setLoading(false);
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
        isDeveloper, 
        isAnonymous: user?.isAnonymous ?? true,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
