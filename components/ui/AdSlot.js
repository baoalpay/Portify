// Reklam alanı yer tutucusu.
//
// AdMob EN SON bağlanacak; bu bileşen yalnızca yeri önceden ayırır ki reklam
// geldiğinde sayfa zıplamasın. Kurallar (docs/YENIDEN-TASARIM.md):
// kaydırılan içeriğin EN SONUNDA durur, sabit değildir, etkileşimli öğelerden
// en az 24pt tamponla ayrılır. AdMob entegrasyonunda bu bileşenin içi gerçek
// banner ile değiştirilecek; dış ölçüler aynı kalacak.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Spacing, Radius, Typography, A11y } from '../../constants/designSystem';

// Standart adaptif banner yüksekliğine yakın sabit alan
const AD_HEIGHT = 64;

const AdSlot = ({ borderColor, textColor }) => {
  return (
    <View style={[styles.slot, { borderColor: borderColor || 'rgba(127,127,127,0.25)' }]}>
      <Text style={[styles.label, { color: textColor || 'rgba(127,127,127,0.6)' }]}>
        Reklam alanı
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  slot: {
    height: AD_HEIGHT,
    marginTop: A11y.adBuffer,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...Typography.caption,
  },
});

export default AdSlot;
