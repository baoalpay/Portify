import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Spacing, BorderRadius } from '../constants/theme';
import usePortfolioStore from '../store/PortfolioStore';

const PORTFOLIO_ICONS = [
  { name: 'wallet', label: 'Cüzdan' },
  { name: 'briefcase', label: 'Çanta' },
  { name: 'trending-up', label: 'Yatırım' },
  { name: 'diamond', label: 'Değerli' },
  { name: 'home', label: 'Ev' },
  { name: 'car', label: 'Araba' },
  { name: 'school', label: 'Eğitim' },
  { name: 'heart', label: 'Tasarruf' },
];

const PORTFOLIO_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F59E0B', '#22C55E', '#14B8A6', '#3B82F6',
];

const PortfolioSelector = () => {
  const { colors, primary } = useTheme();
  
  const portfolios = usePortfolioStore((state) => state.portfolios);
  const activePortfolioId = usePortfolioStore((state) => state.activePortfolioId);
  const setActivePortfolio = usePortfolioStore((state) => state.setActivePortfolio);
  const addPortfolio = usePortfolioStore((state) => state.addPortfolio);
  const updatePortfolio = usePortfolioStore((state) => state.updatePortfolio);
  const deletePortfolio = usePortfolioStore((state) => state.deletePortfolio);
  const isPremium = usePortfolioStore((state) => state.isPremium);
  const loadPortfolios = usePortfolioStore((state) => state.loadPortfolios);

  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState(null);
  
  const [newName, setNewName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('briefcase');
  const [selectedColor, setSelectedColor] = useState('#8B5CF6');

  // Aktif portföyü bul
  const activePortfolio = portfolios.find(p => p.id === activePortfolioId) || portfolios[0];

  const handleSelectPortfolio = async (portfolioId) => {
    setShowDropdown(false);
    if (portfolioId !== activePortfolioId) {
      await setActivePortfolio(portfolioId);
    }
  };

  const handleAddPortfolio = async () => {
    if (!newName.trim()) {
      Alert.alert('Hata', 'Portföy adı girin');
      return;
    }

    const result = await addPortfolio({
      name: newName.trim(),
      icon: selectedIcon,
      color: selectedColor,
    });

    if (result.success) {
      setShowAddModal(false);
      resetForm();
      // Yeni portföye geç
      await setActivePortfolio(result.portfolio.id);
    } else if (result.error === 'limit') {
      Alert.alert(
        'Premium Gerekli',
        isPremium 
          ? 'Maksimum 5 portföy oluşturabilirsiniz.'
          : 'Birden fazla portföy oluşturmak için Premium\'a geçin.',
        [{ text: 'Tamam' }]
      );
    }
  };

  const handleEditPortfolio = async () => {
    if (!newName.trim() || !editingPortfolio) return;

    await updatePortfolio(editingPortfolio.id, {
      name: newName.trim(),
      icon: selectedIcon,
      color: selectedColor,
    });

    setShowEditModal(false);
    resetForm();
    await loadPortfolios();
  };

  const handleDeletePortfolio = (portfolio) => {
    if (portfolio.id === 'default') {
      Alert.alert('Hata', 'Varsayılan portföy silinemez.');
      return;
    }

    Alert.alert(
      'Portföyü Sil',
      `"${portfolio.name}" portföyünü ve içindeki tüm varlıkları silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            await deletePortfolio(portfolio.id);
            setShowDropdown(false);
          },
        },
      ]
    );
  };

  const openEditModal = (portfolio) => {
    setEditingPortfolio(portfolio);
    setNewName(portfolio.name);
    setSelectedIcon(portfolio.icon);
    setSelectedColor(portfolio.color);
    setShowDropdown(false);
    setShowEditModal(true);
  };

  const openAddModal = () => {
    // Premium kontrolü
    const maxPortfolios = isPremium ? 5 : 1;
    if (portfolios.length >= maxPortfolios) {
      Alert.alert(
        'Premium Gerekli',
        isPremium 
          ? 'Maksimum 5 portföy oluşturabilirsiniz.'
          : 'Birden fazla portföy oluşturmak için Premium\'a geçin.',
        [{ text: 'Tamam' }]
      );
      return;
    }
    
    setShowDropdown(false);
    resetForm();
    setShowAddModal(true);
  };

  const resetForm = () => {
    setNewName('');
    setSelectedIcon('briefcase');
    setSelectedColor('#8B5CF6');
    setEditingPortfolio(null);
  };

  const renderPortfolioForm = (isEdit = false) => (
    <View style={styles.formContainer}>
      {/* Ad */}
      <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Portföy Adı</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
        placeholder="Örn: Emeklilik Fonu"
        placeholderTextColor={colors.textSecondary}
        value={newName}
        onChangeText={setNewName}
        maxLength={20}
      />

      {/* İkon Seçimi */}
      <Text style={[styles.formLabel, { color: colors.textSecondary, marginTop: Spacing.md }]}>İkon</Text>
      <View style={styles.iconGrid}>
        {PORTFOLIO_ICONS.map((icon) => (
          <TouchableOpacity
            key={icon.name}
            style={[
              styles.iconOption,
              { backgroundColor: colors.background, borderColor: colors.border },
              selectedIcon === icon.name && { borderColor: primary, backgroundColor: primary + '15' }
            ]}
            onPress={() => setSelectedIcon(icon.name)}
          >
            <Ionicons 
              name={icon.name} 
              size={24} 
              color={selectedIcon === icon.name ? primary : colors.textSecondary} 
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Renk Seçimi */}
      <Text style={[styles.formLabel, { color: colors.textSecondary, marginTop: Spacing.md }]}>Renk</Text>
      <View style={styles.colorGrid}>
        {PORTFOLIO_COLORS.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorOption,
              { backgroundColor: color },
              selectedColor === color && styles.colorOptionSelected
            ]}
            onPress={() => setSelectedColor(color)}
          >
            {selectedColor === color && (
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <>
      {/* Portföy Seçici Butonu */}
      <TouchableOpacity
        style={[styles.selectorButton, { backgroundColor: colors.surface }]}
        onPress={() => setShowDropdown(true)}
        activeOpacity={0.7}
      >
        <View style={[styles.portfolioIcon, { backgroundColor: activePortfolio?.color + '20' }]}>
          <Ionicons name={activePortfolio?.icon || 'wallet'} size={18} color={activePortfolio?.color || primary} />
        </View>
        <Text style={[styles.portfolioName, { color: colors.text }]} numberOfLines={1}>
          {activePortfolio?.name || 'Portföy'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Dropdown Modal */}
      <Modal
        visible={showDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
          <View style={[styles.dropdownContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.dropdownTitle, { color: colors.text }]}>Portföyler</Text>
            
            <ScrollView style={styles.portfolioList} showsVerticalScrollIndicator={false}>
              {portfolios.map((portfolio) => (
                <View key={portfolio.id} style={styles.portfolioRow}>
                  <TouchableOpacity
                    style={[
                      styles.portfolioItem,
                      activePortfolioId === portfolio.id && { backgroundColor: primary + '15' }
                    ]}
                    onPress={() => handleSelectPortfolio(portfolio.id)}
                  >
                    <View style={[styles.portfolioItemIcon, { backgroundColor: portfolio.color + '20' }]}>
                      <Ionicons name={portfolio.icon} size={20} color={portfolio.color} />
                    </View>
                    <Text style={[styles.portfolioItemName, { color: colors.text }]}>
                      {portfolio.name}
                    </Text>
                    {activePortfolioId === portfolio.id && (
                      <Ionicons name="checkmark-circle" size={20} color={primary} />
                    )}
                  </TouchableOpacity>
                  
                  {/* Düzenle/Sil butonları */}
                  <View style={styles.portfolioActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => openEditModal(portfolio)}
                    >
                      <Ionicons name="pencil" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                    {portfolio.id !== 'default' && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeletePortfolio(portfolio)}
                      >
                        <Ionicons name="trash" size={16} color={colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Yeni Portföy Ekle */}
            <TouchableOpacity
              style={[styles.addPortfolioButton, { borderColor: primary }]}
              onPress={openAddModal}
            >
              <Ionicons name="add-circle" size={20} color={primary} />
              <Text style={[styles.addPortfolioText, { color: primary }]}>
                Yeni Portföy Ekle
              </Text>
              {!isPremium && portfolios.length >= 1 && (
                <View style={[styles.premiumBadge, { backgroundColor: '#F59E0B' }]}>
                  <Text style={styles.premiumBadgeText}>PRO</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Yeni Portföy Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.formModal, { backgroundColor: colors.surface }]}>
            <View style={styles.formHeader}>
              <Text style={[styles.formTitle, { color: colors.text }]}>Yeni Portföy</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {renderPortfolioForm()}

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: primary }]}
              onPress={handleAddPortfolio}
            >
              <Text style={styles.saveButtonText}>Oluştur</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Düzenle Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.formModal, { backgroundColor: colors.surface }]}>
            <View style={styles.formHeader}>
              <Text style={[styles.formTitle, { color: colors.text }]}>Portföyü Düzenle</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {renderPortfolioForm(true)}

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: primary }]}
              onPress={handleEditPortfolio}
            >
              <Text style={styles.saveButtonText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    maxWidth: 160,
  },
  portfolioIcon: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  portfolioName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  // Dropdown
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContent: {
    width: '85%',
    maxHeight: '70%',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  portfolioList: {
    maxHeight: 300,
  },
  portfolioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  portfolioItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  portfolioItemIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  portfolioItemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  portfolioActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionButton: {
    padding: Spacing.sm,
  },
  addPortfolioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  addPortfolioText: {
    fontSize: 14,
    fontWeight: '600',
  },
  premiumBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  premiumBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  // Form Modal
  formModal: {
    width: '90%',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  formContainer: {},
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  input: {
    height: 50,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    borderWidth: 1,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  saveButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PortfolioSelector;