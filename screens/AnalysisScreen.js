// Analiz sekmesi — şimdilik iskelet; içerik sonraki aşamada dolacak.

import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Palette, Spacing, Radius, Typography } from '../constants/designSystem';

const AnalysisScreen = () => {
  const { isDark } = useTheme();
  const ds = isDark ? Palette.dark : Palette.light;

  return (
    <View style={[styles.container, { backgroundColor: ds.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={ds.background} />
      <Text style={[styles.title, { color: ds.text }]}>Analiz</Text>

      <View style={[styles.card, { backgroundColor: ds.surface, borderColor: ds.border }]}>
        <View style={[styles.iconWrap, { backgroundColor: ds.accent + '14' }]}>
          <Ionicons name="analytics-outline" size={28} color={ds.accent} />
        </View>
        <Text style={[styles.cardTitle, { color: ds.text }]}>Yakında</Text>
        <Text style={[styles.cardText, { color: ds.textSecondary }]}>
          Portföyünüzün performans analizi, dönemsel karşılaştırmalar ve
          detaylı grafikler bu sekmede yer alacak.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.md },
  title: { ...Typography.h1, marginTop: Spacing.xl, marginBottom: Spacing.lg },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  cardTitle: { ...Typography.h3, marginBottom: Spacing.xs },
  cardText: { ...Typography.bodySmall, textAlign: 'center' },
});

export default AnalysisScreen;
