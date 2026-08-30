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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, THEME_COLORS } from '../context/ThemeContext';
import { Spacing, BorderRadius, Typography } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import usePortfolioStore from '../store/PortfolioStore';

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
  const { colors, primary, isDark, toggleTheme, setThemeColor, selectedColorId } = useTheme();
  
  const loadHoldings = usePortfolioStore((state) => state.loadHoldings);
  const settings = usePortfolioStore((state) => state.settings);
  const setCurrency = usePortfolioStore((state) => state.setCurrency);
  const isPremium = usePortfolioStore((state) => state.isPremium);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [colorModalVisible, setColorModalVisible] = useState(false);

  const openModal = (type) => {
    setModalContent(LEGAL_CONTENT[type]);
    setModalVisible(true);
  };

  const handleColorSelect = (colorId) => {
    const colorObj = THEME_COLORS.find(c => c.id === colorId);
    
    // Premium kontrolü
    if (colorObj?.isPremium && !isPremium) {
      Alert.alert(
        'Premium Gerekli',
        'Bu tema rengini kullanmak için Premium\'a geçmeniz gerekiyor.',
        [{ text: 'Tamam' }]
      );
      return;
    }
    
    setThemeColor(colorId);
  };

  const getSelectedColorName = () => {
    const colorObj = THEME_COLORS.find(c => c.id === selectedColorId);
    return colorObj?.name || 'Mor';
  };

  const clearAllData = async () => {
    Alert.alert(
      'Tüm Verileri Sil',
      'Tüm portföy verileriniz silinecek. Bu işlem geri alınamaz. Emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('portify_holdings');
            await loadHoldings();
            Alert.alert('Başarılı', 'Tüm veriler silindi.');
          },
        },
      ]
    );
  };

  const getCurrencyLabel = () => {
    switch (settings.currency) {
      case 'USD': return '$ Amerikan Doları';
      case 'EUR': return '€ Euro';
      default: return '₺ Türk Lirası';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <View style={styles.header}>
        <Text style={[styles.title, { color: primary }]}>Ayarlar</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Görünüm */}
        <View style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>
            GÖRÜNÜM
          </Text>
          <View style={[styles.groupCard, { backgroundColor: colors.surface }]}>
            {/* Dark Mode */}
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: primary + '15' }]}>
                  <Ionicons name="moon" size={22} color={primary} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Karanlık Mod
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: primary + '60' }}
                thumbColor={isDark ? primary : colors.textSecondary}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Tema Rengi */}
            <TouchableOpacity 
              style={styles.settingItem} 
              activeOpacity={0.7}
              onPress={() => setColorModalVisible(true)}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: primary + '15' }]}>
                  <Ionicons name="color-palette" size={22} color={primary} />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    Tema Rengi
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                    {getSelectedColorName()}
                  </Text>
                </View>
              </View>
              <View style={styles.settingRight}>
                <View style={[styles.colorPreview, { backgroundColor: primary }]} />
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Para Birimi */}
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: primary + '15' }]}>
                  <Ionicons name="cash-outline" size={22} color={primary} />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    Para Birimi
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                    {getCurrencyLabel()}
                  </Text>
                </View>
              </View>
              <View style={styles.currencySelector}>
                {['TRY', 'USD', 'EUR'].map((cur) => (
                  <TouchableOpacity
                    key={cur}
                    style={[
                      styles.currencyButton,
                      { borderColor: colors.border },
                      settings.currency === cur && { backgroundColor: primary, borderColor: primary }
                    ]}
                    onPress={() => setCurrency(cur)}
                  >
                    <Text style={[
                      styles.currencyButtonText,
                      { color: colors.text },
                      settings.currency === cur && { color: '#FFFFFF' }
                    ]}>
                      {cur === 'TRY' ? '₺' : cur === 'USD' ? '$' : '€'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Veri Yönetimi */}
        <View style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>
            VERİ YÖNETİMİ
          </Text>
          <View style={[styles.groupCard, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={styles.settingItem} activeOpacity={0.7} onPress={clearAllData}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#EF4444' + '15' }]}>
                  <Ionicons name="trash" size={22} color="#EF4444" />
                </View>
                <Text style={[styles.settingLabel, { color: '#EF4444' }]}>
                  Tüm Verileri Sil
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bilgilendirme */}
        <View style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>
            BİLGİLENDİRME
          </Text>
          <View style={[styles.groupCard, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={styles.settingItem}
              activeOpacity={0.7}
              onPress={() => openModal('disclaimer')}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: primary + '15' }]}>
                  <Ionicons name="information-circle" size={22} color={primary} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Sorumluluk Reddi
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.settingItem}
              activeOpacity={0.7}
              onPress={() => openModal('terms')}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: primary + '15' }]}>
                  <Ionicons name="document-text" size={22} color={primary} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Kullanım Koşulları
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.settingItem}
              activeOpacity={0.7}
              onPress={() => openModal('privacy')}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: primary + '15' }]}>
                  <Ionicons name="shield-checkmark" size={22} color={primary} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Gizlilik Politikası
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hakkında */}
        <View style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>
            HAKKINDA
          </Text>
          <View style={[styles.groupCard, { backgroundColor: colors.surface }]}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: primary + '15' }]}>
                  <Ionicons name="information" size={22} color={primary} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Versiyon
                </Text>
              </View>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                1.0.0
              </Text>
            </View>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={[styles.disclaimerCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="alert-circle" size={24} color={primary} />
          <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
            Bu uygulama yatırım tavsiyesi vermez. Fiyatlar üçüncü taraf kaynaklardan alınır ve 
            gecikmeli veya hatalı olabilir.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Legal Content Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons 
                  name={modalContent?.icon} 
                  size={24} 
                  color={primary} 
                />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {modalContent?.title}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={[styles.modalCloseButton, { backgroundColor: colors.surface }]}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView 
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.modalText, { color: colors.text }]}>
                {modalContent?.content}
              </Text>
              <View style={{ height: 40 }} />
            </ScrollView>

            {/* Modal Footer */}
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: primary }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Anladım</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Color Picker Modal */}
      <Modal
        visible={colorModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setColorModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setColorModalVisible(false)}
        >
          <View style={[styles.colorModalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.colorModalTitle, { color: colors.text }]}>
              Tema Rengi Seçin
            </Text>
            
            {!isPremium && (
              <View style={[styles.premiumBanner, { backgroundColor: '#F59E0B' + '20' }]}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={[styles.premiumBannerText, { color: '#F59E0B' }]}>
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
              style={[styles.colorModalClose, { backgroundColor: primary }]}
              onPress={() => setColorModalVisible(false)}
            >
              <Text style={styles.colorModalCloseText}>Tamam</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  title: {
    ...Typography.h1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },
  group: {
    marginBottom: Spacing.lg,
  },
  groupTitle: {
    ...Typography.bodySmall,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  groupCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    ...Typography.body,
  },
  settingSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  settingValue: {
    ...Typography.bodySmall,
  },
  divider: {
    height: 1,
    marginLeft: 72,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  currencySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimerCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  disclaimerText: {
    ...Typography.bodySmall,
    flex: 1,
    lineHeight: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '90%',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    flex: 1,
    padding: Spacing.lg,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 22,
  },
  modalFooter: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  modalButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Color Picker Modal
  colorModalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  colorModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  premiumBannerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  colorOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  colorLabels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  colorLabel: {
    width: 56,
    fontSize: 10,
    textAlign: 'center',
  },
  colorModalClose: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  colorModalCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen;