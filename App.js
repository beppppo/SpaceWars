import React, { useState, useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Modal, Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SplashScreen from './src/screens/SplashScreen';
import AuthScreen from './src/screens/AuthScreen';
import MainMenuScreen from './src/screens/MainMenuScreen';
import GameScreen from './src/screens/GameScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { auth } from './FirebaseConfig';
import { deleteUser, EmailAuthProvider, onAuthStateChanged, reauthenticateWithCredential, signOut } from 'firebase/auth';
import {
  cleanupAudio,
  initializeAudio,
  setMusicEnabled as applyMusicEnabled,
  setSfxEnabled as applySfxEnabled,
  stopBackgroundMusic,
} from './src/services/audioManager';
import {
  createUserProfileIfNotExists,
  deleteUserData,
  getUserSettings,
  resetUserRunData,
  updateUserSettings,
} from './src/services/userProfileService';

const Stack = createNativeStackNavigator();
const APP_BACKGROUND_COLOR = '#050611';
const SETTINGS_VIBRATION_KEY = 'SETTINGS_VIBRATION_ENABLED';
const SETTINGS_SHOW_FPS_KEY = 'SETTINGS_SHOW_FPS';
const SETTINGS_SOUND_KEY = 'SETTINGS_SOUND_ENABLED';
const SETTINGS_MUSIC_KEY = 'SETTINGS_MUSIC_ENABLED';
const SETTINGS_SFX_KEY = 'SETTINGS_SFX_ENABLED';
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
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [
          storedVibrationEnabled,
          storedShowFpsEnabled,
          storedMusicEnabled,
          storedSfxEnabled,
          legacyStoredSoundEnabled,
        ] = await Promise.all([
          AsyncStorage.getItem(SETTINGS_VIBRATION_KEY),
          AsyncStorage.getItem(SETTINGS_SHOW_FPS_KEY),
          AsyncStorage.getItem(SETTINGS_MUSIC_KEY),
          AsyncStorage.getItem(SETTINGS_SFX_KEY),
          AsyncStorage.getItem(SETTINGS_SOUND_KEY),
        ]);

        if (storedVibrationEnabled !== null) {
          setVibrationEnabled(storedVibrationEnabled === 'true');
        }

        if (storedShowFpsEnabled !== null) {
          setShowFpsEnabled(storedShowFpsEnabled === 'true');
        }

        if (storedMusicEnabled !== null) {
          setMusicEnabled(storedMusicEnabled === 'true');
        } else if (legacyStoredSoundEnabled !== null) {
          setMusicEnabled(legacyStoredSoundEnabled === 'true');
        }

        if (storedSfxEnabled !== null) {
          setSfxEnabled(storedSfxEnabled === 'true');
        } else if (legacyStoredSoundEnabled !== null) {
          setSfxEnabled(legacyStoredSoundEnabled === 'true');
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setSettingsLoaded(true);
      }
    };

    loadSettings();
  }, []);

  useEffect(() => {
    initializeAudio();

    return () => {
      cleanupAudio();
    };
  }, []);

  useEffect(() => {
    applyMusicEnabled(musicEnabled);
    applySfxEnabled(sfxEnabled);

    if (!settingsLoaded) {
      return;
    }

    if (!musicEnabled || !user) {
      console.log('[audio] App stopping background music');
      stopBackgroundMusic();
    }
  }, [musicEnabled, settingsLoaded, sfxEnabled, user]);

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

  const handleToggleMusic = async (value) => {
    setMusicEnabled(value);
    console.log('[settings] setting changed:', { musicEnabled: value });

    try {
      await Promise.all([
        AsyncStorage.setItem(SETTINGS_MUSIC_KEY, String(value)),
        auth.currentUser?.uid ? updateUserSettings(auth.currentUser.uid, { musicEnabled: value }) : Promise.resolve(),
      ]);
      if (auth.currentUser?.uid) {
        console.log('[settings] Firestore updated successfully');
      }
    } catch (error) {
      console.error('Failed to save music setting:', error);
    }
  };

  const handleToggleSfx = async (value) => {
    setSfxEnabled(value);
    console.log('[settings] setting changed:', { sfxEnabled: value });

    try {
      await Promise.all([
        AsyncStorage.setItem(SETTINGS_SFX_KEY, String(value)),
        auth.currentUser?.uid ? updateUserSettings(auth.currentUser.uid, { sfxEnabled: value }) : Promise.resolve(),
      ]);
      if (auth.currentUser?.uid) {
        console.log('[settings] Firestore updated successfully');
      }
    } catch (error) {
      console.error('Failed to save SFX setting:', error);
    }
  };

  const handleResetRunData = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      console.log('[settings] No authenticated user for stats reset');
      return;
    }

    console.log('[settings] Reset Run Data confirmed');
    await resetUserRunData(uid);
    console.log('[settings] Firestore stats reset success');
  };

  const handleDeleteUser = async (password) => {
    const currentUser = auth.currentUser;
    if (!currentUser?.uid) {
      console.log('[settings] No authenticated user for delete');
      return { success: false, errorCode: 'auth/user-not-found' };
    }

    if (!currentUser.email) {
      console.log('[settings] Missing authenticated user email for reauthentication');
      return { success: false, errorCode: 'auth/missing-email' };
    }

    console.log('[settings] Delete User confirmed');

    try {
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);
      console.log('[settings] User reauthenticated');

      await deleteUserData(currentUser.uid);
      console.log('[settings] Firestore documents deleted');

      await deleteUser(currentUser);
      console.log('[settings] Auth user deleted');

      setShowDeleteSuccessModal(true);
      setShowSplash(false);
      console.log('[settings] Success modal triggered');
      return { success: true };
    } catch (error) {
      if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
        console.log('[settings] Delete user failed: wrong password');
        return { success: false, errorCode: 'auth/wrong-password' };
      }

      if (error?.code === 'auth/user-not-found') {
        console.log('[settings] Delete user failed: user not found');
        return { success: false, errorCode: 'auth/user-not-found' };
      }

      console.log('[settings] Delete user failed:', error);
      return { success: false, errorCode: error?.code || 'unknown' };
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      void (async () => {
        if (currentUser) {
          try {
            await createUserProfileIfNotExists(currentUser);
            const remoteSettings = await getUserSettings(currentUser.uid);

            if (remoteSettings) {
              console.log('[settings] settings loaded', remoteSettings);

              if (typeof remoteSettings.musicEnabled === 'boolean') {
                setMusicEnabled(remoteSettings.musicEnabled);
                await AsyncStorage.setItem(SETTINGS_MUSIC_KEY, String(remoteSettings.musicEnabled));
              }

              if (typeof remoteSettings.sfxEnabled === 'boolean') {
                setSfxEnabled(remoteSettings.sfxEnabled);
                await AsyncStorage.setItem(SETTINGS_SFX_KEY, String(remoteSettings.sfxEnabled));
              }
            }
          } catch (error) {
            console.error('Failed to initialize user data:', error);
          }
        }

        if (initializing) {
          setInitializing(false);
        }
      })();
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
        <Modal
          visible={showDeleteSuccessModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowDeleteSuccessModal(false);
            console.log('[settings] Navigation to login triggered');
          }}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(3, 5, 12, 0.72)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
            <View
              style={{
                width: '100%',
                maxWidth: 360,
                paddingHorizontal: 18,
                paddingVertical: 20,
                borderRadius: 14,
                backgroundColor: 'rgba(10, 18, 32, 0.98)',
                borderWidth: 2,
                borderColor: '#8ca1d1',
              }}
            >
              <Text
                style={{
                  color: '#f6a83b',
                  fontSize: 18,
                  fontWeight: '900',
                  letterSpacing: 1,
                  textAlign: 'center',
                  marginBottom: 6,
                }}
              >
                USER DELETED
              </Text>
              <Text
                style={{
                  color: '#8ca1d1',
                  fontSize: 13,
                  textAlign: 'center',
                  lineHeight: 18,
                  marginBottom: 18,
                }}
              >
                Your account was deleted successfully.
              </Text>
              <Pressable
                style={{
                  backgroundColor: '#101522',
                  borderRadius: 10,
                  paddingVertical: 12,
                  borderWidth: 2,
                  borderColor: '#8ca1d1',
                  alignItems: 'center',
                }}
                onPress={() => {
                  setShowDeleteSuccessModal(false);
                  console.log('[settings] Navigation to login triggered');
                }}
              >
                <Text style={{ color: '#f6e7c1', fontSize: 16, fontWeight: 'bold' }}>OK</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
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
                      musicEnabled={musicEnabled}
                      onToggleMusic={handleToggleMusic}
                      sfxEnabled={sfxEnabled}
                      onToggleSfx={handleToggleSfx}
                      onResetRunData={handleResetRunData}
                      onDeleteUser={handleDeleteUser}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen name="Profile" component={ProfileScreen} />
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
