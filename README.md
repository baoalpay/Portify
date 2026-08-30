# 📊 Portify

**Yatırımlarını tek yerden yönet.**

Portify; hisse senedi (BIST), yatırım fonu, kripto para, döviz, altın ve gümüş varlıklarınızı
tek bir uygulamadan takip etmenizi sağlayan, React Native + Expo ile geliştirilmiş açık kaynak
bir mobil portföy takip uygulamasıdır.

Tüm verileriniz **yalnızca cihazınızda** saklanır — sunucu yok, üyelik yok, veri toplama yok.
Fiyatlar ücretsiz ve anahtarsız halka açık API'lerden çekilir.

> ⚠️ Bu uygulama yatırım tavsiyesi vermez. Fiyatlar üçüncü taraf kaynaklardan alınır ve
> gecikmeli veya hatalı olabilir.

## Ekran Görüntüleri

<!-- TODO: Ekran görüntülerini ekleyin -->
| Portföy | Varlıklarım | Varlık Ekle | Ayarlar |
|---|---|---|---|
| ![Portföy](docs/screenshots/portfolio.png) | ![Varlıklarım](docs/screenshots/holdings.png) | ![Varlık Ekle](docs/screenshots/add-holding.png) | ![Ayarlar](docs/screenshots/settings.png) |

## ✨ Özellikler

- **6 varlık türü:** BIST hisseleri, fonlar, kripto, döviz (20 para birimi), altın, gümüş
- **Otomatik fiyat güncelleme:** Yahoo Finance, CoinGecko ve ExchangeRate API'lerinden (5 dk önbellekli)
- **Portföy özeti:** toplam değer, maliyet, kar/zarar ve getiri yüzdesi
- **Grafikler:** varlık dağılımı (pasta/çubuk/liste), günlük kayıtlara dayalı performans grafiği, hisse detay grafikleri
- **Çoklu portföy:** portföy oluşturma, düzenleme ve varlıkları portföyler arası taşıma
- **Akıllı ekleme:** aynı varlığı tekrar eklerseniz adetler toplanır, ağırlıklı ortalama maliyet hesaplanır
- **Sıralama ve arama:** türe, değere, kar/zarara göre sıralama; sembol/ada göre arama
- **Hedef fiyat alarmı:** "üstüne çıkarsa / altına düşerse" hedefleri (şimdilik uygulama içi gösterge — bkz. Bilinen Eksikler)
- **Kişiselleştirme:** karanlık/aydınlık mod, 8 tema rengi, ₺/$/€ para birimi seçimi
- **Gizlilik odaklı:** tüm veriler cihazda (AsyncStorage), hiçbir sunucuya veri gönderilmez

## 🚀 Kurulum

Gereksinimler: [Node.js](https://nodejs.org) (LTS) ve telefonunuzda [Expo Go](https://expo.dev/go)
uygulaması (veya bir Android/iOS emülatörü).

```bash
# Repoyu klonlayın
git clone https://github.com/baoalpay/Portify.git
cd Portify

# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npx expo start
```

Terminalde çıkan QR kodu telefonunuzdaki Expo Go ile okutun (bilgisayar ve telefon aynı
Wi-Fi ağında olmalı). Emülatör için terminalde `a` (Android) veya `i` (iOS, yalnızca macOS)
tuşuna basın.

API anahtarı veya `.env` dosyası **gerekmez** — kullanılan tüm fiyat servisleri anahtarsızdır.

## 🛠 Kullanılan Teknolojiler

| Teknoloji | Kullanım amacı |
|---|---|
| [React Native](https://reactnative.dev) 0.81 + [Expo](https://expo.dev) SDK 54 | Mobil uygulama çatısı |
| [React](https://react.dev) 19 | Arayüz bileşenleri |
| [Zustand](https://zustand-demo.pmnd.rs) | Durum (state) yönetimi |
| [React Navigation](https://reactnavigation.org) v7 | Sekme + stack navigasyonu |
| [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) | Cihaz içi kalıcı depolama |
| [react-native-chart-kit](https://github.com/indiespirit/react-native-chart-kit) | Pasta ve çizgi grafikleri |
| [react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/) | Kaydırmalı kart aksiyonları |
| Yahoo Finance, CoinGecko, ExchangeRate API | Fiyat verileri (ücretsiz, anahtarsız) |

Mimari detayları için: [docs/MIMARI.md](docs/MIMARI.md)

## 🚧 Bilinen Eksikler

Proje aktif geliştirme aşamasındadır; aşağıdaki konular henüz tamamlanmamıştır:

- **Bildirimler gerçek değil:** Hedef fiyat alarmı kurulabilir ancak telefon bildirimi
  gönderilmez; alarm yalnızca uygulama açıkken varlık kartı üzerinde gösterilir.
  (`expo-notifications` paketi yüklü fakat henüz bağlanmadı.)
- **Premium sistemi bağlı değil:** Kodda Premium kilitleri (çoklu portföy, tema renkleri,
  transfer) kurgulanmış durumda ama satın alma akışı yok; `isPremium` sabit `true` olduğundan
  tüm özellikler şu an herkese açık.
- **Gümüş fiyatı çekilmiyor:** Gümüş için fiyat API'si bağlanmadı; güncel fiyat maliyetle aynı
  varsayılır ve kar/zarar hep 0 görünür.
- **`loadSettings` hatası:** `App.js` açılışta store'da tanımlı olmayan bir `loadSettings`
  fonksiyonu çağırıyor; açılıştaki ilk otomatik veri yükleme zinciri bu yüzden kesiliyor
  (ekranlar odaklanınca veriyi kendileri yüklediği için uygulama çalışmaya devam ediyor).
- Ayrıca: varlık detayındaki grafik hisse dışındaki türlerde temsili (rastgele) veridir,
  fon fiyatları manuel girilir, otomatik güncelleme aralığı için ayar arayüzü yoktur ve
  "Tüm Verileri Sil" yalnızca varsayılan portföyün varlıklarını siler.

Katkıda bulunmak isterseniz bu maddeler iyi birer başlangıç noktasıdır. 🙌

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) ile lisanslanmıştır.

## 📬 İletişim

Sorularınız için: baoalpay@gmail.com
