// Portföy ana ekranı — yeniden tasarım (referans: docs/design-refs/ref-banka-mockup.png)
//
// Referanstan yalnızca görsel dil alındı: gradyanlı kahraman yüzey, silik
// etiket / kahraman sayı hiyerarşisi, cömert boşluk, yumuşak köşeler, tek
// vurgu rengi. Bilgi mimarisi bizim: portföy değeri, kar/zarar, varlık
// dağılımı, varlık özeti. Tüm tokenlar constants/designSystem.js'ten gelir;
// parasal değerler PrivateValue ile sarılıdır (gizlilik modu).

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import {
  Palette,
  Direction,
  Format,
  Spacing,
  Radius,
  Typography,
  Motion,
  A11y,
} from '../constants/designSystem';
import usePortfolioStore from '../store/PortfolioStore';
import { saveToday } from '../services/historyService';
import PortfolioSelector from '../components/PortfolioSelector';
import PrivateValue from '../components/PrivateValue';
import DonutChart from '../components/ui/DonutChart';
import Skeleton from '../components/ui/Skeleton';
import AdSlot from '../components/ui/AdSlot';

// Saat dilimine göre selamlama
const greetingForHour = () => {
  const h = new Date().getHours();
  if (h < 6) return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
};

const QUICK_ADDS = [
  { key: 'stock', label: 'Hisse Ekle', icon: 'trending-up' },
  { key: 'fund', label: 'Fon Ekle', icon: 'pie-chart' },
  { key: 'crypto', label: 'Kripto Ekle', icon: 'logo-bitcoin' },
  { key: null, label: 'Diğer', icon: 'add' },
];

// Dağılım yüzdesi etiketi: kullanıcı kendi varlığını "%0" görmesin
const percentLabel = (p) => {
  if (p > 0 && p < 0.1) return '<%0,1';
  if (p > 0 && p < 1) return `%${Format.number(p, 1)}`;
  return `%${Format.number(p, 0)}`;
};

const TYPE_ICONS = {
  stock: 'trending-up',
  fund: 'pie-chart',
  crypto: 'logo-bitcoin',
  currency: 'cash',
  gold: 'medal',
  silver: 'medal-outline',
};

