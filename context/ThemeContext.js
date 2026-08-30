import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/theme';
import { preferencesRepository } from '../repositories/preferencesRepository';

const ThemeContext = createContext();

// Kullanılabilir tema renkleri
export const THEME_COLORS = [
  { id: 'purple', name: 'Mor', color: '#6366F1', isPremium: false },
  { id: 'blue', name: 'Mavi', color: '#3B82F6', isPremium: true },
  { id: 'cyan', name: 'Turkuaz', color: '#06B6D4', isPremium: true },
  { id: 'green', name: 'Yeşil', color: '#22C55E', isPremium: true },
  { id: 'orange', name: 'Turuncu', color: '#F97316', isPremium: true },
  { id: 'red', name: 'Kırmızı', color: '#EF4444', isPremium: true },
  { id: 'pink', name: 'Pembe', color: '#EC4899', isPremium: true },
  { id: 'gold', name: 'Altın', color: '#F59E0B', isPremium: true },
];

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');
  const [primaryColor, setPrimaryColor] = useState(Colors.primary);
  const [selectedColorId, setSelectedColorId] = useState('purple');

  // Load theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    const savedTheme = await preferencesRepository.loadTheme();
    if (savedTheme !== null) {
      setIsDark(savedTheme === 'dark');
    }

    // Renk tercihini yükle
    const savedColor = await preferencesRepository.loadThemeColor();
    if (savedColor) {
      const colorObj = THEME_COLORS.find(c => c.id === savedColor);
      if (colorObj) {
        setPrimaryColor(colorObj.color);
        setSelectedColorId(savedColor);
      }
    }
  };

  const toggleTheme = async () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    await preferencesRepository.saveTheme(newTheme ? 'dark' : 'light');
  };

  const setThemeColor = async (colorId) => {
    const colorObj = THEME_COLORS.find(c => c.id === colorId);
    if (colorObj) {
      setPrimaryColor(colorObj.color);
      setSelectedColorId(colorId);
      await preferencesRepository.saveThemeColor(colorId);
    }
  };

  const theme = {
    isDark,
    colors: isDark ? Colors.dark : Colors.light,
    primary: primaryColor,
    selectedColorId,
    toggleTheme,
    setThemeColor,
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};