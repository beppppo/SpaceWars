import React, { useState, useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SplashScreen from './src/screens/SplashScreen';
import AuthScreen from './src/screens/AuthScreen';
import MainMenuScreen from './src/screens/MainMenuScreen';
import GameScreen from './src/screens/GameScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { auth } from './FirebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const Stack = createNativeStackNavigator();
const APP_BACKGROUND_COLOR = '#050611';
const SETTINGS_VIBRATION_KEY = 'SETTINGS_VIBRATION_ENABLED';
const SETTINGS_SHOW_FPS_KEY = 'SETTINGS_SHOW_FPS';
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: APP_BACKGROUND_COLOR,
    card: APP_BACKGROUND_COLOR,
    border: APP_BACKGROUND_COLOR,
  },
};

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [showFpsEnabled, setShowFpsEnabled] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [storedVibrationEnabled, storedShowFpsEnabled] = await Promise.all([
          AsyncStorage.getItem(SETTINGS_VIBRATION_KEY),
          AsyncStorage.getItem(SETTINGS_SHOW_FPS_KEY),
        ]);

        if (storedVibrationEnabled !== null) {
          setVibrationEnabled(storedVibrationEnabled === 'true');
        }

        if (storedShowFpsEnabled !== null) {
          setShowFpsEnabled(storedShowFpsEnabled === 'true');
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();
  }, []);

  const handleToggleVibration = async (value) => {
    setVibrationEnabled(value);

    try {
      await AsyncStorage.setItem(SETTINGS_VIBRATION_KEY, String(value));
    } catch (error) {
      console.error('Failed to save vibration setting:', error);
    }
  };

  const handleToggleShowFps = async (value) => {
    setShowFpsEnabled(value);

    try {
      await AsyncStorage.setItem(SETTINGS_SHOW_FPS_KEY, String(value));
    } catch (error) {
      console.error('Failed to save Show FPS setting:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (initializing) {
        setInitializing(false);
      }
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowSplash(true);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (initializing) {
    return <View style={{ flex: 1, backgroundColor: APP_BACKGROUND_COLOR }} />;
  }
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: APP_BACKGROUND_COLOR }}>
        <StatusBar style="light" translucent backgroundColor={APP_BACKGROUND_COLOR} />
        <NavigationContainer theme={navigationTheme}>
          <Stack.Navigator
            initialRouteName={showSplash && !user ? "Splash" : (user ? "MainMenu" : "Auth")}
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              presentation: 'card',
              contentStyle: { backgroundColor: APP_BACKGROUND_COLOR },
            }}
          >
            {!user && showSplash && (
              <Stack.Screen name="Splash">
                {(props) => (
                  <SplashScreen
                    onStart={() => {
                      setShowSplash(false);
                      props.navigation.navigate('Auth');
                    }}
                  />
                )}
              </Stack.Screen>
            )}
            
            {!user && (
              <Stack.Screen name="Auth">
                {(props) => (
                  <AuthScreen
                    onAuthSuccess={(user) => {
                      console.log('Authentication successful:', user.email);
                      // Don't navigate here - let onAuthStateChanged handle it
                    }}
                  />
                )}
              </Stack.Screen>
            )}
            
            {user && (
              <>
                <Stack.Screen name="MainMenu">
                  {(props) => (
                    <MainMenuScreen
                      navigation={props.navigation}
                      onLogout={async () => {
                        await handleLogout();
                        // Don't navigate here - let onAuthStateChanged handle it
                      }}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen name="Settings">
                  {(props) => (
                    <SettingsScreen
                      navigation={props.navigation}
                      vibrationEnabled={vibrationEnabled}
                      onToggleVibration={handleToggleVibration}
                      showFpsEnabled={showFpsEnabled}
                      onToggleShowFps={handleToggleShowFps}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen name="Game">
                  {(props) => (
                    <GameScreen
                      navigation={props.navigation}
                      vibrationEnabled={vibrationEnabled}
                      showFpsEnabled={showFpsEnabled}
                    />
                  )}
                </Stack.Screen>
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </SafeAreaProvider>
  );
}
