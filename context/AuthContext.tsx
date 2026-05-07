import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../utils/firebaseConfig";
import { signInAnonymously, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface AuthContextData {
  user: User | null;
  loading: boolean;
  isDeveloper: boolean;
}

const AuthContext = createContext<AuthContextData>({
  user: null,
  loading: true,
  isDeveloper: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeveloper, setIsDeveloper] = useState(false);

  useEffect(() => {
    // Firebase auth'u dinle
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        try {
          // Firestore'dan kullanıcı verisini kontrol et
          const userRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userRef);
          
          if (!userDoc.exists()) {
            // Kullanıcı ilk defa giriyorsa Firestore'a kaydet
            await setDoc(userRef, {
              createdAt: new Date().toISOString(),
              requestsToday: 0,
              lastRequestDate: new Date().toISOString().split('T')[0],
              isDeveloper: false, // Default olarak developer değil
            });
            setIsDeveloper(false);
          } else {
            // isDeveloper bayrağını al (Kural 4)
            setIsDeveloper(userDoc.data().isDeveloper || false);
          }
        } catch (error) {
          console.error("Firestore okuma/yazma hatası (Kurulum bitmemiş olabilir):", error);
        }
      } else {
        setUser(null);
        // Kullanıcı giriş yapmamışsa otomatik Anonim giriş yap
        signInAnonymously(auth).catch((error) => {
          console.error("Anonim giriş hatası:", error);
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isDeveloper }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
