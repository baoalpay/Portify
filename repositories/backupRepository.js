// Yedekleme / geri yükleme altyapısı
//
// Tüm portföy verisini tek bir JSON nesnesine dışa aktarır ve bu formattaki
// bir yedeği doğrulayıp içe aktarır.
//
// Tasarım notları:
// - validateBackup ASLA fırlatmaz; bozuk dosya { valid: false, errors: [...] } döner.
//   Arayüz bu hataları kullanıcıya gösterir, uygulama çökmez.
// - importData mevcut verinin ÜZERİNE yazar. Arayüz, hasExistingData() true ise
//   içe aktarmadan önce kullanıcıya sormakla yükümlüdür (UI henüz yazılmadı).
// - schema alanı ileride format değişirse eski yedekleri tanımak için var.

import { storage } from './storage';
import { StorageKeys, holdingsKeyFor } from './keys';
import { maintenanceRepository } from './maintenanceRepository';

const BACKUP_APP = 'portify';
const BACKUP_SCHEMA = 1;

const DEFAULT_PORTFOLIO = {
  id: 'default',
  name: 'Ana Portföy',
  icon: 'wallet',
  color: '#6366F1',
};

export const backupRepository = {
  // ---- DIŞA AKTARMA ----

  // Tüm veriyi tek bir nesnede topla
  async exportData() {
    const portfolios =
      (await storage.getJSON(StorageKeys.portfolios, null)) || [DEFAULT_PORTFOLIO];

    const holdingsByPortfolio = {};
    for (const portfolio of portfolios) {
      holdingsByPortfolio[portfolio.id] = await storage.getJSON(
        holdingsKeyFor(portfolio.id),
        []
      );
    }

    return {
      app: BACKUP_APP,
      schema: BACKUP_SCHEMA,
      exportedAt: new Date().toISOString(),
      data: {
        portfolios,
        activePortfolioId:
          (await storage.getString(StorageKeys.activePortfolio, null)) || 'default',
        settings: await storage.getJSON(StorageKeys.settings, null),
        holdingsByPortfolio,
        history: await storage.getJSON(StorageKeys.history, []),
        alerts: await storage.getJSON(StorageKeys.alerts, {}),
      },
    };
  },

  // Paylaşılabilir JSON metni
  async exportJSON() {
    return JSON.stringify(await this.exportData(), null, 2);
  },

  // ---- DOĞRULAMA ----

  // JSON metni veya nesne alır; { valid, errors, backup } döner. Asla fırlatmaz.
  validateBackup(input) {
    const errors = [];

    let backup = input;
    if (typeof input === 'string') {
      try {
        backup = JSON.parse(input);
      } catch (e) {
        return { valid: false, errors: ['Dosya geçerli bir JSON değil.'], backup: null };
      }
    }

    if (backup === null || typeof backup !== 'object' || Array.isArray(backup)) {
      return { valid: false, errors: ['Yedek dosyası tanınamadı.'], backup: null };
    }

    if (backup.app !== BACKUP_APP) {
      errors.push('Bu dosya bir Portify yedeği değil.');
    }
    if (typeof backup.schema !== 'number' || backup.schema > BACKUP_SCHEMA) {
      errors.push(
        'Yedek daha yeni bir uygulama sürümüyle alınmış. Lütfen uygulamayı güncelleyin.'
      );
    }

    const data = backup.data;
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      errors.push('Yedeğin veri bölümü eksik veya bozuk.');
      return { valid: false, errors, backup: null };
    }

    if (!Array.isArray(data.portfolios) || data.portfolios.length === 0) {
      errors.push('Yedekte portföy listesi yok.');
    } else {
      const badPortfolio = data.portfolios.find(
        (p) => !p || typeof p.id !== 'string' || typeof p.name !== 'string'
      );
      if (badPortfolio) errors.push('Portföy kayıtlarından biri bozuk.');
    }

    if (data.holdingsByPortfolio === null || typeof data.holdingsByPortfolio !== 'object' || Array.isArray(data.holdingsByPortfolio)) {
      errors.push('Yedekte varlık kayıtları yok.');
    } else {
      for (const [portfolioId, holdings] of Object.entries(data.holdingsByPortfolio)) {
        if (!Array.isArray(holdings)) {
          errors.push(`"${portfolioId}" portföyünün varlık listesi bozuk.`);
          continue;
        }
        const badHolding = holdings.find(
          (h) =>
            !h ||
            typeof h.symbol !== 'string' ||
            typeof h.type !== 'string' ||
            h.quantity === undefined ||
            h.avgCost === undefined
        );
        if (badHolding) errors.push(`"${portfolioId}" portföyünde bozuk varlık kaydı var.`);
      }
    }

    if (data.history !== undefined && !Array.isArray(data.history)) {
      errors.push('Geçmiş kayıtları bozuk.');
    }
    if (
      data.alerts !== undefined &&
      (data.alerts === null || typeof data.alerts !== 'object' || Array.isArray(data.alerts))
    ) {
      errors.push('Alarm kayıtları bozuk.');
    }

    return { valid: errors.length === 0, errors, backup: errors.length === 0 ? backup : null };
  },

  // ---- İÇE AKTARMA ----

  // İçe aktarmadan önce arayüzün "üzerine yazılsın mı?" sorusu için:
  // cihazda mevcut portföy verisi var mı?
  async hasExistingData() {
    const keys = await storage.getAllKeys();
    return keys.some(
      (key) => key.startsWith('portify_') && key !== StorageKeys.onboarding
    );
  },

  // Doğrulanmış yedeği cihaza yazar (mevcut verinin ÜZERİNE yazar).
  // Dönen değer: { success, errors }
  async importData(input) {
    const { valid, errors, backup } = this.validateBackup(input);
    if (!valid) {
      return { success: false, errors };
    }

    const { data } = backup;

    // Önce eski veriyi temizle (yarım kalmış eski kayıt bırakmamak için)
    await maintenanceRepository.clearAllData();

    await storage.setJSON(StorageKeys.portfolios, data.portfolios);

    const validActiveId = data.portfolios.some((p) => p.id === data.activePortfolioId)
      ? data.activePortfolioId
      : data.portfolios[0].id;
    await storage.setString(StorageKeys.activePortfolio, validActiveId);

    if (data.settings) {
      await storage.setJSON(StorageKeys.settings, data.settings);
    }

    for (const [portfolioId, holdings] of Object.entries(data.holdingsByPortfolio)) {
      await storage.setJSON(holdingsKeyFor(portfolioId), holdings);
    }

    if (Array.isArray(data.history)) {
      await storage.setJSON(StorageKeys.history, data.history);
    }
    if (data.alerts && typeof data.alerts === 'object') {
      await storage.setJSON(StorageKeys.alerts, data.alerts);
    }

    return { success: true, errors: [] };
  },
};
