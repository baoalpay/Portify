import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { useTheme } from '../context/ThemeContext';
import { Spacing, BorderRadius } from '../constants/theme';
import usePortfolioStore from '../store/PortfolioStore';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { saveToday, getHistoryByPeriod, calculatePerformance, formatChartData } from '../services/historyService';
import PortfolioSelector from '../components/PortfolioSelector';

const { width } = Dimensions.get('window');

const PERIODS = [
  { key: '1W', label: '1H' },
  { key: '1M', label: '1A' },
  { key: '6M', label: '6A' },
  { key: '1Y', label: '1Y' },
];

const PortfolioScreen = () => {
  const { colors, primary, isDark } = useTheme();
  const navigation = useNavigation();
  
  const holdings = usePortfolioStore((state) => state.holdings);
  const loadHoldings = usePortfolioStore((state) => state.loadHoldings);
  const loadPortfolios = usePortfolioStore((state) => state.loadPortfolios);
  const getPortfolioSummary = usePortfolioStore((state) => state.getPortfolioSummary);
  const getDistribution = usePortfolioStore((state) => state.getDistribution);
  const getProfitLossDistribution = usePortfolioStore((state) => state.getProfitLossDistribution);
  const updatePrices = usePortfolioStore((state) => state.updatePrices);
  const settings = usePortfolioStore((state) => state.settings);
  const convertCurrency = usePortfolioStore((state) => state.convertCurrency);
  const getCurrencySymbol = usePortfolioStore((state) => state.getCurrencySymbol);
  
  const [refreshing, setRefreshing] = useState(false);
  const [chartType, setChartType] = useState('pie');
  
  // Performans grafiği state
  const [selectedPeriod, setSelectedPeriod] = useState('1M');
  const [historyData, setHistoryData] = useState([]);
  const [performance, setPerformance] = useState({ change: 0, changePercent: 0, isPositive: true });

  const portfolio = getPortfolioSummary();
  const distribution = getDistribution();
  const profitLossData = getProfitLossDistribution();

  // Geçmiş verisini yükle ve bugünü kaydet
  const loadHistoryData = async () => {
    // Bugünün verisini kaydet
    if (portfolio.totalValue > 0) {
      await saveToday(portfolio.totalValue, portfolio.totalCost);
    }
    
    // Seçili periyoda göre veriyi getir
    const data = await getHistoryByPeriod(selectedPeriod);
    setHistoryData(data);
    
    // Performansı hesapla
    const perf = calculatePerformance(data);
    setPerformance(perf);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHoldings();
    await updatePrices();
    await loadHistoryData();
    setRefreshing(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadPortfolios();
      loadHoldings();
      updatePrices();
    }, [])
  );

  // Portfolio değeri değişince geçmişi kaydet
  useEffect(() => {
    if (portfolio.totalValue > 0) {
      loadHistoryData();
    }
  }, [portfolio.totalValue, selectedPeriod]);

  const formatCurrency = (value, short = false) => {
    const converted = convertCurrency ? convertCurrency(value) : value;
    const symbol = getCurrencySymbol ? getCurrencySymbol() : '₺';
    
    if (short && converted >= 1000000) {
      return `${symbol}${(converted / 1000000).toFixed(1)}M`;
    }
    if (short && converted >= 1000) {
      return `${symbol}${(converted / 1000).toFixed(1)}K`;
    }
    return `${symbol}${converted.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const isPositive = portfolio.profitLoss >= 0;
  const profitColor = isPositive ? colors.success : colors.error;

  const formatLastUpdated = () => {
    if (!settings?.lastUpdated) return 'Henüz güncellenmedi';
    const date = new Date(settings.lastUpdated);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  // PieChart için data formatı
  const pieData = distribution.map((item) => ({
    name: item.name,
    population: item.value,
    color: item.color,
    legendFontColor: colors.textSecondary,
    legendFontSize: 11,
  }));

  // Line Chart için data formatı
  const chartData = formatChartData(historyData);
  const hasChartData = chartData.values.length > 1;

  const lineChartData = {
    labels: chartData.labels,
    datasets: [
      {
        data: chartData.values.length > 0 ? chartData.values : [0],
        color: (opacity = 1) => performance.isPositive ? `rgba(34, 197, 94, ${opacity})` : `rgba(239, 68, 68, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const lineChartConfig = {
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => performance.isPositive ? `rgba(34, 197, 94, ${opacity})` : `rgba(239, 68, 68, ${opacity})`,
    labelColor: (opacity = 1) => colors.textSecondary,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: performance.isPositive ? '#22C55E' : '#EF4444',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: colors.border,
      strokeWidth: 1,
    },
    formatYLabel: (value) => {
      const num = parseFloat(value);
      const symbol = getCurrencySymbol ? getCurrencySymbol() : '₺';
      if (num >= 1000000) return `${symbol}${(num / 1000000).toFixed(1)}M`;
      if (num >= 1000) return `${symbol}${(num / 1000).toFixed(0)}K`;
      return `${symbol}${num.toLocaleString('tr-TR')}`;
    },
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={primary}
            colors={[primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              Hoş Geldiniz
            </Text>
            <Text style={[styles.appName, { color: primary }]}>
              Portify
            </Text>
          </View>
          <View style={styles.headerRight}>
            <PortfolioSelector />
            <TouchableOpacity 
              style={[styles.refreshButton, { backgroundColor: colors.surface }]}
              onPress={onRefresh}
            >
              <Ionicons name="refresh" size={20} color={primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Ana Portföy Kartı */}
        <View style={[styles.mainCard, { backgroundColor: colors.surface }]}>
          <View style={styles.mainCardHeader}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
              Toplam Portföy Değeri
            </Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>
              {formatCurrency(portfolio.totalValue)}
            </Text>
            
            <View style={[styles.profitBadge, { backgroundColor: profitColor + '15' }]}>
              <Ionicons 
                name={isPositive ? 'trending-up' : 'trending-down'} 
                size={18} 
                color={profitColor} 
              />
              <Text style={[styles.profitAmount, { color: profitColor }]}>
                {formatCurrency(portfolio.profitLoss)}
              </Text>
              <Text style={[styles.profitPercent, { color: profitColor }]}>
                ({formatPercent(portfolio.profitLossPercent)})
              </Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: colors.background }]}>
              <Ionicons name="wallet-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>Maliyet</Text>
              <Text style={[styles.statBoxValue, { color: colors.text }]}>
                {formatCurrency(portfolio.totalCost, true)}
              </Text>
            </View>
            
            <View style={[styles.statBox, { backgroundColor: colors.background }]}>
              <Ionicons name="analytics-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>Güncel</Text>
              <Text style={[styles.statBoxValue, { color: colors.text }]}>
                {formatCurrency(portfolio.totalValue, true)}
              </Text>
            </View>
            
            <View style={[styles.statBox, { backgroundColor: colors.background }]}>
              <Ionicons 
                name={isPositive ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'} 
                size={20} 
                color={profitColor} 
              />
              <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>Getiri</Text>
              <Text style={[styles.statBoxValue, { color: profitColor }]}>
                {formatPercent(portfolio.profitLossPercent)}
              </Text>
            </View>
          </View>
        </View>

        {/* Performans Grafiği */}
        {holdings.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Performans
              </Text>
            </View>

            <View style={[styles.performanceCard, { backgroundColor: colors.surface }]}>
              {/* Periyot Seçici */}
              <View style={styles.periodSelector}>
                {PERIODS.map((period) => (
                  <TouchableOpacity
                    key={period.key}
                    style={[
                      styles.periodButton,
                      { borderColor: colors.border },
                      selectedPeriod === period.key && { backgroundColor: primary, borderColor: primary }
                    ]}
                    onPress={() => setSelectedPeriod(period.key)}
                  >
                    <Text style={[
                      styles.periodButtonText,
                      { color: colors.textSecondary },
                      selectedPeriod === period.key && { color: '#FFFFFF' }
                    ]}>
                      {period.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Performans Özeti */}
              <View style={styles.performanceSummary}>
                <View>
                  <Text style={[styles.performanceLabel, { color: colors.textSecondary }]}>
                    Dönem Değişimi
                  </Text>
                  <View style={styles.performanceRow}>
                    <Ionicons 
                      name={performance.isPositive ? 'trending-up' : 'trending-down'} 
                      size={20} 
                      color={performance.isPositive ? colors.success : colors.error} 
                    />
                    <Text style={[
                      styles.performanceValue, 
                      { color: performance.isPositive ? colors.success : colors.error }
                    ]}>
                      {formatCurrency(performance.change)} ({formatPercent(performance.changePercent)})
                    </Text>
                  </View>
                </View>
              </View>

              {/* Grafik */}
              {hasChartData ? (
                <View style={styles.chartWrapper}>
                  <LineChart
                  data={lineChartData}
                  width={width - 64}
                  height={180}
                  chartConfig={lineChartConfig}
                  bezier
                  style={styles.lineChart}
                  withInnerLines={true}
                  withOuterLines={false}
                  withVerticalLabels={true}
                  withHorizontalLabels={true}
                  fromZero={false}
                  formatYLabel={(value) => {
                    const num = parseFloat(value);
                    const symbol = getCurrencySymbol ? getCurrencySymbol() : '₺';
                    if (num >= 1000000) return `${symbol}${(num / 1000000).toFixed(1)}M`;
                    if (num >= 1000) return `${symbol}${(num / 1000).toFixed(1)}K`;
                    return `${symbol}${num.toFixed(0)}`;
                  }}
                />
                </View>
              ) : (
                <View style={styles.noDataContainer}>
                  <Ionicons name="time-outline" size={40} color={colors.textSecondary} />
                  <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
                    Henüz yeterli veri yok
                  </Text>
                  <Text style={[styles.noDataSubtext, { color: colors.textSecondary }]}>
                    Grafik için en az 2 günlük veri gerekli.{'\n'}Uygulama her gün otomatik kaydeder.
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Dağılım Başlığı + Chart Selector */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Varlık Dağılımı
          </Text>
          
          <View style={[styles.chartSelector, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.chartButton, chartType === 'pie' && { backgroundColor: primary }]}
              onPress={() => setChartType('pie')}
            >
              <Ionicons name="pie-chart" size={16} color={chartType === 'pie' ? '#FFFFFF' : colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chartButton, chartType === 'bar' && { backgroundColor: primary }]}
              onPress={() => setChartType('bar')}
            >
              <Ionicons name="stats-chart" size={16} color={chartType === 'bar' ? '#FFFFFF' : colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chartButton, chartType === 'list' && { backgroundColor: primary }]}
              onPress={() => setChartType('list')}
            >
              <Ionicons name="list" size={16} color={chartType === 'list' ? '#FFFFFF' : colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Charts */}
        {distribution.length > 0 ? (
          <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
            
            {/* Pie Chart */}
            {chartType === 'pie' && (
              <>
                <PieChart
                  data={pieData}
                  width={width - 60}
                  height={200}
                  chartConfig={{
                    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  hasLegend={false}
                />
                <View style={styles.legendGrid}>
                  {[...distribution].sort((a, b) => b.value - a.value).map((item, index) => (
                    <View key={index} style={[styles.legendItem, { backgroundColor: colors.background }]}>
                      <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                      <Text style={[styles.legendName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.legendPercent, { color: colors.textSecondary }]}>%{item.percent}</Text>
                      <Text style={[styles.legendValue, { color: colors.text }]}>{formatCurrency(item.value, true)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Bar Chart */}
            {chartType === 'bar' && (
              <View style={styles.barContainer}>
                {[...distribution].sort((a, b) => b.value - a.value).map((item, index) => (
                  <View key={index} style={styles.barItem}>
                    <View style={styles.barHeader}>
                      <View style={styles.barLeft}>
                        <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                        <Text style={[styles.barName, { color: colors.text }]}>{item.name}</Text>
                      </View>
                      <Text style={[styles.barValue, { color: colors.text }]}>{formatCurrency(item.value, true)}</Text>
                    </View>
                    <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                      <View style={[styles.barFill, { backgroundColor: item.color, width: `${item.percent}%` }]} />
                    </View>
                    <Text style={[styles.barPercent, { color: colors.textSecondary }]}>%{item.percent}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* List View */}
            {chartType === 'list' && (
              <View style={styles.listContainer}>
                {[...distribution].sort((a, b) => b.value - a.value).map((item, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.listItem, 
                      { borderBottomColor: colors.border },
                      index === distribution.length - 1 && { borderBottomWidth: 0 }
                    ]}
                  >
                    <View style={[styles.listDot, { backgroundColor: item.color }]} />
                    <View style={styles.listContent}>
                      <Text style={[styles.listName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.listPercent, { color: colors.textSecondary }]}>%{item.percent}</Text>
                    </View>
                    <Text style={[styles.listValue, { color: colors.text }]}>{formatCurrency(item.value)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="pie-chart-outline" size={60} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Henüz varlık yok
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Portföyünüzü oluşturmak için varlık ekleyin
            </Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: primary }]}
              onPress={() => navigation.navigate('Holdings')}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Varlık Ekle</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Kar/Zarar Dağılımı */}
        {profitLossData.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Kar/Zarar Dağılımı
              </Text>
            </View>

            <View style={[styles.profitLossCard, { backgroundColor: colors.surface }]}>
              {profitLossData.map((item, index) => {
                const isProfit = item.profitLoss >= 0;
                const barColor = isProfit ? colors.success : colors.error;
                const maxProfitLoss = Math.max(...profitLossData.map(d => Math.abs(d.profitLoss)));
                const barWidth = maxProfitLoss > 0 ? (Math.abs(item.profitLoss) / maxProfitLoss) * 100 : 0;
                
                return (
                  <View 
                    key={item.id} 
                    style={[
                      styles.profitLossItem,
                      index !== profitLossData.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
                    ]}
                  >
                    <View style={styles.profitLossHeader}>
                      <Text style={[styles.profitLossSymbol, { color: colors.text }]}>
                        {item.symbol}
                      </Text>
                      <View style={styles.profitLossValues}>
                        <Text style={[styles.profitLossAmount, { color: barColor }]}>
                          {isProfit ? '+' : ''}{formatCurrency(item.profitLoss, true)}
                        </Text>
                        <Text style={[styles.profitLossPercent, { color: barColor }]}>
                          ({isProfit ? '+' : ''}{item.profitLossPercent.toFixed(1)}%)
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.profitLossBarTrack, { backgroundColor: colors.border }]}>
                      <View 
                        style={[
                          styles.profitLossBarFill, 
                          { 
                            backgroundColor: barColor,
                            width: `${Math.min(barWidth, 100)}%`,
                          }
                        ]} 
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Hızlı İstatistikler */}
        {distribution.length > 0 && (
          <View style={styles.quickStats}>
            <View style={[styles.quickStatCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="layers-outline" size={24} color={primary} />
              <View style={styles.quickStatContent}>
                <Text style={[styles.quickStatValue, { color: colors.text }]}>
                  {holdings.length}
                </Text>
                <Text style={[styles.quickStatLabel, { color: colors.textSecondary }]}>
                  Toplam Varlık
                </Text>
              </View>
            </View>
            
            <View style={[styles.quickStatCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="grid-outline" size={24} color={primary} />
              <View style={styles.quickStatContent}>
                <Text style={[styles.quickStatValue, { color: colors.text }]}>
                  {distribution.length}
                </Text>
                <Text style={[styles.quickStatLabel, { color: colors.textSecondary }]}>
                  Varlık Türü
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Disclaimer */}
        <View style={[styles.disclaimerCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="information-circle" size={20} color={primary} />
          <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
            Bu uygulama yatırım tavsiyesi vermez. Fiyatlar gecikmeli olabilir.
          </Text>
        </View>

        <Text style={[styles.lastUpdate, { color: colors.textSecondary }]}>
          Son güncelleme: {formatLastUpdated()}
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },
  header: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  greeting: {
    fontSize: 14,
    marginBottom: 4,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  mainCardHeader: {
    marginBottom: Spacing.lg,
  },
  cardLabel: {
    fontSize: 14,
    marginBottom: Spacing.xs,
  },
  totalValue: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  profitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: 6,
  },
  profitAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  profitPercent: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    gap: 6,
  },
  statBoxLabel: {
    fontSize: 12,
  },
  statBoxValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  // Performans Grafiği
  performanceCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  periodButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  performanceSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  performanceLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  performanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  dataInfo: {
    fontSize: 12,
  },
  chartWrapper: {
    marginLeft: -Spacing.md,
    marginRight: -Spacing.md,
  },
  lineChart: {
    borderRadius: BorderRadius.md,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  noDataSubtext: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  // Distribution Charts
  chartSelector: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    padding: 4,
  },
  chartButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  legendGrid: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  legendPercent: {
    fontSize: 12,
    marginRight: Spacing.sm,
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  barContainer: {
    gap: Spacing.lg,
  },
  barItem: {
    gap: Spacing.xs,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  barName: {
    fontSize: 14,
    fontWeight: '500',
  },
  barValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barPercent: {
    fontSize: 12,
  },
  listContainer: {
    gap: 0,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  listDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  listContent: {
    flex: 1,
  },
  listName: {
    fontSize: 14,
    fontWeight: '500',
  },
  listPercent: {
    fontSize: 12,
  },
  listValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  quickStats: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  quickStatCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  quickStatContent: {
    flex: 1,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  quickStatLabel: {
    fontSize: 12,
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
  },
  lastUpdate: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  // Kar/Zarar Dağılımı
  profitLossCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  profitLossItem: {
    paddingVertical: Spacing.sm,
  },
  profitLossHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  profitLossSymbol: {
    fontSize: 14,
    fontWeight: '600',
  },
  profitLossValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profitLossAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  profitLossPercent: {
    fontSize: 12,
  },
  profitLossBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  profitLossBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});

export default PortfolioScreen;