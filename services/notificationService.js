import { alertsRepository } from '../repositories/alertsRepository';

// Bildirim izni - şimdilik sadece true döndür
// Development build'de gerçek notification eklenecek
export const requestNotificationPermissions = async () => {
  return true;
};

// Bildirim gönder - şimdilik sadece log
// Development build'de gerçek notification eklenecek
export const sendPriceAlert = async (holding, targetPrice, currentPrice) => {
  console.log(`🎯 Alarm: ${holding.symbol} hedef fiyata ulaştı! Hedef: ${targetPrice}, Güncel: ${currentPrice}`);
};

// Fiyat formatla
const formatPrice = (price) => {
  return `₺${parseFloat(price).toLocaleString('tr-TR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

// Alarmları kaydet
export const saveAlerts = async (alerts) => {
  await alertsRepository.saveAlerts(alerts);
};

// Alarmları yükle
export const loadAlerts = async () => {
  return alertsRepository.loadAlerts();
};

// Tek bir alarm ekle/güncelle
export const setAlert = async (holdingId, targetPrice, targetType = 'above') => {
  const alerts = await loadAlerts();
  
  if (targetPrice && targetPrice > 0) {
    alerts[holdingId] = {
      targetPrice: parseFloat(targetPrice),
      targetType,
      createdAt: new Date().toISOString(),
      triggered: false,
    };
  } else {
    delete alerts[holdingId];
  }
  
  await saveAlerts(alerts);
  return alerts;
};

// Tek bir alarmı getir
export const getAlert = async (holdingId) => {
  const alerts = await loadAlerts();
  return alerts[holdingId] || null;
};

// Tek bir alarmı sil
export const removeAlert = async (holdingId) => {
  const alerts = await loadAlerts();
  delete alerts[holdingId];
  await saveAlerts(alerts);
  return alerts;
};

// Tüm varlıkları kontrol et ve alarm gönder
export const checkPriceAlerts = async (holdings) => {
  const alerts = await loadAlerts();
  let alertsUpdated = false;
  
  for (const holding of holdings) {
    const alert = alerts[holding.id];
    
    if (!alert || alert.triggered) continue;
    
    const currentPrice = parseFloat(holding.currentPrice || holding.avgCost);
    const targetPrice = alert.targetPrice;
    
    let shouldTrigger = false;
    
    if (alert.targetType === 'above' && currentPrice >= targetPrice) {
      shouldTrigger = true;
    } else if (alert.targetType === 'below' && currentPrice <= targetPrice) {
      shouldTrigger = true;
    }
    
    if (shouldTrigger) {
      await sendPriceAlert(holding, targetPrice, currentPrice);
      alerts[holding.id].triggered = true;
      alerts[holding.id].triggeredAt = new Date().toISOString();
      alertsUpdated = true;
    }
  }
  
  if (alertsUpdated) {
    await saveAlerts(alerts);
  }
  
  return alerts;
};

// Tetiklenen alarmı sıfırla
export const resetAlert = async (holdingId) => {
  const alerts = await loadAlerts();
  
  if (alerts[holdingId]) {
    alerts[holdingId].triggered = false;
    alerts[holdingId].triggeredAt = null;
    await saveAlerts(alerts);
  }
  
  return alerts;
};

// Tüm alarmları temizle
export const clearAllAlerts = async () => {
  await alertsRepository.clearAlerts();
};