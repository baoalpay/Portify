// Portify Tasarım Sistemi
//
// Tek doğru kaynak: renk tokenları, tipografi, spacing, radius, gölge, hareket,
// erişilebilirlik sabitleri ve Türkçe sayı/para formatları.
//
// Kurallar:
// - Ekranlar ham hex/px değeri KULLANMAZ; her şey buradan okunur.
// - Kar/zarar asla yalnız renkle anlatılmaz: Direction ile işaret + ikon da eklenir.
// - Sayı formatlama ekranlarda elle yapılmaz; Format yardımcıları kullanılır.
// - Koyu tema ana temadır; açık tema aynı token isimleriyle ayna palettir.
//
// Not: Eski ekranlar constants/theme.js kullanmaya devam ediyor. Ekranlar yeni
// tasarıma taşındıkça bu dosyaya geçecek; theme.js sonrasında kaldırılacak.

// ============ RENK TOKENLARI ============

// Koyu tema (ana tema)
const dark = {
  // Zeminler: katman hissi gölgeyle değil yüzey tonu farkıyla verilir
  background: '#0B0E14',        // uygulama zemini
  surface: '#151A23',           // kart / liste zemini
  surfaceRaised: '#1D2430',     // sheet, modal, öne çıkan kart
  border: '#2A3340',            // ince ayraçlar, kart kenarları

  // Metin hiyerarşisi (background üzerinde WCAG AA hedefli)
  text: '#F2F5F9',              // birincil metin ve sayılar (~16:1)
  textSecondary: '#A9B4C2',     // etiketler, açıklamalar (~8:1)
  textTertiary: '#6E7A89',      // yalnızca büyük puntolu/dekoratif metin (~4.6:1)
                                // DİKKAT: küçük gövde metninde kullanma

  // Marka
  accent: '#8B7CF6',            // ana vurgu (mor — kendi tonumuz)
  accentPressed: '#7362E8',     // basılı durum
  onAccent: '#FFFFFF',          // accent zemin üzerindeki metin

  // Finansal durum renkleri (renk + işaret + ikon üçlüsünün yalnızca renk ayağı)
  profit: '#3DD68C',
  loss: '#FF6B7A',
  warning: '#F5B94D',

  // Durum zeminleri (chip/rozet arkası — %12 dolgu yaklaşık karşılığı)
  profitBg: 'rgba(61, 214, 140, 0.14)',
  lossBg: 'rgba(255, 107, 122, 0.14)',

  overlay: 'rgba(0, 0, 0, 0.55)', // modal arkası karartma

  // Kahraman yüzey gradyanı (adlandırılmış token — ekranlar ham hex kullanmaz)
  heroGradient: ['#8B7CF6', '#6D5BE8'],
};

// Açık tema (ayna palet — aynı token isimleri)
const light = {
  background: '#F5F6F9',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  border: '#E4E8EE',

  text: '#171C26',              // (~15:1)
  textSecondary: '#525E6E',     // (~7:1)
  textTertiary: '#7C8796',      // (~4.5:1) — yalnızca büyük puntolu/dekoratif metin

  accent: '#5B4BD6',
  accentPressed: '#4A3BC4',
  onAccent: '#FFFFFF',

  // Açık zeminde küçük metinde de AA tutması için koyulaştırılmış tonlar
  profit: '#0B8A5C',
  loss: '#D03A52',
  warning: '#B27A10',

  profitBg: 'rgba(11, 138, 92, 0.10)',
  lossBg: 'rgba(208, 58, 82, 0.10)',

  overlay: 'rgba(15, 20, 30, 0.45)',

  // Kahraman yüzey gradyanı (adlandırılmış token — ekranlar ham hex kullanmaz)
  heroGradient: ['#5B4BD6', '#4A3BC4'],
};

export const Palette = { dark, light };

// ============ YÖN / KAR-ZARAR KODLAMASI ============
// Erişilebilirlik kuralı: pozitif/negatif bilgi renk + işaret + ikonla birlikte verilir.
// Bileşenler tutar/yüzde gösterirken bu yardımcıyı kullanmak ZORUNDADIR.

export const Direction = {
  of(value) {
    const positive = value >= 0;
    return {
      positive,
      sign: positive ? '+' : '−',              // U+2212 gerçek eksi işareti
      icon: positive ? 'trending-up' : 'trending-down', // Ionicons adı
      colorToken: positive ? 'profit' : 'loss',         // Palette anahtarı
      bgToken: positive ? 'profitBg' : 'lossBg',
    };
  },
};

// ============ TİPOGRAFİ ============
// Ölçek: display > h1 > h2 > h3 > body > bodySmall > caption
// Sayısal stiller tabular-nums taşır: listelerde rakamlar alt alta hizalanır.

