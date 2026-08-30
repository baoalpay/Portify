# Portify — Yeniden Tasarım Planı

> Durum: TASLAK — onay bekliyor. Bu belge plan aşamasıdır; ekran kodlarına dokunulmamıştır.
> Alınan kararlar: Google Play hedefi, AdMob (en son entegre edilecek, yerleri şimdiden planlı),
> backend yok (local-first), veri katmanı repository pattern ile soyutlanacak.

---

## Görev 1 — Tasarım Analizi (Midas referansı)

> 🚧 **TASLAK — görsel referanslar olmadan yazıldı, doğrulanmadı.**
> `docs/design-refs/` klasörü bu bölüm yazılırken boştu. Aşağıdaki metin genel bilgiye
> dayalı geçici bir yer tutucudur. Görseller eklendiğinde bu bölüm **sıfırdan yeniden
> yazılacak**; mevcut metin o analizde referans alınmayacak.

### Bilgi hiyerarşisi — göz önce nereye gidiyor?

Midas tarzı fintech ekranlarında hiyerarşi "tek büyük sayı" üzerine kuruludur:

1. **Birinci odak:** Toplam portföy değeri — ekrandaki açık ara en büyük ve en kalın metin.
2. **İkinci odak:** Hemen altında dönemlik değişim (tutar + yüzde), renk ve işaretle kodlanmış küçük bir "chip".
3. **Üçüncü katman:** Grafik — dekoratif değil, değişimin hikâyesini anlatan sade bir çizgi.
4. **Dördüncü katman:** Liste öğeleri — her satır kendi içinde mini hiyerarşi taşır
   (solda kimlik: sembol+ad, sağda sonuç: değer+değişim).

Başlıklar ve etiketler kasıtlı olarak silik tutulur; **veri konuşur, arayüz susar**.

### Sayı gösterimi

- Sayılar metinden her zaman daha büyük ve daha kalın; etiketler küçük ve soluk.
- Kar/zarar üç kanalla birden kodlanır: **renk** (yeşil/kırmızı) + **işaret** (+/−) + **yön oku**.
- Rakamlar hizalı durur (eş genişlikli/tabular rakam kullanımı) — listede sayılar alt alta titremez.
- Büyük tutarlar kısaltılır (ör. 1,2 Mn) ama ana portföy değeri daima tam yazılır.

### Boşluk ve yoğunluk

- Koyu zemin + bol nefes alanı; kartlar arası boşluklar cömert, kart içi sıkı.
- Ağır kart gölgeleri yerine **yüzey tonu farkı** ve ince ayraçlarla katman hissi.
- Bir ekranda tek "kahraman" bölge; geri kalan her şey ikincil.

### Navigasyon

- Altta sabit sekme çubuğu (3–5 sekme), ikon + kısa etiket.
- Detaylar sekme değiştirmez; üstüne açılan (push) ekranla gidilir, geri oku ile dönülür.
- Modal/bottom-sheet yalnızca kısa işlemler için (sıralama, seçim).

### Neyi alacağız / neyi almayacağız

**Alacağız (düzen ve etkileşim mantığı):**
- "Tek büyük sayı" hiyerarşisi ve silik etiket / güçlü veri dengesi
- Kar/zararın renk + işaret + ikonla üçlü kodlanması
- Tabular rakamlar ve sağa yaslı sayı sütunları
- Yüzey tonlarıyla katmanlama (gölge yerine), ince ayraçlı listeler
- Bottom-sheet ile hızlı işlemler, sade dönem seçici (1G/1H/1A/1Y şerit)
- Koyu temanın ana tema olması

**Almayacağız:**
- Midas'ın logosu, marka renkleri, ikon seti, yazı tipi — hiçbir marka öğesi
- Al/sat emri arayüzleri, emir defteri, canlı borsa akışı (biz aracı kurum değiliz)
- Haber akışı / içerik feed'i (odak dağıtır, bakım yükü getirir)
- Kampanya/duyuru banner'ları

---

## Görev 2 — Tasarım Sistemi

