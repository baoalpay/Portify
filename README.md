# Portify

Birikimlerim dağınıktı: borsada birkaç hisse, bir iki fon, biraz kripto, bir miktar altın.
Hepsinin o an ne ettiğini görmek için dört ayrı uygulama açmak gerekiyordu. Bunun için
kendime bir portföy takip uygulaması yazdım; belki başkasının da işine yarar diye açık
kaynak yapıyorum.

Portify, React Native ve Expo ile yazılmış bir mobil uygulama. BIST hisseleri, fonlar,
kripto, döviz, altın ve gümüş varlıklarınızı elle giriyorsunuz; uygulama güncel fiyatları
çekip toplam değeri, kar/zararı ve dağılımı gösteriyor.

İki tasarım tercihim var: uygulamanın sunucusu yok, verileriniz yalnızca telefonunuzda
duruyor. Fiyatlar da anahtar gerektirmeyen açık servislerden geliyor (Yahoo Finance,
CoinGecko, ExchangeRate API) — yani üye olmanız gereken, verinizi gönderen hiçbir şey yok.

Bu bir hobi projesi, yatırım tavsiyesi vermez. Fiyatlar gecikmeli veya hatalı olabilir.

## Kurulum

[Node.js](https://nodejs.org) ve telefonunuzda [Expo Go](https://expo.dev/go) yeterli:

```bash
git clone https://github.com/baoalpay/Portify.git
cd Portify
npm install
npx expo start
```

Terminalde çıkan QR kodu Expo Go ile okutun (telefon ve bilgisayar aynı ağda olmalı).
API anahtarı ya da `.env` dosyası gerekmiyor.

## Geliştirme (Android emülatörü ile)

Ben geliştirmeyi Expo Go yerine Android emülatöründe, development build ile yapıyorum
(ileride AdMob gibi native modüller ekleneceği için Expo Go yetmiyor).

Bir kez kurulması gerekenler: Android Studio + Android SDK, bir sanal cihaz (AVD)
ve JDK 17. `JAVA_HOME` ile `ANDROID_HOME` ortam değişkenleri SDK ve JDK yollarını
göstermeli, `platform-tools` ile `emulator` klasörleri PATH'te olmalı.

Günlük geliştirme için tek komut:

```bash
npx expo run:android
```

Bu komut emülatör kapalıysa açar, uygulamayı derleyip kurar ve Metro sunucusunu
başlatır. İlk derleme uzun sürer (5-15 dk); sonrakiler native kod değişmediyse
çok daha hızlıdır. Kod kaydedildiğinde uygulama emülatörde otomatik yenilenir.

## Neler var

Çoklu portföy, varlıklar arası transfer, tür/değer/kar-zarara göre sıralama, arama,
pasta ve çizgi grafikler, günlük performans geçmişi, karanlık ve aydınlık tema,
₺/$/€ para birimi seçimi, hedef fiyat alarmı tanımlama.

Mimari ve veri akışının ayrıntısı için: [docs/MIMARI.md](docs/MIMARI.md).
Devam eden yeniden tasarım planı: [docs/YENIDEN-TASARIM.md](docs/YENIDEN-TASARIM.md).

## Bilinen eksikler

Dürüst olmak gerekirse henüz bitmemiş yerler var:

- Fiyat alarmı kurabiliyorsunuz ama telefon bildirimi gelmiyor; alarm şimdilik sadece
  uygulama içinde işaret olarak görünüyor.
- Varlık detayındaki grafik yalnızca hisselerde gerçek veri kullanıyor; diğer türlerde
  temsili. Bunu ya gerçek veriye bağlayacağım ya da grafiği kaldıracağım.
- Gümüş için fiyat kaynağı bağlamadım, fon fiyatları da elle giriliyor (TEFAS entegrasyonu
  planda).
- Kodda bir Premium kurgusu var ama satın alma sistemi bağlı değil; şu an her özellik
  herkese açık.
- Açılışta çağrılan `loadSettings` fonksiyonu store'da tanımlı değil — bu yüzden para
  birimi tercihi uygulama kapanınca kayboluyor. Sıradaki düzeltme bu.

Katkı vermek isterseniz bu maddeler iyi birer başlangıç noktası.

## Lisans

[MIT](LICENSE)

Sorular için: baoalpay@gmail.com
