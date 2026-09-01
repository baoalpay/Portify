// Ayarlar — yeniden tasarım (Portföy/Varlıklarım ile aynı dil)
//
// Korunan işlevler: karanlık mod, tema rengi, gizlilik modu, para birimi,
// TEFAS otomatik fiyat anahtarı, yedek dışa/içe aktarma, tüm verileri silme,
// hukuki metin modalları. (Portföy yönetimi Portföy sekmesindeki
// PortfolioSelector'dadır; bu ekrana taşınmadı.)
//
// Tasarım kuralları:
// - İçerik BÖLÜMLER halinde: Görünüm / Gizlilik / Fiyat ve Para Birimi /
//   Veri / Tehlikeli Bölge / Bilgilendirme / Hakkında.
// - Yıkıcı işlem (Tüm Verileri Sil) ayrı "Tehlikeli Bölge" kartında,
//   kırmızı çerçeveyle ayrışır ve İKİ AŞAMALI onay ister.
// - Reklam alanı kaydırılan içeriğin EN SONUNDA, sabit değil (AdSlot).

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Switch,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, THEME_COLORS } from '../context/ThemeContext';
import { Palette, Spacing, Radius, Typography, A11y } from '../constants/designSystem';
import usePortfolioStore from '../store/PortfolioStore';
import { backupRepository } from '../repositories/backupRepository';
import { exportBackup, pickBackupFile } from '../services/backupService';
import AdSlot from '../components/ui/AdSlot';

// Sürüm tek yerden okunur; elle güncellenmez
const APP_VERSION = require('../app.json').expo.version;
const CONTACT_EMAIL = 'baoalpay@gmail.com';

