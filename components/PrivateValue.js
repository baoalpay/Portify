// Gizlilik modu maskesi — TEK doğru kaynak.
//
// Kişisel parasal değer gösteren her yer bu bileşeni kullanır; gizlilik modu
// açıkken değer "₺•••••" olarak maskelenir ve geçiş kısa bir fade animasyonuyla
// olur. Maskeleme kuralı da animasyon da yalnızca bu dosyada yaşar — ekranlar
// yeniden tasarlanırken bileşen olduğu gibi taşınır, ekranlarda mantık yoktur.
//
// Kullanım:
//   <PrivateValue style={...}>{formatCurrency(tutar)}</PrivateValue>
//   <PrivateValue style={...} mask="•••">{adet}</PrivateValue>   (sembolsüz maske)

import React, { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import usePortfolioStore from '../store/PortfolioStore';

const CURRENCY_SYMBOLS = ['₺', '$', '€'];
const FADE_MS = 120;

// "₺1.234,56" -> "₺•••••" (para sembolü korunur, tutar gizlenir)
export const maskValue = (text) => {
  const str = String(text);
  const symbol = CURRENCY_SYMBOLS.find((s) => str.includes(s));
  return `${symbol || ''}•••••`;
};

const PrivateValue = ({ children, style, mask, numberOfLines }) => {
  const privacyMode = usePortfolioStore((state) => !!state.settings.privacyMode);

  // Ekranda o an gösterilen mod; animasyon bitince gerçek moda eşitlenir
  const [masked, setMasked] = useState(privacyMode);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (privacyMode === masked) return;
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start(() => {
      setMasked(privacyMode);
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start();
    });
  }, [privacyMode, masked, opacity]);

  const text = masked ? (mask || maskValue(children)) : children;

  return (
    <Animated.Text style={[style, { opacity }]} numberOfLines={numberOfLines}>
      {text}
    </Animated.Text>
  );
};

export default PrivateValue;
