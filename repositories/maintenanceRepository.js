// Veri bakımı: tam silme
//
// "Tüm Verileri Sil" tüm portföy verilerini kaldırır:
// portföyler, aktif portföy, TÜM portföylerin varlıkları, ayarlar,
// geçmiş ve fiyat alarmları (portify_* anahtarları).
//
// Korunanlar: cihaz tercihleri (tema, tema rengi), onboarding durumu ve
// veri yapısı sürüm damgası. Damga silinirse, silme sonrası yazılan yeni
// veri "damgasız eski veri" sanılıp gereksiz göçlerden geçirilebilirdi —
// bkz. repositories/migrationRepository.js.

import { storage } from './storage';
import { StorageKeys } from './keys';

export const maintenanceRepository = {
  // Silinen anahtar sayısını döner
  async clearAllData() {
    const keys = await storage.getAllKeys();
    const toRemove = keys.filter(
      (key) =>
        key.startsWith('portify_') &&
        key !== StorageKeys.onboarding &&
        key !== StorageKeys.schemaVersion
    );
    await storage.multiRemove(toRemove);
    return toRemove.length;
  },
};
