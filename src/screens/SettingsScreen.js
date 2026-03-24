import React from 'react';
import { Modal, Pressable, TextInput, View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
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
  onResetRunData,
  onDeleteUser,
}) {
  const insets = useSafeAreaInsets();
  const [isResetModalOpen, setIsResetModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [deletePassword, setDeletePassword] = React.useState('');
  const [deletePasswordError, setDeletePasswordError] = React.useState('');

  const handleResetRunDataPress = () => {
    console.log('[settings] Reset Run Data button pressed');
    setIsResetModalOpen(true);
  };

  const handleDeleteUserPress = () => {
    console.log('[settings] Delete User button pressed');
    setDeletePassword('');
    setDeletePasswordError('');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmResetRunData = () => {
    setIsResetModalOpen(false);
    if (onResetRunData) {
      void onResetRunData();
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deletePassword.trim()) {
      console.log('[settings] Delete user password missing');
      setDeletePasswordError('Please enter your password.');
      return;
    }

    if (onDeleteUser) {
      const result = await onDeleteUser(deletePassword);
      if (result?.success) {
        setIsDeleteModalOpen(false);
        setDeletePassword('');
        setDeletePasswordError('');
        return;
      }

      if (result?.errorCode === 'auth/wrong-password') {
        setDeletePasswordError('Incorrect password.');
        return;
      }
    }

    setDeletePasswordError('Unable to delete user. Please try again.');
  };

  return (
    <SafeAreaView style={styles.screenContainer} edges={['top', 'bottom']}>
      <View style={styles.spaceBackground}>
        <Modal
          visible={isResetModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsResetModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalPanel}>
              <Text style={styles.modalTitle}>RESET RUN DATA</Text>
              <Text style={styles.modalSubtitle}>
                This will reset Best Time, Wins, and Total Kills.
              </Text>

              <Pressable style={styles.modalSecondaryButton} onPress={handleConfirmResetRunData}>
                <Text style={styles.modalSecondaryButtonText}>Confirm</Text>
              </Pressable>

              <Pressable style={styles.modalCancelButton} onPress={() => setIsResetModalOpen(false)}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={isDeleteModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsDeleteModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalPanel}>
              <Text style={styles.modalTitle}>DELETE USER</Text>
              <Text style={styles.modalSubtitle}>
                Re-enter your password to permanently delete your account and all saved user data.
              </Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Enter password"
                placeholderTextColor="#6f83ad"
                secureTextEntry
                value={deletePassword}
                onChangeText={(value) => {
                  setDeletePassword(value);
                  if (deletePasswordError) {
                    setDeletePasswordError('');
                  }
                }}
              />

              {deletePasswordError ? (
                <Text style={styles.modalErrorText}>{deletePasswordError}</Text>
              ) : null}

              <Pressable style={styles.modalDangerButton} onPress={handleConfirmDeleteUser}>
                <Text style={styles.modalDangerButtonText}>Delete User</Text>
              </Pressable>

              <Pressable
                style={styles.modalCancelButton}
                onPress={() => {
                  setIsDeleteModalOpen(false);
                  setDeletePassword('');
                  setDeletePasswordError('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

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

            <View style={styles.settingsCardFull}>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>Reset Run Data</Text>
                <Text style={styles.settingDescriptionWide}>Clear best time, wins, and total kills</Text>
              </View>
              <SecondaryButton label="RESET" onPress={handleResetRunDataPress} />
            </View>

            <View style={styles.settingsCardFull}>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>Delete User</Text>
                <Text style={styles.settingDescriptionWide}>Delete account and all saved user data</Text>
              </View>
              <SecondaryButton label="DELETE" onPress={handleDeleteUserPress} />
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 5, 12, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalPanel: {
    width: '100%',
    maxWidth: 360,
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderRadius: 14,
    backgroundColor: 'rgba(10, 18, 32, 0.98)',
    borderWidth: 2,
    borderColor: '#8ca1d1',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  modalTitle: {
    color: '#f6a83b',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSubtitle: {
    color: '#8ca1d1',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  modalSecondaryButton: {
    backgroundColor: '#101522',
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#8ca1d1',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalSecondaryButtonText: {
    color: '#f6e7c1',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalInput: {
    backgroundColor: '#101522',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#283557',
    color: '#f6e7c1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  modalErrorText: {
    color: '#d96363',
    fontSize: 12,
    marginTop: -4,
    marginBottom: 12,
    textAlign: 'left',
  },
  modalDangerButton: {
    backgroundColor: '#2a1116',
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#d96363',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalDangerButtonText: {
    color: '#f6e7c1',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCancelButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  modalCancelButtonText: {
    color: '#8ca1d1',
    fontSize: 14,
    fontWeight: '700',
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
  settingDescriptionWide: {
    color: '#8ca1d1',
    fontSize: 10,
    lineHeight: 14,
  },
  settingsCardFull: {
    backgroundColor: '#101522',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#8ca1d1',
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    width: '100%',
  },
});
