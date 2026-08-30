// Portföy listesi ve aktif portföy kaydı

import { storage } from './storage';
import { StorageKeys } from './keys';

export const portfolioRepository = {
  // Kayıtlı portföy listesi; hiç kayıt yoksa null döner (varsayılanı store belirler)
  async loadPortfolios() {
    return storage.getJSON(StorageKeys.portfolios, null);
  },

  async savePortfolios(portfolios) {
    return storage.setJSON(StorageKeys.portfolios, portfolios);
  },

  async loadActivePortfolioId() {
    return storage.getString(StorageKeys.activePortfolio, null);
  },

  async saveActivePortfolioId(portfolioId) {
    return storage.setString(StorageKeys.activePortfolio, portfolioId);
  },
};
