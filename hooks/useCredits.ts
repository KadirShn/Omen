import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { claimDailyCredit } from "../utils/api";
import { db } from "../utils/firebaseConfig";

export const useCredits = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [nextRefreshAt, setNextRefreshAt] = useState<string | null>(null);

  useEffect(() => {
    setCredits(null);
    setIsDeveloper(false);
    setNextRefreshAt(null);
    if (!user || (!user.isAnonymous && !user.emailVerified)) return;

    claimDailyCredit(user)
      .then((status) => {
        setCredits(status.credits);
        setNextRefreshAt(status.nextRefreshAt);
      })
      .catch((requestError) => {
        console.warn("[Credits] Daily sync failed", requestError);
      });

    return onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      setCredits(Number(data.credits ?? 0));
      setIsDeveloper(data.isDeveloper === true);
    });
  }, [user]);

  return { credits, isDeveloper, nextRefreshAt };
};
