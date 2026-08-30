// Uygulama ayarları (para birimi, son güncelleme zamanı, güncelleme aralığı)

import { storage } from './storage';
import { StorageKeys } from './keys';

export const settingsRepository = {
  // Kayıtlı ayarlar; hiç kayıt yoksa null döner (varsayılanları store belirler)
  async loadSettings() {
    return storage.getJSON(StorageKeys.settings, null);
  },

  async saveSettings(settings) {
    return storage.setJSON(StorageKeys.settings, settings);
  },
};
