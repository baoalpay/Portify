// Varlık Detayı — yeniden tasarım (Portföy/Varlıklarım ile aynı dil)
//
// Dürüstlük kuralı: SAHTE VERİ YOK. Fiyat grafiği ve piyasa istatistikleri
// yalnızca hisse senetlerinde, Yahoo Finance'ten gelen GERÇEK veriyle
// gösterilir. Veri gelmezse "yeterli geçmiş veri yok" denir; diğer varlık
// türlerinde grafik bölümü hiç yoktur (eski sürümdeki rastgele/mock üretim
// kaldırıldı). İstatistiklerde uydurma fallback çarpanı yoktur; eksik alan
// "—" gösterilir.
//
// Diğer kurallar:
// - İşlevsiz butonlar (yer imi/zil/paylaş, "Daha fazla göster") kaldırıldı.
// - Gizlilik modu: adet, maliyet, toplamlar ve kar/zarar maskelenir
//   (PrivateValue); BİRİM piyasa fiyatı kişisel veri değildir, açık kalır.
// - Kar/zarar renk+işaret+ikon üçlüsüyle verilir (Direction).
// - Reklam alanı kaydırılan içeriğin EN SONUNDA, sabit değil (AdSlot).

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import {
  Palette,
  Direction,
  Format,
  Spacing,
  Radius,
  Typography,
  A11y,
} from '../constants/designSystem';
import usePortfolioStore from '../store/PortfolioStore';
import PrivateValue from '../components/PrivateValue';
import AdSlot from '../components/ui/AdSlot';

const { width } = Dimensions.get('window');

const TYPE_META = {
  stock: { name: 'Hisse Senedi', icon: 'trending-up' },
  fund: { name: 'Fon/ETF', icon: 'pie-chart' },
  crypto: { name: 'Kripto', icon: 'logo-bitcoin' },
  currency: { name: 'Döviz', icon: 'cash' },
  gold: { name: 'Altın', icon: 'medal' },
  silver: { name: 'Gümüş', icon: 'medal-outline' },
};

const PERIODS = [
  { key: '1G', label: '1G', interval: '15m', range: '1d' },
  { key: '1H', label: '1H', interval: '1h', range: '5d' },
  { key: '1A', label: '1A', interval: '1d', range: '1mo' },
  { key: '3A', label: '3A', interval: '1d', range: '3mo' },
  { key: '1Y', label: '1Y', interval: '1wk', range: '1y' },
  { key: '5Y', label: '5Y', interval: '1mo', range: '5y' },
];

// Grafik altı zaman etiketleri (gerçek veri sayısına göre seyreltilmiş)
const generateLabels = (period, count) => {
  const labels = new Array(count).fill('');
  if (count < 2) return labels;

  const put = (positions, texts) => {
    positions.forEach((p, i) => {
      labels[Math.min(count - 1, Math.floor(count * p))] = texts[i];
    });
  };

  const now = new Date();
  const monthsAgo = (n) =>
    new Date(now.getFullYear(), now.getMonth() - n, 1).toLocaleString('tr-TR', { month: 'short' });

  if (period === '1G') {
    put([0, 0.33, 0.66, 0.999], ['09:00', '12:00', '15:00', '18:00']);
  } else if (period === '1H') {
    put([0, 0.25, 0.5, 0.75, 0.999], ['Pzt', 'Sal', 'Çar', 'Per', 'Cum']);
  } else if (period === '1A') {
    put([0, 0.33, 0.66, 0.999], ['1.Hft', '2.Hft', '3.Hft', '4.Hft']);
  } else if (period === '3A') {
    put([0, 0.5, 0.999], [monthsAgo(2), monthsAgo(1), monthsAgo(0)]);
  } else if (period === '1Y') {
    put([0, 0.33, 0.66, 0.999], [monthsAgo(9), monthsAgo(6), monthsAgo(3), monthsAgo(0)]);
  } else {
    const year = now.getFullYear();
    put(
      [0, 0.25, 0.5, 0.75, 0.999],
      [year - 4, year - 3, year - 2, year - 1, year].map(String)
    );
  }
  return labels;
};

