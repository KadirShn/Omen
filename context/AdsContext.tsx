import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import mobileAds, {
  AdsConsent,
  MaxAdContentRating,
} from "react-native-google-mobile-ads";

interface AdsContextValue {
  isAdsReady: boolean;
  showPrivacyOptions: () => Promise<void>;
}

const AdsContext = createContext<AdsContextValue>({
  isAdsReady: false,
  showPrivacyOptions: async () => {},
});

export function AdsProvider({ children }: { children: React.ReactNode }) {
  const [isAdsReady, setIsAdsReady] = useState(false);

  useEffect(() => {
    let active = true;

    const initializeAds = async () => {
      try {
        await mobileAds().setRequestConfiguration({
          maxAdContentRating: MaxAdContentRating.T,
          tagForChildDirectedTreatment: false,
        });

        try {
          await AdsConsent.requestInfoUpdate({
            tagForUnderAgeOfConsent: false,
          });
          await AdsConsent.loadAndShowConsentFormIfRequired();
        } catch (consentError) {
          // A previous valid consent decision can still allow ad requests.
          console.warn("[Ads] Consent refresh failed", consentError);
        }
        const consentInfo = await AdsConsent.getConsentInfo();

        if (!consentInfo.canRequestAds) return;

        await mobileAds().initialize();
        if (active) setIsAdsReady(true);
      } catch (error) {
        // Ads remain disabled when consent cannot be established.
        console.warn("[Ads] Consent or initialization failed", error);
      }
    };

    initializeAds();
    return () => {
      active = false;
    };
  }, []);

  const showPrivacyOptions = useCallback(async () => {
    await AdsConsent.showPrivacyOptionsForm();
  }, []);

  return (
    <AdsContext.Provider value={{ isAdsReady, showPrivacyOptions }}>
      {children}
    </AdsContext.Provider>
  );
}

export const useAds = () => useContext(AdsContext);
