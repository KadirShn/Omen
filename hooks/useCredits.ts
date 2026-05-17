import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useRewardedAd } from 'react-native-google-mobile-ads';

const adUnitId = __DEV__ 
  ? 'ca-app-pub-3940256099942544/5224354917' 
  : 'ca-app-pub-9093667472808260/8819666043';

export const useCredits = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  
  // Progressive Fatigue States
  const [currentAdProgress, setCurrentAdProgress] = useState<number>(0);
  const [dailyCreditsEarned, setDailyCreditsEarned] = useState<number>(0);
  
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);

  // The dynamic formula
  const requiredAds = 2 + dailyCreditsEarned;

  const { isLoaded, isClosed, isEarnedReward, load, show } = useRewardedAd(adUnitId, {
    keywords: ['dream', 'spirituality', 'psychology']
  });

  const [rewardGrantedForCurrentAd, setRewardGrantedForCurrentAd] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isClosed) {
      setIsWatchingAd(false);
      setRewardGrantedForCurrentAd(false);
      load();
    }
  }, [isClosed, load]);

  useEffect(() => {
    if (isEarnedReward && !rewardGrantedForCurrentAd && user) {
      setRewardGrantedForCurrentAd(true);
      
      const grantReward = async () => {
        try {
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
        } catch (error) {
          console.log("[useCredits]: Failed to process ad reward", error);
        }
      };

      grantReward();
    }
  }, [isEarnedReward, rewardGrantedForCurrentAd, user]);

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
              console.log("[useCredits]: Failed to grant daily reward/reset", e);
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
              console.log("[useCredits]: Failed to reset fatigue", e);
            }
          }
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

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
      console.log("[useCredits]: Failed to deduct credit", error);
      return false;
    }
  }, [credits, isDeveloper, user]);

  const showAdToEarnCredit = useCallback(async () => {
    if (isLoaded) {
      setIsWatchingAd(true);
      show();
    } else {
      console.log("Ad not loaded yet.");
      load();
    }
  }, [isLoaded, show, load]);

  return {
    credits,
    currentAdProgress,
    requiredAds,
    isDeveloper,
    deductCredit,
    showAdToEarnCredit,
    isAdLoaded: isLoaded,
    isWatchingAd,
  };
};