const HoldingDetailScreen = ({ route, navigation }) => {
  const { holding: initialHolding } = route.params;
  const { isDark } = useTheme();
  const ds = isDark ? Palette.dark : Palette.light;

  const deleteHolding = usePortfolioStore((state) => state.deleteHolding);
  const holdings = usePortfolioStore((state) => state.holdings);
  const convertCurrency = usePortfolioStore((state) => state.convertCurrency);
  const getCurrencySymbol = usePortfolioStore((state) => state.getCurrencySymbol);

  // Güncel veriyi store'dan al (düzenleme sonrası tazelenir)
  const holding = holdings.find((h) => h.id === initialHolding.id) || initialHolding;
  const meta = TYPE_META[holding.type] || { name: holding.type, icon: 'wallet' };
  const isStock = holding.type === 'stock';

  const symbol = getCurrencySymbol ? getCurrencySymbol() : '₺';
  const money = (value) => `${symbol}${Format.number(convertCurrency(value))}`;

  const avgCost = parseFloat(holding.avgCost);
  const quantity = parseFloat(holding.quantity);
  const currentPrice = holding.currentPrice ? parseFloat(holding.currentPrice) : avgCost;
  const totalCost = avgCost * quantity;
  const currentValue = currentPrice * quantity;
  const profitLoss = currentValue - totalCost;
  const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;
  const dir = Direction.of(profitLoss);

  // ---- Grafik (yalnızca hisse; gerçek veri gelmezse "veri yok") ----
  const [selectedPeriod, setSelectedPeriod] = useState('1G');
  const [chartStatus, setChartStatus] = useState(isStock ? 'loading' : 'none'); // loading | ready | empty | none
  const [chartData, setChartData] = useState(null);
  const [stats, setStats] = useState(null); // yalnızca Yahoo meta'dan; asla türetilmez

  const fetchChartData = async (period) => {
    if (!isStock) return;
    setChartStatus('loading');

    const periodConfig = PERIODS.find((p) => p.key === period);
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${holding.symbol}.IS?interval=${periodConfig.interval}&range=${periodConfig.range}`;
      const response = await fetch(url);
      const data = await response.json();
      const result = data.chart?.result?.[0];
      const prices = result?.indicators?.quote?.[0]?.close || [];
      const validPrices = prices.filter((p) => p !== null && isFinite(p));

      if (validPrices.length >= 2) {
        if (result.meta) {
          setStats({
            open: result.meta.regularMarketOpen ?? null,
            previousClose:
              result.meta.chartPreviousClose ?? result.meta.previousClose ?? null,
            high: result.meta.regularMarketDayHigh ?? null,
            low: result.meta.regularMarketDayLow ?? null,
          });
        }
        const step = Math.max(1, Math.floor(validPrices.length / 20));
        const sampled = validPrices.filter((_, i) => i % step === 0);
        setChartData({
          labels: generateLabels(period, sampled.length),
          datasets: [{ data: sampled }],
        });
        setChartStatus('ready');
        return;
      }
      setChartStatus('empty');
    } catch (error) {
      console.log('Grafik verisi alınamadı:', error?.message || error);
      setChartStatus('empty');
    }
  };

  useEffect(() => {
    fetchChartData(selectedPeriod);
  }, [selectedPeriod]);

  // Grafiğin rengi grafiğin KENDİ yönünü anlatır (dönem başı → sonu)
  const chartValues = chartData?.datasets?.[0]?.data || [];
  const chartDir = Direction.of(
    chartValues.length >= 2 ? chartValues[chartValues.length - 1] - chartValues[0] : 0
  );
  const chartColor = ds[chartDir.colorToken];

  const handleDelete = () => {
    Alert.alert(
      'Varlığı Sil',
      `${holding.symbol} varlığını silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            await deleteHolding(holding.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const statRow = (label, value) => (
    <View style={styles.statItem} key={label}>
      <Text style={[styles.statLabel, { color: ds.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: ds.text }]}>
        {value != null && isFinite(value) ? money(value) : '—'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: ds.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={ds.background} />

      {/* Başlık */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: ds.surface, borderColor: ds.border }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={ds.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: ds.text }]}>Varlık Detayı</Text>
        <View style={{ width: A11y.minTouchTarget }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Kimlik + birim fiyat (birim fiyat kişisel veri değil, maskelenmez) */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={[styles.typeIcon, { backgroundColor: ds.accent + '14' }]}>
              <Ionicons name={meta.icon} size={24} color={ds.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.symbol, { color: ds.text }]}>{holding.symbol}</Text>
              <Text style={[styles.fullName, { color: ds.textSecondary }]} numberOfLines={1}>
                {holding.fullName || meta.name}
              </Text>
            </View>
          </View>

          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: ds.text }]}>{money(currentPrice)}</Text>
            <View style={[styles.changeChip, { backgroundColor: ds[dir.bgToken] }]}>
              <Ionicons name={dir.icon} size={14} color={ds[dir.colorToken]} />
              <Text style={[styles.changeText, { color: ds[dir.colorToken] }]}>
                {Format.signedPercent(profitLossPercent)}
              </Text>
            </View>
          </View>
          <Text style={[styles.priceHint, { color: ds.textTertiary }]}>
            Birim fiyat · getiri, ortalama maliyete göre
          </Text>
        </View>

        {/* Grafik — YALNIZCA hisse ve gerçek veri; mock üretim yok */}
        {isStock && (
          <View style={styles.chartSection}>
            {chartStatus === 'loading' && (
              <View style={styles.chartPlaceholder}>
                <ActivityIndicator size="large" color={ds.accent} />
              </View>
            )}

            {chartStatus === 'ready' && chartData && (
              <View style={styles.chartWrapper}>
                <LineChart
                  data={chartData}
                  width={width - Spacing.md}
                  height={220}
                  withDots={false}
                  withOuterLines={false}
                  withVerticalLines={false}
                  segments={3}
                  formatYLabel={(value) => `${symbol}${Math.round(convertCurrency(parseFloat(value)))}`}
                  chartConfig={{
                    backgroundGradientFrom: ds.background,
                    backgroundGradientTo: ds.background,
                    decimalPlaces: 0,
                    color: () => chartColor,
                    labelColor: () => ds.textSecondary,
                    propsForBackgroundLines: {
                      strokeDasharray: '5,5',
                      stroke: ds.border,
                      strokeWidth: 1,
                    },
                    propsForLabels: { fontSize: 10 },
                  }}
                  bezier
                  style={styles.chart}
                />
              </View>
            )}

            {chartStatus === 'empty' && (
              <View style={[styles.emptyChart, { backgroundColor: ds.surface, borderColor: ds.border }]}>
                <Ionicons name="analytics-outline" size={22} color={ds.textSecondary} />
                <Text style={[styles.emptyChartText, { color: ds.textSecondary }]}>
                  Bu dönem için yeterli geçmiş veri yok
                </Text>
              </View>
            )}

            <View style={styles.periodSelector}>
              {PERIODS.map((period) => {
                const active = selectedPeriod === period.key;
                return (
                  <TouchableOpacity
                    key={period.key}
                    style={[
                      styles.periodButton,
                      active && { backgroundColor: ds.accent + '1F' },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedPeriod(period.key);
                    }}
                  >
                    <Text
                      style={[
                        styles.periodText,
                        { color: active ? ds.accent : ds.textSecondary },
                        active && { fontWeight: '700' },
                      ]}
                    >
                      {period.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* İstatistikler — yalnızca Yahoo'dan gerçek meta geldiyse */}
        {isStock && stats && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: ds.text }]}>Bugünün İstatistikleri</Text>
            <View style={[styles.card, { backgroundColor: ds.surface, borderColor: ds.border }]}>
              <View style={styles.statGrid}>
                {statRow('Açılış', stats.open)}
                {statRow('Önceki Kapanış', stats.previousClose)}
                {statRow('En Yüksek', stats.high)}
                {statRow('En Düşük', stats.low)}
              </View>
            </View>
          </View>
        )}

        {/* Portföyüm — kişisel tutarlar gizlilik modunda maskelenir */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: ds.text }]}>Portföyüm</Text>
          <View style={[styles.card, { backgroundColor: ds.surface, borderColor: ds.border }]}>
            <View style={styles.statGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: ds.textSecondary }]}>Adet</Text>
                <PrivateValue mask="•••" style={[styles.statValue, { color: ds.text }]}>
                  {Number.isInteger(quantity) ? Format.number(quantity, 0) : Format.number(quantity, 2)}
                </PrivateValue>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: ds.textSecondary }]}>Ort. Maliyet</Text>
                <PrivateValue style={[styles.statValue, { color: ds.text }]}>
                  {money(avgCost)}
                </PrivateValue>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: ds.textSecondary }]}>Toplam Maliyet</Text>
                <PrivateValue style={[styles.statValue, { color: ds.text }]}>
                  {money(totalCost)}
                </PrivateValue>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: ds.textSecondary }]}>Güncel Değer</Text>
                <PrivateValue style={[styles.statValue, { color: ds.text }]}>
                  {money(currentValue)}
                </PrivateValue>
              </View>
              <View style={styles.statItem}>
                <View style={styles.labelRow}>
                  <Ionicons name={dir.icon} size={13} color={ds[dir.colorToken]} />
                  <Text style={[styles.statLabel, { color: ds.textSecondary, marginBottom: 0 }]}>
                    Kar/Zarar
                  </Text>
                </View>
                <PrivateValue style={[styles.statValue, { color: ds[dir.colorToken] }]}>
                  {`${dir.sign}${money(Math.abs(profitLoss))}`}
                </PrivateValue>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: ds.textSecondary }]}>Getiri</Text>
                <Text style={[styles.statValue, { color: ds[dir.colorToken] }]}>
                  {Format.signedPercent(profitLossPercent)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Aksiyonlar */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: ds.accent }]}
            onPress={() => navigation.navigate('AddHolding', { holding })}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil" size={18} color={ds.onAccent} />
            <Text style={[styles.actionText, { color: ds.onAccent }]}>Düzenle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: ds.lossBg }]}
            onPress={handleDelete}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={18} color={ds.loss} />
            <Text style={[styles.actionText, { color: ds.loss }]}>Sil</Text>
          </TouchableOpacity>
        </View>

        {/* Reklam: içeriğin en sonunda, sabit değil */}
        <AdSlot borderColor={ds.border} textColor={ds.textTertiary} />

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.md },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  headerTitle: { ...Typography.h2 },
  iconButton: {
    width: A11y.minTouchTarget,
    height: A11y.minTouchTarget,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hero: { paddingTop: Spacing.sm, paddingBottom: Spacing.md },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: { ...Typography.h2 },
  fullName: { ...Typography.bodySmall, marginTop: 1 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  price: { ...Typography.numDisplay },
  changeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  changeText: { ...Typography.numSmall },
  priceHint: { ...Typography.caption, marginTop: Spacing.xs },

  chartSection: { marginBottom: Spacing.sm },
  chartPlaceholder: { height: 220, alignItems: 'center', justifyContent: 'center' },
  chartWrapper: { marginLeft: -Spacing.xs },
  chart: { borderRadius: Radius.sm },
  emptyChart: {
    height: 120,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  emptyChartText: { ...Typography.bodySmall },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  periodButton: {
    minWidth: A11y.minTouchTarget,
    minHeight: A11y.minTouchTarget,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  periodText: { ...Typography.bodySmall, fontWeight: '600' },

  section: { marginTop: Spacing.md },
  sectionTitle: { ...Typography.h3, marginBottom: Spacing.sm },
  card: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.md },
  statItem: { width: '50%' },
  statLabel: { ...Typography.caption, marginBottom: 2 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  statValue: { ...Typography.numBody },

  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: 52,
    borderRadius: Radius.md,
  },
  actionText: { ...Typography.body, fontWeight: '700' },
});

export default HoldingDetailScreen;