const LEGAL_CONTENT = {
  disclaimer: {
    title: 'Sorumluluk Reddi',
    icon: 'information-circle',
    content: `Son Güncelleme: Ocak 2025

GENEL BİLGİLENDİRME

Portify uygulaması ("Uygulama") yalnızca bilgilendirme ve kişisel portföy takibi amacıyla sunulmaktadır. Bu uygulama hiçbir şekilde yatırım danışmanlığı, finansal tavsiye veya alım-satım önerisi niteliği taşımamaktadır.

FİYAT BİLGİLERİ

• Uygulamada gösterilen fiyatlar üçüncü taraf kaynaklardan alınmaktadır ve gecikmeli olabilir.
• Fiyatlar anlık piyasa değerlerini yansıtmayabilir.
• Gerçek zamanlı ve kesin fiyat bilgisi için lütfen yetkili finansal kuruluşlara başvurunuz.
• Fon fiyatları manuel olarak girilmektedir ve kullanıcının sorumluluğundadır.

YATIRIM KARARLARI

• Yatırım kararlarınızı bu uygulamadaki verilere dayanarak vermeyiniz.
• Her türlü yatırım kararı öncesinde lisanslı bir yatırım danışmanına danışmanızı öneririz.
• Yatırım yapmadan önce kendi araştırmanızı yapınız.
• Geçmiş performans gelecekteki sonuçların garantisi değildir.

SORUMLULUK SINIRI

Portify ve geliştiricileri:
• Uygulama kullanımından doğabilecek herhangi bir finansal kayıptan sorumlu tutulamaz.
• Verilerin doğruluğu, eksiksizliği veya güncelliği konusunda garanti vermez.
• Teknik aksaklıklar veya kesintilerden kaynaklanan zararlardan sorumlu değildir.

Bu uygulamayı kullanarak yukarıdaki şartları kabul etmiş sayılırsınız.`
  },
  terms: {
    title: 'Kullanım Koşulları',
    icon: 'document-text',
    content: `Son Güncelleme: Ocak 2025

Portify uygulamasını ("Uygulama") kullanarak aşağıdaki koşulları kabul etmiş olursunuz.

1. HİZMETİN TANIMI

Portify, kullanıcıların kişisel yatırım portföylerini takip etmelerine olanak sağlayan bir mobil uygulamadır. Uygulama:
• Portföy değeri hesaplama
• Kar/zarar takibi
• Varlık dağılımı görüntüleme
• Fiyat güncelleme
hizmetlerini sunmaktadır.

2. KULLANICI YÜKÜMLÜLÜKLERİ

Kullanıcı olarak:
• Doğru ve güncel bilgiler girmeyi kabul edersiniz.
• Uygulamayı yalnızca kişisel ve yasal amaçlarla kullanacağınızı taahhüt edersiniz.
• Uygulamayı kötüye kullanmayacağınızı kabul edersiniz.
• Girdiğiniz verilerin doğruluğundan siz sorumlusunuz.

3. FİKRİ MÜLKİYET

• Uygulama ve içeriği telif hakkı ile korunmaktadır.
• Uygulamanın kopyalanması, dağıtılması veya tersine mühendislik yapılması yasaktır.
• Portify logosu ve markası tescilli ticari markalardır.

4. HİZMET DEĞİŞİKLİKLERİ

• Uygulamanın özelliklerini önceden haber vermeksizin değiştirme hakkımız saklıdır.
• Hizmeti geçici veya kalıcı olarak durdurma hakkımız saklıdır.
• Yeni özellikler eklenebilir veya mevcut özellikler kaldırılabilir.

5. SORUMLULUK REDDİ

• Uygulama "olduğu gibi" sunulmaktadır.
• Kesintisiz veya hatasız çalışma garantisi verilmemektedir.
• Veri kaybından dolayı sorumluluk kabul edilmemektedir.

6. UYUŞMAZLIK ÇÖZÜMÜ

Bu koşullardan doğan uyuşmazlıklarda Türkiye Cumhuriyeti kanunları uygulanır ve İstanbul mahkemeleri yetkilidir.

7. İLETİŞİM

Sorularınız için: baoalpay@gmail.com`
  },
  privacy: {
    title: 'Gizlilik Politikası',
    icon: 'shield-checkmark',
    content: `Son Güncelleme: Ocak 2025

Portify olarak gizliliğinize önem veriyoruz. Bu politika, verilerinizin nasıl işlendiğini açıklamaktadır.

1. TOPLANAN VERİLER

Uygulama aşağıdaki verileri toplar ve işler:
• Portföy bilgileri (varlık türü, miktar, maliyet)
• Uygulama ayarları (tema, para birimi)
• Kullanım tercihleri

2. VERİ DEPOLAMA

• Tüm verileriniz YALNIZCA cihazınızda (yerel depolama) saklanır.
• Verileriniz hiçbir sunucuya gönderilmez.
• Bulut senkronizasyonu yapılmamaktadır.
• Cihazınızı değiştirdiğinizde veriler aktarılmaz.

3. ÜÇÜNCÜ TARAF HİZMETLER

Uygulama, fiyat bilgileri için üçüncü taraf API'leri kullanmaktadır:
• Yahoo Finance (hisse fiyatları)
• CoinGecko (kripto fiyatları)
• ExchangeRate API (döviz kurları)

Bu hizmetlere yalnızca fiyat sorgusu gönderilir, kişisel bilgileriniz paylaşılmaz.

4. VERİ GÜVENLİĞİ

• Verileriniz cihazınızın güvenlik önlemleri ile korunmaktadır.
• Uygulama şifreleme kullanmamaktadır.
• Hassas finansal verilerinizi (banka bilgileri, şifreler vb.) SAKLAMAYINIZ.

5. VERİ PAYLAŞIMI

Verileriniz:
• Üçüncü taraflarla PAYLAŞILMAZ
• Satılmaz veya kiralanmaz
• Reklam amaçlı kullanılmaz
• Analitik amaçlı toplanmaz

6. ÇOCUKLARIN GİZLİLİĞİ

Bu uygulama 18 yaş altı kullanıcılara yönelik değildir.

7. VERİ SİLME

Verilerinizi silmek için:
• Ayarlar > Tüm Verileri Sil seçeneğini kullanabilirsiniz.
• Uygulamayı kaldırdığınızda tüm veriler silinir.

8. POLİTİKA DEĞİŞİKLİKLERİ

Bu gizlilik politikası zaman zaman güncellenebilir. Önemli değişiklikler uygulama içinden bildirilecektir.

9. İLETİŞİM

Gizlilik ile ilgili sorularınız için: baoalpay@gmail.com`
  }
};

