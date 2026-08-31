// Fiyat verisi erişimi — tüm dış fiyat API'leri tek arayüz altında.
//
// KURAL: Uygulamanın geri kalanı fiyatın NEREDEN geldiğini bilmez;
// yalnızca priceRepository'yi çağırır. İleride fiyatları kendi
// sunucumuzdan (proxy) geçirirsek yalnızca aşağıdaki ENDPOINTS
// nesnesi değişir, başka hiçbir dosyaya dokunulmaz.
//
// Varlık türü -> sağlayıcı eşlemesi:
//   stock    -> Yahoo Finance (BIST: sembol + ".IS")
//   crypto   -> CoinGecko (TRY cinsinden)
//   currency -> ExchangeRate API
//   gold     -> CoinGecko tether-gold (ons -> gram çevrimi; yaklaşık değer)
//   silver   -> sağlayıcı yok (bilinen eksik; null döner)
//   fund     -> TEFAS (repositories/tefasRepository.js — tüm TEFAS kodu orada);
//               MANUEL FİYAT BİRİNCİ SINIF YOLDUR: TEFAS kapalıysa/kırıksa
//               kullanıcının girdiği fiyatla devam edilir

// ============ UÇ NOKTALAR (proxy'ye geçişte SADECE burası değişir) ============

import { tefasRepository } from './tefasRepository';

const ENDPOINTS = {
  stockPrice: (symbol) =>
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}.IS?interval=1d&range=1d`,
  cryptoPrice: (coinId) =>
    `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=try`,
  exchangeRates: (base) =>
    `https://api.exchangerate-api.com/v4/latest/${encodeURIComponent(base)}`,
};

// ============ ÖNBELLEK (5 dakika) ============

const CACHE_DURATION = 5 * 60 * 1000;
const priceCache = new Map();

const getCached = (key) => {
  const cached = priceCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.price;
  }
  return null;
};

const setCached = (key, price) => {
  priceCache.set(key, { price, timestamp: Date.now() });
};

// ============ YARDIMCILAR ============

// Ağ hatasında null döner, asla fırlatmaz
const fetchJSON = async (url) => {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error(`Fiyat isteği başarısız (${url}):`, error?.message || error);
    return null;
  }
};

// Kripto sembol -> CoinGecko id eşleştirmesi
const CRYPTO_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  SOL: 'solana',
  DOGE: 'dogecoin',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  SHIB: 'shiba-inu',
  LTC: 'litecoin',
  AVAX: 'avalanche-2',
  LINK: 'chainlink',
  UNI: 'uniswap',
  ATOM: 'cosmos',
};

const GRAMS_PER_OUNCE = 31.1035;

// ============ TÜR BAZINDA SAĞLAYICILAR ============
// Her sağlayıcı: async fetchPrice(symbol) -> TL fiyat | null

const providers = {
  stock: async (symbol) => {
    const data = await fetchJSON(ENDPOINTS.stockPrice(symbol));
    return data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  },

  crypto: async (symbol) => {
    const coinId = CRYPTO_IDS[symbol.toUpperCase()] || symbol.toLowerCase();
    const data = await fetchJSON(ENDPOINTS.cryptoPrice(coinId));
    return data?.[coinId]?.try ?? null;
  },

  currency: async (symbol) => {
    const data = await fetchJSON(ENDPOINTS.exchangeRates(symbol));
    return data?.rates?.TRY ?? null;
  },

  gold: async () => {
    const data = await fetchJSON(ENDPOINTS.cryptoPrice('tether-gold'));
    const pricePerOunce = data?.['tether-gold']?.try;
    return pricePerOunce ? pricePerOunce / GRAMS_PER_OUNCE : null;
  },

  // Bilinen eksik: gümüş için ücretsiz sağlayıcı bağlanmadı
  silver: async () => null,

  // Fon fiyatı elle girilir (TEFAS entegrasyonu planda)
  fund: async () => null,
};

// ============ DIŞA AÇIK ARAYÜZ ============

export const priceRepository = {
  // Tek varlık için güncel TL fiyatı; bulunamazsa null (asla fırlatmaz)
  async getPrice(type, symbol) {
    const provider = providers[type];
    if (!provider) return null;

    const cacheKey = `${type}_${symbol}`;
    const cached = getCached(cacheKey);
    if (cached !== null) return cached;

    const price = await provider(symbol);
    if (price !== null) setCached(cacheKey, price);
    return price;
  },

  // Tüm varlıkların fiyatını tazele; her varlık için:
  // yeni fiyat -> onu kullan; yoksa mevcut fiyatı, o da yoksa maliyeti koru.
  //
  // Fonlar: options.tefasEnabled true ise (varsayılan) TEFAS'tan günlük fiyat
  // denenir; alınamazsa manuel/son bilinen fiyatla devam edilir ve holding'e
  // priceStale=true işlenir ("fiyat güncellenemedi" göstergesi için).
  async updateAllPrices(holdings, options = {}) {
    const tefasEnabled = options.tefasEnabled !== false;

    return Promise.all(
      holdings.map(async (holding) => {
        if (holding.type === 'fund') {
          const tefas = tefasEnabled
            ? await tefasRepository.getFundPrice(holding.symbol)
            : null;

          if (tefas) {
            return {
              ...holding,
              currentPrice: tefas.price.toString(),
              priceUpdatedAt: tefas.date,
              priceStale: !!tefas.stale,
            };
          }

          // Manuel fiyat birinci sınıf yol: TEFAS kapalı ya da veri yoksa
          // kullanıcının girdiği fiyat (o da yoksa maliyet) kullanılır
          const manual = holding.currentPrice
            ? parseFloat(holding.currentPrice)
            : parseFloat(holding.avgCost);
          return {
            ...holding,
            currentPrice: manual.toString(),
            priceStale: tefasEnabled, // açıkken alınamadıysa "güncellenemedi"
          };
        }

        let currentPrice = null;
        try {
          currentPrice = await this.getPrice(holding.type, holding.symbol);
        } catch (error) {
          console.error(`Fiyat hatası (${holding.symbol}):`, error);
        }

        if (currentPrice === null) {
          currentPrice = holding.currentPrice
            ? parseFloat(holding.currentPrice)
            : parseFloat(holding.avgCost);
        }

        return {
          ...holding,
          currentPrice: currentPrice.toString(),
        };
      })
    );
  },

  // Döviz kurları (para birimi dönüşümü için): { USD, EUR } | null
  async getExchangeRates(base = 'TRY') {
    const data = await fetchJSON(ENDPOINTS.exchangeRates(base));
    if (data?.rates?.USD && data?.rates?.EUR) {
      return { USD: data.rates.USD, EUR: data.rates.EUR };
    }
    return null;
  },

  clearCache() {
    priceCache.clear();
  },
};
