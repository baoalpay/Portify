// Depolama erişim katmanı.
//
// KURAL: AsyncStorage importu projede YALNIZCA bu dosyada bulunur.
// İleride sunucuya geçilirse yalnızca repositories/ katmanı değişir;
// store ve ekranlar bu değişikliği fark etmez.

import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  // JSON değer oku; yoksa veya bozuksa fallback döner (asla fırlatmaz)
  async getJSON(key, fallback = null) {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw != null ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.error(`Depolama okunamadı (${key}):`, error);
      return fallback;
    }
  },

  async setJSON(key, value) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Depolama yazılamadı (${key}):`, error);
      return false;
    }
  },

  // Düz metin değerler (tema adı gibi JSON olmayan eski kayıtlar için)
  async getString(key, fallback = null) {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw != null ? raw : fallback;
    } catch (error) {
      console.error(`Depolama okunamadı (${key}):`, error);
      return fallback;
    }
  },

  async setString(key, value) {
    try {
      await AsyncStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(`Depolama yazılamadı (${key}):`, error);
      return false;
    }
  },

  async remove(key) {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Depolama silinemedi (${key}):`, error);
      return false;
    }
  },

  async getAllKeys() {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Depolama anahtarları listelenemedi:', error);
      return [];
    }
  },

  async multiRemove(keys) {
    try {
      if (keys.length > 0) await AsyncStorage.multiRemove(keys);
      return true;
    } catch (error) {
      console.error('Toplu silme başarısız:', error);
      return false;
    }
  },
};
