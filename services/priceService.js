// Fiyat servis API'leri

const CACHE_DURATION = 5 * 60 * 1000; // 5 dakika cache
const priceCache = new Map();

const getCachedPrice = (symbol) => {
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.price;
  }
  return null;
};

const setCachedPrice = (symbol, price) => {
  priceCache.set(symbol, { price, timestamp: Date.now() });
};

// Kripto sembol -> CoinGecko ID eşleştirmesi
const CRYPTO_IDS = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'BNB': 'binancecoin',
  'XRP': 'ripple',
  'ADA': 'cardano',
  'SOL': 'solana',
  'DOGE': 'dogecoin',
  'DOT': 'polkadot',
  'MATIC': 'matic-network',
  'SHIB': 'shiba-inu',
  'LTC': 'litecoin',
  'AVAX': 'avalanche-2',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
};

// BIST Hisse fiyatı
export const fetchStockPrice = async (symbol) => {
  try {
    const cached = getCachedPrice(`stock_${symbol}`);
    if (cached) return cached;

    console.log(`Hisse fiyatı çekiliyor: ${symbol}`);
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.IS?interval=1d&range=1d`
    );
    const data = await response.json();
    
    if (data.chart?.result?.[0]?.meta?.regularMarketPrice) {
      const price = data.chart.result[0].meta.regularMarketPrice;
      console.log(`${symbol} fiyat: ${price}`);
      setCachedPrice(`stock_${symbol}`, price);
      return price;
    }
    return null;
  } catch (error) {
    console.error(`Hisse fiyatı hatası (${symbol}):`, error);
    return null;
  }
};

// Döviz kuru
export const fetchCurrencyRate = async (currency) => {
  try {
    const cached = getCachedPrice(`currency_${currency}`);
    if (cached) return cached;

    console.log(`Döviz kuru çekiliyor: ${currency}`);
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${currency}`);
    const data = await response.json();
    
    if (data.rates?.TRY) {
      const rate = data.rates.TRY;
      console.log(`${currency} kur: ${rate}`);
      setCachedPrice(`currency_${currency}`, rate);
      return rate;
    }
    return null;
  } catch (error) {
    console.error(`Döviz kuru hatası (${currency}):`, error);
    return null;
  }
};

// Kripto fiyatı (CoinGecko API - ücretsiz)
export const fetchCryptoPrice = async (symbol) => {
  try {
    const cached = getCachedPrice(`crypto_${symbol}`);
    if (cached) return cached;

    const coinId = CRYPTO_IDS[symbol.toUpperCase()] || symbol.toLowerCase();
    console.log(`Kripto fiyatı çekiliyor: ${symbol} (${coinId})`);

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=try`
    );
    const data = await response.json();
    
    if (data[coinId]?.try) {
      const price = data[coinId].try;
      console.log(`${symbol} fiyat: ${price} TRY`);
      setCachedPrice(`crypto_${symbol}`, price);
      return price;
    }
    return null;
  } catch (error) {
    console.error(`Kripto fiyatı hatası (${symbol}):`, error);
    return null;
  }
};

// Altın fiyatı
export const fetchGoldPrice = async () => {
  try {
    const cached = getCachedPrice('gold');
    if (cached) return cached;

    console.log('Altın fiyatı çekiliyor...');
    // Gold ounce -> TRY, sonra gram'a çevir
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=tether-gold&vs_currencies=try'
    );
    const data = await response.json();
    
    if (data['tether-gold']?.try) {
      // 1 oz = 31.1035 gram
      const pricePerGram = data['tether-gold'].try / 31.1035;
      console.log(`Altın gram fiyat: ${pricePerGram}`);
      setCachedPrice('gold', pricePerGram);
      return pricePerGram;
    }
    return null;
  } catch (error) {
    console.error('Altın fiyatı hatası:', error);
    return null;
  }
};

// Gümüş fiyatı
export const fetchSilverPrice = async () => {
  try {
    const cached = getCachedPrice('silver');
    if (cached) return cached;
    console.log('Gümüş API henüz çalışmıyor');
    return null;
  } catch (error) {
    console.error('Gümüş fiyatı hatası:', error);
    return null;
  }
};

// Fon fiyatı (manuel - API çalışmıyor)
export const fetchFundPrice = async (fundCode) => {
  console.log(`Fon ${fundCode}: Manuel fiyat gerekli`);
  return null;
};

// Tüm fiyatları güncelle
export const updateAllPrices = async (holdings) => {
  const updatedHoldings = await Promise.all(
    holdings.map(async (holding) => {
      let currentPrice = null;

      try {
        switch (holding.type) {
          case 'stock':
            currentPrice = await fetchStockPrice(holding.symbol);
            break;
          case 'crypto':
            currentPrice = await fetchCryptoPrice(holding.symbol);
            break;
          case 'currency':
            currentPrice = await fetchCurrencyRate(holding.symbol);
            break;
          case 'gold':
            currentPrice = await fetchGoldPrice();
            break;
          case 'silver':
            currentPrice = await fetchSilverPrice();
            break;
          case 'fund':
            // Fon için mevcut fiyatı koru (manuel güncelleme)
            currentPrice = holding.currentPrice ? parseFloat(holding.currentPrice) : null;
            break;
        }
      } catch (error) {
        console.error(`Fiyat hatası (${holding.symbol}):`, error);
      }

      // Fiyat yoksa mevcut değeri koru, o da yoksa maliyeti kullan
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

  return updatedHoldings;
};

export const clearPriceCache = () => {
  priceCache.clear();
};