// screens/MainMenuScreen.js

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import { auth } from '../../FirebaseConfig';
import { setMenuMusicMode, startBackgroundMusic } from '../services/audioManager';

export default function MainMenuScreen({ navigation, onLogout, onPlayStart }) {
  const user = auth.currentUser;
  // Prefer the friendly name, but fall back to email so the header never feels empty.
  const displayName = user?.displayName || user?.email || 'User';

  useFocusEffect(
    React.useCallback(() => {
      // Re-apply menu audio every time we come back here so gameplay audio does not leak across screens.
      console.log('[audio] MainMenuScreen applying menu music mode');
      setMenuMusicMode();
      console.log('[audio] MainMenuScreen starting background music');
      void startBackgroundMusic();
    }, [])
  );
  
  const handlePlay = () => {
    // Let the app refresh any "come back later" reminder right when a new run starts.
    if (onPlayStart) {
      void onPlayStart();
    }
    navigation.navigate('Game');
  };

  const handleOpenSettings = () => {
    navigation.navigate('Settings');
  };

  const handleOpenProfile = () => {
    navigation.navigate('Profile');
  };
  
  return (
    <SafeAreaView style={styles.screenContainer} edges={['top', 'bottom']}>
      <View style={styles.spaceBackground}>
        <Text style={styles.gameTitleSmall}>SPACEWARS</Text>
        {user && (
          <Text style={styles.userEmail}>
            {displayName}
          </Text>
        )}

        <View style={styles.mainMenuRow}>
          <View style={styles.menuButtonsColumn}>
            {/* Keep the main actions grouped on the left and leave the ship to carry the empty space. */}
            <View style={styles.buttonSpacing}>
              <PrimaryButton label="PLAY" onPress={handlePlay} />
            </View>
            <View style={styles.buttonSpacing}>
              <PrimaryButton label="PROFILE" onPress={handleOpenProfile} />
            </View>
            <View style={styles.buttonSpacing}>
              <PrimaryButton label="SETTINGS" onPress={handleOpenSettings} />
            </View>
            <SecondaryButton label="LOG OUT" onPress={onLogout} />
          </View>

          <View style={styles.menuShipWrapper}>
            <Image
              source={require('../../assets/spaceship.png')}
              style={styles.bigShip}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#050611',
  },
  spaceBackground: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  gameTitleSmall: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f6a83b',
    textAlign: 'center',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#8ca1d1',
    textAlign: 'center',
    marginBottom: 8,
  },
  mainMenuRow: {
    flex: 1,
    flexDirection: 'row',
    marginTop: 10,
  },
  menuButtonsColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  buttonSpacing: {
    marginBottom: 12,
  },
  menuShipWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bigShip: {
    width: 180,
    height: 180,
  },
});

