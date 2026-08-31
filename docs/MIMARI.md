# Portify — Mimari ve Proje Analizi

> Bu belge, projenin tamamı okunarak hazırlanmıştır (30 Ağustos 2026).
> Teknik terimler ilk geçtikleri yerde kısaca açıklanmıştır.

---

## 1. Bu proje ne işe yarıyor?

**Portify**, Türkiye'deki bireysel yatırımcılar için yapılmış bir **mobil portföy takip uygulamasıdır**.
Kullanıcı; hisse senedi (BIST), yatırım fonu, kripto para, döviz, altın ve gümüş varlıklarını
uygulamaya elle girer (sembol, adet, ortalama maliyet). Uygulama güncel fiyatları internetten
çekerek toplam portföy değerini, kar/zararı ve varlık dağılımını hesaplayıp grafiklerle gösterir.

Çözdüğü problem: "Param farklı yerlerde (borsa, kripto, döviz, altın) dağınık duruyor;
hepsinin toplam değerini ve kar/zararımı tek ekranda görmek istiyorum."

Önemli bir tasarım kararı: **Uygulamanın kendi sunucusu ve üyelik sistemi yok.**
Tüm veriler yalnızca telefonun kendi hafızasında saklanır. Fiyatlar ücretsiz, herkese açık
API'lerden çekilir. (API = başka bir servisin internet üzerinden veri sunduğu adres.)

---

## 2. Teknoloji Stack'i (Kullanılan Teknolojiler)

| Katman | Teknoloji | Sürüm | Açıklama |
|---|---|---|---|
| Çatı (framework) | **React Native** | 0.81.5 | JavaScript ile hem iOS hem Android uygulaması yazmayı sağlar |
| Geliştirme platformu | **Expo** | ~54 | React Native'i kolaylaştıran araç seti; derleme, test ve yayınlamayı basitleştirir |
| Arayüz kütüphanesi | **React** | 19.1.0 | Ekranların "bileşen" (component) mantığıyla kurulmasını sağlar |
| Durum yönetimi (state) | **Zustand** | ^5 | Uygulamanın ortak verilerini (varlık listesi, ayarlar) tek merkezde tutan küçük bir kütüphane |
| Navigasyon | **React Navigation** | v7 | Ekranlar arası geçiş: altta 3 sekmeli bar (bottom-tabs) + üst üste açılan ekranlar (stack) |
| Kalıcı depolama | **AsyncStorage** | ^2.2 | Telefonun hafızasına anahtar-değer şeklinde veri kaydeder (uygulama kapansa da veri durur) |
| Grafikler | **react-native-chart-kit** | ^6.12 | Pasta (pie) ve çizgi (line) grafikleri çizer; altyapıda `react-native-svg` kullanır |
| Jest/kaydırma | **react-native-gesture-handler** | ~2.28 | Kartları sola kaydırınca çıkan Sil/Düzenle/Transfer butonları için |
| Tarih işlemleri | date-fns | ^4.1 | **Pakette var ama kodda hiç kullanılmıyor** |
| HTTP istekleri | axios | ^1.13 | **Pakette var ama kodda hiç kullanılmıyor** (tüm istekler tarayıcı yerleşiği `fetch` ile yapılıyor) |
| UI kit | react-native-paper | ^5.14 | **Pakette var ama kodda hiç kullanılmıyor** |
| Bildirimler | expo-notifications, expo-device | — | **Pakette ve app.json'da ayarlı ama kodda hiç import edilmiyor** (bildirim özelliği yarım, aşağıda) |

### Veri nereden geliyor? (3. parti servisler)

Hepsi ücretsiz ve **API anahtarı (şifre/key) gerektirmeyen** herkese açık servisler:

