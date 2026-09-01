// Analiz — yalnızca ELDEKİ GERÇEK veriden üretilen görünümler.
//
// Veri kaynakları: varlık listesi (store), günlük değer geçmişi
// (historyService, portify_history) ve diğer portföylerin kayıtları
// (holdingsRepository — salt okuma). Dış istek YOK, uydurma/örnek veri YOK;
// veri yetersizse açıkça "yeterli geçmiş veri yok" denir.
//
// Dil kuralı: uygulama yatırım tavsiyesi VERMEZ. Bu ekran durumu gösterir,
// yorum yapmaz ("riskli", "çeşitlendirin" gibi ifadeler kullanılmaz).
//
// Bloklar:
// 1) Dönemsel Performans (1H/1A/3A/1Y) — geçmiş kayıtlarından değişim ve
//    mini istatistikler; kayıtların nasıl biriktiğine dair dürüst not.
// 2) Kar/Zarar Sıralaması — varlıklar K/Z tutarına göre sıralı.
// 3) Tür Bazında Özet — tür başına maliyet/değer/K-Z.
// 4) Konsantrasyon — en büyük varlıkların portföy payı (yalnızca durum).
// 5) Portföy Karşılaştırması — birden fazla portföy varsa.
//
// Gizlilik modu: tutarlar maskelenir (PrivateValue); yüzdeler ve paylar
// görünür kalır. Reklam alanı içeriğin EN SONUNDA, sabit değil.

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
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
import { holdingsRepository } from '../repositories/holdingsRepository';
import { loadHistory } from '../services/historyService';
import PrivateValue from '../components/PrivateValue';
import AdSlot from '../components/ui/AdSlot';

const TYPE_META = {
  stock: { name: 'Hisse Senetleri', icon: 'trending-up', color: '#6366F1' },
  fund: { name: 'Fonlar', icon: 'pie-chart', color: '#8B5CF6' },
  crypto: { name: 'Kripto', icon: 'logo-bitcoin', color: '#EC4899' },
  currency: { name: 'Döviz', icon: 'cash', color: '#22C55E' },
  gold: { name: 'Altın', icon: 'medal', color: '#F59E0B' },
  silver: { name: 'Gümüş', icon: 'medal-outline', color: '#94A3B8' },
};

const typeMeta = (type) => TYPE_META[type] || { name: type, icon: 'wallet', color: '#6366F1' };

const PERIODS = [
  { key: '1H', label: '1H', days: 7 },
  { key: '1A', label: '1A', days: 30 },
  { key: '3A', label: '3A', days: 90 },
  { key: '1Y', label: '1Y', days: 365 },
];

// "2026-08-30" -> "30 Ağu"
const shortDate = (isoDate) => {
  const d = new Date(isoDate);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
};

