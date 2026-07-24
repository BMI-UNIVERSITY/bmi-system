import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend) // Load translations from /public/locales
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    fallbackLng: 'en',
    debug: false,
    
    // Whitelist supported languages
    supportedLngs: ['en', 'en-US', 'en-GB', 'sw', 'es', 'fr', 'ar'],
    
    interpolation: {
      // React handles XSS escaping in JSX expressions, so i18next double-escaping
      // is unnecessary and would render HTML entities literally. Keep false.
      escapeValue: false,
    },
    
    backend: {
      loadPath: '/locales/{{lng}}/translation.json',
    },

    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage', 'cookie'],
    }
  });

export default i18n;









