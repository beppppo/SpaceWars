import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import SplashScreen from './src/screens/SplashScreen';
import AuthScreen from './src/screens/AuthScreen';
import MainMenuScreen from './src/screens/MainMenuScreen';
import GameScreen from './src/screens/GameScreen';
import { auth } from './FirebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

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
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050611' }}>
        <ActivityIndicator size="large" color="#f6a83b" />
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={showSplash && !user ? "Splash" : (user ? "MainMenu" : "Auth")}
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#050611' },
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
              <Stack.Screen name="Game">
                {(props) => <GameScreen navigation={props.navigation} />}
              </Stack.Screen>
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
