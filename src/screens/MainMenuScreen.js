// screens/MainMenuScreen.js

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import { auth } from '../../FirebaseConfig';

export default function MainMenuScreen({ navigation, onLogout }) {
  const user = auth.currentUser;
  const displayName = user?.displayName || user?.email || 'User';
  
  const handlePlay = () => {
    navigation.navigate('Game');
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
            <View style={styles.buttonSpacing}>
              <PrimaryButton label="PLAY" onPress={handlePlay} />
            </View>
            <View style={styles.buttonSpacing}>
              <PrimaryButton label="PROFILE (soon)" onPress={() => {}} />
            </View>
            <View style={styles.buttonSpacing}>
              <PrimaryButton label="SETTINGS (soon)" onPress={() => {}} />
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

