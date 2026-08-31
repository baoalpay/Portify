// Varlıklarım — yeniden tasarım (Portföy ekranıyla aynı görsel dil)
//
// Referanstan alınan dil: düz satırlar (ikon kutusu + ad + sağda değer),
// silik etiket / belirgin sayı, cömert boşluk, tek vurgu rengi.
// Korunan işlevler: arama, 7 sıralama seçeneği, türe göre gruplama,
// kaydırma aksiyonları (Transfer/Düzenle/Sil), transfer modalı, hedef
// fiyat alarmı göstergesi, TEFAS "fiyat güncellenemedi" ibaresi,
// gizlilik maskesi (PrivateValue). Bu listede reklam YOK (tasarım kuralı).

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import { useFocusEffect } from '@react-navigation/native';
import { checkPriceAlerts, loadAlerts } from '../services/notificationService';
import PrivateValue from '../components/PrivateValue';
import Skeleton from '../components/ui/Skeleton';

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

const TYPE_META = {
  stock: { name: 'Hisse Senetleri', icon: 'trending-up', color: '#6366F1' },
  fund: { name: 'Fonlar', icon: 'pie-chart', color: '#8B5CF6' },
  crypto: { name: 'Kripto', icon: 'logo-bitcoin', color: '#EC4899' },
  currency: { name: 'Döviz', icon: 'cash', color: '#22C55E' },
  gold: { name: 'Altın', icon: 'medal', color: '#F59E0B' },
  silver: { name: 'Gümüş', icon: 'medal-outline', color: '#94A3B8' },
};

const typeMeta = (type) => TYPE_META[type] || { name: type, icon: 'wallet', color: '#6366F1' };

