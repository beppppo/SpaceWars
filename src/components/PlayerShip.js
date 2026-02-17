import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

export default function PlayerShip({ position, size = 50, rotation = 0 }) {
  return (
    <View
      style={[
        styles.ship,
        {
          left: position.x - size / 2,
          top: position.y - size / 2,
          width: size,
          height: size,
          transform: [{ rotate: `${rotation}rad` }],
        },
      ]}
    >
      <Image
        source={require('../../assets/spaceship.png')}
        style={styles.shipImage}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ship: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shipImage: {
    width: '100%',
    height: '100%',
  },
});

