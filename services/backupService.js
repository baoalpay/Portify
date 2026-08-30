// Yedekleme akışları: dosya oluşturup paylaşma ve dosya seçip okuma.
//
// Veri işi backupRepository'de (doğrulama, içe/dışa aktarma); bu dosya yalnızca
// cihazın dosya sistemi ve paylaşım ekranıyla konuşur. Hiçbir fonksiyon
// fırlatmaz; her durumda { success/canceled/error } şeklinde sonuç döner.

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { backupRepository } from '../repositories/backupRepository';

// Yedeği tarihli dosyaya yazıp paylaşım ekranını açar.
// Dönen değer: { success, error? }
export const exportBackup = async () => {
  try {
    const json = await backupRepository.exportJSON();

    const date = new Date().toISOString().split('T')[0]; // 2026-08-30
    const fileUri = `${FileSystem.cacheDirectory}portify-yedek-${date}.json`;
    await FileSystem.writeAsStringAsync(fileUri, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (!(await Sharing.isAvailableAsync())) {
      return { success: false, error: 'Bu cihazda dosya paylaşımı desteklenmiyor.' };
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Portify yedeğini kaydet',
    });

    return { success: true };
  } catch (error) {
    console.error('Yedek dışa aktarılamadı:', error);
    return { success: false, error: 'Yedek dosyası oluşturulamadı.' };
  }
};

// Kullanıcıya dosya seçtirir ve içeriği metin olarak okur.
// Dönen değer: { canceled: true } | { content } | { error }
export const pickBackupFile = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      // .json bazen text/plain veya octet-stream olarak etiketlenir;
      // asıl doğrulamayı backupRepository.validateBackup yapar
      type: ['application/json', 'text/plain', 'application/octet-stream'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) {
      return { canceled: true };
    }

    const uri = result.assets?.[0]?.uri;
    if (!uri) {
      return { error: 'Seçilen dosyaya erişilemedi.' };
    }

    const content = await FileSystem.readAsStringAsync(uri);
    return { content };
  } catch (error) {
    console.error('Yedek dosyası okunamadı:', error);
    return { error: 'Dosya okunamadı. Lütfen geçerli bir yedek dosyası seçin.' };
  }
};
