// Donut (halka) grafik — react-native-svg ile, ek kütüphane yok.
// segments: [{ value, color }], ortadaki içerik children olarak verilir.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const DonutChart = ({ segments, size = 132, strokeWidth = 18, trackColor, children }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + (s.value > 0 ? s.value : 0), 0);

  // Dilimler arasında küçük nefes payı (derece cinsinden)
  const gap = segments.length > 1 ? circumference * 0.008 : 0;

  let offset = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s, i) => {
      const fraction = total > 0 ? s.value / total : 0;
      const length = Math.max(circumference * fraction - gap, 0);
      const arc = (
        <Circle
          key={i}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={s.color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${length} ${circumference - length}`}
          strokeDashoffset={-offset}
          strokeLinecap="round"
          fill="none"
        />
      );
      offset += circumference * fraction;
      return arc;
    });

  return (
    <View style={{ width: size, height: size }}>
      {/* -90°: ilk dilim saat 12'den başlasın */}
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {trackColor && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
        )}
        {arcs}
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DonutChart;
