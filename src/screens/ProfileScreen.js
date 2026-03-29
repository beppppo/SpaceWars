import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../FirebaseConfig';
import { SecondaryButton } from '../components/Buttons';
import { uploadUserProfilePhoto } from '../services/userProfileService';

const DEFAULT_PROFILE = {
  username: 'Player',
  photoURL: null,
  bestTime: 0,
  wins: 0,
  totalKills: 0,
};

function formatDurationSeconds(totalSeconds) {
  // Firestore stores raw seconds, but the screen should read like a real stat panel.
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const loadProfile = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser?.uid) {
      console.log('[profile] No authenticated user found');
      setLoading(false);
      return;
    }

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const statsRef = doc(db, 'userStats', currentUser.uid);
      // These live in separate collections on purpose, so load them together and merge locally.
      const [userSnapshot, statsSnapshot] = await Promise.all([
        getDoc(userRef),
        getDoc(statsRef),
      ]);

      const userData = userSnapshot.exists() ? userSnapshot.data() : {};
      const statsData = statsSnapshot.exists() ? statsSnapshot.data() : {};

      setProfile({
        username: userData.username || currentUser.displayName || 'Player',
        photoURL: userData.photoURL || currentUser.photoURL || null,
        bestTime: statsData.bestTime || 0,
        wins: statsData.wins || 0,
        totalKills: statsData.totalKills || 0,
      });
    } catch (error) {
      console.log('[profile] Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const processPickedImage = async (imageUri) => {
    const currentUser = auth.currentUser;
    if (!currentUser?.uid || !imageUri) {
      return;
    }

    try {
      setUploadingPhoto(true);
      // Reuse the shared upload helper so camera and gallery both follow the exact same save path.
      await uploadUserProfilePhoto(currentUser.uid, imageUri);
      await loadProfile();
    } catch (error) {
      console.log('[profile] Failed to update profile photo:', error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleChooseFromGallery = async () => {
    setIsPhotoModalOpen(false);

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        console.log('[profile] Media library permission denied');
        if (Platform.OS !== 'web') {
          Alert.alert('Permission needed', 'Media library permission is required to choose a profile photo.');
        }
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        // Keeping it square here saves us from weird avatar crops later.
        aspect: [1, 1],
        quality: 0.8,
      });

      if (pickerResult.canceled || !pickerResult.assets?.[0]?.uri) {
        return;
      }

      await processPickedImage(pickerResult.assets[0].uri);
    } catch (error) {
      console.log('[profile] Failed to open gallery:', error);
    }
  };

  const handleTakePhoto = async () => {
    setIsPhotoModalOpen(false);

    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        console.log('[profile] Camera permission denied');
        if (Platform.OS !== 'web') {
          Alert.alert('Permission needed', 'Camera permission is required to take a profile photo.');
        }
        return;
      }

      console.log('[profile] Camera opened');
      const cameraResult = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        // Match the gallery crop so both sources behave the same in the UI.
        aspect: [1, 1],
        quality: 0.8,
      });

      if (cameraResult.canceled || !cameraResult.assets?.[0]?.uri) {
        return;
      }

      console.log('[profile] Photo taken');
      await processPickedImage(cameraResult.assets[0].uri);
    } catch (error) {
      console.log('[profile] Failed to open camera:', error);
    }
  };

  const handleSelectProfilePhoto = () => {
    if (uploadingPhoto) {
      return;
    }

    // Prevent stacked uploads by only allowing the chooser when the current one is finished.
    setIsPhotoModalOpen(true);
  };

  return (
    <SafeAreaView style={styles.screenContainer} edges={['top', 'bottom']}>
      <View style={styles.spaceBackground}>
        <Modal
          visible={isPhotoModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsPhotoModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalPanel}>
              <Text style={styles.modalTitle}>PROFILE PHOTO</Text>
              <Text style={styles.modalSubtitle}>Choose how you want to update your avatar</Text>

              <Pressable style={styles.modalSecondaryButton} onPress={() => void handleTakePhoto()}>
                <Text style={styles.modalSecondaryButtonText}>Take Photo</Text>
              </Pressable>

              <Pressable style={styles.modalSecondaryButton} onPress={() => void handleChooseFromGallery()}>
                <Text style={styles.modalSecondaryButtonText}>Choose from Gallery</Text>
              </Pressable>

              <Pressable style={styles.modalCancelButton} onPress={() => setIsPhotoModalOpen(false)}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <View style={[styles.backButtonRow, { top: insets.top + 4 }]}>
          <SecondaryButton label="BACK" onPress={() => navigation.goBack()} />
        </View>

        <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f6a83b" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : (
          <View style={styles.profileRow}>
            <View style={styles.identityPanel}>
              <Pressable style={styles.avatarPressable} onPress={handleSelectProfilePhoto}>
                {profile.photoURL ? (
                  <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarPlaceholderText}>
                      {profile.username.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                {uploadingPhoto && (
                  <View style={styles.avatarLoadingOverlay}>
                    <ActivityIndicator size="small" color="#f6e7c1" />
                  </View>
                )}
              </Pressable>

              <Text style={styles.username}>{profile.username}</Text>
            </View>

            <View style={styles.statsCard}>
              <View style={styles.statsHeader}>
                <Text style={styles.statsHeaderText}>COMBAT RECORD</Text>
              </View>

              {/* Keep the stats in one panel so it feels like HUD data instead of separate cards. */}
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Best Time</Text>
                <Text style={styles.statValue}>{formatDurationSeconds(profile.bestTime)}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Wins</Text>
                <Text style={styles.statValue}>{profile.wins}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Kills</Text>
                <Text style={styles.statValue}>{profile.totalKills}</Text>
              </View>
            </View>
          </View>
        )}
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
  modalCancelButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  modalCancelButtonText: {
    color: '#8ca1d1',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
  },
  identityPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  loadingText: {
    marginTop: 12,
    color: '#f6e7c1',
    fontSize: 16,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 20,
  },
  avatarPressable: {
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e2945',
    borderWidth: 2,
    borderColor: '#f6a83b',
  },
  avatarPlaceholderText: {
    color: '#f6e7c1',
    fontSize: 42,
    fontWeight: 'bold',
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 70,
    backgroundColor: 'rgba(5, 6, 17, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    color: '#f6a83b',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statsCard: {
    flex: 1,
    maxWidth: 360,
    minHeight: 220,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 14,
    backgroundColor: 'rgba(10, 18, 32, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(140, 161, 209, 0.45)',
    justifyContent: 'flex-start',
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  statsHeader: {
    alignSelf: 'flex-start',
    marginBottom: 18,
  },
  statsHeaderText: {
    color: '#f6a83b',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingVertical: 6,
  },
  statDivider: {
    height: 1,
    backgroundColor: 'rgba(140, 161, 209, 0.16)',
    marginVertical: 8,
  },
  statLabel: {
    color: '#8ca1d1',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  statValue: {
    color: '#f6e7c1',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'right',
    minWidth: 64,
  },
});
