// Hata Sınırı (Error Boundary)
//
// Herhangi bir ekranın render'ında beklenmedik bir hata fırlarsa uygulama
// beyaz ekrana düşmez; bu bileşen hatayı yakalar, anlaşılır bir mesaj ve
// "Tekrar Dene" butonu gösterir. Tekrar Dene, sarılan ağacı sıfırdan kurar
// (key değişimiyle remount) — geçici hatalarda kullanıcı veri kaybı olmadan
// devam eder.
//
// Notlar (bilinçli tasarım):
// - Class bileşeni zorunludur: componentDidCatch/getDerivedStateFromError
//   yalnızca class'larda vardır.
// - ThemeProvider'ın da DIŞINDA durur (tema kodundaki hatayı da yakalasın);
//   bu yüzden tema Context'i yerine sistem şeması (Appearance) ile renk seçer.
// - Yalnızca render/yaşam döngüsü hatalarını yakalar; olay işleyicilerindeki
//   ve async koddaki hatalar React tasarımı gereği buraya düşmez (o katmanlar
//   zaten "asla fırlatmaz" kuralıyla yazılıyor — bkz. repositories/).

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Appearance } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Spacing, Radius, Typography, A11y } from '../constants/designSystem';

class ErrorBoundary extends React.Component {
  state = { error: null, resetKey: 0 };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary bir ekran hatası yakaladı:', error, info?.componentStack);
  }

  handleRetry = () => {
    // key değişince children komple yeniden kurulur (remount)
    this.setState((s) => ({ error: null, resetKey: s.resetKey + 1 }));
  };

  render() {
    const { error, resetKey } = this.state;

    if (error) {
      const isDark = Appearance.getColorScheme() === 'dark';
      const ds = isDark ? Palette.dark : Palette.light;

      return (
        <View style={[styles.container, { backgroundColor: ds.background }]}>
          <View style={[styles.iconWrap, { backgroundColor: ds.lossBg }]}>
            <Ionicons name="alert-circle" size={40} color={ds.loss} />
          </View>
          <Text style={[styles.title, { color: ds.text }]}>Bir şeyler ters gitti</Text>
          <Text style={[styles.message, { color: ds.textSecondary }]}>
            Beklenmedik bir hata oluştu. Verileriniz güvende; tekrar denemek
            genellikle sorunu çözer.
          </Text>
          {__DEV__ && (
            <View style={[styles.devBox, { backgroundColor: ds.surface, borderColor: ds.border }]}>
              <Text style={[styles.devText, { color: ds.loss }]} numberOfLines={6}>
                {String(error?.message || error)}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: ds.accent }]}
            onPress={this.handleRetry}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color={ds.onAccent} />
            <Text style={[styles.retryText, { color: ds.onAccent }]}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return <React.Fragment key={resetKey}>{this.props.children}</React.Fragment>;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: { ...Typography.h2, marginBottom: Spacing.xs, textAlign: 'center' },
  message: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    maxWidth: 320,
  },
  devBox: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.lg,
    maxWidth: '100%',
  },
  devText: { ...Typography.caption, fontFamily: 'monospace' },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: A11y.minTouchTarget + 8,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
  },
  retryText: { ...Typography.body, fontWeight: '700' },
});

export default ErrorBoundary;
