import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Spacing, BorderRadius, Typography, Shadows } from '../constants/theme';
import usePortfolioStore from '../store/PortfolioStore';
import { useFocusEffect } from '@react-navigation/native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { checkPriceAlerts, loadAlerts } from '../services/notificationService';
import PrivateValue from '../components/PrivateValue';

const SORT_OPTIONS = [
  { key: 'type', label: 'Türe Göre', icon: 'layers-outline' },
  { key: 'value_desc', label: 'Değer (Yüksek → Düşük)', icon: 'arrow-down-outline' },
  { key: 'value_asc', label: 'Değer (Düşük → Yüksek)', icon: 'arrow-up-outline' },
  { key: 'profit_desc', label: 'Kar/Zarar (En Çok Kazanan)', icon: 'trending-up' },
  { key: 'profit_asc', label: 'Kar/Zarar (En Çok Kaybeden)', icon: 'trending-down' },
  { key: 'alpha', label: 'Alfabetik (A-Z)', icon: 'text-outline' },
  { key: 'recent', label: 'Son Eklenen', icon: 'time-outline' },
];

const TYPE_ORDER = ['stock', 'fund', 'crypto', 'currency', 'gold', 'silver'];

const HoldingsScreen = ({ navigation }) => {
  const { colors, isDark, primary } = useTheme();
  
  const holdings = usePortfolioStore((state) => state.holdings);
  const isLoading = usePortfolioStore((state) => state.isLoading);
  const loadHoldings = usePortfolioStore((state) => state.loadHoldings);
  const deleteHolding = usePortfolioStore((state) => state.deleteHolding);
  const updatePrices = usePortfolioStore((state) => state.updatePrices);
  const portfolios = usePortfolioStore((state) => state.portfolios);
  const activePortfolioId = usePortfolioStore((state) => state.activePortfolioId);
  const transferHolding = usePortfolioStore((state) => state.transferHolding);
  const isPremium = usePortfolioStore((state) => state.isPremium);
  
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('type');
  const [showSortModal, setShowSortModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [alerts, setAlerts] = useState({});
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedHoldingForTransfer, setSelectedHoldingForTransfer] = useState(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHoldings();
    await updatePrices();
    const updatedAlerts = await checkPriceAlerts(holdings);
    setAlerts(updatedAlerts);
    setRefreshing(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadHoldings();
      updatePrices();
      loadAlertsData();
    }, [])
  );

  const loadAlertsData = async () => {
    const alertsData = await loadAlerts();
    setAlerts(alertsData);
  };

  useEffect(() => {
    if (holdings.length > 0) {
      checkPriceAlerts(holdings).then(setAlerts);
    }
  }, [holdings]);

  const getIcon = (type) => {
    switch (type) {
      case 'stock': return 'trending-up';
      case 'fund': return 'pie-chart';
      case 'crypto': return 'logo-bitcoin';
      case 'currency': return 'cash';
      case 'gold': return 'medal';
      case 'silver': return 'medal-outline';
      default: return 'wallet';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'stock': return '#6366F1';
      case 'fund': return '#8B5CF6';
      case 'crypto': return '#EC4899';
      case 'currency': return '#22C55E';
      case 'gold': return '#F59E0B';
      case 'silver': return '#94A3B8';
      default: return primary;
    }
  };

  const getTypeName = (type) => {
    switch (type) {
      case 'stock': return 'Hisse Senetleri';
      case 'fund': return 'Fonlar';
      case 'crypto': return 'Kripto';
      case 'currency': return 'Döviz';
      case 'gold': return 'Altın';
      case 'silver': return 'Gümüş';
      default: return type;
    }
  };

  const formatCurrency = (value) => {
    return `₺${parseFloat(value).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const calculateProfitLoss = (holding) => {
    const avgCost = parseFloat(holding.avgCost);
    const quantity = parseFloat(holding.quantity);
    const currentPrice = holding.currentPrice ? parseFloat(holding.currentPrice) : avgCost;
    
    const cost = avgCost * quantity;
    const currentValue = currentPrice * quantity;
    const profitLoss = currentValue - cost;
    const profitLossPercent = cost > 0 ? (profitLoss / cost) * 100 : 0;
    
    return { value: currentValue, currentPrice, profitLoss, profitLossPercent };
  };

  const filteredHoldings = useMemo(() => {
    if (!searchQuery.trim()) return holdings;
    const query = searchQuery.toLowerCase().trim();
    return holdings.filter(h => 
      h.symbol.toLowerCase().includes(query) ||
      (h.fullName && h.fullName.toLowerCase().includes(query)) ||
      getTypeName(h.type).toLowerCase().includes(query)
    );
  }, [holdings, searchQuery]);

  const sortedHoldings = useMemo(() => {
    const holdingsWithCalc = filteredHoldings.map(h => ({ ...h, calc: calculateProfitLoss(h) }));

    switch (sortBy) {
      case 'type':
        return [...holdingsWithCalc].sort((a, b) => {
          const typeA = TYPE_ORDER.indexOf(a.type);
          const typeB = TYPE_ORDER.indexOf(b.type);
          if (typeA !== typeB) return typeA - typeB;
          return b.calc.value - a.calc.value;
        });
      case 'value_desc': return [...holdingsWithCalc].sort((a, b) => b.calc.value - a.calc.value);
      case 'value_asc': return [...holdingsWithCalc].sort((a, b) => a.calc.value - b.calc.value);
      case 'profit_desc': return [...holdingsWithCalc].sort((a, b) => b.calc.profitLossPercent - a.calc.profitLossPercent);
      case 'profit_asc': return [...holdingsWithCalc].sort((a, b) => a.calc.profitLossPercent - b.calc.profitLossPercent);
      case 'alpha': return [...holdingsWithCalc].sort((a, b) => a.symbol.localeCompare(b.symbol, 'tr'));
      case 'recent': return [...holdingsWithCalc].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      default: return holdingsWithCalc;
    }
  }, [filteredHoldings, sortBy]);

  const topPerformers = useMemo(() => {
    if (holdings.length < 2) return null;
    const holdingsWithCalc = holdings.map(h => ({ ...h, calc: calculateProfitLoss(h) }));
    const sorted = [...holdingsWithCalc].sort((a, b) => b.calc.profitLossPercent - a.calc.profitLossPercent);
    const topGainer = sorted[0];
    const topLoser = sorted[sorted.length - 1];

    if (topGainer.calc.profitLossPercent <= 0 && topLoser.calc.profitLossPercent <= 0) {
      return { topGainer: null, topLoser };
    }
    if (topGainer.calc.profitLossPercent >= 0 && topLoser.calc.profitLossPercent >= 0) {
      return { topGainer, topLoser: null };
    }
    return { topGainer, topLoser };
  }, [holdings]);

  const groupedByType = useMemo(() => {
    if (sortBy !== 'type') return null;
    const groups = {};
    sortedHoldings.forEach(holding => {
      if (!groups[holding.type]) groups[holding.type] = [];
      groups[holding.type].push(holding);
    });
    return TYPE_ORDER.filter(type => groups[type]?.length > 0).map(type => ({
      type, name: getTypeName(type), color: getTypeColor(type), holdings: groups[type],
    }));
  }, [sortedHoldings, sortBy]);

  const handleDelete = (holding) => {
    Alert.alert('Varlığı Sil', `${holding.symbol} varlığını silmek istediğinize emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteHolding(holding.id); } },
    ]);
  };

  const handleEdit = (holding) => navigation.navigate('AddHolding', { holding });
  const handleCardPress = (holding) => navigation.navigate('HoldingDetail', { holding });
  const toggleSearch = () => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(''); };

  const handleTransfer = (holding) => {
    if (!isPremium) {
      Alert.alert(
        'Premium Gerekli',
        'Varlık transferi yapmak için Premium\'a geçmeniz gerekiyor.',
        [{ text: 'Tamam' }]
      );
      return;
    }
    
    if (portfolios.length <= 1) {
      Alert.alert(
        'Portföy Gerekli',
        'Transfer için en az 2 portföyünüz olmalı.',
        [{ text: 'Tamam' }]
      );
      return;
    }
    
    setSelectedHoldingForTransfer(holding);
    setShowTransferModal(true);
  };

  const executeTransfer = async (targetPortfolioId) => {
    if (!selectedHoldingForTransfer) return;
    
    const result = await transferHolding(selectedHoldingForTransfer.id, targetPortfolioId);
    
    if (result.success) {
      const targetPortfolio = portfolios.find(p => p.id === targetPortfolioId);
      Alert.alert(
        'Transfer Başarılı',
        `${selectedHoldingForTransfer.symbol} "${targetPortfolio?.name}" portföyüne taşındı.`
      );
    } else {
      Alert.alert('Hata', 'Transfer sırasında bir hata oluştu.');
    }
    
    setShowTransferModal(false);
    setSelectedHoldingForTransfer(null);
  };

  const renderRightActions = (holding) => (
    <View style={styles.swipeActionsContainer}>
      <TouchableOpacity style={[styles.swipeButton, { backgroundColor: primary }]} onPress={() => handleTransfer(holding)}>
        <Ionicons name="swap-horizontal" size={24} color="#FFFFFF" />
        <Text style={styles.swipeButtonText}>Transfer</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.swipeButton, { backgroundColor: '#F59E0B' }]} onPress={() => handleEdit(holding)}>
        <Ionicons name="pencil" size={24} color="#FFFFFF" />
        <Text style={styles.swipeButtonText}>Düzenle</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.swipeButton, { backgroundColor: '#EF4444' }]} onPress={() => handleDelete(holding)}>
        <Ionicons name="trash" size={24} color="#FFFFFF" />
        <Text style={styles.swipeButtonText}>Sil</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTopPerformerCard = (holding, type) => {
    if (!holding) return null;
    const { value, profitLoss, profitLossPercent } = holding.calc;
    const isGainer = type === 'gainer';
    const cardColor = isGainer ? colors.success : colors.error;
    
    return (
      <TouchableOpacity style={[styles.topPerformerCard, { backgroundColor: colors.surface, borderLeftColor: cardColor }]} onPress={() => handleCardPress(holding)} activeOpacity={0.7}>
        <View style={[styles.topPerformerBadge, { backgroundColor: cardColor + '15' }]}>
          <Ionicons name={isGainer ? 'trophy' : 'trending-down'} size={14} color={cardColor} />
          <Text style={[styles.topPerformerBadgeText, { color: cardColor }]}>{isGainer ? 'En Çok Kazanan' : 'En Çok Kaybeden'}</Text>
        </View>
        <Text style={[styles.topPerformerSymbol, { color: colors.text }]} numberOfLines={1}>{holding.symbol}</Text>
        <Text style={[styles.topPerformerPercent, { color: cardColor }]}>{profitLoss >= 0 ? '+' : ''}{profitLossPercent.toFixed(1)}%</Text>
      </TouchableOpacity>
    );
  };

  const renderHoldingCard = (holding) => {
    const { value, profitLoss, profitLossPercent, currentPrice } = holding.calc;
    const typeColor = getTypeColor(holding.type);
    const alert = alerts[holding.id];
    const hasActiveAlert = alert && !alert.triggered;
    
    return (
      <Swipeable key={holding.id} renderRightActions={() => renderRightActions(holding)} overshootRight={false}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => handleCardPress(holding)}>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardLeft}>
                <View style={[styles.iconContainer, { backgroundColor: typeColor + '15' }]}>
                  <Ionicons name={getIcon(holding.type)} size={24} color={typeColor} />
                </View>
                <View>
                  <View style={styles.symbolRow}>
                    <Text style={[styles.holdingName, { color: colors.text }]}>{holding.symbol}</Text>
                    {hasActiveAlert && <Ionicons name="notifications" size={14} color={primary} style={{ marginLeft: 4 }} />}
                  </View>
                  <Text style={[styles.holdingFullName, { color: colors.textSecondary }]}>{holding.fullName}</Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <PrivateValue style={[styles.holdingValue, { color: colors.text }]}>{formatCurrency(value)}</PrivateValue>
                <View style={[styles.profitBadge, { backgroundColor: profitLoss >= 0 ? colors.success + '15' : colors.error + '15' }]}>
                  <Text style={[styles.profitText, { color: profitLoss >= 0 ? colors.success : colors.error }]}>{profitLoss >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%</Text>
                </View>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.cardFooter}>
              <View style={styles.footerItem}><Text style={[styles.footerLabel, { color: colors.textSecondary }]}>Adet/Miktar</Text><PrivateValue mask="•••" style={[styles.footerValue, { color: colors.text }]}>{holding.quantity}</PrivateValue></View>
              <View style={styles.footerItem}><Text style={[styles.footerLabel, { color: colors.textSecondary }]}>Ort. Maliyet</Text><PrivateValue style={[styles.footerValue, { color: colors.text }]}>{formatCurrency(holding.avgCost)}</PrivateValue></View>
              <View style={styles.footerItem}><Text style={[styles.footerLabel, { color: holding.type === 'fund' && holding.priceStale ? '#F59E0B' : colors.textSecondary }]}>{holding.type === 'fund' && holding.priceStale ? 'Fiyat güncellenemedi' : 'Güncel Fiyat'}</Text><Text style={[styles.footerValue, { color: colors.text }]}>{formatCurrency(currentPrice)}</Text></View>
            </View>
            {hasActiveAlert && (
              <View style={[styles.alertIndicator, { backgroundColor: primary + '10', borderColor: primary + '30' }]}>
                <Ionicons name="flag" size={14} color={primary} />
                <Text style={[styles.alertIndicatorText, { color: primary }]}>Hedef: {formatCurrency(alert.targetPrice)} ({alert.targetType === 'above' ? '↑' : '↓'})</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const currentSortOption = SORT_OPTIONS.find(o => o.key === sortBy);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Varlıklarım</Text>
          <View style={styles.headerButtons}>
            {holdings.length > 0 && (
              <TouchableOpacity style={[styles.headerButton, { backgroundColor: colors.surface }]} onPress={toggleSearch}>
                <Ionicons name={showSearch ? "close" : "search"} size={22} color={showSearch ? colors.error : primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.addButton, { backgroundColor: primary }]} onPress={() => navigation.navigate('AddHolding')}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {showSearch && (
          <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Varlık ara..." placeholderTextColor={colors.textSecondary} value={searchQuery} onChangeText={setSearchQuery} autoFocus autoCapitalize="none" />
            {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={20} color={colors.textSecondary} /></TouchableOpacity>}
          </View>
        )}

        {holdings.length > 0 && !showSearch && (
          <TouchableOpacity style={[styles.sortButton, { backgroundColor: colors.surface }]} onPress={() => setShowSortModal(true)}>
            <Ionicons name={currentSortOption?.icon || 'swap-vertical'} size={18} color={primary} />
            <Text style={[styles.sortButtonText, { color: colors.text }]}>{currentSortOption?.label || 'Sırala'}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {showSearch && searchQuery.length > 0 && (
          <View style={styles.searchResultCount}><Text style={[styles.searchResultText, { color: colors.textSecondary }]}>{sortedHoldings.length} sonuç bulundu</Text></View>
        )}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primary} colors={[primary]} />}>
          {holdings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="wallet-outline" size={80} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Henüz Varlık Eklemediniz</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Portföyünüzü oluşturmak için varlık ekleyin</Text>
              <TouchableOpacity style={[styles.emptyButton, { backgroundColor: primary }]} onPress={() => navigation.navigate('AddHolding')}>
                <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Varlık Ekle</Text>
              </TouchableOpacity>
            </View>
          ) : sortedHoldings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={60} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Sonuç Bulunamadı</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>"{searchQuery}" için sonuç yok</Text>
              <TouchableOpacity style={[styles.clearSearchButton, { borderColor: primary }]} onPress={() => setSearchQuery('')}>
                <Text style={[styles.clearSearchText, { color: primary }]}>Aramayı Temizle</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {topPerformers && !searchQuery && (
                <View style={styles.topPerformersContainer}>
                  {renderTopPerformerCard(topPerformers.topGainer, 'gainer')}
                  {renderTopPerformerCard(topPerformers.topLoser, 'loser')}
                </View>
              )}
              {sortBy === 'type' && groupedByType && !searchQuery ? (
                groupedByType.map((group) => (
                  <View key={group.type} style={styles.groupContainer}>
                    <View style={styles.groupHeader}>
                      <View style={[styles.groupDot, { backgroundColor: group.color }]} />
                      <Text style={[styles.groupTitle, { color: colors.text }]}>{group.name}</Text>
                      <Text style={[styles.groupCount, { color: colors.textSecondary }]}>({group.holdings.length})</Text>
                    </View>
                    {group.holdings.map(holding => renderHoldingCard(holding))}
                  </View>
                ))
              ) : sortedHoldings.map(holding => renderHoldingCard(holding))}
            </>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>

        <Modal visible={showSortModal} transparent={true} animationType="fade" onRequestClose={() => setShowSortModal(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSortModal(false)}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Sıralama</Text>
              {SORT_OPTIONS.map((option) => (
                <TouchableOpacity key={option.key} style={[styles.sortOption, sortBy === option.key && { backgroundColor: primary + '15' }]} onPress={() => { setSortBy(option.key); setShowSortModal(false); }}>
                  <Ionicons name={option.icon} size={20} color={sortBy === option.key ? primary : colors.textSecondary} />
                  <Text style={[styles.sortOptionText, { color: colors.text }, sortBy === option.key && { color: primary, fontWeight: '600' }]}>{option.label}</Text>
                  {sortBy === option.key && <Ionicons name="checkmark" size={20} color={primary} />}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Transfer Modal */}
        <Modal visible={showTransferModal} transparent={true} animationType="slide" onRequestClose={() => setShowTransferModal(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTransferModal(false)}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Portföy Seç</Text>
              
              {selectedHoldingForTransfer && (
                <View style={[styles.transferInfo, { backgroundColor: colors.background }]}>
                  <Ionicons name="swap-horizontal" size={24} color={primary} />
                  <Text style={[styles.transferInfoText, { color: colors.text }]}>
                    <Text style={{ fontWeight: '700' }}>{selectedHoldingForTransfer.symbol}</Text> taşınacak
                  </Text>
                </View>
              )}

              {portfolios.filter(p => p.id !== activePortfolioId).map((portfolio) => (
                <TouchableOpacity 
                  key={portfolio.id} 
                  style={[styles.transferOption, { backgroundColor: colors.background }]}
                  onPress={() => executeTransfer(portfolio.id)}
                >
                  <View style={[styles.transferPortfolioIcon, { backgroundColor: portfolio.color + '20' }]}>
                    <Ionicons name={portfolio.icon || 'wallet'} size={24} color={portfolio.color} />
                  </View>
                  <Text style={[styles.transferPortfolioName, { color: colors.text }]}>{portfolio.name}</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}

              <TouchableOpacity 
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setShowTransferModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>İptal</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  loadingText: { fontSize: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: Spacing.xl, paddingBottom: Spacing.sm },
  title: { fontSize: 28, fontWeight: '700' },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerButton: { width: 44, height: 44, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
  addButton: { width: 48, height: 48, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.md, marginBottom: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, gap: Spacing.sm },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: Spacing.xs },
  searchResultCount: { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  searchResultText: { fontSize: 14 },
  sortButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginHorizontal: Spacing.md, marginBottom: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, gap: Spacing.xs },
  sortButtonText: { fontSize: 14, fontWeight: '500' },
  scrollContent: { paddingHorizontal: Spacing.md },
  topPerformersContainer: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  topPerformerCard: { flex: 1, borderRadius: BorderRadius.lg, padding: Spacing.md, borderLeftWidth: 3 },
  topPerformerBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm, gap: 4, marginBottom: Spacing.sm },
  topPerformerBadgeText: { fontSize: 10, fontWeight: '600' },
  topPerformerSymbol: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  topPerformerPercent: { fontSize: 16, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxl * 2, gap: Spacing.md },
  emptyTitle: { fontSize: 20, fontWeight: '600', marginTop: Spacing.md },
  emptySubtitle: { fontSize: 16, textAlign: 'center' },
  emptyButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, gap: Spacing.xs, marginTop: Spacing.md },
  emptyButtonText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
  clearSearchButton: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginTop: Spacing.md },
  clearSearchText: { fontSize: 16, fontWeight: '600' },
  groupContainer: { marginBottom: Spacing.lg },
  groupHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm, gap: Spacing.sm },
  groupDot: { width: 10, height: 10, borderRadius: 5 },
  groupTitle: { fontSize: 16, fontWeight: '600' },
  groupCount: { fontSize: 14 },
  swipeActionsContainer: { flexDirection: 'row', marginBottom: Spacing.md },
  swipeButton: { width: 80, justifyContent: 'center', alignItems: 'center', gap: 4 },
  swipeButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  card: { borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  iconContainer: { width: 48, height: 48, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
  symbolRow: { flexDirection: 'row', alignItems: 'center' },
  holdingName: { fontSize: 18, fontWeight: '600' },
  holdingFullName: { fontSize: 12 },
  cardRight: { alignItems: 'flex-end' },
  holdingValue: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  profitBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  profitText: { fontSize: 12, fontWeight: '600' },
  divider: { height: 1, marginBottom: Spacing.md },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  footerItem: { flex: 1, alignItems: 'center' },
  footerLabel: { fontSize: 11, marginBottom: 4 },
  footerValue: { fontSize: 13, fontWeight: '600' },
  alertIndicator: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.md, padding: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1 },
  alertIndicatorText: { fontSize: 12, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, paddingBottom: Spacing.xxl },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: Spacing.lg, textAlign: 'center' },
  sortOption: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.md, gap: Spacing.md },
  sortOptionText: { flex: 1, fontSize: 16 },
  // Transfer Modal
  transferInfo: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.lg, gap: Spacing.sm },
  transferInfoText: { fontSize: 16 },
  transferOption: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.sm, gap: Spacing.md },
  transferPortfolioIcon: { width: 48, height: 48, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
  transferPortfolioName: { flex: 1, fontSize: 16, fontWeight: '600' },
  cancelButton: { padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, alignItems: 'center', marginTop: Spacing.md },
  cancelButtonText: { fontSize: 16, fontWeight: '600' },
});

export default HoldingsScreen;