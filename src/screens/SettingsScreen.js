import React from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SecondaryButton } from '../components/Buttons';

export default function SettingsScreen({
  navigation,
  vibrationEnabled,
  onToggleVibration,
  showFpsEnabled,
  onToggleShowFps,
  musicEnabled,
  onToggleMusic,
  sfxEnabled,
  onToggleSfx,
}) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.screenContainer} edges={['top', 'bottom']}>
      <View style={styles.spaceBackground}>
        <View style={[styles.backButtonRow, { top: insets.top + 4 }]}>
          <SecondaryButton label="BACK" onPress={() => navigation.goBack()} />
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.gameTitleSmall}>SPACEWARS</Text>
          <Text style={styles.settingsTitle}>Settings</Text>
        </View>

        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.settingsGrid}>
            <View style={styles.settingsCard}>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>Vibration</Text>
                <Text style={styles.settingDescription}>Death feedback</Text>
              </View>
              <Switch
                value={vibrationEnabled}
                onValueChange={onToggleVibration}
                trackColor={{ false: '#3a4661', true: '#f6a83b' }}
                thumbColor={vibrationEnabled ? '#f6e7c1' : '#d9e2f2'}
              />
            </View>

            <View style={styles.settingsCard}>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>Show FPS</Text>
                <Text style={styles.settingDescription}>Debug counter</Text>
              </View>
              <Switch
                value={showFpsEnabled}
                onValueChange={onToggleShowFps}
                trackColor={{ false: '#3a4661', true: '#f6a83b' }}
                thumbColor={showFpsEnabled ? '#f6e7c1' : '#d9e2f2'}
              />
            </View>

            <View style={styles.settingsCard}>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>Music</Text>
                <Text style={styles.settingDescription}>Background audio</Text>
              </View>
              <Switch
                value={musicEnabled}
                onValueChange={onToggleMusic}
                trackColor={{ false: '#3a4661', true: '#f6a83b' }}
                thumbColor={musicEnabled ? '#f6e7c1' : '#d9e2f2'}
              />
            </View>

            <View style={styles.settingsCard}>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>SFX</Text>
                <Text style={styles.settingDescription}>Sound effects</Text>
              </View>
              <Switch
                value={sfxEnabled}
                onValueChange={onToggleSfx}
                trackColor={{ false: '#3a4661', true: '#f6a83b' }}
                thumbColor={sfxEnabled ? '#f6e7c1' : '#d9e2f2'}
              />
            </View>
          </View>
        </ScrollView>
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
    paddingBottom: 16,
  },
  backButtonRow: {
    position: 'absolute',
    left: 24,
    zIndex: 2,
  },
  titleSection: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
    marginBottom: 14,
  },
  gameTitleSmall: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f6a83b',
    textAlign: 'center',
    marginBottom: 4,
  },
  settingsTitle: {
    fontSize: 18,
    color: '#8ca1d1',
    textAlign: 'center',
    marginBottom: 0,
    fontWeight: '700',
  },
  contentContainer: {
    paddingTop: 4,
    paddingBottom: 16,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  contentScroll: {
    flex: 1,
  },
  settingsGrid: {
    width: '100%',
    maxWidth: 400,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  settingsCard: {
    backgroundColor: '#101522',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#8ca1d1',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    width: '48.5%',
  },
  settingCopy: {
    flex: 1,
    paddingRight: 6,
  },
  settingLabel: {
    color: '#f6e7c1',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 1,
  },
  settingDescription: {
    color: '#8ca1d1',
    fontSize: 8,
    lineHeight: 10,
  },
});