Yeni tasarım sistemi **`constants/designSystem.js`** dosyasında kuruldu (mevcut
`constants/theme.js` bilerek korundu — eski ekranlar hâlâ ona bağlı; ekranlar yeni sisteme
taşındıkça `theme.js` emekliye ayrılacak).

### Temel kararlar

- **Koyu tema ana temadır.** Renk tokenları önce koyu tema için tasarlandı, açık tema
  aynı token isimleriyle ayna palet olarak sunuldu. Ekranlar token ismi kullanır
  (`colors.textSecondary`), asla ham hex kullanmaz.
- **Erişilebilirlik:**
  - Kar/zarar asla yalnız renkle anlatılmaz: `Direction` yardımıcısı işaret (+/−) ve
    ikon adını (`trending-up/down`) birlikte verir; bileşenler bunu kullanmak zorundadır.
  - Metin renkleri koyu ve açık zeminde WCAG AA hedefiyle seçildi (gövde metni ≥ 4.5:1;
    `textTertiary` yalnızca büyük/ikincil metinde kullanılır — dosyada uyarı notu var).
  - `A11y.minTouchTarget = 44` — tüm dokunulabilir bileşenler için taban ölçü.
- **Türkçe sayı/para formatı merkezi:** `Format` yardımcıları (`formatCurrency`,
  `formatPercent`, `formatSigned`, `formatCompact`) `tr-TR` yereliyle çalışır:
  binlik ayracı **nokta**, ondalık **virgül** (1.234.567,89 ₺). Ekranlar kendi başına
  `toFixed` / elle formatlama yapmayacak — tek doğru kaynak bu modül.
- **Hazır UI kütüphanesi yok:** Sistem yalnızca token + yardımcı sunar; bileşenler
  (Card, StatChip, AmountText...) bu tokenlarla sıfırdan yazılacak.
- **Tipografi ölçeği:** display(34) → h1(28) → h2(22) → h3(18) → body(16) → bodySmall(14)
  → caption(12). Sayısal stiller `fontVariant: tabular-nums` taşır.
- **Spacing:** 4pt ızgara (4/8/12/16/24/32/48). **Radius:** 6/10/14/20/tam.
- **Hareket:** `Motion.fast=150ms, base=250ms, slow=400ms` + tek yay (spring) ayarı;
  animasyon süreleri ekranlara serpiştirilmez, buradan okunur.

---

## Görev 3 — Ekran Planı

### Veri katmanı (ekranlardan önce kurulacak temel)

Ekranlar veriyi **repository** üzerinden alacak; verinin AsyncStorage'dan mı, ileride bir
sunucudan mı geldiğini bilmeyecek:

```
screens/  →  store (Zustand)  →  repositories/           →  bugün: AsyncStorage
                                   portfolioRepository        yarın: REST API (ekranlar değişmeden)
                                   holdingsRepository
                                   settingsRepository
                                   historyRepository
                                   priceRepository (Yahoo/CoinGecko/ExchangeRate sağlayıcıları)
```

Kural: `AsyncStorage` importu yalnızca repository dosyalarında görülebilir. Store, repository
fonksiyonlarını çağırır; ekranlar yalnızca store'u görür. (Bugünkü kodda AsyncStorage 6 ayrı
dosyaya dağılmış durumda — taşıma sırasında toplanacak.)

### Reklam yerleşimi ilkeleri (AdMob — en son entegre edilecek)

1. Parasal verinin üstünü hiçbir reklam örtmez; reklam alanı **yerleşimde önceden ayrılır**
   (yüklenince zıplama/kayma olmaz, yanlış tıklama riski düşer).
2. Liste kaydırması reklamla bölünmez — listelerin **arasına** reklam girmez.
3. Etkileşimli öğelere (sekme çubuğu, kaydet butonu, kaydırmalı kartlar) bitişik reklam olmaz;
   en az bir spacing.xl (24pt) tampon bırakılır.
4. Geçiş reklamı (interstitial) ve açılış reklamı kullanılmayacak — finans uygulamasında
   güven kırar, Play politika riski taşır.
5. Ekran başına en fazla 1 reklam. Form ekranlarında hiç reklam yok.

### 3.1 Portföy (ana sekme)