1. **Yahoo Finance** (`query1.finance.yahoo.com`) → BIST hisse fiyatları (sembole `.IS` eklenerek) ve hisse detay grafikleri
2. **CoinGecko** (`api.coingecko.com`) → kripto fiyatları (TL cinsinden) ve altın fiyatı (tether-gold token'ı üzerinden gram altına çevrilerek — yaklaşık bir değerdir)
3. **ExchangeRate API** (`api.exchangerate-api.com`) → döviz kurları

- Fon fiyatları: API yok, kullanıcı **elle** girer (uygulama tefas.gov.tr'ye yönlendirir).
- Gümüş fiyatı: **hiç çalışmıyor** (kodda "Gümüş API henüz çalışmıyor" notu var).
- Fiyatlar 5 dakikalık bellek-içi önbellekte (cache) tutulur; aynı fiyat 5 dk içinde tekrar sorulmaz.

---

## 3. Mimari: Klasörler ve Veri Akışı

### Klasörlerin görevleri

```
Portify/
├── App.js                  → Uygulamanın giriş noktası: navigasyon, splash/onboarding,
│                             otomatik fiyat güncelleme yöneticisi
├── index.js                → Expo'nun App.js'i başlatan standart dosyası
├── app.json                → Expo yapılandırması (uygulama adı, ikon, izinler)
├── assets/                 → Görseller: uygulama ikonu, splash görseli, favicon
├── components/             → Birden fazla yerde kullanılan/ekran-üstü parçalar:
│   ├── SplashScreen.js       açılış animasyonu
│   ├── OnboardingScreen.js   ilk kurulumda 3 sayfalık tanıtım
│   └── PortfolioSelector.js  portföy seçme/ekleme/düzenleme açılır menüsü
├── constants/
│   └── theme.js            → Sabit tasarım değerleri: renk paleti (açık/koyu),
│                             boşluk, köşe yuvarlaklığı, yazı tipleri, gölgeler
├── context/
│   └── ThemeContext.js     → Tema yönetimi (React Context ile): karanlık mod aç/kapa,
│                             8 tema renginden birini seçme; tercih AsyncStorage'a kaydedilir
├── screens/                → Uygulamanın 5 ekranı (aşağıda tek tek anlatılıyor)
├── services/               → "İş mantığı" katmanı — arayüzden bağımsız fonksiyonlar:
│   ├── priceService.js       dış API'lerden fiyat çekme + 5 dk önbellek
│   ├── historyService.js     günlük portföy değeri geçmişini kaydetme/okuma (grafik için)
│   └── notificationService.js hedef fiyat alarmlarını kaydetme/kontrol etme
├── store/
│   └── PortfolioStore.js   → Zustand "store": uygulamanın kalbi. Varlıklar, portföyler,
│                             ayarlar, hesaplamalar ve AsyncStorage kayıt/yükleme burada
└── docs/                   → GitHub Pages için statik web sayfaları
    ├── index.html            tanıtım sayfası
    ├── privacy-policy.html   gizlilik politikası
    └── terms-of-service.html kullanım koşulları
```

### Katmanlar arası veri akışı

Genel akış şöyledir:

```
Ekran (screens/) ──okur/çağırır──► Store (Zustand) ──kaydeder/yükler──► AsyncStorage (telefon hafızası)
        │                              │
        │                              └──fiyat ister──► services/priceService ──► İnternet (Yahoo, CoinGecko...)
        └──tema bilgisini──► context/ThemeContext ──► constants/theme.js (renk değerleri)
```

- **Ekranlar** veriyi doğrudan internetten ya da hafızadan almaz; **store'a sorar**.
- **Store** hem bellekteki güncel durumu tutar hem de her değişikliği AsyncStorage'a yazar.
- **Servisler** "nasıl fiyat çekilir / nasıl geçmiş tutulur" detayını bilir; store ve ekranlar bunları fonksiyon olarak çağırır.

### Örnek senaryo: Kullanıcı uygulamayı açıp Portföy ekranını görüyor

1. `index.js`, `App.js` içindeki `App` bileşenini başlatır.
2. `App` önce `ThemeProvider` ile sarılır → AsyncStorage'dan tema tercihi (karanlık mod, renk) okunur.
3. `AppContent` çalışır: AsyncStorage'a bakılır — onboarding (tanıtım) daha önce tamamlanmış mı?
   - İlk kurulumsa: Splash animasyonu biter bitmez 3 sayfalık **OnboardingScreen** gösterilir.
   - Değilse: Splash animasyonu oynarken arkada ana uygulama kurulur.
4. `PriceUpdateManager` devreye girer: `loadSettings()` → `loadHoldings()` → `updatePrices()`
   sırasıyla çağrılır. (⚠ Not: `loadSettings` store'da tanımlı değil — bkz. Bölüm 5, bu adım hata verir.)
5. Altta 3 sekmeli navigasyon açılır, varsayılan sekme **Portföy**'dür.
6. `PortfolioScreen` ekrana her odaklandığında (`useFocusEffect`):
   - `loadPortfolios()` → AsyncStorage'daki `portify_portfolios` anahtarından portföy listesi okunur.
   - `loadHoldings()` → aktif portföyün varlıkları `portify_holdings` (veya `portify_holdings_<id>`) anahtarından okunur.
   - `updatePrices()` → store, `services/priceService.updateAllPrices()`'ı çağırır; her varlığın
     türüne göre doğru API'ye gidilir (hisse→Yahoo, kripto→CoinGecko...). Dönen fiyatlar
     varlıklara işlenir, hem store'daki durum güncellenir hem AsyncStorage'a geri yazılır.
7. Ekran, store'daki hesap fonksiyonlarını çağırarak görünümü kurar:
   - `getPortfolioSummary()` → toplam değer, maliyet, kar/zarar
   - `getDistribution()` → pasta grafiği için tür bazında dağılım
   - `getProfitLossDistribution()` → varlık bazında kar/zarar çubukları
8. Ayrıca `services/historyService.saveToday()` ile o günün portföy değeri güne 1 kayıt olacak
   şekilde saklanır; "Performans" çizgi grafiği bu birikmiş günlük kayıtlardan beslenir.
9. Store'daki veri değiştiğinde Zustand, o veriyi kullanan ekranları otomatik yeniden çizer.

---

## 4. Ekranlar (tek tek)

### 4.1 PortfolioScreen (Portföy — ana sekme)
Uygulamanın özet/gösterge paneli.
- **Ne yapar:** Toplam portföy değeri, maliyet, kar/zarar ve getiri yüzdesini büyük kartta gösterir.
  Günlük kayıtlardan **performans çizgi grafiği** (1H/1A/6A/1Y dönem seçimli), tür bazında
  **varlık dağılımı** (pasta / çubuk / liste olarak 3 görünüm), varlık bazında **kar/zarar
  çubukları** ve hızlı istatistikler. Aşağı çekince (pull-to-refresh) fiyatlar yenilenir.
- **Kullandığı parçalar:** `PortfolioSelector` (portföy değiştirme menüsü), `react-native-chart-kit`
  (PieChart, LineChart), store'un özet/dağılım fonksiyonları, `historyService`.

### 4.2 HoldingsScreen (Varlıklarım)
Varlık listesinin yönetildiği ekran (kendi Stack'inin ilk sayfası).
- **Ne yapar:** Tüm varlıkları kart halinde listeler (tür rengiyle ikon, güncel değer, kar/zarar
  rozeti, adet/maliyet/güncel fiyat satırı). 7 farklı **sıralama** seçeneği (türe göre gruplu,
  değere göre, kar/zarara göre, alfabetik, son eklenen), **arama**, en çok kazanan / en çok
  kaybeden kartları. Kartı **sola kaydırınca** Transfer / Düzenle / Sil butonları çıkar.
  Transfer, varlığı başka portföye taşır (Premium özelliği olarak kurgulanmış).
  Aktif fiyat alarmı olan varlıkta zil ikonu ve hedef fiyat şeridi görünür.
- **Kullandığı parçalar:** `Swipeable` (gesture-handler), store, `notificationService`
  (alarm yükleme/kontrol), 2 adet Modal (sıralama ve transfer).

### 4.3 AddHoldingScreen (Varlık Ekle / Düzenle)
- **Ne yapar:** 6 varlık türünden biri seçilir; türe göre form etiketleri değişir
  (hisse→"Lot", altın→"Gram" gibi). Döviz için 20 para birimlik aranabilir liste vardır.
  Fon seçilirse güncel fiyat elle girilmesi zorunludur. İsteğe bağlı **hedef fiyat alarmı**
  kurulabilir ("üstüne çıkarsa / altına düşerse"). Aynı sembol tekrar eklenirse store,
  adetleri toplayıp **ağırlıklı ortalama maliyet** hesaplayarak birleştirir.
  Düzenleme modunda tür ve sembol kilitlenir.
- **Kullandığı parçalar:** store (`addHolding`/`updateHolding`), `notificationService`
  (`setAlert`, `getAlert`).

### 4.4 HoldingDetailScreen (Varlık Detayı)
- **Ne yapar:** Tek varlığın büyük fiyat başlığı, dönem seçimli (1G–5Y) **fiyat grafiği**,
  Açılış/Kapanış/En Yüksek/En Düşük istatistikleri ve "Portföyüm" özeti (adet, maliyet,
  güncel değer, kar/zarar). Düzenle ve Sil butonları vardır.
- **Önemli detay:** Grafik verisi **yalnızca hisse senetlerinde gerçektir** (Yahoo Finance).
  Diğer tüm türlerde (kripto, döviz, altın...) grafik **rastgele üretilmiş sahte (mock) veridir**
  ve istatistik kutuları da fiyattan türetilmiş tahmini değerlerle başlar. Bkz. Bölüm 5.
- **Kullandığı parçalar:** LineChart, store.

### 4.5 SettingsScreen (Ayarlar)
- **Ne yapar:** Karanlık mod anahtarı, 8 renkli tema seçici (7'si Premium kilidi arkasında
  kurgulanmış), para birimi seçimi (₺/$/€ — dönüşüm kurları ExchangeRate API'den),
  "Tüm Verileri Sil", ve uygulama içi gömülü metinlerle Sorumluluk Reddi / Kullanım
  Koşulları / Gizlilik Politikası modalları, sürüm bilgisi.
- **Kullandığı parçalar:** `ThemeContext` (tema), store (para birimi, premium durumu),
  AsyncStorage (veri silme).

### Ekran dışı bileşenler
- **SplashScreen:** Tamamen animasyonlu açılış perdesi (logo + yazı + nokta yükleyici), ~2.5 sn sonra kaybolur.
- **OnboardingScreen:** İlk açılışta 3 slaytlık tanıtım; "tamamlandı" bilgisi AsyncStorage'a yazılır.
- **PortfolioSelector:** Portföy açılır menüsü + yeni portföy oluşturma/düzenleme formları
  (isim, 8 ikon, 8 renk). Premium olmayan 1, Premium 5 portföy açabilir (kurgu).

---

## 5. Yarım Kalmış / Kullanılmayan / Sorunlu Kod Parçaları

### Gerçek hata (bug)
1. **`App.js:113` → `loadSettings` store'da yok.** `PriceUpdateManager` açılışta
   `loadSettings()` çağırıyor ama `PortfolioStore.js`'te böyle bir fonksiyon tanımlanmamış.
   Bu çağrı hata fırlatır ve açılıştaki `loadHoldings()` + `updatePrices()` zinciri kesilir.
   Uygulama yine de çalışıyor görünür çünkü ekranlar odaklanınca kendi başlarına veri yükler.

### Yarım kalmış özellikler
2. **Bildirimler sahte:** `notificationService.js`'te `requestNotificationPermissions` her zaman
   `true` döner, `sendPriceAlert` sadece konsola yazar (kodda "Development build'de gerçek
   notification eklenecek" notu var). `expo-notifications` ve `expo-device` paketleri yüklü ve
   `app.json`'da bildirim izinleri tanımlı ama **kodda hiç import edilmiyor**. Yani alarm kurulunca
   telefon bildirimi GELMEZ; sadece uygulama açıkken kart üzerinde işaret görünür.
3. **Otomatik güncelleme aralığı ayarlanamıyor:** `App.js`'teki zamanlayıcı
   `settings.updateInterval` değerine bakıyor ama bu ayarı değiştirecek hiçbir arayüz yok ve
   varsayılan ayarlarda bu alan tanımsız → otomatik güncelleme fiilen hep "Manuel mod"da.
4. **Gümüş fiyatı çekilmiyor:** `fetchSilverPrice` boş iskelet; her zaman `null` döner
   (gümüş varlıklarında güncel fiyat = maliyet varsayılır, kar/zarar hep 0 görünür).
5. **Detay ekranındaki grafik hisse dışında sahte:** `generateMockChartData` rastgele sayı üretir;
   istatistikler (`open/high/low`) hisse dışında uydurma çarpanlarla hesaplanır. Kullanıcı bunu
   gerçek veri sanabilir — ileride ya gerçek API bağlanmalı ya da "temsili" ibaresi eklenmeli.
6. **Detay ekranında işlevsiz butonlar:** üstteki yer imi / zil / paylaş ikonları ve
   "Daha fazla göster" butonunun `onPress`'i yok — basınca hiçbir şey olmaz.
7. **Premium sistemi bağlanmamış:** `isPremium` store'da **sabit `true`**; `setPremium` hiçbir
   yerden çağrılmıyor, satın alma akışı yok. Tüm Premium kilitleri (renkler, çoklu portföy,
   transfer) şu an fiilen herkese açık.
8. **"Tüm Verileri Sil" eksik siliyor:** Sadece `portify_holdings` anahtarını (varsayılan
   portföyün varlıkları) siler. Diğer portföyler, onların varlıkları, geçmiş (`portify_history`),
   alarmlar (`portify_price_alerts`) ve portföy listesi **silinmez**.

### Kullanılmayan (ölü) kod ve bağımlılıklar
9. **Hiç kullanılmayan npm paketleri:** `axios`, `date-fns`, `react-native-paper`,
   `expo-notifications`, `expo-device`. (Repo boyutu ve derleme süresi için temizlenebilir.)
10. **Export edilip hiç çağrılmayan fonksiyonlar:** `priceService.clearPriceCache`,
    `priceService.fetchFundPrice` (her zaman `null` döner), `OnboardingScreen.resetOnboarding`,
    `store.setPremium`, `historyService.getHistoryCount`, `notificationService.removeAlert`,
    `notificationService.resetAlert`, `notificationService` içindeki yerel `formatPrice`.
11. **Küçük tutarsızlıklar:** Store'daki varsayılan kur değerleri (`USD: 0.027`) elle yazılmış ve
    günceli yansıtmaz (yalnızca para birimi değiştirilince API'den tazelenir). `HoldingsStack`
    içinde `useTheme`'den alınan `colors` hiç kullanılmıyor. `App.js`'te `isPremium` yorunda
    "Premium durumu" dışında açıklama yok.

---

## 6. Projeyi Bilgisayarında Çalıştırma

Gerekenler: **Node.js** (LTS sürümü) ve telefonuna **Expo Go** uygulaması
(App Store / Google Play'den ücretsiz) — veya bir Android/iOS emülatörü.

```bash
# 1) Proje klasörüne gir
cd Portify

# 2) Bağımlılıkları indir (package.json'daki kütüphaneleri node_modules/ içine kurar)
npm install

# 3) Geliştirme sunucusunu başlat
npx expo start
```

Sonra:
- Terminalde bir **QR kod** çıkar. Telefondaki Expo Go ile bu kodu okut → uygulama telefonda açılır.
  (Bilgisayar ve telefon aynı Wi-Fi ağında olmalı.)
- Emülatör kullanacaksan terminalde `a` (Android) veya `i` (iOS, sadece Mac) tuşuna bas.
- `w` tuşu web önizlemesi açar ama uygulama mobil için tasarlandığından web'de bazı şeyler bozuk görünebilir.

Not: Fiyatların gelmesi için internet bağlantısı gerekir; herhangi bir API anahtarı ya da
`.env` dosyası **gerekmez** (tüm servisler anahtarsız ve ücretsizdir).

---

## 7. TEFAS Bağımlılığı (bakım notu — kırılırsa buradan başla)

> Son güncelleme: 30 Ağustos 2026. Fon fiyatları TEFAS'ın **gayriresmî** iç
> servisinden çekiliyor. TEFAS resmî API sunmuyor (SSS'lerinde açıkça
> "kurumsal politika gereği API paylaşımı yapılmamaktadır" yazıyor).

### Nereye bakılır?

**TEFAS'a dokunan TÜM kod tek dosyada: `repositories/tefasRepository.js`.**
Fon fiyatı gelmiyorsa önce o dosyadaki uç noktayı ve istek gövdesini kontrol et;
başka hiçbir dosyada TEFAS bilgisi yoktur.

### Kullanılan uç nokta (30.08.2026 itibarıyla çalışıyor)

- `POST https://www.tefas.gov.tr/api/funds/fonGnlBlgSiraliGetir`
- Gövde (JSON): `fonTipi: "YAT"`, `fonKodu: "NNF" | null`, `basTarih`/`bitTarih`
  (**yyyyMMdd** formatında, ör. `20260828`), `basSira: 1`, `bitSira: 100000`, `dil: "TR"`
  + sitenin gönderdiği boş alanlar (dosyada hazır şablon var)
- Header: `Content-Type: application/json`, `Origin/Referer: tefas.gov.tr`
- Yanıt: `resultList` dizisi; önemli alanlar `fonKodu`, `fonUnvan`, `tarih`
  (yyyy-MM-dd), **`fiyat`** (TL birim pay değeri)
- `fonKodu: null` gönderilirse TÜM fonların listesi döner (arama önbelleği bundan beslenir)

### Bilinen riskler ve gözlenmiş davranışlar

1. **Uç nokta habersiz değişebilir.** Nisan 2026'da site Next.js'e taşındı ve eski
   `/api/DB/BindHistoryInfo` uç noktası kapatıldı ("Method not found or disabled"
   dönüyor) — tüm üçüncü parti kütüphaneler kırıldı. Aynısı yine olabilir.
2. **Hız sınırı: ~6 istek/dakika.** Aşınca IP birkaç dakika bağlantı düşürme
   cezası alıyor (curl'de `exit code 000`/ECONNRESET olarak görünür). Bu yüzden
   dosyada istekler arası 10 sn zorunlu bekleme ve günde-bir-istek önbelleği var.
3. **Tek istekte en çok ~1 aylık aralık** dönüyor (biz zaten 4-8 günlük soruyoruz).
4. **Hukuki durum gri:** veri Takasbank'ın; ticari kullanım için açık izin yok,
   bilinen yaptırım örneği de yok. Uygulama ciddi gelir üretirse Takasbank'la
   lisans görüşülmeli.

### Kırılırsa uygulama ne yapar?

Hiçbir şey çökmez: `getFundPrice` asla hata fırlatmaz; son bilinen fiyat
(`portify_tefas_prices` anahtarında) `stale: true` işaretiyle döner, o da yoksa
kullanıcının elle girdiği fiyat kullanılır (manuel giriş birinci sınıf yoldur).
Varlık kartında "Fiyat güncellenemedi" ibaresi görünür. Kullanıcı Ayarlar >
Fiyat Kaynakları'ndan TEFAS'ı tamamen kapatabilir.

### Onarım için ipuçları

- Yeni uç noktayı bulmak için: tefas.gov.tr'yi tarayıcıda aç, geliştirici
  araçları > Network sekmesinde fon listesi sayfasının çağırdığı isteğe bak.
- Topluluk kütüphaneleri genelde hızlı güncellenir; şablon olarak bak:
  `github.com/mirzazad/pytefas`, `pypi.org/project/tefas-crawler`.
- Önbellek anahtarları: `portify_tefas_prices` (fon başına son fiyat),
  `portify_tefas_fund_list` (7 günlük arama listesi) — `repositories/keys.js`.
