// screens/AuthScreen.js

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import { auth } from '../../FirebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendEmailVerification,
  updateProfile
} from 'firebase/auth';

// Cross-platform alert function
const showAlert = (title, message, buttons) => {
  if (Platform.OS === 'web') {
    // For web, use window.alert or window.confirm
    if (buttons && buttons.length > 0) {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed && buttons[0].onPress) {
        buttons[0].onPress();
      }
    } else {
      window.alert(`${title}\n\n${message}`);
    }
  } else {
    // For mobile, use native Alert
    Alert.alert(title, message, buttons);
  }
};

export default function AuthScreen({ onAuthSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('User logged in:', userCredential.user.email);
      if (onAuthSuccess) {
        onAuthSuccess(userCredential.user);
      }
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Failed to log in';
      
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later';
          break;
        default:
          errorMessage = error.message;
      }
      
      showAlert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      showAlert('Error', 'Please enter name, email and password');
      return;
    }

    if (password.length < 6) {
      showAlert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('User registered:', userCredential.user.email);
      
      // Update user profile with name
      await updateProfile(userCredential.user, {
        displayName: name
      });
      
      // Send email verification
      await sendEmailVerification(userCredential.user);
      
      showAlert(
        'Registration Successful', 
        'A verification email has been sent to your email address.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (onAuthSuccess) {
                onAuthSuccess(userCredential.user);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = 'Failed to create account';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered. Please log in instead or use a different email address.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Use at least 6 characters';
          break;
        default:
          errorMessage = error.message;
      }
      
      showAlert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screenContainer} edges={['bottom']}>
      <View style={styles.spaceBackground}>
        <Text style={styles.gameTitleSmall}>SPACEWARS</Text>
        <View style={styles.authBox}>
          <Text style={styles.authModeTitle}>
            {isRegistering ? 'CREATE ACCOUNT' : 'LOG IN'}
          </Text>

          {isRegistering && (
            <>
              <Text style={styles.label}>NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor="#4d607f"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!loading}
              />
              <View style={{ height: 10 }} />
            </>
          )}

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter email"
            placeholderTextColor="#4d607f"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          <Text style={[styles.label, { marginTop: 10 }]}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            placeholderTextColor="#4d607f"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />

          <View style={{ height: 10 }} />

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#f6a83b" />
            </View>
          ) : (
            <>
              {isRegistering ? (
                <>
                  <PrimaryButton
                    label="REGISTER"
                    onPress={handleRegister}
                  />
                  <View style={{ height: 8 }} />
                  <SecondaryButton
                    label="BACK TO LOGIN"
                    onPress={() => setIsRegistering(false)}
                  />
                </>
              ) : (
                <>
                  <PrimaryButton
                    label="LOG IN"
                    onPress={handleLogin}
                  />
                  <View style={{ height: 8 }} />
                  <SecondaryButton
                    label="CREATE ACCOUNT"
                    onPress={() => setIsRegistering(true)}
                  />
                </>
              )}
            </>
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
    paddingVertical: 12,
    justifyContent: 'center',
  },
  gameTitleSmall: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f6a83b',
    textAlign: 'center',
    marginBottom: 12,
  },
  authBox: {
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#111728',
    borderWidth: 2,
    borderColor: '#283557',
  },
  authModeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f6a83b',
    textAlign: 'center',
    marginBottom: 12,
  },
  label: {
    color: '#f6e7c1',
    fontSize: 12,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#070b15',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#283557',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 3,
    color: '#f6e7c1',
    fontSize: 14,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

