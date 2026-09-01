// Veri yapısı sürümleme ve göç (migration) altyapısı
//
// AsyncStorage'daki veri yapısı zamanla değişebilir (alan eklenir, anahtar
// yeniden adlandırılır...). Mevcut kullanıcıların verisini bozmadan yeni
// yapıya taşımak için her cihazda bir "şema sürümü" damgası tutulur
// (portify_schema_version) ve uygulama açılışında bekleyen göçler sırayla
// çalıştırılır. Ayrıntı ve yeni göç ekleme rehberi: docs/MIMARI.md
// "Veri Yapısı Sürümleme ve Göç" bölümü.
//
// Kurallar (bilinçli tasarım):
// - runMigrations ASLA fırlatmaz; göç başarısız olursa sürüm damgası son
//   başarılı adımda kalır ve bir sonraki açılışta yeniden denenir.
// - Her göç adımından sonra damga HEMEN yazılır; yarıda kesilme (uygulama
//   kapanması) durumunda tamamlanan adımlar tekrar çalışmaz.
// - Göçler idempotent yazılmalıdır: aynı adım iki kez çalışsa da veri
//   bozulmamalıdır (yarıda kesilen adım yeniden çalışacaktır).
// - Göçler tema anahtarlarına ('theme', 'theme_color') dokunmaz; onlar
//   cihaz tercihidir ve ThemeProvider göçlerden ÖNCE okuyabilir.

import { storage } from './storage';
import { StorageKeys } from './keys';

// Uygulamanın beklediği güncel veri yapısı sürümü.
// Yeni bir göç eklerken bu sayı da artırılır.
export const CURRENT_SCHEMA_VERSION = 1;

// Göç adımları — `to` alanına göre artan sırada durmalıdır.
// Her adım, (to - 1) sürümündeki veriyi `to` sürümüne taşır.
//
// Şablon:
// {
//   to: 2,
//   name: 'ornek-alan-ekle',
//   run: async () => {
//     const holdings = await storage.getJSON(StorageKeys.holdingsDefault, []);
//     const migrated = holdings.map((h) => ({ ...h, yeniAlan: h.yeniAlan ?? 'varsayilan' }));
//     await storage.setJSON(StorageKeys.holdingsDefault, migrated);
//   },
// },
const MIGRATIONS = [];

// Cihazda portföy verisi var mı? (damga ve onboarding sayılmaz)
const hasPortfolioData = async () => {
  const keys = await storage.getAllKeys();
  return keys.some(
    (key) =>
      key.startsWith('portify_') &&
      key !== StorageKeys.onboarding &&
      key !== StorageKeys.schemaVersion
  );
};

export const migrationRepository = {
  // Uygulama açılışında, veri okuyan her şeyden ÖNCE çağrılır (App.js).
  // Dönen değer: { fromVersion, toVersion, applied } — asla fırlatmaz.
  async runMigrations() {
    try {
      let version = await storage.getJSON(StorageKeys.schemaVersion, null);

      if (typeof version !== 'number') {
        if (!(await hasPortfolioData())) {
          // Temiz kurulum: veri güncel yapıda oluşacak, göç gerekmez
          await storage.setJSON(StorageKeys.schemaVersion, CURRENT_SCHEMA_VERSION);
          return {
            fromVersion: CURRENT_SCHEMA_VERSION,
            toVersion: CURRENT_SCHEMA_VERSION,
            applied: 0,
          };
        }
        // Damgasız eski veri: sürümleme eklenmeden önceki yapı = sürüm 1
        version = 1;
        await storage.setJSON(StorageKeys.schemaVersion, version);
      }

      if (version > CURRENT_SCHEMA_VERSION) {
        // Veri, uygulamadan daha yeni (ör. sürüm geri alındı) — dokunma.
        // Eski uygulama yeni yapıyı bilemez; okuyabildiği kadarını okur.
        console.warn(
          `Veri yapısı (v${version}) uygulamadan (v${CURRENT_SCHEMA_VERSION}) daha yeni; göç atlandı.`
        );
        return { fromVersion: version, toVersion: version, applied: 0 };
      }

      const fromVersion = version;
      let applied = 0;

      for (const migration of MIGRATIONS) {
        if (migration.to <= version) continue;
        console.log(`Veri göçü: v${version} -> v${migration.to} (${migration.name})`);
        await migration.run();
        version = migration.to;
        await storage.setJSON(StorageKeys.schemaVersion, version);
        applied++;
      }

      if (applied > 0) {
        console.log(`Veri göçü tamamlandı: v${fromVersion} -> v${version} (${applied} adım)`);
      }
      return { fromVersion, toVersion: version, applied };
    } catch (error) {
      // Göç başarısız: damga son başarılı adımda kaldı, sonraki açılışta
      // yeniden denenecek. Uygulama eldeki veriyle açılmaya devam eder.
      console.error('Veri göçü başarısız:', error);
      return { fromVersion: null, toVersion: null, applied: 0, error: true };
    }
  },
};
