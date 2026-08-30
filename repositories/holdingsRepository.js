// Varlık (holding) kayıtları — portföy başına ayrı anahtar

import { storage } from './storage';
import { holdingsKeyFor } from './keys';

export const holdingsRepository = {
  async loadHoldings(portfolioId) {
    return storage.getJSON(holdingsKeyFor(portfolioId), []);
  },

  async saveHoldings(portfolioId, holdings) {
    return storage.setJSON(holdingsKeyFor(portfolioId), holdings);
  },

  async removeHoldings(portfolioId) {
    return storage.remove(holdingsKeyFor(portfolioId));
  },
};
