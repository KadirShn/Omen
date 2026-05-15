import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebaseConfig';
import { useAuth } from '../context/AuthContext';

// --- MOCK ADMOB: Commented out for Expo Go testing ---
// import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
// const adUnitId = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy';
// const rewarded = RewardedAd.createForAdRequest(adUnitId, { keywords: ['dream', 'spirituality', 'psychology'] });

export const useCredits = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  
  // Progressive Fatigue States
  const [currentAdProgress, setCurrentAdProgress] = useState<number>(0);
  const [dailyCreditsEarned, setDailyCreditsEarned] = useState<number>(0);
  
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [adLoaded, setAdLoaded] = useState(true); // Mock is always loaded
  const [isWatchingAd, setIsWatchingAd] = useState(false);

  // The dynamic formula
  const requiredAds = 2 + dailyCreditsEarned;

  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCredits(data.credits ?? 0);
        setCurrentAdProgress(data.currentAdProgress ?? 0);
        setDailyCreditsEarned(data.dailyCreditsEarned ?? 0);
        setIsDeveloper(data.isDeveloper ?? false);
        
        // --- Daily Passive Energy & Reset Logic ---
        const lastDailyRewardTimestamp = data.lastDailyRewardTimestamp;
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        if (lastDailyRewardTimestamp !== todayStr) {
          if (user.isAnonymous) {
            // Guests do not receive the daily check-in reward.
            // But we can reset their daily watch-ad fatigue just in case.
            try {
              await updateDoc(userRef, {
                lastDailyRewardTimestamp: todayStr,
                dailyCreditsEarned: 0,
                currentAdProgress: 0
              });
            } catch (e) {}
            return;
          }

          const currentCredits = data.credits ?? 0;
          const MAX_FREE_CREDITS = 5;

          if (currentCredits < MAX_FREE_CREDITS) {
            try {
              await updateDoc(userRef, {
                credits: increment(1),
                lastDailyRewardTimestamp: todayStr,
                dailyCreditsEarned: 0,
                currentAdProgress: 0
              });
              console.log("Granted daily +1 energy and reset fatigue!");
            } catch (e) {
              console.error("Failed to grant daily reward/reset:", e);
            }
          } else {
            // User reached cap. Reset fatigue but do not add credit.
            try {
              await updateDoc(userRef, {
                lastDailyRewardTimestamp: todayStr,
                dailyCreditsEarned: 0,
                currentAdProgress: 0
              });
              console.log("Cap reached. Reset fatigue but no credits added.");
            } catch (e) {
              console.error("Failed to reset fatigue:", e);
            }
          }
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  /* --- MOCK ADMOB LOGIC START --- */
  // useEffect(() => {
  //   const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => setAdLoaded(true));
  //   
  //   const unsubscribeEarned = rewarded.addAdEventListener(
  //     RewardedAdEventType.EARNED_REWARD,
  //     async (reward) => { /* Update this logic when un-mocked */ }
  //   );
  //
  //   const unsubscribeClosed = rewarded.addAdEventListener(RewardedAdEventType.CLOSED, () => {
  //      setAdLoaded(false);
  //      rewarded.load();
  //   });
  //
  //   rewarded.load();
  //
  //   return () => {
  //     unsubscribeLoaded();
  //     unsubscribeEarned();
  //     unsubscribeClosed();
  //   };
  // }, [user]);
  /* --- MOCK ADMOB LOGIC END --- */

  const deductCredit = useCallback(async (): Promise<boolean> => {
    // 1. The Developer Bypass
    if (isDeveloper) return true;
    
    // 2. Not enough credits
    if (credits === null || credits <= 0) {
      return false;
    }

    try {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          credits: increment(-1)
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to deduct credit:", error);
      return false;
    }
  }, [credits, isDeveloper, user]);

  const showAdToEarnCredit = useCallback(async () => {
    /* --- MOCK ADMOB FLOW --- */
    setIsWatchingAd(true);
    
    // Simulate watching video
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Progressive Fatigue Reward Logic
    if (user) {
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const currentProgress = data.currentAdProgress ?? 0;
          const currentDailyEarned = data.dailyCreditsEarned ?? 0;
          
          const currentReqAds = 2 + currentDailyEarned;
          const newProgress = currentProgress + 1;
          
          if (newProgress >= currentReqAds) {
             // Reached target -> +1 credit, reset progress, increase fatigue
             await updateDoc(userRef, {
               credits: increment(1),
               currentAdProgress: 0,
               dailyCreditsEarned: increment(1)
             });
          } else {
             // Just step forward in progress
             await updateDoc(userRef, {
               currentAdProgress: newProgress
             });
          }
        }
    }
    
    setIsWatchingAd(false);
  }, [user]);

  return {
    credits,
    currentAdProgress,
    requiredAds,
    isDeveloper,
    deductCredit,
    showAdToEarnCredit,
    isAdLoaded: adLoaded,
    isWatchingAd,
  };
};
