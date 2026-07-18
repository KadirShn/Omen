import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useRewardedAd } from "react-native-google-mobile-ads";
import { db } from "../utils/firebaseConfig";
import { useAuth } from "../context/AuthContext";
import { useAds } from "../context/AdsContext";
import { claimAdReward, claimDailyCredit } from "../utils/api";

const adUnitId = __DEV__
  ? "ca-app-pub-3940256099942544/5224354917"
  : "ca-app-pub-9093667472808260/8819666043";

export const useCredits = () => {
  const { user } = useAuth();
  const { isAdsReady } = useAds();
  const [credits, setCredits] = useState<number | null>(null);
  const [currentAdProgress, setCurrentAdProgress] = useState(0);
  const [dailyCreditsEarned, setDailyCreditsEarned] = useState(0);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [adMessage, setAdMessage] = useState<string | null>(null);
  const rewardHandled = useRef(false);

  const requestOptions = useMemo(
    () => ({
      keywords: ["dream", "wellness", "journaling"],
      serverSideVerificationOptions: user
        ? { userId: user.uid, customData: "omen-energy" }
        : undefined,
    }),
    [user],
  );

  const { isLoaded, isClosed, isEarnedReward, load, show, error } = useRewardedAd(
    adUnitId,
    requestOptions,
  );

  const requiredAds = 2 + dailyCreditsEarned;

  useEffect(() => {
    if (!user) return;
    claimDailyCredit(user).catch((requestError) => {
      console.warn("[Credits] Daily sync failed", requestError);
    });

    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      setCredits(Number(data.credits ?? 0));
      setCurrentAdProgress(Number(data.currentAdProgress ?? 0));
      setDailyCreditsEarned(Number(data.dailyCreditsEarned ?? 0));
      setIsDeveloper(data.isDeveloper === true);
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (isAdsReady) load();
  }, [isAdsReady, load]);

  useEffect(() => {
    if (!error) return;
    setIsWatchingAd(false);
    setAdMessage("Reklam şu anda yüklenemedi. Lütfen biraz sonra tekrar dene.");
  }, [error]);

  useEffect(() => {
    if (!isClosed) return;
    setIsWatchingAd(false);
    rewardHandled.current = false;
    if (isAdsReady) load();
  }, [isClosed, isAdsReady, load]);

  useEffect(() => {
    if (!isEarnedReward || !user || rewardHandled.current) return;
    rewardHandled.current = true;
    if (__DEV__) {
      claimAdReward(user)
        .then(() => setAdMessage("Test reklamı ilerlemesi kaydedildi."))
        .catch(() => setAdMessage("Test ödülü doğrulanamadı."));
    } else {
      setAdMessage("Ödülün güvenli biçimde doğrulanıyor…");
    }
  }, [isEarnedReward, user]);

  const showAdToEarnCredit = useCallback(() => {
    setAdMessage(null);
    if (!isAdsReady || !isLoaded) {
      setAdMessage("Reklam hazırlanıyor. Birkaç saniye sonra tekrar dene.");
      if (isAdsReady) load();
      return;
    }
    setIsWatchingAd(true);
    show();
  }, [isAdsReady, isLoaded, load, show]);

  return {
    credits,
    currentAdProgress,
    requiredAds,
    isDeveloper,
    showAdToEarnCredit,
    isAdLoaded: isAdsReady && isLoaded,
    isWatchingAd,
    adMessage,
  };
};
