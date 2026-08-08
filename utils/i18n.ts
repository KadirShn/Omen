import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import tr from '../locales/tr.json';

const resources = {
  en: { translation: en },
  tr: { translation: tr },
};

const i18n = createInstance();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'tr',
    fallbackLng: 'tr',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
