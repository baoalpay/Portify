// Veri bakımı: tam silme
//
// "Tüm Verileri Sil" tüm portföy verilerini kaldırır:
// portföyler, aktif portföy, TÜM portföylerin varlıkları, ayarlar,
// geçmiş ve fiyat alarmları (portify_* anahtarları).
//
// Korunanlar: cihaz tercihleri (tema, tema rengi) ve onboarding durumu —
// veri silen kullanıcıya tanıtım ekranını yeniden göstermek gereksiz.

import { storage } from './storage';
import { StorageKeys } from './keys';

export const maintenanceRepository = {
  // Silinen anahtar sayısını döner
  async clearAllData() {
    const keys = await storage.getAllKeys();
    const toRemove = keys.filter(
      (key) => key.startsWith('portify_') && key !== StorageKeys.onboarding
    );
    await storage.multiRemove(toRemove);
    return toRemove.length;
  },
};
