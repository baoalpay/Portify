import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform, AppState, View } from 'react-native';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import PortfolioScreen from './screens/PortfolioScreen';
import HoldingsScreen from './screens/HoldingsScreen';
import SettingsScreen from './screens/SettingsScreen';
import AnalysisScreen from './screens/AnalysisScreen';
import { Palette } from './constants/designSystem';
import AddHoldingScreen from './screens/AddHoldingScreen';
import HoldingDetailScreen from './screens/HoldingDetailScreen';
import SplashScreen from './components/SplashScreen';
import ErrorBoundary from './components/ErrorBoundary';
import OnboardingScreen, { checkOnboardingCompleted } from './components/OnboardingScreen';
import usePortfolioStore from './store/PortfolioStore';
import { migrationRepository } from './repositories/migrationRepository';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Holdings Stack (Varlıklarım + Ekleme + Detay ekranı)
function HoldingsStack() {
  const { colors } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="HoldingsList" component={HoldingsScreen} />
      <Stack.Screen 
        name="AddHolding" 
        component={AddHoldingScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="HoldingDetail" 
        component={HoldingDetailScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { isDark } = useTheme();
  const ds = isDark ? Palette.dark : Palette.light;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: ds.surface,
          borderTopColor: ds.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 85 : 64,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: ds.accent,
        tabBarInactiveTintColor: ds.textSecondary,
        tabBarIcon: ({ focused, color }) => {
          let iconName;

          if (route.name === 'Portfolio') {
            iconName = focused ? 'pie-chart' : 'pie-chart-outline';
          } else if (route.name === 'Holdings') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Analysis') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -2,
        },
      })}
    >
      <Tab.Screen
        name="Portfolio"
        component={PortfolioScreen}
        options={{ tabBarLabel: 'Portföy' }}
      />
      <Tab.Screen
        name="Holdings"
        component={HoldingsStack}
        options={{ tabBarLabel: 'Varlıklarım' }}
      />
      <Tab.Screen
        name="Analysis"
        component={AnalysisScreen}
        options={{ tabBarLabel: 'Analiz' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Ayarlar' }}
      />
    </Tab.Navigator>
  );
}

// Otomatik fiyat güncelleme yöneticisi
function PriceUpdateManager({ children }) {
  const settings = usePortfolioStore((state) => state.settings);
  const loadSettings = usePortfolioStore((state) => state.loadSettings);
  const loadHoldings = usePortfolioStore((state) => state.loadHoldings);
  const updatePrices = usePortfolioStore((state) => state.updatePrices);
  
  const intervalRef = useRef(null);
  const appState = useRef(AppState.currentState);

  // Fiyat güncelleme AÇILIŞI BEKLETMEZ: ayarlar ve varlıklar splash
  // sırasında AppContent.initApp'te yüklendi; ağ isteği arkada çalışır,
  // fiyatlar gelince ekranlar store üzerinden kendiliğinden tazelenir.
  useEffect(() => {
    updatePrices();
  }, []);

  // Zamanlayıcı kurulumu
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!settings.updateInterval || settings.updateInterval === 0) {
      console.log('Otomatik güncelleme kapalı (Manuel mod)');
      return;
    }

    const intervalMs = settings.updateInterval * 60 * 1000;
    console.log(`Otomatik güncelleme aktif: ${settings.updateInterval} dakikada bir`);

    intervalRef.current = setInterval(async () => {
      console.log('Otomatik fiyat güncellemesi çalışıyor...');
      await updatePrices();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [settings.updateInterval]);

  // Uygulama ön plana geldiğinde güncelle
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('Uygulama ön plana geldi, fiyatlar güncelleniyor...');
        
        const lastUpdated = settings.lastUpdated ? new Date(settings.lastUpdated) : null;
        const now = new Date();
        
        if (lastUpdated && settings.updateInterval > 0) {
          const diffMinutes = (now - lastUpdated) / 60000;
          if (diffMinutes >= settings.updateInterval) {
            await updatePrices();
          }
        } else if (!lastUpdated) {
          await updatePrices();
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [settings.lastUpdated, settings.updateInterval]);

  return children;
}

// Ana uygulama wrapper'ı — açılış orkestrasyonu.
//
// Sıra: (1) veri göçleri → (2) ayarlar → (3) portföyler + varlıklar →
// (4) onboarding kontrolü. Bunlar splash SÜRESİNCE biter; splash ancak
// arkadaki ağaç gerçekten çizildikten sonra (iki kare + minimum marka
// süresi) fade ile kalkar — arkada asla boş/yarı yüklü ekran görünmez.
// Fiyat güncelleme bu zincirde YOKTUR: ağ isteği açılışı bekletmesin
// diye PriceUpdateManager arkada başlatır.

// Splash en az bu kadar görünür (anlık yanıp sönme hissi olmasın)
const MIN_SPLASH_MS = 900;

function AppContent() {
  const { isDark, themeLoaded } = useTheme();
  const ds = isDark ? Palette.dark : Palette.light;

  const loadSettings = usePortfolioStore((state) => state.loadSettings);
  const loadPortfolios = usePortfolioStore((state) => state.loadPortfolios);
  const loadHoldings = usePortfolioStore((state) => state.loadHoldings);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isReady, setIsReady] = useState(false); // kritik açılış işleri bitti
  const [splashVisible, setSplashVisible] = useState(true); // fade tetikleyici
  const [splashGone, setSplashGone] = useState(false); // fade bitti, unmount

  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    const t0 = Date.now();
    // 1) Göçler: veri okuyan her şeyden önce
    await migrationRepository.runMigrations();
    const t1 = Date.now();
    // 2-3) İlk çizimin ihtiyacı olan veri: ayarlar (tema/para birimi/
    // gizlilik) + portföyler + aktif portföyün varlıkları
    await loadSettings();
    await loadPortfolios();
    await loadHoldings();
    const t2 = Date.now();
    const completed = await checkOnboardingCompleted();
    setShowOnboarding(!completed);
    setIsReady(true);
    console.log(
      `Açılış kritik yol: göç ${t1 - t0}ms + veri ${t2 - t1}ms = ${Date.now() - t0}ms`
    );
  };

  // Kritik işler VE tema tercihi hazır olunca: minimum süreyi tamamla,
  // arkadaki ağacın ilk karelerinin çizilmesini bekle, sonra fade başlat
  useEffect(() => {
    if (!isReady || !themeLoaded) return;
    const wait = Math.max(0, MIN_SPLASH_MS - (Date.now() - startedAtRef.current));
    const timer = setTimeout(() => {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setSplashVisible(false))
      );
    }, wait);
    return () => clearTimeout(timer);
  }, [isReady, themeLoaded]);

  return (
    <View style={{ flex: 1, backgroundColor: ds.background }}>
      {/* Uygulama ağacı splash'in ALTINDA kurulur; splash hazır ekrana açılır */}
      {isReady &&
        (showOnboarding ? (
          <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
        ) : (
          <PriceUpdateManager>
            <NavigationContainer>
              <MainTabs />
            </NavigationContainer>
          </PriceUpdateManager>
        ))}

      {!splashGone && (
        <SplashScreen
          visible={splashVisible}
          onHidden={() => {
            setSplashGone(true);
            console.log(`Splash kapandı: toplam ${Date.now() - startedAtRef.current}ms`);
          }}
        />
      )}
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}