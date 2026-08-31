import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Spacing, BorderRadius, Typography, Shadows } from '../constants/theme';
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

const AddHoldingScreen = ({ navigation, route }) => {
  const { colors, isDark, primary } = useTheme();
  const addHolding = usePortfolioStore((state) => state.addHolding);
  const updateHolding = usePortfolioStore((state) => state.updateHolding);
  
  const editMode = route.params?.holding ? true : false;
  const existingHolding = route.params?.holding;
  
  const [selectedType, setSelectedType] = useState(editMode ? existingHolding.type : null);
  const [formData, setFormData] = useState({
    symbol: editMode ? existingHolding.symbol : '',
    quantity: editMode ? existingHolding.quantity.toString() : '',
    avgCost: editMode ? existingHolding.avgCost.toString() : '',
    currentPrice: editMode && existingHolding.currentPrice ? existingHolding.currentPrice.toString() : '',
  });
  
  const [currencySearch, setCurrencySearch] = useState(editMode && existingHolding.type === 'currency' ?
    CURRENCY_LIST.find(c => c.code === existingHolding.symbol)?.name || '' : '');
  const [showCurrencyList, setShowCurrencyList] = useState(false);

  // Fon arama (liste TEFAS'tan bir kez çekilip önbelleklenir; liste yoksa
  // düz kod girişi çalışmaya devam eder — manuel yol birinci sınıftır)
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

  // Hedef fiyat state'leri
  const [targetEnabled, setTargetEnabled] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [targetType, setTargetType] = useState('above'); // 'above' veya 'below'

  // Edit modda mevcut alarmı yükle
  useEffect(() => {
    if (editMode && existingHolding) {
      loadExistingAlert();
    }
  }, [editMode, existingHolding]);

  const loadExistingAlert = async () => {
    const alert = await getAlert(existingHolding.id);
    if (alert) {
      setTargetEnabled(true);
      setTargetPrice(alert.targetPrice.toString());
      setTargetType(alert.targetType || 'above');
    }
  };

  const assetTypes = [
    { id: 'stock', name: 'Hisse Senedi', icon: 'trending-up', color: '#6366F1' },
    { id: 'fund', name: 'Fon/ETF', icon: 'pie-chart', color: '#8B5CF6' },
    { id: 'crypto', name: 'Kripto', icon: 'logo-bitcoin', color: '#EC4899' },
    { id: 'currency', name: 'Döviz', icon: 'cash', color: '#22C55E' },
    { id: 'gold', name: 'Altın', icon: 'medal', color: '#F59E0B' },
    { id: 'silver', name: 'Gümüş', icon: 'medal-outline', color: '#94A3B8' },
  ];

  const needsManualPrice = selectedType === 'fund';
  const noSymbolRequired = selectedType === 'gold' || selectedType === 'silver';

  const filteredCurrencies = CURRENCY_LIST.filter(c =>
    c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
    c.name.toLowerCase().includes(currencySearch.toLowerCase())
  );

  const handleSave = async () => {
    let holdingId = existingHolding?.id;

    const resolvedFullName = selectedType === 'fund' && fundFullName
      ? fundFullName
      : formData.symbol || (selectedType === 'gold' ? 'Altın' : selectedType === 'silver' ? 'Gümüş' : formData.symbol);

    if (editMode) {
      const updates = {
        symbol: noSymbolRequired
          ? (selectedType === 'gold' ? 'GOLD' : 'SILVER')
          : formData.symbol,
        fullName: resolvedFullName,
        quantity: formData.quantity,
        avgCost: formData.avgCost,
      };
      
      if (formData.currentPrice) {
        updates.currentPrice = formData.currentPrice;
        updates.priceUpdatedAt = new Date().toISOString();
      }
      
      await updateHolding(existingHolding.id, updates);
    } else {
      const holding = {
        type: selectedType,
        symbol: noSymbolRequired
          ? (selectedType === 'gold' ? 'GOLD' : 'SILVER')
          : formData.symbol,
        fullName: resolvedFullName,
        quantity: formData.quantity,
        avgCost: formData.avgCost,
      };

      if (needsManualPrice && formData.currentPrice) {
        holding.currentPrice = formData.currentPrice;
        holding.priceUpdatedAt = new Date().toISOString();
      }

      const newHolding = await addHolding(holding);
      holdingId = newHolding?.id;
    }

    // Hedef fiyat alarmını kaydet
    if (holdingId) {
      if (targetEnabled && targetPrice) {
        await requestNotificationPermissions();
        await setAlert(holdingId, parseFloat(targetPrice), targetType);
      } else {
        await setAlert(holdingId, null); // Alarmı kaldır
      }
    }
    
    navigation.goBack();
  };

  const getInputLabel = () => {
    switch (selectedType) {
      case 'stock': 
        return { symbol: 'Hisse Kodu', quantity: 'Lot Sayısı', cost: 'Ort. Maliyet (₺)', price: 'Güncel Fiyat (₺)', placeholder: 'Örn: THYAO' };
      case 'fund': 
        return { symbol: 'Fon Kodu', quantity: 'Adet', cost: 'Ort. Maliyet (₺)', price: 'Güncel Fiyat (₺)', placeholder: 'Örn: TI2' };
      case 'crypto': 
        return { symbol: 'Kripto Kodu', quantity: 'Adet', cost: 'Ort. Maliyet (₺)', price: 'Güncel Fiyat (₺)', placeholder: 'Örn: BTC' };
      case 'currency': 
        return { symbol: 'Döviz', quantity: 'Miktar', cost: 'Ort. Kur (₺)', price: 'Güncel Kur (₺)', placeholder: 'Ara... (USD, Euro, İsviçre...)' };
      case 'gold': 
        return { symbol: 'Altın', quantity: 'Gram', cost: 'Ort. Fiyat (₺/gr)', price: 'Güncel Fiyat (₺/gr)', placeholder: '' };
      case 'silver': 
        return { symbol: 'Gümüş', quantity: 'Gram', cost: 'Ort. Fiyat (₺/gr)', price: 'Güncel Fiyat (₺/gr)', placeholder: '' };
      default: 
        return { symbol: 'Sembol', quantity: 'Miktar', cost: 'Maliyet', price: 'Güncel Fiyat', placeholder: '' };
    }
  };

  const getPriceHint = () => {
    if (selectedType === 'fund') {
      return 'Fiyat, TEFAS\'tan günde bir kez otomatik güncellenir. Girdiğiniz fiyat, TEFAS\'a ulaşılamadığında kullanılır.';
    }
    return '';
  };

  const getInfoText = () => {
    if (editMode) {
      if (needsManualPrice) {
        return 'Fon fiyatı TEFAS\'tan günlük çekilir; dilerseniz güncel fiyatı elle de girebilirsiniz.';
      }
      return 'Varlık bilgilerinizi güncelleyin. Sembol değiştirilemez.';
    } else {
      if (needsManualPrice) {
        return 'Fon adı veya koduyla arama yapabilirsiniz. Fiyat TEFAS\'tan günlük güncellenir; girdiğiniz fiyat yedek olarak kullanılır.';
      }
      return 'Güncel fiyatlar otomatik olarak güncellenecektir. Sadece maliyet bilgilerinizi girin.';
    }
  };

  const labels = getInputLabel();

  const isFormValid = () => {
    if (!selectedType) return false;
    if (!formData.quantity || !formData.avgCost) return false;
    if (!noSymbolRequired && !formData.symbol) return false;
    if (!editMode && needsManualPrice && !formData.currentPrice) return false;
    return true;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {editMode ? 'Varlık Düzenle' : 'Varlık Ekle'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Varlık Türü Seçin</Text>
        
        <View style={styles.typeGrid}>
          {assetTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeCard,
                { backgroundColor: colors.surface },
                selectedType === type.id && { borderColor: type.color, borderWidth: 2 },
                editMode && styles.typeCardDisabled,
                Shadows.small,
              ]}
              onPress={() => !editMode && setSelectedType(type.id)}
              activeOpacity={editMode ? 1 : 0.7}
              disabled={editMode}
            >
              <View style={[styles.typeIcon, { backgroundColor: type.color + '15' }]}>
                <Ionicons name={type.icon} size={28} color={type.color} />
              </View>
              <Text style={[styles.typeName, { color: colors.text }]}>{type.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedType && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing.xl }]}>
              Bilgileri Girin
            </Text>

            {/* Döviz için arama listeli input */}
            {selectedType === 'currency' && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  {labels.symbol}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                    editMode && styles.inputDisabled
                  ]}
                  placeholder={labels.placeholder}
                  placeholderTextColor={colors.textSecondary}
                  value={formData.symbol ? `${formData.symbol} - ${currencySearch}` : currencySearch}
                  onChangeText={(text) => {
                    if (!editMode) {
                      setCurrencySearch(text);
                      setShowCurrencyList(true);
                      setFormData({ ...formData, symbol: '' });
                    }
                  }}
                  onFocus={() => !editMode && setShowCurrencyList(true)}
                  editable={!editMode}
                />
                {showCurrencyList && !editMode && filteredCurrencies.length > 0 && !formData.symbol && (
                  <View style={[styles.currencyList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {filteredCurrencies.slice(0, 5).map((currency) => (
                      <TouchableOpacity
                        key={currency.code}
                        style={[styles.currencyItem, { borderBottomColor: colors.border }]}
                        onPress={() => {
                          setFormData({ ...formData, symbol: currency.code });
                          setCurrencySearch(currency.name);
                          setShowCurrencyList(false);
                        }}
                      >
                        <Text style={[styles.currencyCode, { color: colors.text }]}>{currency.code}</Text>
                        <Text style={[styles.currencyName, { color: colors.textSecondary }]}>{currency.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Diğer türler için normal input */}
            {!noSymbolRequired && selectedType !== 'currency' && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  {labels.symbol}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                    editMode && styles.inputDisabled
                  ]}
                  placeholder={labels.placeholder}
                  placeholderTextColor={colors.textSecondary}
                  value={formData.symbol}
                  onChangeText={(text) => {
                    setFormData({ ...formData, symbol: text.toUpperCase() });
                    if (selectedType === 'fund') {
                      setShowFundList(true);
                      setFundFullName('');
                    }
                  }}
                  onFocus={() => selectedType === 'fund' && !editMode && setShowFundList(true)}
                  autoCapitalize="characters"
                  editable={!editMode}
                />
                {selectedType === 'fund' && fundFullName !== '' && (
                  <Text style={[styles.fundNameHint, { color: colors.textSecondary }]} numberOfLines={1}>
                    {fundFullName}
                  </Text>
                )}
                {selectedType === 'fund' && showFundList && !editMode && fundList &&
                  formData.symbol.length > 0 && fundFullName === '' && (
                  <View style={[styles.currencyList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {tefasRepository.searchFunds(formData.symbol, fundList).map((fund) => (
                      <TouchableOpacity
                        key={fund.code}
                        style={[styles.currencyItem, { borderBottomColor: colors.border }]}
                        onPress={() => {
                          setFormData({ ...formData, symbol: fund.code });
                          setFundFullName(fund.name);
                          setShowFundList(false);
                        }}
                      >
                        <Text style={[styles.currencyCode, { color: colors.text }]}>{fund.code}</Text>
                        <Text style={[styles.currencyName, { color: colors.textSecondary }]} numberOfLines={1}>{fund.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {labels.quantity}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                value={formData.quantity}
                onChangeText={(text) => setFormData({ ...formData, quantity: text })}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {labels.cost}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                value={formData.avgCost}
                onChangeText={(text) => setFormData({ ...formData, avgCost: text })}
                keyboardType="decimal-pad"
              />
            </View>

            {needsManualPrice && (
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    {labels.price}
                  </Text>
                  <Text style={[styles.labelHint, { color: primary }]}>
                    (Zorunlu)
                  </Text>
                </View>
                <TextInput
                  style={[
                    styles.input, 
                    { backgroundColor: colors.surface, color: colors.text, borderColor: primary }
                  ]}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.currentPrice}
                  onChangeText={(text) => setFormData({ ...formData, currentPrice: text })}
                  keyboardType="decimal-pad"
                />
                <View style={[styles.priceHint, { backgroundColor: primary + '10' }]}>
                  <Ionicons name="information-circle" size={16} color={primary} />
                  <Text style={[styles.priceHintText, { color: colors.textSecondary }]}>
                    {getPriceHint()}
                  </Text>
                </View>
              </View>
            )}

            {/* Hedef Fiyat Alarmı */}
            <View style={[styles.targetSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.targetHeader}>
                <View style={styles.targetLeft}>
                  <Ionicons name="notifications" size={24} color={primary} />
                  <View>
                    <Text style={[styles.targetTitle, { color: colors.text }]}>Hedef Fiyat Alarmı</Text>
                    <Text style={[styles.targetSubtitle, { color: colors.textSecondary }]}>
                      Fiyat hedefe ulaşınca bildirim al
                    </Text>
                  </View>
                </View>
                <Switch
                  value={targetEnabled}
                  onValueChange={setTargetEnabled}
                  trackColor={{ false: colors.border, true: primary + '60' }}
                  thumbColor={targetEnabled ? primary : colors.textSecondary}
                />
              </View>

              {targetEnabled && (
                <View style={styles.targetContent}>
                  <View style={styles.targetTypeSelector}>
                    <TouchableOpacity
                      style={[
                        styles.targetTypeButton,
                        { borderColor: colors.border },
                        targetType === 'above' && { backgroundColor: colors.success + '15', borderColor: colors.success }
                      ]}
                      onPress={() => setTargetType('above')}
                    >
                      <Ionicons 
                        name="trending-up" 
                        size={18} 
                        color={targetType === 'above' ? colors.success : colors.textSecondary} 
                      />
                      <Text style={[
                        styles.targetTypeText, 
                        { color: targetType === 'above' ? colors.success : colors.textSecondary }
                      ]}>
                        Üstüne Çıkarsa
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.targetTypeButton,
                        { borderColor: colors.border },
                        targetType === 'below' && { backgroundColor: colors.error + '15', borderColor: colors.error }
                      ]}
                      onPress={() => setTargetType('below')}
                    >
                      <Ionicons 
                        name="trending-down" 
                        size={18} 
                        color={targetType === 'below' ? colors.error : colors.textSecondary} 
                      />
                      <Text style={[
                        styles.targetTypeText, 
                        { color: targetType === 'below' ? colors.error : colors.textSecondary }
                      ]}>
                        Altına Düşerse
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.background, 
                      color: colors.text, 
                      borderColor: targetType === 'above' ? colors.success : colors.error 
                    }]}
                    placeholder="Hedef fiyat girin"
                    placeholderTextColor={colors.textSecondary}
                    value={targetPrice}
                    onChangeText={setTargetPrice}
                    keyboardType="decimal-pad"
                  />

                  {editMode && existingHolding?.currentPrice && (
                    <Text style={[styles.currentPriceHint, { color: colors.textSecondary }]}>
                      Güncel fiyat: ₺{parseFloat(existingHolding.currentPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </Text>
                  )}
                </View>
              )}
            </View>

            <View style={[styles.infoCard, { backgroundColor: primary + '10', borderColor: primary + '30' }]}>
              <Ionicons name="information-circle" size={20} color={primary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {getInfoText()}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: primary },
                !isFormValid() && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!isFormValid()}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>
                {editMode ? 'Değişiklikleri Kaydet' : 'Varlığı Kaydet'}
              </Text>
            </TouchableOpacity>
          </>
        )}

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
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.h2,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  typeCard: {
    width: '31%',
    aspectRatio: 0.9,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeCardDisabled: {
    opacity: 0.6,
  },
  typeIcon: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  typeName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  inputLabel: {
    ...Typography.bodySmall,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  labelHint: {
    ...Typography.bodySmall,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  input: {
    height: 56,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    borderWidth: 1,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  fundNameHint: {
    ...Typography.caption,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  currencyList: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
    maxHeight: 200,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '700',
    width: 50,
  },
  currencyName: {
    fontSize: 14,
    flex: 1,
  },
  priceHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  priceHintText: {
    ...Typography.caption,
    flex: 1,
  },
  // Hedef Fiyat Alarmı
  targetSection: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  targetTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  targetSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  targetContent: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  targetTypeSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  targetTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  targetTypeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  currentPriceHint: {
    fontSize: 12,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginTop: Spacing.md,
    borderWidth: 1,
  },
  infoText: {
    ...Typography.bodySmall,
    flex: 1,
    lineHeight: 20,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    ...Typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default AddHoldingScreen;