export const Typography = {
  display: { fontSize: 34, fontWeight: '700', letterSpacing: -0.6, lineHeight: 40 },
  h1:      { fontSize: 28, fontWeight: '700', letterSpacing: -0.4, lineHeight: 34 },
  h2:      { fontSize: 22, fontWeight: '600', letterSpacing: -0.3, lineHeight: 28 },
  h3:      { fontSize: 18, fontWeight: '600', letterSpacing: -0.2, lineHeight: 24 },
  body:    { fontSize: 16, fontWeight: '400', lineHeight: 22 },
  bodySmall: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },

  // Sayısal varyantlar (para, yüzde, adet)
  numDisplay: { fontSize: 34, fontWeight: '700', letterSpacing: -0.6, lineHeight: 40, fontVariant: ['tabular-nums'] },
  numLarge:   { fontSize: 22, fontWeight: '700', letterSpacing: -0.3, lineHeight: 28, fontVariant: ['tabular-nums'] },
  numBody:    { fontSize: 16, fontWeight: '600', lineHeight: 22, fontVariant: ['tabular-nums'] },
  numSmall:   { fontSize: 13, fontWeight: '600', lineHeight: 18, fontVariant: ['tabular-nums'] },
};

// ============ SPACING (4pt ızgara) ============

export const Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ============ KÖŞE YARIÇAPLARI ============

export const Radius = {
  xs: 6,     // chip, rozet
  sm: 10,    // buton, input
  md: 14,    // kart
  lg: 20,    // sheet, büyük kart
  full: 999, // daire
};

// ============ GÖLGELER ============
// Koyu temada katmanlar öncelikle yüzey tonuyla ayrılır; gölge yalnızca
// yüzen öğelerde (sheet, popover) kullanılır.

export const Elevation = {
  none: {},
  raised: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 2,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
};

// ============ HAREKET ============

export const Motion = {
  fast: 150,   // ms — basma geri bildirimi, chip geçişleri
  base: 250,   // ms — ekran içi geçişler, sheet açılışı
  slow: 400,   // ms — vurgu animasyonları
  spring: { tension: 60, friction: 10 }, // Animated.spring için ortak ayar
};

// ============ ERİŞİLEBİLİRLİK ============

export const A11y = {
  minTouchTarget: 44, // pt — tüm dokunulabilir öğelerin minimum genişlik/yüksekliği
  adBuffer: 24,       // pt — reklam ile etkileşimli öğe arasındaki zorunlu tampon
};

// ============ TÜRKÇE SAYI / PARA FORMATLARI ============
// Türk formatı: binlik ayracı NOKTA, ondalık VİRGÜL → 1.234.567,89
// Ekranlar toFixed/elle biçimleme yapmaz; yalnızca bu fonksiyonları kullanır.

const LOCALE = 'tr-TR';

export const Format = {
  // 1234567.89 → "1.234.567,89"
  number(value, digits = 2) {
    const n = Number(value);
    if (!isFinite(n)) return '—';
    return n.toLocaleString(LOCALE, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  },

  // 1234567.89 → "₺1.234.567,89"
  currency(value, symbol = '₺', digits = 2) {
    return `${symbol}${Format.number(value, digits)}`;
  },

  // 1234567 → "₺1,2 Mn" | 12500 → "₺12,5 B"  (B = bin, Mn = milyon, Mr = milyar)
  compactCurrency(value, symbol = '₺') {
    const n = Number(value);
    if (!isFinite(n)) return '—';
    const abs = Math.abs(n);
    if (abs >= 1e9) return `${symbol}${Format.number(n / 1e9, 1)} Mr`;
    if (abs >= 1e6) return `${symbol}${Format.number(n / 1e6, 1)} Mn`;
    if (abs >= 1e3) return `${symbol}${Format.number(n / 1e3, 1)} B`;
    return Format.currency(n, symbol);
  },

  // 12.345 → "%12,35" (işaretsiz; işaret Direction ile eklenir)
  percent(value, digits = 2) {
    const n = Number(value);
    if (!isFinite(n)) return '—';
    return `%${Format.number(Math.abs(n), digits)}`;
  },

  // 1234.5 → "+₺1.234,50" / -1234.5 → "−₺1.234,50"
  signedCurrency(value, symbol = '₺', digits = 2) {
    const d = Direction.of(Number(value));
    return `${d.sign}${Format.currency(Math.abs(Number(value)), symbol, digits)}`;
  },

  // 12.345 → "+%12,35" / -12.345 → "−%12,35"
  signedPercent(value, digits = 2) {
    const d = Direction.of(Number(value));
    return `${d.sign}${Format.percent(value, digits)}`;
  },
};
