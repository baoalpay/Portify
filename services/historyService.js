import { historyRepository } from '../repositories/historyRepository';

const MAX_DAYS = 365;

// Bugünün tarihini YYYY-MM-DD formatında al
const getTodayKey = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

// Geçmiş verilerini yükle
export const loadHistory = async () => {
  return historyRepository.loadHistory();
};

// Bugünün verisini kaydet (günde 1 kez)
export const saveToday = async (portfolioValue, totalCost) => {
  try {
    const history = await loadHistory();
    const todayKey = getTodayKey();
    
    // Bugün zaten kaydedilmiş mi kontrol et
    const existingIndex = history.findIndex(h => h.date === todayKey);
    
    const todayData = {
      date: todayKey,
      value: portfolioValue,
      cost: totalCost,
      timestamp: Date.now(),
    };
    
    if (existingIndex !== -1) {
      // Bugün varsa güncelle
      history[existingIndex] = todayData;
    } else {
      // Bugün yoksa ekle
      history.push(todayData);
    }
    
    // Tarihe göre sırala (eskiden yeniye)
    history.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Maksimum gün sayısını aş, eskileri sil
    const trimmedHistory = history.slice(-MAX_DAYS);

    await historyRepository.saveHistory(trimmedHistory);
    return trimmedHistory;
  } catch (error) {
    console.error('Geçmiş kaydedilemedi:', error);
    return [];
  }
};

// Belirli periyot için verileri getir
export const getHistoryByPeriod = async (period) => {
  const history = await loadHistory();
  
  if (history.length === 0) return [];
  
  const now = new Date();
  let startDate;
  
  switch (period) {
    case '1D':
      // Son 24 saat - ama günlük kayıt tuttuğumuz için son 1 günü göster
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
      break;
    case '1W':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '1M':
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case '6M':
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 6);
      break;
    case '1Y':
      startDate = new Date(now);
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
  }
  
  const filtered = history.filter(h => new Date(h.date) >= startDate);
  
  return filtered;
};

// Performans hesapla (yüzde değişim)
export const calculatePerformance = (historyData) => {
  if (!historyData || historyData.length < 2) {
    return { change: 0, changePercent: 0, isPositive: true };
  }
  
  const firstValue = historyData[0].value;
  const lastValue = historyData[historyData.length - 1].value;
  
  const change = lastValue - firstValue;
  const changePercent = firstValue > 0 ? (change / firstValue) * 100 : 0;
  
  return {
    change,
    changePercent,
    isPositive: change >= 0,
  };
};

// Grafik için veri formatla
export const formatChartData = (historyData) => {
  if (!historyData || historyData.length === 0) {
    return { labels: [], values: [] };
  }
  
  // Çok fazla veri varsa etiketleri azalt
  const maxLabels = 6;
  const step = Math.ceil(historyData.length / maxLabels);
  
  const labels = [];
  const values = [];
  
  historyData.forEach((item, index) => {
    values.push(item.value);
    
    // Her step'te bir etiket göster
    if (index % step === 0 || index === historyData.length - 1) {
      const date = new Date(item.date);
      const label = `${date.getDate()}/${date.getMonth() + 1}`;
      labels.push(label);
    } else {
      labels.push('');
    }
  });
  
  return { labels, values };
};

// Tüm geçmişi sil
export const clearHistory = async () => {
  return historyRepository.clearHistory();
};

// Geçmiş veri sayısını al
export const getHistoryCount = async () => {
  const history = await loadHistory();
  return history.length;
};