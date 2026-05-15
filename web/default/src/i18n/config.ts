import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import fr from './locales/fr.json'
import ja from './locales/ja.json'
import ru from './locales/ru.json'
import vi from './locales/vi.json'
import zh from './locales/zh.json'

export const resources = {
  en,
  zh,
  fr,
  ru,
  ja,
  vi,
} as const

export const I18N_STORAGE_KEY = 'i18nextLng'
export const I18N_DEFAULT_LNG = 'vi'
export const I18N_SUPPORTED = ['en', 'zh', 'fr', 'ru', 'ja', 'vi'] as const

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: I18N_DEFAULT_LNG,
      fallbackLng: I18N_DEFAULT_LNG,
      supportedLngs: I18N_SUPPORTED as unknown as string[],
      initAsync: false,
      load: 'languageOnly',
      nsSeparator: false,
      saveMissing: false,
      updateMissing: false,
      saveMissingTo: 'fallback',
      debug: process.env.NODE_ENV === 'development',
      interpolation: {
        escapeValue: false,
      },
    })
}

export default i18n