const AnalysisScreen = () => {
  const { isDark } = useTheme();
  const ds = isDark ? Palette.dark : Palette.light;

  const holdings = usePortfolioStore((state) => state.holdings);
  const portfolios = usePortfolioStore((state) => state.portfolios);
  const activePortfolioId = usePortfolioStore((state) => state.activePortfolioId);
  const convertCurrency = usePortfolioStore((state) => state.convertCurrency);
  const getCurrencySymbol = usePortfolioStore((state) => state.getCurrencySymbol);

  const symbol = getCurrencySymbol ? getCurrencySymbol() : '₺';
  const money = (value) => `${symbol}${Format.number(convertCurrency(value))}`;

  const [selectedPeriod, setSelectedPeriod] = useState('1A');
  const [history, setHistory] = useState([]);
  // [{ id, name, icon, cost, value }] — yalnızca birden fazla portföy varsa dolar
  const [portfolioRows, setPortfolioRows] = useState([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      loadHistory().then((records) => {
        if (!cancelled) setHistory(records || []);
      });

      // Portföy karşılaştırması: kayıtları salt okuma ile topla
      const loadComparison = async () => {
        if (!portfolios || portfolios.length < 2) {
          if (!cancelled) setPortfolioRows([]);
          return;
        }
        const rows = [];
        for (const p of portfolios) {
          const items = await holdingsRepository.loadHoldings(p.id);
          let cost = 0;
          let value = 0;
          for (const h of items) {
            const quantity = parseFloat(h.quantity);
            const avgCost = parseFloat(h.avgCost);
            const price = h.currentPrice ? parseFloat(h.currentPrice) : avgCost;
            if (!isFinite(quantity) || !isFinite(avgCost)) continue;
            cost += avgCost * quantity;
            value += (isFinite(price) ? price : avgCost) * quantity;
          }
          rows.push({ id: p.id, name: p.name, icon: p.icon || 'wallet', cost, value });
        }
        if (!cancelled) setPortfolioRows(rows);
      };
      loadComparison();

      return () => {
        cancelled = true;
      };
    }, [portfolios, activePortfolioId, holdings])
  );

  // ---- Varlık hesapları (aktif portföy) ----
  const calc = useMemo(() => {
    return holdings
      .map((h) => {
        const quantity = parseFloat(h.quantity);
        const avgCost = parseFloat(h.avgCost);
        const price = h.currentPrice ? parseFloat(h.currentPrice) : avgCost;
        const cost = avgCost * quantity;
        const value = (isFinite(price) ? price : avgCost) * quantity;
        const profit = value - cost;
        const profitPercent = cost > 0 ? (profit / cost) * 100 : 0;
        return { ...h, cost, value, profit, profitPercent };
      })
      .filter((h) => isFinite(h.cost) && isFinite(h.value));
  }, [holdings]);

  const totalValue = calc.reduce((sum, h) => sum + h.value, 0);

  // 1) Dönemsel performans (gerçek geçmiş kayıtlarından)
  const performance = useMemo(() => {
    const period = PERIODS.find((p) => p.key === selectedPeriod);
    const start = new Date();
    start.setDate(start.getDate() - period.days);
    const records = history.filter((r) => new Date(r.date) >= start);

    if (records.length < 2) {
      return { enough: false, recordCount: records.length };
    }

    const first = records[0];
    const last = records[records.length - 1];
    const change = last.value - first.value;
    const changePercent = first.value > 0 ? (change / first.value) * 100 : 0;

    // Ardışık kayıtlar arası en iyi / en kötü değişim
    let best = null;
    let worst = null;
    for (let i = 1; i < records.length; i++) {
      const diff = records[i].value - records[i - 1].value;
      const diffPercent =
        records[i - 1].value > 0 ? (diff / records[i - 1].value) * 100 : 0;
      const step = { date: records[i].date, diff, diffPercent };
      if (best === null || diff > best.diff) best = step;
      if (worst === null || diff < worst.diff) worst = step;
    }

    return { enough: true, recordCount: records.length, first, last, change, changePercent, best, worst };
  }, [history, selectedPeriod]);

  // 2) K/Z sıralaması
  const ranked = useMemo(
    () => [...calc].sort((a, b) => b.profit - a.profit),
    [calc]
  );
  const maxAbsProfit = ranked.reduce((m, h) => Math.max(m, Math.abs(h.profit)), 0);

  // 3) Tür bazında özet
  const byType = useMemo(() => {
    const groups = {};
    for (const h of calc) {
      if (!groups[h.type]) groups[h.type] = { type: h.type, cost: 0, value: 0, count: 0 };
      groups[h.type].cost += h.cost;
      groups[h.type].value += h.value;
      groups[h.type].count += 1;
    }
    return Object.values(groups).sort((a, b) => b.value - a.value);
  }, [calc]);

  // 4) Konsantrasyon: değere göre en büyük 3 varlık payı
  const concentration = useMemo(() => {
    if (totalValue <= 0) return [];
    return [...calc]
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map((h) => ({ symbol: h.symbol, share: (h.value / totalValue) * 100 }));
  }, [calc, totalValue]);

  const SectionTitle = ({ children }) => (
    <Text style={[styles.sectionTitle, { color: ds.text }]}>{children}</Text>
  );

  const Card = ({ children, style }) => (
    <View style={[styles.card, { backgroundColor: ds.surface, borderColor: ds.border }, style]}>
      {children}
    </View>
  );

  const EmptyNote = ({ icon, text }) => (
    <View style={styles.emptyNote}>
      <Ionicons name={icon} size={22} color={ds.textSecondary} />
      <Text style={[styles.emptyNoteText, { color: ds.textSecondary }]}>{text}</Text>
    </View>
  );

  // Hiç varlık yoksa: tek boş durum kartı
  if (calc.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: ds.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={ds.background} />
        <Text style={[styles.title, { color: ds.text }]}>Analiz</Text>
        <Card style={{ alignItems: 'center', padding: Spacing.lg }}>
          <View style={[styles.emptyIcon, { backgroundColor: ds.accent + '14' }]}>
            <Ionicons name="analytics-outline" size={28} color={ds.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: ds.text }]}>Henüz analiz edilecek veri yok</Text>
          <Text style={[styles.emptyText, { color: ds.textSecondary }]}>
            Varlık ekledikçe kar/zarar sıralaması, tür bazında özet ve
            performans istatistikleri burada görünür.
          </Text>
        </Card>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: ds.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={ds.background} />
      <Text style={[styles.title, { color: ds.text }]}>Analiz</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* 1) Dönemsel Performans */}
        <SectionTitle>Dönemsel Performans</SectionTitle>
        <Card>
          <View style={styles.periodRow}>
            {PERIODS.map((period) => {
              const active = selectedPeriod === period.key;
              return (
                <TouchableOpacity
                  key={period.key}
                  style={[styles.periodButton, active && { backgroundColor: ds.accent + '1F' }]}
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

          {performance.enough ? (
            <>
              {(() => {
                const dir = Direction.of(performance.change);
                return (
                  <View style={styles.perfHero}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.perfLabel, { color: ds.textSecondary }]}>
                        {shortDate(performance.first.date)} → {shortDate(performance.last.date)}
                      </Text>
                      <PrivateValue style={[styles.perfChange, { color: ds[dir.colorToken] }]}>
                        {`${dir.sign}${money(Math.abs(performance.change))}`}
                      </PrivateValue>
                    </View>
                    <View style={[styles.changeChip, { backgroundColor: ds[dir.bgToken] }]}>
                      <Ionicons name={dir.icon} size={14} color={ds[dir.colorToken]} />
                      <Text style={[styles.changeChipText, { color: ds[dir.colorToken] }]}>
                        {Format.signedPercent(performance.changePercent)}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              <View style={[styles.perfGrid, { borderTopColor: ds.border }]}>
                <View style={styles.perfItem}>
                  <Text style={[styles.perfLabel, { color: ds.textSecondary }]}>Dönem Başı</Text>
                  <PrivateValue style={[styles.perfValue, { color: ds.text }]}>
                    {money(performance.first.value)}
                  </PrivateValue>
                </View>
                <View style={styles.perfItem}>
                  <Text style={[styles.perfLabel, { color: ds.textSecondary }]}>Dönem Sonu</Text>
                  <PrivateValue style={[styles.perfValue, { color: ds.text }]}>
                    {money(performance.last.value)}
                  </PrivateValue>
                </View>
                {/* Renk değerin KENDİ yönünü anlatır (negatif "en iyi" kırmızıdır) */}
                <View style={styles.perfItem}>
                  <Text style={[styles.perfLabel, { color: ds.textSecondary }]}>
                    En İyi Değişim ({shortDate(performance.best.date)})
                  </Text>
                  <Text style={[styles.perfValue, { color: ds[Direction.of(performance.best.diff).colorToken] }]}>
                    {Format.signedPercent(performance.best.diffPercent)}
                  </Text>
                </View>
                <View style={styles.perfItem}>
                  <Text style={[styles.perfLabel, { color: ds.textSecondary }]}>
                    En Kötü Değişim ({shortDate(performance.worst.date)})
                  </Text>
                  <Text style={[styles.perfValue, { color: ds[Direction.of(performance.worst.diff).colorToken] }]}>
                    {Format.signedPercent(performance.worst.diffPercent)}
                  </Text>
                </View>
                <View style={styles.perfItem}>
                  <Text style={[styles.perfLabel, { color: ds.textSecondary }]}>Kayıt Sayısı</Text>
                  <Text style={[styles.perfValue, { color: ds.text }]}>
                    {performance.recordCount} gün
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <EmptyNote
              icon="hourglass-outline"
              text={
                performance.recordCount === 1
                  ? 'Bu dönemde tek kayıt var; karşılaştırma için en az iki gün gerekir.'
                  : 'Bu dönem için yeterli geçmiş veri yok.'
              }
            />
          )}
        </Card>
        {/* Dürüstlük notu: geçmişin nasıl biriktiği */}
        <Text style={[styles.footnote, { color: ds.textTertiary }]}>
          Geçmiş, uygulamanın açıldığı günlerde günde bir kez kaydedilir. Uygulamanın
          açılmadığı günler kayıt oluşmaz; aradaki hareket sonraki kayıtta tek değişim
          olarak görünür. "En iyi/en kötü değişim" bu kayıtlar arasındaki farktır.
        </Text>

        {/* 2) Kar/Zarar Sıralaması */}
        <SectionTitle>Kar/Zarar Sıralaması</SectionTitle>
        <Card>
          {ranked.map((h, index) => {
            const dir = Direction.of(h.profit);
            const meta = typeMeta(h.type);
            const barRatio = maxAbsProfit > 0 ? Math.abs(h.profit) / maxAbsProfit : 0;
            return (
              <View
                key={h.id}
                style={[
                  styles.rankRow,
                  index > 0 && { borderTopColor: ds.border, borderTopWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <View style={[styles.rankIcon, { backgroundColor: meta.color + '18' }]}>
                  <Ionicons name={meta.icon} size={16} color={meta.color} />
                </View>
                <View style={styles.rankMid}>
                  <Text style={[styles.rankSymbol, { color: ds.text }]} numberOfLines={1}>
                    {h.symbol}
                  </Text>
                  <View style={[styles.barTrack, { backgroundColor: ds.border }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          backgroundColor: ds[dir.colorToken],
                          width: `${Math.max(3, barRatio * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.rankRight}>
                  <PrivateValue style={[styles.rankAmount, { color: ds[dir.colorToken] }]}>
                    {`${dir.sign}${money(Math.abs(h.profit))}`}
                  </PrivateValue>
                  <View style={styles.percentRow}>
                    <Ionicons name={dir.icon} size={11} color={ds[dir.colorToken]} />
                    <Text style={[styles.rankPercent, { color: ds[dir.colorToken] }]}>
                      {Format.signedPercent(h.profitPercent)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </Card>

        {/* 3) Tür Bazında Özet */}
        <SectionTitle>Tür Bazında Özet</SectionTitle>
        <Card>
          {byType.map((group, index) => {
            const profit = group.value - group.cost;
            const profitPercent = group.cost > 0 ? (profit / group.cost) * 100 : 0;
            const dir = Direction.of(profit);
            const meta = typeMeta(group.type);
            return (
              <View
                key={group.type}
                style={[
                  styles.typeRow,
                  index > 0 && { borderTopColor: ds.border, borderTopWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <View style={[styles.rankIcon, { backgroundColor: meta.color + '18' }]}>
                  <Ionicons name={meta.icon} size={16} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.typeName, { color: ds.text }]}>
                    {meta.name} <Text style={{ color: ds.textSecondary }}>({group.count})</Text>
                  </Text>
                  <PrivateValue style={[styles.typeCost, { color: ds.textSecondary }]}>
                    {`Maliyet: ${money(group.cost)}`}
                  </PrivateValue>
                </View>
                <View style={styles.rankRight}>
                  <PrivateValue style={[styles.typeValue, { color: ds.text }]}>
                    {money(group.value)}
                  </PrivateValue>
                  <View style={styles.percentRow}>
                    <Ionicons name={dir.icon} size={11} color={ds[dir.colorToken]} />
                    <Text style={[styles.rankPercent, { color: ds[dir.colorToken] }]}>
                      {Format.signedPercent(profitPercent)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </Card>

        {/* 4) Konsantrasyon — yalnızca durum gösterilir, yorum yapılmaz */}
        <SectionTitle>Konsantrasyon</SectionTitle>
        <Card>
          {concentration.length > 0 && (
            <Text style={[styles.concentrationHeadline, { color: ds.text }]}>
              Portföyünüzün {Format.percent(concentration[0].share)}'i tek varlıkta
              (<Text style={{ fontWeight: '700' }}>{concentration[0].symbol}</Text>)
            </Text>
          )}
          {concentration.map((item) => (
            <View key={item.symbol} style={styles.concentrationRow}>
              <Text style={[styles.concentrationSymbol, { color: ds.text }]} numberOfLines={1}>
                {item.symbol}
              </Text>
              <View style={[styles.barTrack, { backgroundColor: ds.border, flex: 1 }]}>
                <View
                  style={[
                    styles.barFill,
                    { backgroundColor: ds.accent, width: `${Math.max(2, item.share)}%` },
                  ]}
                />
              </View>
              <Text style={[styles.concentrationShare, { color: ds.textSecondary }]}>
                {Format.percent(item.share)}
              </Text>
            </View>
          ))}
        </Card>

        {/* 5) Portföy Karşılaştırması — birden fazla portföy varsa */}
        {portfolioRows.length >= 2 && (
          <>
            <SectionTitle>Portföy Karşılaştırması</SectionTitle>
            <Card>
              {portfolioRows.map((p, index) => {
                const profit = p.value - p.cost;
                const profitPercent = p.cost > 0 ? (profit / p.cost) * 100 : 0;
                const dir = Direction.of(profit);
                const isActive = p.id === activePortfolioId;
                return (
                  <View
                    key={p.id}
                    style={[
                      styles.typeRow,
                      index > 0 && { borderTopColor: ds.border, borderTopWidth: StyleSheet.hairlineWidth },
                    ]}
                  >
                    <View style={[styles.rankIcon, { backgroundColor: ds.accent + '14' }]}>
                      <Ionicons name={p.icon} size={16} color={ds.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.typeName, { color: ds.text }]} numberOfLines={1}>
                        {p.name}
                        {isActive && <Text style={{ color: ds.accent }}> · aktif</Text>}
                      </Text>
                    </View>
                    <View style={styles.rankRight}>
                      <PrivateValue style={[styles.typeValue, { color: ds.text }]}>
                        {money(p.value)}
                      </PrivateValue>
                      <View style={styles.percentRow}>
                        <Ionicons name={dir.icon} size={11} color={ds[dir.colorToken]} />
                        <Text style={[styles.rankPercent, { color: ds[dir.colorToken] }]}>
                          {Format.signedPercent(profitPercent)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </Card>
            <Text style={[styles.footnote, { color: ds.textTertiary }]}>
              Diğer portföylerin fiyatları, o portföy en son açıldığında güncellenen
              değerlerdir.
            </Text>
          </>
        )}

        {/* Reklam: içeriğin en sonunda, sabit değil */}
        <AdSlot borderColor={ds.border} textColor={ds.textTertiary} />

        <View style={{ height: 96 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.md },
  title: { ...Typography.h1, marginTop: Spacing.xl, marginBottom: Spacing.sm },
  scroll: { paddingTop: Spacing.xs },

  sectionTitle: { ...Typography.h3, marginTop: Spacing.md, marginBottom: Spacing.sm },
  card: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  footnote: {
    ...Typography.caption,
    marginTop: Spacing.xs,
    marginHorizontal: Spacing.xxs,
    lineHeight: 16,
  },

  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: { ...Typography.h3, marginBottom: Spacing.xs, textAlign: 'center' },
  emptyText: { ...Typography.bodySmall, textAlign: 'center' },
  emptyNote: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.lg,
  },
  emptyNoteText: { ...Typography.bodySmall, textAlign: 'center' },

  periodRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
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

  perfHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  perfLabel: { ...Typography.caption, marginBottom: 2 },
  perfChange: { ...Typography.numLarge },
  changeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  changeChipText: { ...Typography.numSmall },
  perfGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  perfItem: { width: '50%' },
  perfValue: { ...Typography.numBody },

  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    minHeight: A11y.minTouchTarget,
  },
  rankIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankMid: { flex: 1, gap: 4 },
  rankSymbol: { ...Typography.body, fontWeight: '600' },
  barTrack: {
    height: 5,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: Radius.full },
  rankRight: { alignItems: 'flex-end' },
  rankAmount: { ...Typography.numBody },
  percentRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 1 },
  rankPercent: { ...Typography.numSmall },

  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    minHeight: A11y.minTouchTarget,
  },
  typeName: { ...Typography.body, fontWeight: '600' },
  typeCost: { ...Typography.caption, marginTop: 1 },
  typeValue: { ...Typography.numBody },

  concentrationHeadline: {
    ...Typography.body,
    marginBottom: Spacing.sm,
    lineHeight: 22,
  },
  concentrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    minHeight: 32,
  },
  concentrationSymbol: { ...Typography.bodySmall, fontWeight: '600', width: 72 },
  concentrationShare: { ...Typography.numSmall, width: 56, textAlign: 'right' },
});

export default AnalysisScreen;