- **Amaç:** 3 saniyede cevap: "Ne kadarım var, bugün ne oldu?"
- **Bilgi önceliği:** ① toplam değer (display boyutu) → ② dönem değişimi (işaret+ikon+renk chip)
  → ③ performans çizgi grafiği (dönem şeridiyle) → ④ varlık dağılımı → ⑤ en çok kazanan/kaybeten.
  Mevcut ekrandaki "Maliyet/Güncel/Getiri" üçlü kutuları özet kartın **içine**, daha silik alınır;
  "Hızlı istatistikler" bölümü kaldırılır (bilgi değeri düşük, yer işgali yüksek).
- **Bileşenler:** `ScreenHeader` (portföy seçici + yenile), `HeroSummary`, `PeriodStrip`,
  `PerformanceChart`, `DistributionCard` (pasta/çubuk/liste görünümleri korunur), `MoversRow`.
- **Reklam:** Kaydırılan içeriğin **en sonunda**, son güncelleme yazısının altında tek sabit
  boyutlu banner alanı. Sekme çubuğuna yapışık değil (24pt tampon), veri okumayı engellemez.

### 3.2 Varlıklarım (liste)

- **Amaç:** Tüm varlıkları tarayıp yönetmek.
- **Bilgi önceliği:** ① varlık satırları (sembol/ad solda, değer + değişim sağda, tabular hizalı)
  → ② tür grupları (renk noktalı başlık) → ③ arama/sıralama araçları. "En çok kazanan/kaybeden"
  kartları Portföy ekranına taşındığı için buradan kaldırılır (tekrar ediyordu).
- **Bileşenler:** `SearchBar`, `SortSheet` (bottom-sheet), `HoldingRow` (kaydırınca
  Transfer/Düzenle/Sil aksiyonları korunur), `SectionHeader`, boş durum bileşeni.
- **Reklam:** **Yok.** Sınırsız uzunlukta kaydırılan ana çalışma listesi — ilkeler gereği temiz kalır.

### 3.3 Varlık Ekle / Düzenle

- **Amaç:** En az sürtünmeyle doğru veri girişi.
- **Bilgi önceliği:** ① tür seçimi (6 kart) → ② türe göre form → ③ isteğe bağlı alarm bölümü
  → ④ kaydet. Mevcut akış korunur; klavye türleri ve 44pt hedefler tasarım sisteminden gelir.
  Döviz arama listesi bottom-sheet'e taşınır (mevcut inline liste klavyeyle çakışıyor).
- **Bileşenler:** `TypeGrid`, `FormField`, `CurrencyPickerSheet`, `AlertSection`, `PrimaryButton`.
- **Reklam:** **Yok** (form ekranı — yanlış tıklama ve veri girişi kesintisi riski).

### 3.4 Varlık Detayı

- **Amaç:** Tek varlığın durumu ve geçmişi.
- **Bilgi önceliği:** ① sembol + güncel fiyat + değişim → ② grafik + dönem şeridi →
  ③ "Portföyüm" özeti (adet, maliyet, değer, kar/zarar) → ④ istatistikler → ⑤ Düzenle/Sil.
  **Dürüstlük düzeltmesi:** gerçek verisi olmayan türlerde sahte grafik gösterilmeyecek;
  ya sağlayıcıdan gerçek seri çekilecek ya da grafik alanı "geçmiş veri yok" durumuna düşecek.
  İşlevsiz üst ikonlar (yer imi/zil/paylaş) ve "Daha fazla göster" kaldırılır ya da bağlanır.
