import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// We'll use a simpler approach for debugging missing translations
const logMissingTranslations = true;

import enTranslation from './locales/en/translation.json';
import teTranslation from './locales/te/translation.json';
import hiTranslation from './locales/hi/translation.json';

// Ensure translations are properly loaded
const resources = {
  en: {
    translation: enTranslation
  },
  te: {
    translation: teTranslation
  },
  hi: {
    translation: hiTranslation
  }
};

// Initialize i18next
i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    debug: true, // Enable debug for better troubleshooting
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    resources,
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: ''
    },
    returnEmptyString: false,
    returnNull: false,
    // Add missing key handler for debugging
    saveMissing: true,
    missingKeyHandler: (lng, ns, key, fallbackValue) => {
      console.warn(`Missing translation key: ${key} for language: ${lng}`);
    }
  });

// Force reload resources to ensure they're properly loaded
i18n.reloadResources().then(() => {
  console.log('Translation resources reloaded successfully');
});

export default i18n;