const PortfolioScreen = () => {
  const { isDark } = useTheme();
  const ds = isDark ? Palette.dark : Palette.light;
  const navigation = useNavigation();

  const holdings = usePortfolioStore((state) => state.holdings);
  const isLoading = usePortfolioStore((state) => state.isLoading);
  const loadHoldings = usePortfolioStore((state) => state.loadHoldings);
  const loadPortfolios = usePortfolioStore((state) => state.loadPortfolios);
  const getPortfolioSummary = usePortfolioStore((state) => state.getPortfolioSummary);
  const getDistribution = usePortfolioStore((state) => state.getDistribution);
  const updatePrices = usePortfolioStore((state) => state.updatePrices);
  const convertCurrency = usePortfolioStore((state) => state.convertCurrency);
  const getCurrencySymbol = usePortfolioStore((state) => state.getCurrencySymbol);
  const privacyMode = usePortfolioStore((state) => !!state.settings.privacyMode);
  const togglePrivacyMode = usePortfolioStore((state) => state.togglePrivacyMode);

  const [refreshing, setRefreshing] = useState(false);

  const portfolio = getPortfolioSummary();
  const distribution = getDistribution();

  const symbol = getCurrencySymbol ? getCurrencySymbol() : '₺';
  const money = (value) => `${symbol}${Format.number(convertCurrency(value))}`;
  const moneyCompact = (value) => Format.compactCurrency(convertCurrency(value), symbol);

  const direction = Direction.of(portfolio.profitLoss);

  // İlk yükleme iskeleti: henüz hiç veri gelmemişken
  const showSkeleton = isLoading && holdings.length === 0;

  // Sayı değişiminde kısa, sakin bir geçiş (abartısız — tasarım ilkesi)
  const heroOpacity = useRef(new Animated.Value(1)).current;
  const prevValueRef = useRef(portfolio.totalValue);
  useEffect(() => {
    if (prevValueRef.current !== portfolio.totalValue) {
      prevValueRef.current = portfolio.totalValue;
      heroOpacity.setValue(0.35);
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: Motion.base,
        useNativeDriver: true,
      }).start();
    }
  }, [portfolio.totalValue, heroOpacity]);

  useFocusEffect(
    React.useCallback(() => {
      loadPortfolios();
      loadHoldings();
      updatePrices();
    }, [])
  );

  // Günlük geçmiş kaydı (performans verisi birikmeye devam etsin)
  useEffect(() => {
    if (portfolio.totalValue > 0) {
      saveToday(portfolio.totalValue, portfolio.totalCost);
    }
  }, [portfolio.totalValue]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHoldings();
    await updatePrices();
    setRefreshing(false);
  };

  const handleToggleGizlilik = () => {
    Haptics.selectionAsync();
    togglePrivacyMode();
  };

  const handleQuickAdd = (presetType) => {
    Haptics.selectionAsync();
    navigation.navigate('Holdings', {
      screen: 'AddHolding',
      params: presetType ? { presetType } : undefined,
    });
  };

  // Varlık özeti: değere göre ilk 5
  const topHoldings = useMemo(() => {
    return holdings
      .map((h) => {
        const currentPrice = h.currentPrice ? parseFloat(h.currentPrice) : parseFloat(h.avgCost);
        const quantity = parseFloat(h.quantity);
        const cost = parseFloat(h.avgCost) * quantity;
        const value = currentPrice * quantity;
        const changePercent = cost > 0 ? ((value - cost) / cost) * 100 : 0;
        return { ...h, value, changePercent };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [holdings]);

  return (
    <View style={[styles.container, { backgroundColor: ds.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={ds.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ds.accent} colors={[ds.accent]} />
        }
      >
        {/* Başlık: selamlama + portföy seçici + gizlilik */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { color: ds.textSecondary }]}>{greetingForHour()} 👋</Text>
            <Text style={[styles.screenTitle, { color: ds.text }]}>Portföyüm</Text>
          </View>
          <View style={styles.headerRight}>
            <PortfolioSelector />
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: ds.surface, borderColor: ds.border }]}
              onPress={handleToggleGizlilik}
              accessibilityLabel={privacyMode ? 'Tutarları göster' : 'Tutarları gizle'}
            >
              <Ionicons name={privacyMode ? 'eye-off' : 'eye'} size={20} color={ds.accent} />
            </TouchableOpacity>
          </View>
        </View>

        {showSkeleton ? (
          <>
            <Skeleton height={172} borderRadius={Radius.lg} />
            <View style={styles.quickRow}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.quickItem}>
                  <Skeleton width={56} height={56} borderRadius={Radius.md} />
                  <Skeleton width={52} height={10} style={{ marginTop: Spacing.xs }} />
                </View>
              ))}
            </View>
            <Skeleton height={168} borderRadius={Radius.lg} style={{ marginTop: Spacing.lg }} />
          </>
        ) : (
          <>
            {/* Kahraman kart: gradyanlı yüzey (kart metaforu yok) */}
            <LinearGradient
              colors={ds.heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <Text style={styles.heroLabel}>Toplam Portföy Değeri</Text>
              <Animated.View style={{ opacity: heroOpacity }}>
                <PrivateValue style={styles.heroValue}>{money(portfolio.totalValue)}</PrivateValue>
              </Animated.View>

              <View style={styles.heroDivider} />

              <Text style={styles.heroLabel}>Toplam Kar/Zarar</Text>
              <View style={styles.heroPnlRow}>
                <Animated.View style={{ opacity: heroOpacity }}>
                  <PrivateValue style={styles.heroPnlValue}>
                    {`${direction.sign}${money(Math.abs(portfolio.profitLoss))}`}
                  </PrivateValue>
                </Animated.View>
                <View style={styles.heroChip}>
                  <Ionicons name={direction.icon} size={14} color="#FFFFFF" />
                  <Text style={styles.heroChipText}>
                    {Format.signedPercent(portfolio.profitLossPercent)}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {/* Hızlı ekleme kısayolları */}
            <View style={styles.quickRow}>
              {QUICK_ADDS.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={styles.quickItem}
                  onPress={() => handleQuickAdd(item.key)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickIcon, { backgroundColor: ds.accent + '14' }]}>
                    <Ionicons name={item.icon} size={24} color={ds.accent} />
                  </View>
                  <Text style={[styles.quickLabel, { color: ds.textSecondary }]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Varlık dağılımı */}
            <Text style={[styles.sectionTitle, { color: ds.text }]}>Varlık Dağılımı</Text>
            {distribution.length > 0 ? (
              <View style={[styles.card, { backgroundColor: ds.surface, borderColor: ds.border }]}>
                <View style={styles.donutRow}>
                  <DonutChart
                    segments={distribution.map((d) => ({ value: d.value, color: d.color }))}
                    trackColor={ds.border}
                  >
                    <Text style={[styles.donutCaption, { color: ds.textSecondary }]}>Toplam</Text>
                    <PrivateValue style={[styles.donutTotal, { color: ds.text }]}>
                      {moneyCompact(portfolio.totalValue)}
                    </PrivateValue>
                  </DonutChart>

                  <View style={styles.legend}>
                    {[...distribution]
                      .sort((a, b) => b.value - a.value)
                      .map((item) => (
                        <View key={item.name} style={styles.legendRow}>
                          <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                          <Text style={[styles.legendName, { color: ds.text }]} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={[styles.legendPercent, { color: ds.textSecondary }]}>
                            {percentLabel(item.percent)}
                          </Text>
                        </View>
                      ))}
                  </View>
                </View>
              </View>
            ) : (
              <View style={[styles.card, styles.emptyCard, { backgroundColor: ds.surface, borderColor: ds.border }]}>
                <View style={[styles.quickIcon, { backgroundColor: ds.accent + '14' }]}>
                  <Ionicons name="pie-chart-outline" size={24} color={ds.accent} />
                </View>
                <Text style={[styles.emptyTitle, { color: ds.text }]}>Henüz varlık yok</Text>
                <Text style={[styles.emptyText, { color: ds.textSecondary }]}>
                  Yukarıdaki kısayollarla ilk varlığınızı ekleyin.
                </Text>
              </View>
            )}

            {/* Varlıklarım özeti */}
            {topHoldings.length > 0 && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: ds.text, marginTop: 0, marginBottom: 0 }]}>
                    Varlıklarım
                  </Text>
                  <TouchableOpacity
                    style={styles.seeAll}
                    onPress={() => navigation.navigate('Holdings')}
                  >
                    <Text style={[styles.seeAllText, { color: ds.accent }]}>Tümünü Gör</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.card, { backgroundColor: ds.surface, borderColor: ds.border }]}>
                  {topHoldings.map((h, index) => {
                    const dir = Direction.of(h.changePercent);
                    return (
                      <View
                        key={h.id}
                        style={[
                          styles.holdingRow,
                          index !== topHoldings.length - 1 && {
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: ds.border,
                          },
                        ]}
                      >
                        <View style={[styles.holdingIcon, { backgroundColor: ds.accent + '10' }]}>
                          <Ionicons name={TYPE_ICONS[h.type] || 'wallet'} size={20} color={ds.accent} />
                        </View>
                        <View style={styles.holdingNameWrap}>
                          <Text style={[styles.holdingSymbol, { color: ds.text }]}>{h.symbol}</Text>
                          <Text style={[styles.holdingFullName, { color: ds.textSecondary }]} numberOfLines={1}>
                            {h.fullName}
                          </Text>
                        </View>
                        <View style={styles.holdingRight}>
                          <PrivateValue style={[styles.holdingValue, { color: ds.text }]}>
                            {money(h.value)}
                          </PrivateValue>
                          <View style={styles.holdingChangeRow}>
                            <Ionicons name={dir.icon} size={12} color={ds[dir.colorToken]} />
                            <Text style={[styles.holdingChange, { color: ds[dir.colorToken] }]}>
                              {Format.signedPercent(h.changePercent)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            <Text style={[styles.disclaimer, { color: ds.textTertiary }]}>
              Bu uygulama yatırım tavsiyesi vermez. Fiyatlar gecikmeli olabilir.
            </Text>

            {/* Reklam alanı: kaydırılan içeriğin en sonunda, yeri önceden ayrılmış */}
            <AdSlot borderColor={ds.border} textColor={ds.textTertiary} />
          </>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.md },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  headerLeft: { flexShrink: 1 },
  greeting: { ...Typography.bodySmall, marginBottom: 2 },
  screenTitle: { ...Typography.h1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  iconButton: {
    width: A11y.minTouchTarget,
    height: A11y.minTouchTarget,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Kahraman kart
  hero: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  heroLabel: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 4,
  },
  heroValue: {
    ...Typography.numDisplay,
    color: '#FFFFFF',
  },
  heroDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.28)',
    marginVertical: Spacing.md,
  },
  heroPnlRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  heroPnlValue: {
    ...Typography.numLarge,
    color: '#FFFFFF',
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  heroChipText: {
    ...Typography.numSmall,
    color: '#FFFFFF',
  },

  // Hızlı ekleme
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
  },
  quickItem: { alignItems: 'center', width: 72 },
  quickIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    ...Typography.caption,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },

  sectionTitle: {
    ...Typography.h3,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  seeAll: { minHeight: A11y.minTouchTarget, justifyContent: 'center', paddingHorizontal: Spacing.xs },
  seeAllText: { ...Typography.bodySmall, fontWeight: '600' },

  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },

  // Donut + açıklama
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  donutCaption: { ...Typography.caption },
  donutTotal: { ...Typography.numSmall, fontSize: 15 },
  legend: { flex: 1, gap: Spacing.sm },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { ...Typography.bodySmall, flex: 1 },
  legendPercent: { ...Typography.numSmall },

  // Boş durum
  emptyCard: { alignItems: 'center', paddingVertical: Spacing.lg },
  emptyTitle: { ...Typography.h3, marginTop: Spacing.sm },
  emptyText: { ...Typography.bodySmall, marginTop: 4, textAlign: 'center' },

  // Varlık özeti satırları
  holdingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    minHeight: A11y.minTouchTarget + 8,
    gap: Spacing.sm,
  },
  holdingIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdingNameWrap: { flex: 1 },
  holdingSymbol: { ...Typography.body, fontWeight: '600' },
  holdingFullName: { ...Typography.caption, marginTop: 1 },
  holdingRight: { alignItems: 'flex-end' },
  holdingValue: { ...Typography.numBody },
  holdingChangeRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 1 },
  holdingChange: { ...Typography.numSmall },

  disclaimer: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});

export default PortfolioScreen;