- **Bileşenler:** `PriceHeader`, `PerformanceChart` (Portföy ile ortak), `StatGrid`, `ActionRow`.
- **Reklam:** İçeriğin en sonunda, aksiyon butonlarından 24pt tamponla ayrılmış tek banner
  alanı (opsiyonel — ilk sürümde yalnızca Portföy + Ayarlar'da başlanabilir).

### 3.5 Ayarlar

- **Amaç:** Kişiselleştirme, veri yönetimi, yasal metinler.
- **Bilgi önceliği:** ① görünüm (tema/renk/para birimi) → ② veri yönetimi (yedekle/geri yükle
  eklenecek — bkz. Görev 4; "Tüm verileri sil" TAM silme olacak) → ③ bilgilendirme/yasal →
  ④ hakkında.
- **Bileşenler:** `SettingsRow`, `SettingsSection`, `ThemeColorSheet`, yasal metin modalları.
- **Reklam:** Liste sonunda tek banner alanı. Ayarlar nadir açılan, veri içermeyen bir ekran —
  en güvenli reklam yüzeyi.

### Ortak bileşen kitaplığı (components/ui/ altında yazılacak)

`AmountText` (tabular, işaret+ikon kurallı), `ChangeChip`, `Card`, `Row`, `SectionHeader`,
`PrimaryButton`, `IconButton`, `Sheet`, `EmptyState`, `AdSlot` (reklam gelene kadar boş yer
tutucu — yerleşim baştan doğru ölçülür).

---

## Görev 4 — Öne Çıkaracak Özellik Önerileri

Rakip kıyası: Delta/CoinStats (kripto ağırlıklı, TL ve BIST zayıf), Midas/Fintables (aracı
kurum/analiz odaklı, "her varlık tek yerde" değil), yerli portföy defteri uygulamaları
(çoğu reklam boğulması + eski arayüz). Boşluk: **"BIST + fon + kripto + altını TL bazında,
gizlilikle, güzel arayüzle izleyen"** uygulama azlığı.

| # | Özellik | Emek | Etki | Backend? |
|---|---|---|---|---|
| 1 | **Yedekleme / geri yükleme** — tüm veriyi tek JSON dosyasına dışa aktar, paylaş/içe aktar. "Telefon değişince verim gitti" 1 yıldızlı yorumların ana kaynağı | Düşük | Yüksek | Hayır |
| 2 | **Gizlilik modu** — göz ikonuyla tüm tutarları ••• yap (toplu taşımada bakan gözlere karşı). Fintech'te çok sevilen küçük özellik | Çok düşük | Orta | Hayır |
| 3 | **Biyometrik kilit** — parmak izi/yüz ile uygulama kilidi (expo-local-authentication). "Verin cihazında" vaadini tamamlar | Düşük | Orta-Yüksek | Hayır |
| 4 | **TEFAS fon fiyatlarını otomatik çekme** — bugün elle girilen fon fiyatları otomatikleşir; Türkiye pazarında ciddi ayrıştırıcı | Orta | Yüksek | Hayır |
| 5 | **İşlem geçmişi (alış/satış kayıtları)** — tek "ortalama maliyet" yerine işlem defteri; gerçekleşmiş/gerçekleşmemiş kar ayrımı | Orta-Yüksek | Yüksek | Hayır |
| 6 | **Ana ekran widget'ı** — toplam değer + günlük değişim Android widget'ı; mağazada görsel ayrıştırıcı | Yüksek | Yüksek | Hayır |
| 7 | **Gerçek fiyat alarmları** — mevcut yarım özelliğin tamamlanması (yerel bildirim + arka plan kontrolü; development build gerektirir) | Yüksek | Yüksek | Hayır* |
| 8 | **Buluta senkron / çoklu cihaz** — repository pattern sayesinde ileride eklenebilir; şimdilik sadece mimaride yeri hazır | Yüksek | Orta | **Evet** |

\* Alarm kontrolü cihazda yapılabilir; sunucu destekli push daha güvenilir olur ama şart değil.

**Önerilen sıra:** 2 → 1 → 3 (üçü toplam ~1 hafta, mağaza sayfasına üç madde) → 4 → 5 → 7 → 6.

---

## Uygulama Sırası (onaydan sonra, her adım ayrı izinle)

1. Veri katmanı: `repositories/` iskeleti + store'un buraya taşınması (davranış birebir korunarak)
2. `components/ui/` ortak bileşenler (tasarım sistemi üzerinde)
3. Ekranların tek tek yeni düzene taşınması (Portföy → Varlıklarım → Ekle → Detay → Ayarlar)
4. Görev 4 hızlı kazanımları (gizlilik modu, yedekleme, biyometrik kilit)
5. En son: AdMob entegrasyonu (`AdSlot` yer tutucuları gerçek reklamla değişir)
