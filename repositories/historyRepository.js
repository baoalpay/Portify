// Günlük portföy değeri geçmişi (performans grafiği verisi)

import { storage } from './storage';
import { StorageKeys } from './keys';

export const historyRepository = {
  async loadHistory() {
    return storage.getJSON(StorageKeys.history, []);
  },

  async saveHistory(history) {
    return storage.setJSON(StorageKeys.history, history);
  },

  async clearHistory() {
    return storage.remove(StorageKeys.history);
  },
};
