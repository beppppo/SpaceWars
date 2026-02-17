import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export function PrimaryButton({ label, onPress }) {
  const handlePress = React.useCallback(() => {
    if (onPress && typeof onPress === 'function') {
      onPress();
    }
  }, [onPress]);

  return (
    <TouchableOpacity 
      style={styles.primaryButton} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function SecondaryButton({ label, onPress }) {
  return (
    <TouchableOpacity 
      style={styles.secondaryButton} 
      onPress={onPress || (() => {})}
      activeOpacity={0.7}
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: '#1e2945',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: '#f6a83b',
  },
  primaryButtonText: {
    color: '#f6e7c1',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#101522',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: '#8ca1d1',
  },
  secondaryButtonText: {
    color: '#f6e7c1',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

