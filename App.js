import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform, AppState } from 'react-native';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import PortfolioScreen from './screens/PortfolioScreen';
import HoldingsScreen from './screens/HoldingsScreen';
import SettingsScreen from './screens/SettingsScreen';
import AddHoldingScreen from './screens/AddHoldingScreen';
import HoldingDetailScreen from './screens/HoldingDetailScreen';
import SplashScreen from './components/SplashScreen';
import OnboardingScreen, { checkOnboardingCompleted } from './components/OnboardingScreen';
import usePortfolioStore from './store/PortfolioStore';

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
  const { colors, primary, isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Portfolio') {
            iconName = focused ? 'pie-chart' : 'pie-chart-outline';
          } else if (route.name === 'Holdings') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={26} color={color} />;
        },
        tabBarLabelStyle: {
          fontSize: 12,
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

  // İlk yükleme
  useEffect(() => {
    const init = async () => {
      await loadSettings();
      await loadHoldings();
      await updatePrices();
    };
    init();
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

// Ana uygulama wrapper'ı - Splash Screen ve Onboarding ile
function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    const completed = await checkOnboardingCompleted();
    setShowOnboarding(!completed);
    setIsReady(true);
  };

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  if (!isReady) {
    return null;
  }

  // Onboarding gösterilecekse
  if (showOnboarding && !showSplash) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return (
    <>
      <PriceUpdateManager>
        <NavigationContainer>
          <MainTabs />
        </NavigationContainer>
      </PriceUpdateManager>
      
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}