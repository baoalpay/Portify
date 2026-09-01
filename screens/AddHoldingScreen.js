// Varlık Ekle / Düzenle — yeniden tasarım (Portföy/Varlıklarım ile aynı dil)
//
// Bu ekranda reklam YOK (tasarım kuralı: form ekranlarında reklam olmaz).
// Davranış kuralları:
// - Sayısal alanlar sayı klavyesi açar; ondalık için hem virgül hem nokta
//   kabul edilir (Türkçe düzen), kayıtta noktaya normalize edilir.
// - Hata mesajları alanın ALTINDA görünür; doğrulama için uyarı penceresi yok.
// - Kaydet, form geçerli olana dek pasiftir; altındaki satır nedenini söyler.
// - Yarım doldurulup çıkılırsa "kaydedilmemiş değişiklikler" onayı sorulur.
// - Fon akışı: TEFAS arama önerileri, tam ad, onEndEditing emniyeti korunur.

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import {
  Palette,
  Spacing,
  Radius,
  Typography,
  A11y,
} from '../constants/designSystem';
import usePortfolioStore from '../store/PortfolioStore';
import { setAlert, getAlert, requestNotificationPermissions } from '../services/notificationService';
import { tefasRepository } from '../repositories/tefasRepository';

const CURRENCY_LIST = [
  { code: 'USD', name: 'Amerikan Doları' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'İngiliz Sterlini' },
  { code: 'CHF', name: 'İsviçre Frangı' },
  { code: 'JPY', name: 'Japon Yeni' },
  { code: 'CAD', name: 'Kanada Doları' },
  { code: 'AUD', name: 'Avustralya Doları' },
  { code: 'CNY', name: 'Çin Yuanı' },
  { code: 'SAR', name: 'Suudi Riyali' },
  { code: 'RUB', name: 'Rus Rublesi' },
  { code: 'INR', name: 'Hindistan Rupisi' },
  { code: 'KRW', name: 'Güney Kore Wonu' },
  { code: 'SEK', name: 'İsveç Kronu' },
  { code: 'NOK', name: 'Norveç Kronu' },
  { code: 'DKK', name: 'Danimarka Kronu' },
  { code: 'AED', name: 'BAE Dirhemi' },
  { code: 'QAR', name: 'Katar Riyali' },
  { code: 'KWD', name: 'Kuveyt Dinarı' },
  { code: 'PLN', name: 'Polonya Zlotisi' },
  { code: 'MXN', name: 'Meksika Pesosu' },
];

const ASSET_TYPES = [
  { id: 'stock', name: 'Hisse Senedi', icon: 'trending-up' },
  { id: 'fund', name: 'Fon/ETF', icon: 'pie-chart' },
  { id: 'crypto', name: 'Kripto', icon: 'logo-bitcoin' },
  { id: 'currency', name: 'Döviz', icon: 'cash' },
  { id: 'gold', name: 'Altın', icon: 'medal' },
  { id: 'silver', name: 'Gümüş', icon: 'medal-outline' },
];

// Sayısal giriş: yalnızca rakam + tek ondalık ayracı (virgül veya nokta)
const sanitizeDecimal = (text) => {
  let cleaned = String(text).replace(/[^0-9.,]/g, '');
  const firstSep = cleaned.search(/[.,]/);
  if (firstSep !== -1) {
    cleaned =
      cleaned.slice(0, firstSep + 1) + cleaned.slice(firstSep + 1).replace(/[.,]/g, '');
  }
  return cleaned;
};

// "12,5" -> 12.5 (kayıtta noktaya normalize edilir)
const toNumber = (text) => parseFloat(String(text).replace(',', '.'));
const isPositive = (text) => {
  const n = toNumber(text);
  return isFinite(n) && n > 0;
};
const toDotString = (text) => String(toNumber(text));

