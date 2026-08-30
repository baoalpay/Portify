// Cihaz tercihleri: tema, tema rengi, onboarding durumu
// (Portföy verisi değildir; "Tüm Verileri Sil" bunlara dokunmaz.)

import { storage } from './storage';
import { StorageKeys } from './keys';

export const preferencesRepository = {
  // 'dark' | 'light' | null
  async loadTheme() {
    return storage.getString(StorageKeys.theme, null);
  },

  async saveTheme(theme) {
    return storage.setString(StorageKeys.theme, theme);
  },

  // tema rengi id'si ('purple' vb.) | null
  async loadThemeColor() {
    return storage.getString(StorageKeys.themeColor, null);
  },

  async saveThemeColor(colorId) {
    return storage.setString(StorageKeys.themeColor, colorId);
  },

  async isOnboardingCompleted() {
    return (await storage.getString(StorageKeys.onboarding, null)) === 'true';
  },

  async setOnboardingCompleted() {
    return storage.setString(StorageKeys.onboarding, 'true');
  },

  async resetOnboarding() {
    return storage.remove(StorageKeys.onboarding);
  },
};