const HoldingsScreen = ({ navigation }) => {
  const { isDark } = useTheme();
  const ds = isDark ? Palette.dark : Palette.light;

  const holdings = usePortfolioStore((state) => state.holdings);
  const isLoading = usePortfolioStore((state) => state.isLoading);
  const loadHoldings = usePortfolioStore((state) => state.loadHoldings);
  const deleteHolding = usePortfolioStore((state) => state.deleteHolding);
  const updatePrices = usePortfolioStore((state) => state.updatePrices);
  const portfolios = usePortfolioStore((state) => state.portfolios);
  const activePortfolioId = usePortfolioStore((state) => state.activePortfolioId);
  const transferHolding = usePortfolioStore((state) => state.transferHolding);
  const convertCurrency = usePortfolioStore((state) => state.convertCurrency);
  const getCurrencySymbol = usePortfolioStore((state) => state.getCurrencySymbol);

  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('type');
  const [showSortModal, setShowSortModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [alerts, setAlerts] = useState({});
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);

  const symbol = getCurrencySymbol ? getCurrencySymbol() : '₺';
  const money = (value) => `${symbol}${Format.number(convertCurrency(value))}`;

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHoldings();
    await updatePrices();
    setAlerts(await checkPriceAlerts(holdings));
    setRefreshing(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadHoldings();
      updatePrices();
      loadAlerts().then(setAlerts);
    }, [])
  );

  useEffect(() => {
    if (holdings.length > 0) {
      checkPriceAlerts(holdings).then(setAlerts);
    }
  }, [holdings]);

  const withCalc = (h) => {
    const avgCost = parseFloat(h.avgCost);
    const quantity = parseFloat(h.quantity);
    const currentPrice = h.currentPrice ? parseFloat(h.currentPrice) : avgCost;
    const cost = avgCost * quantity;
    const value = currentPrice * quantity;
    const profitLoss = value - cost;
    const profitLossPercent = cost > 0 ? (profitLoss / cost) * 100 : 0;
    return { ...h, calc: { value, currentPrice, profitLoss, profitLossPercent } };
  };

  const filteredHoldings = useMemo(() => {
    if (!searchQuery.trim()) return holdings;
    const query = searchQuery.toLocaleLowerCase('tr').trim();
    return holdings.filter(
      (h) =>
        h.symbol.toLocaleLowerCase('tr').includes(query) ||
        (h.fullName && h.fullName.toLocaleLowerCase('tr').includes(query)) ||
        typeMeta(h.type).name.toLocaleLowerCase('tr').includes(query)
    );
  }, [holdings, searchQuery]);

  const sortedHoldings = useMemo(() => {
    const list = filteredHoldings.map(withCalc);
    switch (sortBy) {
      case 'type':
        return [...list].sort((a, b) => {
          const ta = TYPE_ORDER.indexOf(a.type);
          const tb = TYPE_ORDER.indexOf(b.type);
          if (ta !== tb) return ta - tb;
          return b.calc.value - a.calc.value;
        });
      case 'value_desc': return [...list].sort((a, b) => b.calc.value - a.calc.value);
      case 'value_asc': return [...list].sort((a, b) => a.calc.value - b.calc.value);
      case 'profit_desc': return [...list].sort((a, b) => b.calc.profitLossPercent - a.calc.profitLossPercent);
      case 'profit_asc': return [...list].sort((a, b) => a.calc.profitLossPercent - b.calc.profitLossPercent);
      case 'alpha': return [...list].sort((a, b) => a.symbol.localeCompare(b.symbol, 'tr'));
      case 'recent': return [...list].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      default: return list;
    }
  }, [filteredHoldings, sortBy]);

  const topPerformers = useMemo(() => {
    if (holdings.length < 2) return null;
    const sorted = holdings.map(withCalc).sort((a, b) => b.calc.profitLossPercent - a.calc.profitLossPercent);
    const gainer = sorted[0];
    const loser = sorted[sorted.length - 1];
    return {
      gainer: gainer.calc.profitLossPercent > 0 ? gainer : null,
      loser: loser.calc.profitLossPercent < 0 ? loser : null,
    };
  }, [holdings]);

  const groupedByType = useMemo(() => {
    if (sortBy !== 'type') return null;
    const groups = {};
    sortedHoldings.forEach((h) => {
      if (!groups[h.type]) groups[h.type] = [];
      groups[h.type].push(h);
    });
    return TYPE_ORDER.filter((t) => groups[t]?.length > 0).map((t) => ({
      type: t,
      ...typeMeta(t),
      holdings: groups[t],
    }));
  }, [sortedHoldings, sortBy]);

  const handleDelete = (holding) => {
    Alert.alert('Varlığı Sil', `${holding.symbol} varlığını silmek istediğinize emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteHolding(holding.id); } },
    ]);
  };

  const handleTransfer = (holding) => {
    if (portfolios.length <= 1) {
      Alert.alert('Portföy Gerekli', 'Transfer için en az 2 portföyünüz olmalı.', [{ text: 'Tamam' }]);
      return;
    }
    setTransferTarget(holding);
    setShowTransferModal(true);
  };

  const executeTransfer = async (targetPortfolioId) => {
    if (!transferTarget) return;
    const result = await transferHolding(transferTarget.id, targetPortfolioId);
    if (result.success) {
      const target = portfolios.find((p) => p.id === targetPortfolioId);
      Alert.alert('Transfer Başarılı', `${transferTarget.symbol} "${target?.name}" portföyüne taşındı.`);
    } else {
      Alert.alert('Hata', 'Transfer sırasında bir hata oluştu.');
    }
    setShowTransferModal(false);
    setTransferTarget(null);
  };

  const toggleSearch = () => {
    Haptics.selectionAsync();
    setShowSearch(!showSearch);
    if (showSearch) setSearchQuery('');
  };

  const renderRightActions = (holding) => (
    <View style={styles.swipeActions}>
      <TouchableOpacity
        style={[styles.swipeButton, { backgroundColor: ds.accent }]}
        onPress={() => handleTransfer(holding)}
      >
        <Ionicons name="swap-horizontal" size={22} color="#FFFFFF" />
        <Text style={styles.swipeLabel}>Transfer</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.swipeButton, { backgroundColor: ds.warning }]}
        onPress={() => navigation.navigate('AddHolding', { holding })}
      >
        <Ionicons name="pencil" size={22} color="#FFFFFF" />
        <Text style={styles.swipeLabel}>Düzenle</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.swipeButton, { backgroundColor: ds.loss }]}
        onPress={() => handleDelete(holding)}
      >
        <Ionicons name="trash" size={22} color="#FFFFFF" />
        <Text style={styles.swipeLabel}>Sil</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRow = (holding, isLast) => {
    const meta = typeMeta(holding.type);
    const dir = Direction.of(holding.calc.profitLoss);
    const alert = alerts[holding.id];
    const hasAlert = alert && !alert.triggered;
    const stale = holding.type === 'fund' && holding.priceStale;

    return (
      <Swipeable key={holding.id} renderRightActions={() => renderRightActions(holding)} overshootRight={false}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('HoldingDetail', { holding })}
          style={[
            styles.row,
            { backgroundColor: ds.surface },
            !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ds.border },
          ]}
        >
          <View style={[styles.rowIcon, { backgroundColor: meta.color + '14' }]}>
            <Ionicons name={meta.icon} size={20} color={meta.color} />
          </View>

          <View style={styles.rowName}>
            <View style={styles.symbolRow}>
              <Text style={[styles.rowSymbol, { color: ds.text }]}>{holding.symbol}</Text>
              {hasAlert && <Ionicons name="notifications" size={13} color={ds.accent} />}
            </View>
            <Text style={[styles.rowCaption, { color: ds.textSecondary }]} numberOfLines={1}>
              {holding.fullName}
            </Text>
            {hasAlert && (
              <Text style={[styles.rowCaption, { color: ds.accent }]} numberOfLines={1}>
                Hedef: {money(alert.targetPrice)} {alert.targetType === 'above' ? '↑' : '↓'}
              </Text>
            )}
            {stale && (
              <Text style={[styles.rowCaption, { color: ds.warning }]}>Fiyat güncellenemedi</Text>
            )}
          </View>

          <View style={styles.rowRight}>
            <PrivateValue style={[styles.rowValue, { color: ds.text }]}>
              {money(holding.calc.value)}
            </PrivateValue>
            <View style={styles.rowChange}>
              <Ionicons name={dir.icon} size={12} color={ds[dir.colorToken]} />
              <Text style={[styles.rowChangeText, { color: ds[dir.colorToken] }]}>
                {Format.signedPercent(holding.calc.profitLossPercent)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const currentSort = SORT_OPTIONS.find((o) => o.key === sortBy);
  const showSkeleton = isLoading && holdings.length === 0;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: ds.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={ds.background} />

        {/* Başlık */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: ds.text }]}>Varlıklarım</Text>
          <View style={styles.headerButtons}>
            {holdings.length > 0 && (
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: ds.surface, borderColor: ds.border }]}
                onPress={toggleSearch}
              >
                <Ionicons name={showSearch ? 'close' : 'search'} size={20} color={showSearch ? ds.loss : ds.accent} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.iconButton, styles.addButton, { backgroundColor: ds.accent }]}
              onPress={() => {
                Haptics.selectionAsync();
                navigation.navigate('AddHolding');
              }}
            >
              <Ionicons name="add" size={24} color={ds.onAccent} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Arama */}
        {showSearch && (
          <View style={[styles.searchBar, { backgroundColor: ds.surface, borderColor: ds.border }]}>
            <Ionicons name="search" size={18} color={ds.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: ds.text }]}
              placeholder="Varlık ara..."
              placeholderTextColor={ds.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={ds.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Sıralama */}
        {holdings.length > 0 && !showSearch && (
          <TouchableOpacity
            style={[styles.sortPill, { backgroundColor: ds.surface, borderColor: ds.border }]}
            onPress={() => setShowSortModal(true)}
          >
            <Ionicons name={currentSort?.icon || 'swap-vertical'} size={16} color={ds.accent} />
            <Text style={[styles.sortText, { color: ds.text }]}>{currentSort?.label || 'Sırala'}</Text>
            <Ionicons name="chevron-down" size={14} color={ds.textSecondary} />
          </TouchableOpacity>
        )}

        {showSearch && searchQuery.length > 0 && (
          <Text style={[styles.resultCount, { color: ds.textSecondary }]}>
            {sortedHoldings.length} sonuç bulundu
          </Text>
        )}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ds.accent} colors={[ds.accent]} />
          }
        >
          {showSkeleton ? (
            <View style={[styles.card, { backgroundColor: ds.surface, borderColor: ds.border }]}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.row, { backgroundColor: 'transparent' }]}>
                  <Skeleton width={44} height={44} borderRadius={Radius.md} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton width={90} height={14} />
                    <Skeleton width={150} height={10} />
                  </View>
                  <Skeleton width={70} height={14} />
                </View>
              ))}
            </View>
          ) : holdings.length === 0 ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: ds.accent + '14' }]}>
                <Ionicons name="wallet-outline" size={32} color={ds.accent} />
              </View>
              <Text style={[styles.emptyTitle, { color: ds.text }]}>Henüz Varlık Eklemediniz</Text>
              <Text style={[styles.emptyText, { color: ds.textSecondary }]}>
                Portföyünüzü oluşturmak için varlık ekleyin.
              </Text>
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: ds.accent }]}
                onPress={() => navigation.navigate('AddHolding')}
              >
                <Ionicons name="add-circle" size={18} color={ds.onAccent} />
                <Text style={[styles.emptyButtonText, { color: ds.onAccent }]}>Varlık Ekle</Text>
              </TouchableOpacity>
            </View>
          ) : sortedHoldings.length === 0 ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: ds.accent + '14' }]}>
                <Ionicons name="search-outline" size={32} color={ds.accent} />
              </View>
              <Text style={[styles.emptyTitle, { color: ds.text }]}>Sonuç Bulunamadı</Text>
              <Text style={[styles.emptyText, { color: ds.textSecondary }]}>"{searchQuery}" için sonuç yok.</Text>
            </View>
          ) : (
            <>
              {/* En çok kazanan / kaybeden */}
              {topPerformers && (topPerformers.gainer || topPerformers.loser) && !searchQuery && (
                <View style={styles.performersRow}>
                  {topPerformers.gainer && (
                    <TouchableOpacity
                      style={[styles.performerCard, { backgroundColor: ds.surface, borderColor: ds.border, borderLeftColor: ds.profit }]}
                      onPress={() => navigation.navigate('HoldingDetail', { holding: topPerformers.gainer })}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.performerBadge, { color: ds.profit }]}>En Çok Kazanan</Text>
                      <Text style={[styles.performerSymbol, { color: ds.text }]} numberOfLines={1}>
                        {topPerformers.gainer.symbol}
                      </Text>
                      <Text style={[styles.performerPercent, { color: ds.profit }]}>
                        {Format.signedPercent(topPerformers.gainer.calc.profitLossPercent)}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {topPerformers.loser && (
                    <TouchableOpacity
                      style={[styles.performerCard, { backgroundColor: ds.surface, borderColor: ds.border, borderLeftColor: ds.loss }]}
                      onPress={() => navigation.navigate('HoldingDetail', { holding: topPerformers.loser })}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.performerBadge, { color: ds.loss }]}>En Çok Kaybeden</Text>
                      <Text style={[styles.performerSymbol, { color: ds.text }]} numberOfLines={1}>
                        {topPerformers.loser.symbol}
                      </Text>
                      <Text style={[styles.performerPercent, { color: ds.loss }]}>
                        {Format.signedPercent(topPerformers.loser.calc.profitLossPercent)}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {sortBy === 'type' && groupedByType && !searchQuery ? (
                groupedByType.map((group) => (
                  <View key={group.type} style={styles.group}>
                    <View style={styles.groupHeader}>
                      <View style={[styles.groupDot, { backgroundColor: group.color }]} />
                      <Text style={[styles.groupTitle, { color: ds.text }]}>{group.name}</Text>
                      <Text style={[styles.groupCount, { color: ds.textSecondary }]}>({group.holdings.length})</Text>
                    </View>
                    <View style={[styles.card, { backgroundColor: ds.surface, borderColor: ds.border }]}>
                      {group.holdings.map((h, i) => renderRow(h, i === group.holdings.length - 1))}
                    </View>
                  </View>
                ))
              ) : (
                <View style={[styles.card, { backgroundColor: ds.surface, borderColor: ds.border }]}>
                  {sortedHoldings.map((h, i) => renderRow(h, i === sortedHoldings.length - 1))}
                </View>
              )}
            </>
          )}

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>

        {/* Sıralama modalı */}
        <Modal visible={showSortModal} transparent animationType="fade" onRequestClose={() => setShowSortModal(false)}>
          <TouchableOpacity
            style={[styles.overlay, { backgroundColor: ds.overlay }]}
            activeOpacity={1}
            onPress={() => setShowSortModal(false)}
          >
            <View style={[styles.sheet, { backgroundColor: ds.surfaceRaised }]}>
              <Text style={[styles.sheetTitle, { color: ds.text }]}>Sıralama</Text>
              {SORT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.sheetRow, sortBy === option.key && { backgroundColor: ds.accent + '14' }]}
                  onPress={() => { setSortBy(option.key); setShowSortModal(false); }}
                >
                  <Ionicons name={option.icon} size={18} color={sortBy === option.key ? ds.accent : ds.textSecondary} />
                  <Text
                    style={[
                      styles.sheetRowText,
                      { color: ds.text },
                      sortBy === option.key && { color: ds.accent, fontWeight: '600' },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {sortBy === option.key && <Ionicons name="checkmark" size={18} color={ds.accent} />}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Transfer modalı */}
        <Modal visible={showTransferModal} transparent animationType="slide" onRequestClose={() => setShowTransferModal(false)}>
          <TouchableOpacity
            style={[styles.overlay, { backgroundColor: ds.overlay }]}
            activeOpacity={1}
            onPress={() => setShowTransferModal(false)}
          >
            <View style={[styles.sheet, { backgroundColor: ds.surfaceRaised }]}>
              <Text style={[styles.sheetTitle, { color: ds.text }]}>Portföy Seç</Text>
              {transferTarget && (
                <Text style={[styles.sheetSubtitle, { color: ds.textSecondary }]}>
                  <Text style={{ fontWeight: '700', color: ds.text }}>{transferTarget.symbol}</Text> taşınacak
                </Text>
              )}
              {portfolios
                .filter((p) => p.id !== activePortfolioId)
                .map((portfolio) => (
                  <TouchableOpacity
                    key={portfolio.id}
                    style={[styles.sheetRow, { backgroundColor: ds.surface, marginBottom: Spacing.xs, borderRadius: Radius.md }]}
                    onPress={() => executeTransfer(portfolio.id)}
                  >
                    <View style={[styles.rowIcon, { backgroundColor: (portfolio.color || '#8B5CF6') + '20', width: 36, height: 36 }]}>
                      <Ionicons name={portfolio.icon || 'wallet'} size={18} color={portfolio.color || ds.accent} />
                    </View>
                    <Text style={[styles.sheetRowText, { color: ds.text }]}>{portfolio.name}</Text>
                    <Ionicons name="chevron-forward" size={18} color={ds.textSecondary} />
                  </TouchableOpacity>
                ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.md },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  title: { ...Typography.h1 },
  headerButtons: { flexDirection: 'row', gap: Spacing.xs },
  iconButton: {
    width: A11y.minTouchTarget,
    height: A11y.minTouchTarget,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: { borderWidth: 0 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.xs,
    minHeight: A11y.minTouchTarget,
  },
  searchInput: { flex: 1, ...Typography.body, paddingVertical: Spacing.xs },
  resultCount: { ...Typography.caption, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },

  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
    minHeight: 36,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  sortText: { ...Typography.caption, fontWeight: '600' },

  performersRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  performerCard: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: Spacing.sm,
  },
  performerBadge: { ...Typography.caption, fontWeight: '600', marginBottom: 2 },
  performerSymbol: { ...Typography.h3 },
  performerPercent: { ...Typography.numSmall, marginTop: 2 },

  group: { marginBottom: Spacing.lg },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  groupDot: { width: 8, height: 8, borderRadius: 4 },
  groupTitle: { ...Typography.bodySmall, fontWeight: '600' },
  groupCount: { ...Typography.caption },

  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minHeight: A11y.minTouchTarget + 16,
    gap: Spacing.sm,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: { flex: 1 },
  symbolRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowSymbol: { ...Typography.body, fontWeight: '600' },
  rowCaption: { ...Typography.caption, marginTop: 1 },
  rowRight: { alignItems: 'flex-end' },
  rowValue: { ...Typography.numBody },
  rowChange: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 1 },
  rowChangeText: { ...Typography.numSmall },

  swipeActions: { flexDirection: 'row' },
  swipeButton: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  swipeLabel: { ...Typography.caption, color: '#FFFFFF', fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.xs },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: { ...Typography.h3 },
  emptyText: { ...Typography.bodySmall, textAlign: 'center' },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    minHeight: A11y.minTouchTarget,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },
  emptyButtonText: { ...Typography.body, fontWeight: '600' },

  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  sheetTitle: { ...Typography.h3, textAlign: 'center', marginBottom: Spacing.md },
  sheetSubtitle: { ...Typography.bodySmall, textAlign: 'center', marginBottom: Spacing.md },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    minHeight: A11y.minTouchTarget,
    borderRadius: Radius.md,
  },
  sheetRowText: { flex: 1, ...Typography.body },
});

export default HoldingsScreen;
