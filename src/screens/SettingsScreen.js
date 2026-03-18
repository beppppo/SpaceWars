import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SecondaryButton } from '../components/Buttons';

export default function SettingsScreen({
  navigation,
  vibrationEnabled,
  onToggleVibration,
  showFpsEnabled,
  onToggleShowFps,
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

        <View style={styles.contentContainer}>
          <View style={styles.settingsCard}>
            <View style={styles.settingCopy}>
              <Text style={styles.settingLabel}>Vibration</Text>
              <Text style={styles.settingDescription}>Enable vibration feedback on player death</Text>
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
              <Text style={styles.settingDescription}>Display FPS debug counter during gameplay</Text>
            </View>
            <Switch
              value={showFpsEnabled}
              onValueChange={onToggleShowFps}
              trackColor={{ false: '#3a4661', true: '#f6a83b' }}
              thumbColor={showFpsEnabled ? '#f6e7c1' : '#d9e2f2'}
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
    marginBottom: 28,
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
    flex: 1,
    paddingTop: 8,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  settingsCard: {
    backgroundColor: '#101522',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8ca1d1',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    width: '100%',
    maxWidth: 360,
  },
  settingCopy: {
    flex: 1,
    paddingRight: 10,
  },
  settingLabel: {
    color: '#f6e7c1',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  settingDescription: {
    color: '#8ca1d1',
    fontSize: 11,
    maxWidth: 210,
    lineHeight: 15,
  },
});