const SettingsScreen = () => {
  const { primary, isDark, toggleTheme, setThemeColor, selectedColorId } = useTheme();
  const ds = isDark ? Palette.dark : Palette.light;

  const resetAllData = usePortfolioStore((state) => state.resetAllData);
  const loadPortfolios = usePortfolioStore((state) => state.loadPortfolios);
  const loadHoldings = usePortfolioStore((state) => state.loadHoldings);
  const loadSettings = usePortfolioStore((state) => state.loadSettings);
  const settings = usePortfolioStore((state) => state.settings);
  const setCurrency = usePortfolioStore((state) => state.setCurrency);
  const isPremium = usePortfolioStore((state) => state.isPremium);
  const togglePrivacyMode = usePortfolioStore((state) => state.togglePrivacyMode);
  const saveSettings = usePortfolioStore((state) => state.saveSettings);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [colorModalVisible, setColorModalVisible] = useState(false);

  const tefasEnabled = settings.tefasEnabled !== false;

  const openModal = (type) => {
    setModalContent(LEGAL_CONTENT[type]);
    setModalVisible(true);
  };

  const handleColorSelect = (colorId) => {
    const colorObj = THEME_COLORS.find((c) => c.id === colorId);
    if (colorObj?.isPremium && !isPremium) {
      Alert.alert(
        'Premium Gerekli',
        "Bu tema rengini kullanmak için Premium'a geçmeniz gerekiyor.",
        [{ text: 'Tamam' }]
      );
      return;
    }
    Haptics.selectionAsync();
    setThemeColor(colorId);
  };

  const selectedColorName =
    THEME_COLORS.find((c) => c.id === selectedColorId)?.name || 'Mor';

  const handleExport = async () => {
    const result = await exportBackup();
    if (!result.success && result.error) {
      Alert.alert('Hata', result.error);
    }
  };

  const handleImport = async () => {
    const picked = await pickBackupFile();
    if (picked.canceled) return;
    if (picked.error) {
      Alert.alert('Hata', picked.error);
      return;
    }

    const { valid, errors } = backupRepository.validateBackup(picked.content);
    if (!valid) {
      Alert.alert('Geçersiz Yedek', errors.join('\n'));
      return;
    }

    const doImport = async () => {
      const result = await backupRepository.importData(picked.content);
      if (result.success) {
        await loadPortfolios();
        await loadSettings();
        await loadHoldings();
        Alert.alert('Başarılı', 'Yedek geri yüklendi.');
      } else {
        Alert.alert('Hata', result.errors.join('\n'));
      }
    };

    if (await backupRepository.hasExistingData()) {
      Alert.alert(
        'Üzerine Yazılacak',
        'Mevcut portföyünüzün üzerine yazılacak ve şu anki verileriniz silinecek. Devam etmek istiyor musunuz?',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Geri Yükle', style: 'destructive', onPress: doImport },
        ]
      );
    } else {
      await doImport();
    }
  };

  // Yıkıcı işlem: iki aşamalı onay
  const clearAllData = () => {
    Alert.alert(
      'Tüm Verileri Sil',
      'Tüm portföyleriniz, varlıklarınız, geçmiş kayıtlarınız ve fiyat alarmlarınız kalıcı olarak silinecek. Bu işlem GERİ ALINAMAZ.\n\nSilmeden önce "Yedeği Dışa Aktar" ile yedek almanız önerilir.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Devam Et',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Son Onay',
              'Emin misiniz? Tüm veriler kalıcı olarak silinecek.',
              [
                { text: 'Vazgeç', style: 'cancel' },
                {
                  text: 'Evet, Hepsini Sil',
                  style: 'destructive',
                  onPress: async () => {
                    await resetAllData();
                    Alert.alert('Tamamlandı', 'Tüm veriler silindi.');
                  },
                },
              ]
            ),
        },
      ]
    );
  };

  const currencyLabel =
    settings.currency === 'USD'
      ? '$ Amerikan Doları'
      : settings.currency === 'EUR'
        ? '€ Euro'
        : '₺ Türk Lirası';

  const switchColors = {
    trackColor: { false: ds.border, true: ds.accent + '66' },
  };

  // Ortak satır: ikon + etiket(+alt yazı) + sağ öğe (veya ok)
  const Row = ({ icon, label, subtitle, onPress, right, color, first }) => {
    const content = (
      <View style={[styles.row, !first && { borderTopColor: ds.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
        <View style={[styles.rowIcon, { backgroundColor: (color || ds.accent) + '14' }]}>
          <Ionicons name={icon} size={20} color={color || ds.accent} />
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.rowLabel, { color: color || ds.text }]}>{label}</Text>
          {subtitle ? (
            <Text style={[styles.rowSubtitle, { color: ds.textSecondary }]}>{subtitle}</Text>
          ) : null}
        </View>
        {right !== undefined
          ? right
          : onPress && <Ionicons name="chevron-forward" size={18} color={ds.textTertiary} />}
      </View>
    );
    return onPress ? (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    ) : (
      content
    );
  };

  const Section = ({ title, children, footnote, titleColor, borderColor }) => (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: titleColor || ds.textSecondary }]}>{title}</Text>
      <View
        style={[
          styles.card,
          { backgroundColor: ds.surface, borderColor: borderColor || ds.border },
        ]}
      >
        {children}
      </View>
      {footnote ? (
        <Text style={[styles.footnote, { color: ds.textTertiary }]}>{footnote}</Text>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: ds.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={ds.background} />

      <View style={styles.header}>
        <Text style={[styles.title, { color: ds.text }]}>Ayarlar</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Görünüm */}
        <Section title="GÖRÜNÜM">
          <Row
            first
            icon="moon"
            label="Karanlık Mod"
            right={
              <Switch
                value={isDark}
                onValueChange={() => {
                  Haptics.selectionAsync();
                  toggleTheme();
                }}
                {...switchColors}
                thumbColor={isDark ? ds.accent : ds.textTertiary}
              />
            }
          />
          <Row
            icon="color-palette"
            label="Tema Rengi"
            subtitle={selectedColorName}
            onPress={() => setColorModalVisible(true)}
            right={
              <View style={styles.rowRight}>
                <View style={[styles.colorDot, { backgroundColor: primary }]} />
                <Ionicons name="chevron-forward" size={18} color={ds.textTertiary} />
              </View>
            }
          />
        </Section>

        {/* Gizlilik */}
        <Section
          title="GİZLİLİK"
          footnote="Açıkken tutar, adet ve maliyetler tüm ekranlarda maskelenir; birim piyasa fiyatları görünür kalır."
        >
          <Row
            first
            icon="eye-off"
            label="Gizlilik Modu"
            subtitle="Tutarları gizle"
            right={
              <Switch
                value={!!settings.privacyMode}
                onValueChange={() => {
                  Haptics.selectionAsync();
                  togglePrivacyMode();
                }}
                {...switchColors}
                thumbColor={settings.privacyMode ? ds.accent : ds.textTertiary}
              />
            }
          />
        </Section>

        {/* Fiyat ve Para Birimi */}
        <Section
          title="FİYAT VE PARA BİRİMİ"
          footnote="Fon fiyatlarının kaynağı Takasbank TEFAS'tır. Fon fiyatları günde bir kez hesaplanır ve ertesi iş günü açıklanır; anlık değildir."
        >
          <Row
            first
            icon="cash-outline"
            label="Para Birimi"
            subtitle={currencyLabel}
            right={
              <View style={styles.currencySelector}>
                {['TRY', 'USD', 'EUR'].map((cur) => {
                  const active = settings.currency === cur;
                  return (
                    <TouchableOpacity
                      key={cur}
                      style={[
                        styles.currencyButton,
                        { borderColor: active ? ds.accent : ds.border },
                        active && { backgroundColor: ds.accent },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setCurrency(cur);
                      }}
                    >
                      <Text
                        style={[
                          styles.currencyButtonText,
                          { color: active ? ds.onAccent : ds.text },
                        ]}
                      >
                        {cur === 'TRY' ? '₺' : cur === 'USD' ? '$' : '€'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            }
          />
          <Row
            icon="cloud-download-outline"
            label="TEFAS'tan otomatik fiyat çek"
            subtitle="Kapalıyken fon fiyatları elle girilir"
            right={
              <Switch
                value={tefasEnabled}
                onValueChange={() => {
                  Haptics.selectionAsync();
                  saveSettings({ tefasEnabled: !tefasEnabled });
                }}
                {...switchColors}
                thumbColor={tefasEnabled ? ds.accent : ds.textTertiary}
              />
            }
          />
        </Section>

        {/* Veri */}
        <Section
          title="VERİ"
          footnote="Yedek, tüm portföylerinizi, ayarlarınızı, geçmişi ve alarmları içeren tek bir JSON dosyasıdır."
        >
          <Row first icon="download-outline" label="Yedeği Dışa Aktar" onPress={handleExport} />
          <Row icon="cloud-upload-outline" label="Yedekten Geri Yükle" onPress={handleImport} />
        </Section>

        {/* Tehlikeli Bölge — görsel olarak ayrık, iki aşamalı onay */}
        <Section title="TEHLİKELİ BÖLGE" titleColor={ds.loss} borderColor={ds.loss + '66'}>
          <Row
            first
            icon="trash"
            color={ds.loss}
            label="Tüm Verileri Sil"
            subtitle="Tüm portföyler, varlıklar, geçmiş ve alarmlar kalıcı olarak silinir"
            onPress={clearAllData}
          />
        </Section>

        {/* Bilgilendirme */}
        <Section title="BİLGİLENDİRME">
          <Row
            first
            icon="information-circle"
            label="Sorumluluk Reddi"
            onPress={() => openModal('disclaimer')}
          />
          <Row icon="document-text" label="Kullanım Koşulları" onPress={() => openModal('terms')} />
          <Row
            icon="shield-checkmark"
            label="Gizlilik Politikası"
            onPress={() => openModal('privacy')}
          />
        </Section>

        {/* Hakkında */}
        <Section title="HAKKINDA">
          <Row
            first
            icon="information"
            label="Sürüm"
            right={<Text style={[styles.rowValue, { color: ds.textSecondary }]}>{APP_VERSION}</Text>}
          />
          <Row
            icon="server-outline"
            label="Veri Kaynakları"
            subtitle="Yahoo Finance · CoinGecko · ExchangeRate · TEFAS"
            right={null}
          />
          <Row
            icon="mail-outline"
            label="İletişim"
            subtitle={CONTACT_EMAIL}
            onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
          />
          {/* Play Store yayınında gerçek URL bağlanacak (yer tutucu) */}
          <Row
            icon="globe-outline"
            label="Gizlilik Politikası (Web)"
            right={<Text style={[styles.rowValue, { color: ds.textTertiary }]}>Yakında</Text>}
          />
        </Section>

        {/* Yatırım tavsiyesi değildir notu */}
        <View style={[styles.disclaimerCard, { backgroundColor: ds.accent + '0D', borderColor: ds.accent + '2E' }]}>
          <Ionicons name="alert-circle" size={18} color={ds.accent} />
          <Text style={[styles.disclaimerText, { color: ds.textSecondary }]}>
            Bu uygulama yatırım tavsiyesi vermez. Fiyatlar üçüncü taraf kaynaklardan alınır ve
            gecikmeli veya hatalı olabilir.
          </Text>
        </View>

        {/* Reklam: içeriğin en sonunda, sabit değil */}
        <AdSlot borderColor={ds.border} textColor={ds.textTertiary} />

        <View style={{ height: 96 }} />
      </ScrollView>

      {/* Hukuki metin modalı */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: ds.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: ds.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: ds.border }]}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name={modalContent?.icon} size={22} color={ds.accent} />
                <Text style={[styles.modalTitle, { color: ds.text }]}>{modalContent?.title}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.modalCloseButton, { backgroundColor: ds.surface, borderColor: ds.border }]}
              >
                <Ionicons name="close" size={22} color={ds.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalText, { color: ds.text }]}>{modalContent?.content}</Text>
              <View style={{ height: Spacing.xl }} />
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: ds.border }]}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: ds.accent }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: ds.onAccent }]}>Anladım</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Tema rengi modalı */}
      <Modal
        visible={colorModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setColorModalVisible(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: ds.overlay }]}
          activeOpacity={1}
          onPress={() => setColorModalVisible(false)}
        >
          <View style={[styles.colorModalContent, { backgroundColor: ds.surfaceRaised }]}>
            <Text style={[styles.colorModalTitle, { color: ds.text }]}>Tema Rengi Seçin</Text>

            {!isPremium && (
              <View style={[styles.premiumBanner, { backgroundColor: ds.warning + '20' }]}>
                <Ionicons name="star" size={16} color={ds.warning} />
                <Text style={[styles.premiumBannerText, { color: ds.warning }]}>
                  Premium ile tüm renkleri aç!
                </Text>
              </View>
            )}

            <View style={styles.colorGrid}>
              {THEME_COLORS.map((colorItem) => (
                <TouchableOpacity
                  key={colorItem.id}
                  style={[
                    styles.colorOption,
                    { backgroundColor: colorItem.color },
                    selectedColorId === colorItem.id && styles.colorOptionSelected,
                  ]}
                  onPress={() => handleColorSelect(colorItem.id)}
                  activeOpacity={0.7}
                >
                  {selectedColorId === colorItem.id && (
                    <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                  )}
                  {colorItem.isPremium && !isPremium && selectedColorId !== colorItem.id && (
                    <Ionicons name="lock-closed" size={18} color="rgba(255,255,255,0.7)" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.colorModalClose, { backgroundColor: ds.accent }]}
              onPress={() => setColorModalVisible(false)}
            >
              <Text style={[styles.colorModalCloseText, { color: ds.onAccent }]}>Tamam</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  title: { ...Typography.h1 },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs },

  group: { marginBottom: Spacing.lg },
  groupTitle: {
    ...Typography.caption,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xxs,
  },
  card: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  footnote: {
    ...Typography.caption,
    marginTop: Spacing.xs,
    marginHorizontal: Spacing.xxs,
    lineHeight: 16,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: A11y.minTouchTarget + 12,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: { ...Typography.body },
  rowSubtitle: { ...Typography.caption, marginTop: 1 },
  rowValue: { ...Typography.bodySmall },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  colorDot: { width: 22, height: 22, borderRadius: Radius.full },

  currencySelector: { flexDirection: 'row', gap: Spacing.xs },
  currencyButton: {
    width: A11y.minTouchTarget,
    height: A11y.minTouchTarget,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyButtonText: { ...Typography.body, fontWeight: '600' },

  disclaimerCard: {
    flexDirection: 'row',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  disclaimerText: { ...Typography.caption, flex: 1, lineHeight: 16 },

  // Modallar
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: {
    height: '90%',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  modalTitle: { ...Typography.h3 },
  modalCloseButton: {
    width: A11y.minTouchTarget,
    height: A11y.minTouchTarget,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: { flex: 1, padding: Spacing.md },
  modalText: { ...Typography.bodySmall, lineHeight: 22 },
  modalFooter: { padding: Spacing.md, borderTopWidth: 1 },
  modalButton: {
    minHeight: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: { ...Typography.body, fontWeight: '700' },

  colorModalContent: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  colorModalTitle: { ...Typography.h3, textAlign: 'center', marginBottom: Spacing.lg },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  premiumBannerText: { ...Typography.caption, fontWeight: '600' },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  colorOption: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  colorModalClose: {
    minHeight: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorModalCloseText: { ...Typography.body, fontWeight: '700' },
});

export default SettingsScreen;