const AddHoldingScreen = ({ navigation, route }) => {
  const { isDark } = useTheme();
  const ds = isDark ? Palette.dark : Palette.light;

  const addHolding = usePortfolioStore((state) => state.addHolding);
  const updateHolding = usePortfolioStore((state) => state.updateHolding);

  const editMode = route.params?.holding ? true : false;
  const existingHolding = route.params?.holding;
  const presetType = route.params?.presetType; // hızlı ekleme kısayolundan

  const [selectedType, setSelectedType] = useState(
    editMode ? existingHolding.type : presetType || null
  );

  useEffect(() => {
    if (!editMode && presetType) {
      setSelectedType(presetType);
    }
  }, [presetType, editMode]);

  const [formData, setFormData] = useState({
    symbol: editMode ? existingHolding.symbol : '',
    quantity: editMode ? String(existingHolding.quantity) : '',
    avgCost: editMode ? String(existingHolding.avgCost) : '',
    currentPrice:
      editMode && existingHolding.currentPrice ? String(existingHolding.currentPrice) : '',
  });

  // Hangi alanlara dokunuldu (hata mesajı ancak dokunulduktan sonra görünür)
  const [touched, setTouched] = useState({});
  const touch = (field) => setTouched((t) => ({ ...t, [field]: true }));

  const [currencySearch, setCurrencySearch] = useState(
    editMode && existingHolding.type === 'currency'
      ? CURRENCY_LIST.find((c) => c.code === existingHolding.symbol)?.name || ''
      : ''
  );
  const [showCurrencyList, setShowCurrencyList] = useState(false);

  // Fon arama (TEFAS listesi önbellekten; liste yoksa düz giriş sürer)
  const [fundList, setFundList] = useState(null);
  const [showFundList, setShowFundList] = useState(false);
  const [fundFullName, setFundFullName] = useState(
    editMode && existingHolding?.type === 'fund' ? existingHolding.fullName || '' : ''
  );

  useEffect(() => {
    if (selectedType === 'fund' && fundList === null && !editMode) {
      tefasRepository.getFundList().then((funds) => {
        if (funds) setFundList(funds);
      });
    }
  }, [selectedType]);

  const fundSuggestions = useMemo(() => {
    if (selectedType !== 'fund' || !fundList) return [];
    return tefasRepository.searchFunds(formData.symbol, fundList);
  }, [selectedType, formData.symbol, fundList]);

  // Hedef fiyat alarmı
  const [targetEnabled, setTargetEnabled] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [targetType, setTargetType] = useState('above');
  const initialAlarmRef = useRef({ enabled: false, price: '', type: 'above' });

  useEffect(() => {
    if (editMode && existingHolding) {
      getAlert(existingHolding.id).then((alert) => {
        if (alert) {
          setTargetEnabled(true);
          setTargetPrice(String(alert.targetPrice));
          setTargetType(alert.targetType || 'above');
          initialAlarmRef.current = {
            enabled: true,
            price: String(alert.targetPrice),
            type: alert.targetType || 'above',
          };
        }
      });
    }
  }, []);

  const needsManualPrice = selectedType === 'fund';
  const noSymbolRequired = selectedType === 'gold' || selectedType === 'silver';

  const filteredCurrencies = CURRENCY_LIST.filter(
    (c) =>
      c.code.toLocaleLowerCase('tr').includes(currencySearch.toLocaleLowerCase('tr')) ||
      c.name.toLocaleLowerCase('tr').includes(currencySearch.toLocaleLowerCase('tr'))
  );

  // ---- Doğrulama: alan bazlı hatalar + Kaydet'in pasiflik nedeni ----
  const validation = useMemo(() => {
    const errors = {};
    let reason = null;

    if (!selectedType) {
      reason = 'Önce varlık türü seçin';
      return { errors, reason };
    }
    if (!noSymbolRequired && !formData.symbol.trim()) {
      errors.symbol =
        selectedType === 'fund'
          ? 'Fon kodu girin'
          : selectedType === 'currency'
            ? 'Listeden bir döviz seçin'
            : 'Sembol girin';
      reason = reason || errors.symbol;
    }
    if (!formData.quantity.trim()) {
      errors.quantity = 'Miktar girin';
    } else if (!isPositive(formData.quantity)) {
      errors.quantity = 'Geçerli bir miktar girin (0’dan büyük)';
    }
    if (errors.quantity) reason = reason || errors.quantity;

    if (!formData.avgCost.trim()) {
      errors.avgCost = 'Ortalama maliyet girin';
    } else if (!isPositive(formData.avgCost)) {
      errors.avgCost = 'Geçerli bir maliyet girin (0’dan büyük)';
    }
    if (errors.avgCost) reason = reason || errors.avgCost;

    if (!editMode && needsManualPrice) {
      if (!formData.currentPrice.trim()) {
        errors.currentPrice = 'Fon için güncel fiyat girin';
      } else if (!isPositive(formData.currentPrice)) {
        errors.currentPrice = 'Geçerli bir fiyat girin (0’dan büyük)';
      }
      if (errors.currentPrice) reason = reason || errors.currentPrice;
    } else if (formData.currentPrice.trim() && !isPositive(formData.currentPrice)) {
      errors.currentPrice = 'Geçerli bir fiyat girin (0’dan büyük)';
      reason = reason || errors.currentPrice;
    }

    if (targetEnabled) {
      if (!targetPrice.trim()) {
        errors.targetPrice = 'Hedef fiyat girin (veya alarmı kapatın)';
      } else if (!isPositive(targetPrice)) {
        errors.targetPrice = 'Geçerli bir hedef fiyat girin';
      }
      if (errors.targetPrice) reason = reason || errors.targetPrice;
    }

    return { errors, reason };
  }, [selectedType, formData, targetEnabled, targetPrice, editMode, needsManualPrice, noSymbolRequired]);

  const canSave = !validation.reason;

  // ---- Kaydedilmemiş değişiklik koruması ----
  const savedRef = useRef(false);

  const isDirty = () => {
    if (savedRef.current) return false;
    if (!editMode) {
      return !!(
        formData.symbol ||
        formData.quantity ||
        formData.avgCost ||
        formData.currentPrice ||
        currencySearch ||
        targetEnabled
      );
    }
    const alarm = initialAlarmRef.current;
    return (
      formData.quantity !== String(existingHolding.quantity) ||
      formData.avgCost !== String(existingHolding.avgCost) ||
      formData.currentPrice !==
        (existingHolding.currentPrice ? String(existingHolding.currentPrice) : '') ||
      targetEnabled !== alarm.enabled ||
      (targetEnabled && (targetPrice !== alarm.price || targetType !== alarm.type))
    );
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isDirty()) return;
      e.preventDefault();
      Alert.alert(
        'Kaydedilmemiş değişiklikler',
        'Girdiğiniz bilgiler kaydedilmedi. Çıkmak istediğinize emin misiniz?',
        [
          { text: 'Kalmaya devam et', style: 'cancel' },
          {
            text: 'Çık',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });
    return unsubscribe;
  });

  // ---- Kaydet ----
  const handleSave = async () => {
    if (!canSave) return;

    const normalizedSymbol = formData.symbol.trim().toUpperCase();
    const resolvedFullName =
      selectedType === 'fund' && fundFullName
        ? fundFullName
        : normalizedSymbol ||
          (selectedType === 'gold' ? 'Altın' : selectedType === 'silver' ? 'Gümüş' : normalizedSymbol);

    let holdingId = existingHolding?.id;

    if (editMode) {
      const updates = {
        symbol: noSymbolRequired
          ? (selectedType === 'gold' ? 'GOLD' : 'SILVER')
          : normalizedSymbol,
        fullName: resolvedFullName,
        quantity: toDotString(formData.quantity),
        avgCost: toDotString(formData.avgCost),
      };
      if (formData.currentPrice.trim()) {
        updates.currentPrice = toDotString(formData.currentPrice);
        updates.priceUpdatedAt = new Date().toISOString();
      }
      await updateHolding(existingHolding.id, updates);
    } else {
      const holding = {
        type: selectedType,
        symbol: noSymbolRequired
          ? (selectedType === 'gold' ? 'GOLD' : 'SILVER')
          : normalizedSymbol,
        fullName: resolvedFullName,
        quantity: toDotString(formData.quantity),
        avgCost: toDotString(formData.avgCost),
      };
      if (needsManualPrice && formData.currentPrice.trim()) {
        holding.currentPrice = toDotString(formData.currentPrice);
        holding.priceUpdatedAt = new Date().toISOString();
      }
      const created = await addHolding(holding);
      holdingId = created?.id;
    }

    if (holdingId) {
      if (targetEnabled && targetPrice) {
        await requestNotificationPermissions();
        await setAlert(holdingId, toNumber(targetPrice), targetType);
      } else {
        await setAlert(holdingId, null);
      }
    }

    savedRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  const labels = useMemo(() => {
    switch (selectedType) {
      case 'stock':
        return { symbol: 'Hisse Kodu', quantity: 'Lot Sayısı', cost: 'Ort. Maliyet (₺)', price: 'Güncel Fiyat (₺)', placeholder: 'Örn: THYAO' };
      case 'fund':
        return { symbol: 'Fon Kodu', quantity: 'Adet', cost: 'Ort. Maliyet (₺)', price: 'Güncel Fiyat (₺)', placeholder: 'Kod veya ad ile arayın' };
      case 'crypto':
        return { symbol: 'Kripto Kodu', quantity: 'Adet', cost: 'Ort. Maliyet (₺)', price: 'Güncel Fiyat (₺)', placeholder: 'Örn: BTC' };
      case 'currency':
        return { symbol: 'Döviz', quantity: 'Miktar', cost: 'Ort. Kur (₺)', price: 'Güncel Kur (₺)', placeholder: 'Ara... (USD, Euro...)' };
      case 'gold':
        return { symbol: 'Altın', quantity: 'Gram', cost: 'Ort. Fiyat (₺/gr)', price: 'Güncel Fiyat (₺/gr)', placeholder: '' };
      case 'silver':
        return { symbol: 'Gümüş', quantity: 'Gram', cost: 'Ort. Fiyat (₺/gr)', price: 'Güncel Fiyat (₺/gr)', placeholder: '' };
      default:
        return { symbol: 'Sembol', quantity: 'Miktar', cost: 'Maliyet', price: 'Güncel Fiyat', placeholder: '' };
    }
  }, [selectedType]);

  const infoText = editMode
    ? needsManualPrice
      ? 'Fon fiyatı TEFAS’tan günlük çekilir; dilerseniz güncel fiyatı elle de girebilirsiniz.'
      : 'Varlık bilgilerinizi güncelleyin. Sembol değiştirilemez.'
    : needsManualPrice
      ? 'Fon adı veya koduyla arama yapabilirsiniz. Fiyat TEFAS’tan günlük güncellenir; girdiğiniz fiyat yedek olarak kullanılır.'
      : 'Güncel fiyatlar otomatik olarak güncellenecektir. Sadece maliyet bilgilerinizi girin.';

  const FieldError = ({ field }) =>
    touched[field] && validation.errors[field] ? (
      <Text style={[styles.fieldError, { color: ds.loss }]}>{validation.errors[field]}</Text>
    ) : null;

  const inputStyle = (field) => [
    styles.input,
    {
      backgroundColor: ds.surface,
      color: ds.text,
      borderColor: touched[field] && validation.errors[field] ? ds.loss : ds.border,
    },
  ];

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
        <Text style={[styles.headerTitle, { color: ds.text }]}>
          {editMode ? 'Varlık Düzenle' : 'Varlık Ekle'}
        </Text>
        <View style={{ width: A11y.minTouchTarget }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.sectionTitle, { color: ds.text }]}>Varlık Türü</Text>
        <View style={styles.typeGrid}>
          {ASSET_TYPES.map((type) => {
            const selected = selectedType === type.id;
            return (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeCard,
                  { backgroundColor: ds.surface, borderColor: selected ? ds.accent : ds.border },
                  selected && { backgroundColor: ds.accent + '0D' },
                  editMode && !selected && { opacity: 0.45 },
                ]}
                onPress={() => {
                  if (!editMode) {
                    Haptics.selectionAsync();
                    setSelectedType(type.id);
                  }
                }}
                activeOpacity={editMode ? 1 : 0.7}
                disabled={editMode}
              >
                <View style={[styles.typeIcon, { backgroundColor: ds.accent + '14' }]}>
                  <Ionicons name={type.icon} size={24} color={ds.accent} />
                </View>
                <Text style={[styles.typeName, { color: ds.text }]}>{type.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedType && (
          <>
            <Text style={[styles.sectionTitle, { color: ds.text, marginTop: Spacing.xl }]}>
              Bilgiler
            </Text>

            {/* Döviz: aranabilir liste */}
            {selectedType === 'currency' && (
              <View style={styles.field}>
                <Text style={[styles.label, { color: ds.textSecondary }]}>{labels.symbol}</Text>
                <TextInput
                  style={[...inputStyle('symbol'), editMode && styles.inputDisabled]}
                  placeholder={labels.placeholder}
                  placeholderTextColor={ds.textTertiary}
                  value={formData.symbol ? `${formData.symbol} - ${currencySearch}` : currencySearch}
                  onChangeText={(text) => {
                    if (!editMode) {
                      setCurrencySearch(text);
                      setShowCurrencyList(true);
                      setFormData({ ...formData, symbol: '' });
                    }
                  }}
                  onFocus={() => !editMode && setShowCurrencyList(true)}
                  onBlur={() => touch('symbol')}
                  editable={!editMode}
                />
                <FieldError field="symbol" />
                {showCurrencyList && !editMode && filteredCurrencies.length > 0 && !formData.symbol && (
                  <View style={[styles.suggestList, { backgroundColor: ds.surface, borderColor: ds.border }]}>
                    {filteredCurrencies.slice(0, 5).map((currency) => (
                      <TouchableOpacity
                        key={currency.code}
                        style={[styles.suggestItem, { borderBottomColor: ds.border }]}
                        onPress={() => {
                          setFormData({ ...formData, symbol: currency.code });
                          setCurrencySearch(currency.name);
                          setShowCurrencyList(false);
                        }}
                      >
                        <Text style={[styles.suggestCode, { color: ds.text }]}>{currency.code}</Text>
                        <Text style={[styles.suggestName, { color: ds.textSecondary }]}>{currency.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Sembol / fon kodu */}
            {!noSymbolRequired && selectedType !== 'currency' && (
              <View style={styles.field}>
                <Text style={[styles.label, { color: ds.textSecondary }]}>{labels.symbol}</Text>
                <TextInput
                  style={[...inputStyle('symbol'), editMode && styles.inputDisabled]}
                  placeholder={labels.placeholder}
                  placeholderTextColor={ds.textTertiary}
                  value={formData.symbol}
                  onChangeText={(text) => {
                    // Tuş vuruşunda dönüşüm yok (kontrollü girdi tuzağı) —
                    // büyük harf kayıt anında uygulanır
                    setFormData({ ...formData, symbol: text });
                    if (selectedType === 'fund') {
                      setShowFundList(true);
                      setFundFullName('');
                    }
                  }}
                  onFocus={() => selectedType === 'fund' && !editMode && setShowFundList(true)}
                  onBlur={() => touch('symbol')}
                  onEndEditing={(e) => {
                    const nativeText = e?.nativeEvent?.text ?? '';
                    setFormData((prev) =>
                      prev.symbol === nativeText ? prev : { ...prev, symbol: nativeText }
                    );
                  }}
                  autoCapitalize="characters"
                  editable={!editMode}
                />
                <FieldError field="symbol" />
                {selectedType === 'fund' && fundFullName !== '' && (
                  <Text style={[styles.fundName, { color: ds.textSecondary }]} numberOfLines={1}>
                    {fundFullName}
                  </Text>
                )}
                {selectedType === 'fund' && showFundList && !editMode && fundList &&
                  formData.symbol.length > 0 && fundFullName === '' && fundSuggestions.length > 0 && (
                  <View style={[styles.suggestList, { backgroundColor: ds.surface, borderColor: ds.border }]}>
                    {fundSuggestions.map((fund) => (
                      <TouchableOpacity
                        key={fund.code}
                        style={[styles.suggestItem, { borderBottomColor: ds.border }]}
                        onPress={() => {
                          setFormData({ ...formData, symbol: fund.code });
                          setFundFullName(fund.name);
                          setShowFundList(false);
                        }}
                      >
                        <Text style={[styles.suggestCode, { color: ds.text }]}>{fund.code}</Text>
                        <Text style={[styles.suggestName, { color: ds.textSecondary }]} numberOfLines={1}>
                          {fund.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Miktar */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: ds.textSecondary }]}>{labels.quantity}</Text>
              <TextInput
                style={inputStyle('quantity')}
                placeholder="0"
                placeholderTextColor={ds.textTertiary}
                value={formData.quantity}
                onChangeText={(text) => setFormData({ ...formData, quantity: sanitizeDecimal(text) })}
                onBlur={() => touch('quantity')}
                keyboardType="decimal-pad"
              />
              <FieldError field="quantity" />
            </View>

            {/* Ortalama maliyet */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: ds.textSecondary }]}>{labels.cost}</Text>
              <TextInput
                style={inputStyle('avgCost')}
                placeholder="0,00"
                placeholderTextColor={ds.textTertiary}
                value={formData.avgCost}
                onChangeText={(text) => setFormData({ ...formData, avgCost: sanitizeDecimal(text) })}
                onBlur={() => touch('avgCost')}
                keyboardType="decimal-pad"
              />
              <FieldError field="avgCost" />
            </View>

            {/* Fon: güncel fiyat */}
            {needsManualPrice && (
              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { color: ds.textSecondary }]}>{labels.price}</Text>
                  {!editMode && <Text style={[styles.labelHint, { color: ds.accent }]}>(Zorunlu)</Text>}
                </View>
                <TextInput
                  style={inputStyle('currentPrice')}
                  placeholder="0,00"
                  placeholderTextColor={ds.textTertiary}
                  value={formData.currentPrice}
                  onChangeText={(text) => setFormData({ ...formData, currentPrice: sanitizeDecimal(text) })}
                  onBlur={() => touch('currentPrice')}
                  keyboardType="decimal-pad"
                />
                <FieldError field="currentPrice" />
                <Text style={[styles.hint, { color: ds.textTertiary }]}>
                  Fiyat, TEFAS’tan günde bir kez otomatik güncellenir. Girdiğiniz fiyat, TEFAS’a
                  ulaşılamadığında kullanılır.
                </Text>
              </View>
            )}

            {/* Hedef fiyat alarmı */}
            <View style={[styles.alarmCard, { backgroundColor: ds.surface, borderColor: ds.border }]}>
              <View style={styles.alarmHeader}>
                <View style={styles.alarmLeft}>
                  <View style={[styles.typeIcon, { backgroundColor: ds.accent + '14', width: 40, height: 40 }]}>
                    <Ionicons name="notifications" size={20} color={ds.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.alarmTitle, { color: ds.text }]}>Hedef Fiyat Alarmı</Text>
                    <Text style={[styles.alarmSubtitle, { color: ds.textSecondary }]}>
                      Fiyat hedefe ulaşınca bildirim al
                    </Text>
                  </View>
                </View>
                <Switch
                  value={targetEnabled}
                  onValueChange={(v) => {
                    Haptics.selectionAsync();
                    setTargetEnabled(v);
                  }}
                  trackColor={{ false: ds.border, true: ds.accent + '66' }}
                  thumbColor={targetEnabled ? ds.accent : ds.textTertiary}
                />
              </View>

              {targetEnabled && (
                <View style={styles.alarmBody}>
                  <View style={styles.targetTypeRow}>
                    <TouchableOpacity
                      style={[
                        styles.targetTypeButton,
                        { borderColor: ds.border },
                        targetType === 'above' && { backgroundColor: ds.profitBg, borderColor: ds.profit },
                      ]}
                      onPress={() => setTargetType('above')}
                    >
                      <Ionicons name="trending-up" size={16} color={targetType === 'above' ? ds.profit : ds.textSecondary} />
                      <Text style={[styles.targetTypeText, { color: targetType === 'above' ? ds.profit : ds.textSecondary }]}>
                        Üstüne Çıkarsa
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.targetTypeButton,
                        { borderColor: ds.border },
                        targetType === 'below' && { backgroundColor: ds.lossBg, borderColor: ds.loss },
                      ]}
                      onPress={() => setTargetType('below')}
                    >
                      <Ionicons name="trending-down" size={16} color={targetType === 'below' ? ds.loss : ds.textSecondary} />
                      <Text style={[styles.targetTypeText, { color: targetType === 'below' ? ds.loss : ds.textSecondary }]}>
                        Altına Düşerse
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={inputStyle('targetPrice')}
                    placeholder="Hedef fiyat girin"
                    placeholderTextColor={ds.textTertiary}
                    value={targetPrice}
                    onChangeText={(text) => setTargetPrice(sanitizeDecimal(text))}
                    onBlur={() => touch('targetPrice')}
                    keyboardType="decimal-pad"
                  />
                  <FieldError field="targetPrice" />
                  {editMode && existingHolding?.currentPrice && (
                    <Text style={[styles.hint, { color: ds.textTertiary, textAlign: 'center' }]}>
                      Güncel fiyat: ₺{parseFloat(existingHolding.currentPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Bilgi */}
            <View style={[styles.infoCard, { backgroundColor: ds.accent + '0D', borderColor: ds.accent + '2E' }]}>
              <Ionicons name="information-circle" size={18} color={ds.accent} />
              <Text style={[styles.infoText, { color: ds.textSecondary }]}>{infoText}</Text>
            </View>

            {/* Kaydet */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: ds.accent },
                !canSave && { opacity: 0.45 },
              ]}
              onPress={handleSave}
              disabled={!canSave}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={22} color={ds.onAccent} />
              <Text style={[styles.saveText, { color: ds.onAccent }]}>
                {editMode ? 'Değişiklikleri Kaydet' : 'Varlığı Kaydet'}
              </Text>
            </TouchableOpacity>
            {!canSave && (
              <Text style={[styles.saveReason, { color: ds.textTertiary }]}>
                Kaydetmek için: {validation.reason.toLocaleLowerCase('tr')}
              </Text>
            )}
          </>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

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

  sectionTitle: { ...Typography.h3, marginBottom: Spacing.sm },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  typeCard: {
    width: '31%',
    aspectRatio: 0.95,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeName: { ...Typography.caption, fontWeight: '600', textAlign: 'center' },

  field: { marginBottom: Spacing.md },
  label: { ...Typography.caption, fontWeight: '600', marginBottom: Spacing.xs },
  labelRow: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' },
  labelHint: { ...Typography.caption, fontWeight: '600', marginBottom: Spacing.xs },
  input: {
    minHeight: 52,
    borderRadius: Radius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
  },
  inputDisabled: { opacity: 0.55 },
  fieldError: { ...Typography.caption, marginTop: Spacing.xs },
  hint: { ...Typography.caption, marginTop: Spacing.xs, lineHeight: 16 },
  fundName: { ...Typography.caption, marginTop: Spacing.xs },

  suggestList: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    marginTop: Spacing.xs,
    overflow: 'hidden',
  },
  suggestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
    minHeight: A11y.minTouchTarget,
  },
  suggestCode: { ...Typography.body, fontWeight: '700', width: 52 },
  suggestName: { ...Typography.bodySmall, flex: 1 },

  alarmCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.xs,
  },
  alarmHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  alarmLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  alarmTitle: { ...Typography.body, fontWeight: '600' },
  alarmSubtitle: { ...Typography.caption, marginTop: 1 },
  alarmBody: { marginTop: Spacing.md, gap: Spacing.sm },
  targetTypeRow: { flexDirection: 'row', gap: Spacing.sm },
  targetTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: A11y.minTouchTarget,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  targetTypeText: { ...Typography.caption, fontWeight: '600' },

  infoCard: {
    flexDirection: 'row',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginTop: Spacing.md,
    alignItems: 'flex-start',
  },
  infoText: { ...Typography.caption, flex: 1, lineHeight: 16 },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: 52,
    borderRadius: Radius.md,
    marginTop: Spacing.lg,
  },
  saveText: { ...Typography.body, fontWeight: '700' },
  saveReason: { ...Typography.caption, textAlign: 'center', marginTop: Spacing.xs },
});

export default AddHoldingScreen;
