import { create } from 'zustand';
import { updateAllPrices } from '../services/priceService';
import { portfolioRepository } from '../repositories/portfolioRepository';
import { holdingsRepository } from '../repositories/holdingsRepository';

// Varsayılan portföy
const DEFAULT_PORTFOLIO = {
  id: 'default',
  name: 'Ana Portföy',
  icon: 'wallet',
  color: '#6366F1',
  createdAt: new Date().toISOString(),
};

const usePortfolioStore = create((set, get) => ({
  // State
  holdings: [],
  portfolios: [DEFAULT_PORTFOLIO],
  activePortfolioId: 'default',
  isLoading: false,
  isPremium: true, // Premium durumu
  settings: {
    currency: 'TRY',
    lastUpdated: null,
  },
  exchangeRates: {
    USD: 0.027,
    EUR: 0.026,
  },

  // ============ PORTFÖY YÖNETİMİ ============

  // Tüm portföyleri yükle
  loadPortfolios: async () => {
    try {
      const portfolios = await portfolioRepository.loadPortfolios();
      if (portfolios) {
        set({ portfolios: portfolios.length > 0 ? portfolios : [DEFAULT_PORTFOLIO] });
      }

      // Aktif portföyü yükle
      const activeId = await portfolioRepository.loadActivePortfolioId();
      if (activeId) {
        set({ activePortfolioId: activeId });
      }
    } catch (error) {
      console.error('Portföyler yüklenemedi:', error);
    }
  },

  // Portföyleri kaydet
  savePortfolios: async (portfolios) => {
    await portfolioRepository.savePortfolios(portfolios);
  },

  // Aktif portföyü değiştir
  setActivePortfolio: async (portfolioId) => {
    set({ activePortfolioId: portfolioId });
    await portfolioRepository.saveActivePortfolioId(portfolioId);
    // Yeni portföyün holdinglerini yükle
    await get().loadHoldings();
  },

  // Aktif portföyü getir
  getActivePortfolio: () => {
    const { portfolios, activePortfolioId } = get();
    return portfolios.find(p => p.id === activePortfolioId) || portfolios[0];
  },

  // Yeni portföy ekle
  addPortfolio: async (portfolioData) => {
    const { portfolios, isPremium } = get();
    
    // Premium kontrolü
    const maxPortfolios = isPremium ? 5 : 1;
    if (portfolios.length >= maxPortfolios) {
      return { success: false, error: 'limit' };
    }

    const newPortfolio = {
      id: Date.now().toString(),
      name: portfolioData.name || 'Yeni Portföy',
      icon: portfolioData.icon || 'briefcase',
      color: portfolioData.color || '#8B5CF6',
      createdAt: new Date().toISOString(),
    };

    const updatedPortfolios = [...portfolios, newPortfolio];
    set({ portfolios: updatedPortfolios });
    await get().savePortfolios(updatedPortfolios);
    
    return { success: true, portfolio: newPortfolio };
  },

  // Portföy düzenle
  updatePortfolio: async (portfolioId, updates) => {
    const portfolios = get().portfolios.map(p =>
      p.id === portfolioId ? { ...p, ...updates } : p
    );
    set({ portfolios });
    await get().savePortfolios(portfolios);
  },

  // Portföy sil
  deletePortfolio: async (portfolioId) => {
    const { portfolios, activePortfolioId } = get();
    
    // Varsayılan portföy silinemez
    if (portfolioId === 'default') {
      return { success: false, error: 'default' };
    }

    // En az 1 portföy kalmalı
    if (portfolios.length <= 1) {
      return { success: false, error: 'last' };
    }

    const updatedPortfolios = portfolios.filter(p => p.id !== portfolioId);
    set({ portfolios: updatedPortfolios });
    await get().savePortfolios(updatedPortfolios);

    // Silinen portföy aktifse, varsayılana geç
    if (activePortfolioId === portfolioId) {
      await get().setActivePortfolio('default');
    }

    // Silinen portföyün holdinglerini de sil
    await holdingsRepository.removeHoldings(portfolioId);

    return { success: true };
  },

  // ============ HOLDİNG YÖNETİMİ ============

  // Aktif portföyün holdinglerini yükle
  loadHoldings: async () => {
    try {
      set({ isLoading: true });
      const { activePortfolioId } = get();
      const holdings = await holdingsRepository.loadHoldings(activePortfolioId);
      set({ holdings });
    } catch (error) {
      console.error('Holdings yüklenemedi:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Holdingleri kaydet
  saveHoldings: async (holdings) => {
    const { activePortfolioId } = get();
    await holdingsRepository.saveHoldings(activePortfolioId, holdings);
  },

  // Holding ekle
  addHolding: async (holdingData) => {
    const existingHoldings = get().holdings;
    
    const existingIndex = existingHoldings.findIndex(
      (h) => h.symbol === holdingData.symbol && h.type === holdingData.type
    );

    let newHolding = null;

    if (existingIndex !== -1) {
      const existing = existingHoldings[existingIndex];
      const existingQty = parseFloat(existing.quantity);
      const newQty = parseFloat(holdingData.quantity);
      const totalQty = existingQty + newQty;

      const existingCost = parseFloat(existing.avgCost);
      const newCost = parseFloat(holdingData.avgCost);
      const avgCost = ((existingQty * existingCost) + (newQty * newCost)) / totalQty;

      const updatedHolding = {
        ...existing,
        quantity: totalQty.toString(),
        avgCost: avgCost.toFixed(2),
        updatedAt: new Date().toISOString(),
      };

      const updatedHoldings = [...existingHoldings];
      updatedHoldings[existingIndex] = updatedHolding;
      
      set({ holdings: updatedHoldings });
      await get().saveHoldings(updatedHoldings);
      newHolding = updatedHolding;
    } else {
      newHolding = {
        id: Date.now().toString(),
        ...holdingData,
        createdAt: new Date().toISOString(),
      };

      const updatedHoldings = [...existingHoldings, newHolding];
      set({ holdings: updatedHoldings });
      await get().saveHoldings(updatedHoldings);
    }

    return newHolding;
  },

  // Holding sil
  deleteHolding: async (id) => {
    const updatedHoldings = get().holdings.filter((h) => h.id !== id);
    set({ holdings: updatedHoldings });
    await get().saveHoldings(updatedHoldings);
  },

  // Holding güncelle
  updateHolding: async (id, updates) => {
    const updatedHoldings = get().holdings.map((h) =>
      h.id === id ? { ...h, ...updates } : h
    );
    set({ holdings: updatedHoldings });
    await get().saveHoldings(updatedHoldings);
  },

  // ============ HESAPLAMALAR ============

  getPortfolioSummary: () => {
    const holdings = get().holdings;
    
    if (holdings.length === 0) {
      return {
        totalValue: 0,
        totalCost: 0,
        profitLoss: 0,
        profitLossPercent: 0,
      };
    }

    const totalCost = holdings.reduce((sum, h) => {
      const cost = parseFloat(h.avgCost) * parseFloat(h.quantity);
      return sum + (isNaN(cost) ? 0 : cost);
    }, 0);

    const totalValue = holdings.reduce((sum, h) => {
      const currentPrice = h.currentPrice ? parseFloat(h.currentPrice) : parseFloat(h.avgCost);
      const value = currentPrice * parseFloat(h.quantity);
      return sum + (isNaN(value) ? 0 : value);
    }, 0);

    const profitLoss = totalValue - totalCost;
    const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

    return { totalValue, totalCost, profitLoss, profitLossPercent };
  },

  getDistribution: () => {
    const holdings = get().holdings;
    const distribution = {};

    holdings.forEach((h) => {
      const currentPrice = h.currentPrice ? parseFloat(h.currentPrice) : parseFloat(h.avgCost);
      const value = currentPrice * parseFloat(h.quantity);
      if (!distribution[h.type]) {
        distribution[h.type] = 0;
      }
      distribution[h.type] += value;
    });

    const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);

    const typeNames = {
      stock: 'Hisse Senetleri',
      fund: 'Fonlar',
      crypto: 'Kripto',
      currency: 'Döviz',
      gold: 'Altın',
      silver: 'Gümüş',
    };

    const typeColors = {
      stock: '#6366F1',
      fund: '#8B5CF6',
      crypto: '#EC4899',
      currency: '#22C55E',
      gold: '#F59E0B',
      silver: '#94A3B8',
    };

    return Object.entries(distribution).map(([type, value]) => ({
      name: typeNames[type] || type,
      value,
      percent: total > 0 ? parseFloat(((value / total) * 100).toFixed(2)) : 0,
      color: typeColors[type] || '#6366F1',
      legendFontColor: '#7F7F7F',
      legendFontSize: 11,
    }));
  },

  // ============ FİYAT GÜNCELLEME ============

  updatePrices: async () => {
    const holdings = get().holdings;
    if (holdings.length === 0) return;

    try {
      const updatedHoldings = await updateAllPrices(holdings);
      set({ 
        holdings: updatedHoldings,
        settings: { ...get().settings, lastUpdated: new Date().toISOString() }
      });
      await get().saveHoldings(updatedHoldings);
    } catch (error) {
      console.error('Fiyat güncelleme hatası:', error);
    }
  },

  // ============ PARA BİRİMİ ============

  updateExchangeRates: async () => {
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
      const data = await response.json();
      if (data.rates) {
        set({
          exchangeRates: {
            USD: data.rates.USD,
            EUR: data.rates.EUR,
          }
        });
      }
    } catch (error) {
      console.log('Kur güncellenemedi');
    }
  },

  setCurrency: async (currency) => {
    set({ settings: { ...get().settings, currency } });
    if (currency !== 'TRY') {
      await get().updateExchangeRates();
    }
  },

  convertCurrency: (valueTRY) => {
    const { settings, exchangeRates } = get();
    if (settings.currency === 'TRY') return valueTRY;
    if (settings.currency === 'USD') return valueTRY * exchangeRates.USD;
    if (settings.currency === 'EUR') return valueTRY * exchangeRates.EUR;
    return valueTRY;
  },

  getCurrencySymbol: () => {
    const { settings } = get();
    switch (settings.currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      default: return '₺';
    }
  },

  // ============ PREMIUM ============

  setPremium: (isPremium) => {
    set({ isPremium });
  },

  // ============ KAR/ZARAR DAĞILIMI ============

  getProfitLossDistribution: () => {
    const holdings = get().holdings;
    
    return holdings.map((h) => {
      const currentPrice = h.currentPrice ? parseFloat(h.currentPrice) : parseFloat(h.avgCost);
      const avgCost = parseFloat(h.avgCost);
      const quantity = parseFloat(h.quantity);
      
      const cost = avgCost * quantity;
      const value = currentPrice * quantity;
      const profitLoss = value - cost;
      const profitLossPercent = cost > 0 ? (profitLoss / cost) * 100 : 0;
      
      return {
        id: h.id,
        symbol: h.symbol,
        type: h.type,
        profitLoss,
        profitLossPercent,
        value,
        cost,
      };
    }).sort((a, b) => b.profitLoss - a.profitLoss);
  },

  // ============ VARLIK TRANSFERİ (Premium) ============

  transferHolding: async (holdingId, targetPortfolioId) => {
    const { holdings, activePortfolioId, isPremium } = get();
    
    // Premium kontrolü
    if (!isPremium) {
      return { success: false, error: 'premium' };
    }

    // Aynı portföye transfer yapılamaz
    if (targetPortfolioId === activePortfolioId) {
      return { success: false, error: 'same' };
    }

    // Varlığı bul
    const holding = holdings.find(h => h.id === holdingId);
    if (!holding) {
      return { success: false, error: 'not_found' };
    }

    // Mevcut portföyden sil
    const updatedHoldings = holdings.filter(h => h.id !== holdingId);
    set({ holdings: updatedHoldings });
    await get().saveHoldings(updatedHoldings);

    try {
      // Hedef portföyün holdinglerini yükle
      const targetHoldings = await holdingsRepository.loadHoldings(targetPortfolioId);
      
      // Aynı sembol var mı kontrol et
      const existingIndex = targetHoldings.findIndex(
        h => h.symbol === holding.symbol && h.type === holding.type
      );

      if (existingIndex !== -1) {
        // Birleştir
        const existing = targetHoldings[existingIndex];
        const existingQty = parseFloat(existing.quantity);
        const newQty = parseFloat(holding.quantity);
        const totalQty = existingQty + newQty;
        const avgCost = ((existingQty * parseFloat(existing.avgCost)) + (newQty * parseFloat(holding.avgCost))) / totalQty;

        targetHoldings[existingIndex] = {
          ...existing,
          quantity: totalQty.toString(),
          avgCost: avgCost.toFixed(2),
          updatedAt: new Date().toISOString(),
        };
      } else {
        // Yeni olarak ekle
        targetHoldings.push({
          ...holding,
          id: Date.now().toString(),
          transferredAt: new Date().toISOString(),
        });
      }

      await holdingsRepository.saveHoldings(targetPortfolioId, targetHoldings);
      return { success: true };
    } catch (error) {
      console.error('Transfer hatası:', error);
      return { success: false, error: 'transfer_failed' };
    }
  },
}));

export default usePortfolioStore;