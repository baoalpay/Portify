// Açılış perdesi — YER TUTUCU sürüm.
//
// Logo henüz hazır değil; tasarım sistemi gradyanı üzerinde "Portify"
// yazısı gösterilir. Logo geldiğinde YALNIZCA aşağıdaki içerik bloğu
// (yazı yerine <Image>) değişecek — bkz. docs/MIMARI.md "Logo Değişimi".
//
// Davranış (asıl önemli kısım): süre SABİT DEĞİL, KONTROLLÜDÜR.
// - Perde, parent `visible` true tuttuğu sürece ekranı tamamen kaplar.
// - Parent, arkadaki uygulama ağacı ÇİZİLDİKTEN sonra `visible=false`
//   yapar; perde yumuşak bir fade ile kalkar ve `onHidden` çağrılır.
// - Böylece perde kalktığında arkada asla boş/yarı yüklü ekran görünmez.
// - Renkler temadan gelir (heroGradient); açık/koyu temada beyaz
//   parlama olmaz.

import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { Palette } from '../constants/designSystem';

const FADE_OUT_MS = 350;

const SplashScreen = ({ visible, onHidden }) => {
  const { isDark } = useTheme();
  const ds = isDark ? Palette.dark : Palette.light;

  const opacity = useRef(new Animated.Value(1)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const nameScale = useRef(new Animated.Value(0.94)).current;

  // Giriş: yazı yumuşakça belirir
  useEffect(() => {
    Animated.parallel([
      Animated.timing(nameOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(nameScale, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  // Çıkış: parent hazır deyince fade-out, bitince haber ver
  useEffect(() => {
    if (!visible) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_OUT_MS,
        useNativeDriver: true,
      }).start(() => onHidden && onHidden());
    }
  }, [visible]);

  return (
    <Animated.View
      style={[styles.container, { opacity }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <LinearGradient
        colors={ds.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* ---- LOGO YER TUTUCUSU: logo gelince bu blok <Image> olacak ---- */}
      <Animated.Text
        style={[
          styles.name,
          { color: ds.onAccent, opacity: nameOpacity, transform: [{ scale: nameScale }] },
        ]}
      >
        Portify
      </Animated.Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 44,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});

export default SplashScreen;
