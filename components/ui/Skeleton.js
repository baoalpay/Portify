// Yükleme iskeleti — sakin bir nabız animasyonuyla solan blok.
// Ağır parlama/shimmer bilinçli olarak yok (tasarım ilkesi: sakin ve net).

import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { Motion } from '../../constants/designSystem';

const Skeleton = ({ width, height, borderRadius = 10, color, style }) => {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: Motion.slow * 2,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: Motion.slow * 2,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: color || 'rgba(127,127,127,0.18)', opacity },
        style,
      ]}
    />
  );
};

export default Skeleton;
