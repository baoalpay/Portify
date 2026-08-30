// Hedef fiyat alarmı kayıtları

import { storage } from './storage';
import { StorageKeys } from './keys';

export const alertsRepository = {
  async loadAlerts() {
    return storage.getJSON(StorageKeys.alerts, {});
  },

  async saveAlerts(alerts) {
    return storage.setJSON(StorageKeys.alerts, alerts);
  },

  async clearAlerts() {
    return storage.remove(StorageKeys.alerts);
  },
};
