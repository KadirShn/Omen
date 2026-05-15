import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from '../locales/en.json';
import tr from '../locales/tr.json';

const resources = {
  en: { translation: en },
  tr: { translation: tr },
};

// Fallback if device language isn't matched
const languageDetector = Localization.getLocales()[0]?.languageCode || 'en';
const defaultLang = resources[languageDetector as keyof typeof resources] ? languageDetector : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
