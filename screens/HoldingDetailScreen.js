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
import { useTheme } from '../context/ThemeContext';
import { Spacing, BorderRadius, Typography, Shadows } from '../constants/theme';
import usePortfolioStore from '../store/PortfolioStore';

const { width } = Dimensions.get('window');

const HoldingDetailScreen = ({ route, navigation }) => {
  const { holding: initialHolding } = route.params;
  const { colors, isDark } = useTheme();
  const deleteHolding = usePortfolioStore((state) => state.deleteHolding);
  const updateHolding = usePortfolioStore((state) => state.updateHolding);
  const holdings = usePortfolioStore((state) => state.holdings);
  
  // Güncel holding verisini store'dan al
  const holding = holdings.find(h => h.id === initialHolding.id) || initialHolding;
  
  const [selectedPeriod, setSelectedPeriod] = useState('1G');
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 0 });
  


  const periods = [
    { key: '1G', label: '1G', interval: '15m', range: '1d' },
    { key: '1H', label: '1H', interval: '1h', range: '5d' },
    { key: '1A', label: '1A', interval: '1d', range: '1mo' },
    { key: '3A', label: '3A', interval: '1d', range: '3mo' },
    { key: '1Y', label: '1Y', interval: '1wk', range: '1y' },
    { key: '5Y', label: '5Y', interval: '1mo', range: '5y' },
  ];

  const formatCurrency = (value, short = false) => {
    if (short) {
      return `₺${Math.round(value)}`;
    }
    return `₺${parseFloat(value).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const avgCost = parseFloat(holding.avgCost);
  const quantity = parseFloat(holding.quantity);
  const currentPrice = holding.currentPrice ? parseFloat(holding.currentPrice) : avgCost;
  
  const totalCost = avgCost * quantity;
  const currentValue = currentPrice * quantity;
  const profitLoss = currentValue - totalCost;
  const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

  const [stats, setStats] = useState({
    open: currentPrice * 0.99,
    previousClose: currentPrice * 0.98,
    high: currentPrice * 1.02,
    low: currentPrice * 0.97,
  });

  const generateLabels = (period, count) => {
    const labels = new Array(count).fill('');
    
    if (count < 2) return labels;
    
    if (period === '1G') {
      const times = ['09:00', '12:00', '15:00', '18:00'];
      labels[0] = times[0];
      labels[Math.floor(count * 0.33)] = times[1];
      labels[Math.floor(count * 0.66)] = times[2];
      labels[count - 1] = times[3];
    } else if (period === '1H') {
      const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'];
      labels[0] = days[0];
      labels[Math.floor(count * 0.25)] = days[1];
      labels[Math.floor(count * 0.5)] = days[2];
      labels[Math.floor(count * 0.75)] = days[3];
      labels[count - 1] = days[4];
    } else if (period === '1A') {
      labels[0] = '1.Hft';
      labels[Math.floor(count * 0.33)] = '2.Hft';
      labels[Math.floor(count * 0.66)] = '3.Hft';
      labels[count - 1] = '4.Hft';
    } else if (period === '3A') {
      const now = new Date();
      const months = [];
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(d.toLocaleString('tr-TR', { month: 'short' }));
      }
      labels[0] = months[0];
      labels[Math.floor(count * 0.5)] = months[1];
      labels[count - 1] = months[2];
    } else if (period === '1Y') {
      const now = new Date();
      const months = [];
      for (let i = 9; i >= 0; i -= 3) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(d.toLocaleString('tr-TR', { month: 'short' }));
      }
      labels[0] = months[0];
      labels[Math.floor(count * 0.33)] = months[1];
      labels[Math.floor(count * 0.66)] = months[2];
      labels[count - 1] = months[3];
    } else {
      labels[0] = '2021';
      labels[Math.floor(count * 0.25)] = '2022';
      labels[Math.floor(count * 0.5)] = '2023';
      labels[Math.floor(count * 0.75)] = '2024';
      labels[count - 1] = '2025';
    }
    
    return labels;
  };

  const fetchChartData = async (period) => {
    setIsLoadingChart(true);
    
    const periodConfig = periods.find(p => p.key === period);
    
    try {
      if (holding.type === 'stock') {
        const symbol = `${holding.symbol}.IS`;
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${periodConfig.interval}&range=${periodConfig.range}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.chart?.result?.[0]) {
          const result = data.chart.result[0];
          const prices = result.indicators.quote[0].close;
          const validPrices = prices.filter(p => p !== null);
          
          if (validPrices.length > 0) {
            const minPrice = Math.min(...validPrices);
            const maxPrice = Math.max(...validPrices);
            setPriceRange({ min: minPrice, max: maxPrice });
            
            if (result.meta) {
              setStats({
                open: result.meta.regularMarketOpen || currentPrice * 0.99,
                previousClose: result.meta.previousClose || currentPrice * 0.98,
                high: result.meta.regularMarketDayHigh || maxPrice,
                low: result.meta.regularMarketDayLow || minPrice,
              });
            }
            
            const step = Math.max(1, Math.floor(validPrices.length / 20));
            const sampledPrices = validPrices.filter((_, i) => i % step === 0);
            const labels = generateLabels(period, sampledPrices.length);
            
            setChartData({
              labels,
              datasets: [{ data: sampledPrices }],
            });
            
            setIsLoadingChart(false);
            return;
          }
        }
      }
      
      generateMockChartData(period);
      
    } catch (error) {
      console.error('Chart data fetch error:', error);
      generateMockChartData(period);
    }
  };

  const generateMockChartData = (period) => {
    let dataPoints = [];
    const basePrice = currentPrice;
    
    const pointsConfig = {
      '1G': { points: 20, variance: 0.02 },
      '1H': { points: 20, variance: 0.05 },
      '1A': { points: 20, variance: 0.10 },
      '3A': { points: 20, variance: 0.15 },
      '1Y': { points: 20, variance: 0.25 },
      '5Y': { points: 20, variance: 0.50 },
    };

    const config = pointsConfig[period];
    
    for (let i = 0; i < config.points; i++) {
      const randomFactor = 1 + (Math.random() - 0.5) * config.variance;
      const trendFactor = 1 + (i / config.points) * (profitLossPercent / 100) * 0.5;
      dataPoints.push(basePrice * randomFactor * trendFactor * 0.95);
    }
    
    dataPoints.push(currentPrice);

    const minPrice = Math.min(...dataPoints);
    const maxPrice = Math.max(...dataPoints);
    setPriceRange({ min: minPrice, max: maxPrice });

    const labels = generateLabels(period, dataPoints.length);

    setChartData({
      labels,
      datasets: [{ data: dataPoints }],
    });
    
    setIsLoadingChart(false);
  };

  useEffect(() => {
    fetchChartData(selectedPeriod);
  }, [selectedPeriod, currentPrice]);

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

  const handleEdit = () => {
    navigation.navigate('AddHolding', { holding });
  };

  const isPositive = profitLoss >= 0;
  const changeColor = isPositive ? colors.success : colors.error;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="bookmark-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="share-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Sembol ve Fiyat */}
        <View style={styles.priceSection}>
          <Text style={[styles.symbol, { color: colors.text }]}>{holding.symbol}</Text>
          <Text style={[styles.fullName, { color: colors.textSecondary }]}>
            {holding.fullName}
          </Text>
          
          <View style={styles.priceRow}>
            <Text style={[styles.currentPrice, { color: colors.text }]}>
              {formatCurrency(currentPrice)}
            </Text>
            <Text style={[styles.changePercent, { color: changeColor }]}>
              {isPositive ? '+' : ''}%{profitLossPercent.toFixed(2)}
            </Text>
          </View>

        </View>

        {/* Grafik */}
        <View style={styles.chartSection}>
          {isLoadingChart ? (
            <View style={styles.chartLoading}>
              <ActivityIndicator size="large" color={colors.textPrimary} />
            </View>
          ) : chartData ? (
            <View style={styles.chartWrapper}>
              <LineChart
                data={chartData}
                width={width - 16}
                height={220}
                withDots={false}
                withInnerLines={true}
                withOuterLines={false}
                withVerticalLabels={true}
                withHorizontalLabels={true}
                withHorizontalLines={true}
                withVerticalLines={false}
                segments={3}
                yAxisSuffix=""
                yAxisInterval={1}
                formatYLabel={(value) => `₺${Math.round(parseFloat(value))}`}
                chartConfig={{
                  backgroundColor: 'transparent',
                  backgroundGradientFrom: colors.background,
                  backgroundGradientTo: colors.background,
                  decimalPlaces: 0,
                  color: (opacity = 1) => isPositive ? colors.success : colors.error,
                  labelColor: (opacity = 1) => colors.textSecondary,
                  propsForBackgroundLines: {
                    strokeDasharray: '5,5',
                    stroke: colors.border,
                    strokeWidth: 1,
                  },
                  propsForLabels: {
                    fontSize: 10,
                  },
                }}
                bezier
                style={styles.chart}
              />
            </View>
          ) : null}

          {/* Zaman Seçici */}
          <View style={styles.periodSelector}>
            {periods.map((period) => (
              <TouchableOpacity
                key={period.key}
                style={[
                  styles.periodButton,
                  selectedPeriod === period.key && [
                    styles.periodButtonActive,
                    { backgroundColor: colors.textSecondary + '30' }
                  ],
                ]}
                onPress={() => setSelectedPeriod(period.key)}
              >
                <Text
                  style={[
                    styles.periodText,
                    { color: colors.textSecondary },
                    selectedPeriod === period.key && { color: colors.text, fontWeight: '600' },
                  ]}
                >
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* İstatistikler */}
        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>İstatistikler</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Açılış</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {formatCurrency(stats.open)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Önceki Kapanış</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {formatCurrency(stats.previousClose)}
                </Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>En Yüksek</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {formatCurrency(stats.high)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>En Düşük</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {formatCurrency(stats.low)}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.showMoreButton}>
            <Text style={[styles.showMoreText, { color: colors.textPrimary }]}>
              Daha fazla göster
            </Text>
          </TouchableOpacity>
        </View>

        {/* Portföyüm */}
        <View style={[styles.portfolioSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Portföyüm</Text>
          
          <View style={styles.portfolioGrid}>
            <View style={styles.portfolioItem}>
              <Text style={[styles.portfolioLabel, { color: colors.textSecondary }]}>Adet</Text>
              <Text style={[styles.portfolioValue, { color: colors.text }]}>{quantity}</Text>
            </View>
            <View style={styles.portfolioItem}>
              <Text style={[styles.portfolioLabel, { color: colors.textSecondary }]}>Ort. Maliyet</Text>
              <Text style={[styles.portfolioValue, { color: colors.text }]}>{formatCurrency(avgCost)}</Text>
            </View>
            <View style={styles.portfolioItem}>
              <Text style={[styles.portfolioLabel, { color: colors.textSecondary }]}>Toplam Maliyet</Text>
              <Text style={[styles.portfolioValue, { color: colors.text }]}>{formatCurrency(totalCost)}</Text>
            </View>
            <View style={styles.portfolioItem}>
              <Text style={[styles.portfolioLabel, { color: colors.textSecondary }]}>Güncel Değer</Text>
              <Text style={[styles.portfolioValue, { color: colors.text }]}>{formatCurrency(currentValue)}</Text>
            </View>
            <View style={styles.portfolioItem}>
              <Text style={[styles.portfolioLabel, { color: colors.textSecondary }]}>Kar/Zarar</Text>
              <Text style={[styles.portfolioValue, { color: changeColor }]}>
                {isPositive ? '+' : ''}{formatCurrency(profitLoss)}
              </Text>
            </View>
            <View style={styles.portfolioItem}>
              <Text style={[styles.portfolioLabel, { color: colors.textSecondary }]}>Getiri</Text>
              <Text style={[styles.portfolioValue, { color: changeColor }]}>
                {isPositive ? '+' : ''}%{profitLossPercent.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Aksiyonlar */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
            onPress={handleEdit}
          >
            <Ionicons name="pencil" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Düzenle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Sil</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
  },
  priceSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  symbol: {
    fontSize: 20,
    fontWeight: '700',
  },
  fullName: {
    fontSize: 14,
    marginTop: 2,
    marginBottom: Spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  currentPrice: {
    fontSize: 36,
    fontWeight: '700',
  },
  changePercent: {
    fontSize: 20,
    fontWeight: '600',
  },
  chartSection: {
    paddingBottom: Spacing.md,
  },
  chartLoading: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartWrapper: {
    alignItems: 'center',
    marginLeft: -8,
  },
  chart: {
    borderRadius: 8,
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  periodButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  periodButtonActive: {
    borderRadius: BorderRadius.sm,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  statsGrid: {
    gap: Spacing.md,
  },
  statRow: {
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  showMoreButton: {
    marginTop: Spacing.md,
  },
  showMoreText: {
    fontSize: 16,
    fontWeight: '500',
  },
  portfolioSection: {
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  portfolioItem: {
    width: '50%',
    paddingVertical: Spacing.sm,
  },
  portfolioLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  portfolioValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionsSection: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
});

export default HoldingDetailScreen;