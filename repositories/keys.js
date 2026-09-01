// Tüm depolama anahtarlarının tek kayıt yeri.
// Yeni bir anahtar eklenirse BURAYA eklenir — "Tüm Verileri Sil" ve
// yedekleme bu listeye güvenir.

export const StorageKeys = {
  schemaVersion: 'portify_schema_version',      // veri yapısı sürümü (bkz. migrationRepository)
  portfolios: 'portify_portfolios',
  activePortfolio: 'portify_active_portfolio',
  settings: 'portify_settings',
  holdingsDefault: 'portify_holdings',          // varsayılan portföyün varlıkları
  holdingsPrefix: 'portify_holdings_',          // diğer portföyler: portify_holdings_<id>
  history: 'portify_history',
  alerts: 'portify_price_alerts',
  tefasPrices: 'portify_tefas_prices',        // fon başına son bilinen TEFAS fiyatı
  tefasFundList: 'portify_tefas_fund_list',   // aranabilir fon listesi önbelleği
  onboarding: 'portify_onboarding_completed',
  theme: 'theme',
  themeColor: 'theme_color',
};

// Bir portföyün varlık listesinin anahtarı
export const holdingsKeyFor = (portfolioId) =>
  portfolioId === 'default'
    ? StorageKeys.holdingsDefault
    : StorageKeys.holdingsPrefix + portfolioId;
