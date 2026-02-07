import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ onFinish }) => {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;
  const backgroundOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animasyon sırası
    Animated.sequence([
      // 1. Logo fade in ve scale
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      
      // 2. App adı fade in
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      
      // 3. Slogan fade in
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      
      // 4. Loader fade in
      Animated.timing(loaderOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      
      // 5. Bekle
      Animated.delay(800),
      
      // 6. Her şey fade out
      Animated.timing(backgroundOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish && onFinish();
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: backgroundOpacity }]}>
      {/* Gradient Background */}
      <View style={styles.gradientBackground}>
        <View style={styles.gradientTop} />
        <View style={styles.gradientBottom} />
      </View>

      {/* Decorative Circles */}
      <View style={[styles.circle, styles.circle1]} />
      <View style={[styles.circle, styles.circle2]} />
      <View style={[styles.circle, styles.circle3]} />

      {/* Content */}
      <View style={styles.content}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <View style={styles.logoInner}>
            <Ionicons name="pie-chart" size={50} color="#FFFFFF" />
          </View>
        </Animated.View>

        {/* App Name */}
        <Animated.Text style={[styles.appName, { opacity: textOpacity }]}>
          Portify
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
          Portföyünü Yönet
        </Animated.Text>

        {/* Loader */}
        <Animated.View style={[styles.loaderContainer, { opacity: loaderOpacity }]}>
          <View style={styles.loader}>
            <Animated.View style={styles.loaderDot} />
            <Animated.View style={[styles.loaderDot, styles.loaderDotMiddle]} />
            <Animated.View style={styles.loaderDot} />
          </View>
        </Animated.View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>v1.0.0</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientTop: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  gradientBottom: {
    flex: 1,
    backgroundColor: '#16213e',
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.1,
  },
  circle1: {
    width: 300,
    height: 300,
    backgroundColor: '#6366F1',
    top: -100,
    right: -100,
  },
  circle2: {
    width: 200,
    height: 200,
    backgroundColor: '#8B5CF6',
    bottom: 100,
    left: -80,
  },
  circle3: {
    width: 150,
    height: 150,
    backgroundColor: '#6366F1',
    bottom: -50,
    right: 50,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoInner: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  appName: {
    fontSize: 42,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 8,
    letterSpacing: 1,
  },
  loaderContainer: {
    marginTop: 50,
  },
  loader: {
    flexDirection: 'row',
    gap: 8,
  },
  loaderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6366F1',
    opacity: 0.5,
  },
  loaderDotMiddle: {
    opacity: 0.8,
    transform: [{ scale: 1.2 }],
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#4B5563',
  },
});

export default SplashScreen;