import React from 'react';
import { View, StyleSheet, Image, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/Buttons';

const Star = ({ size, top, left, opacity }) => (
  <View
    style={{
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: '#ffffff',
      top: `${top}%`,
      left: `${left}%`,
      opacity: opacity || 0.8,
    }}
  />
);

const Stars = () => {
  const stars = [
    { size: 1, top: 15, left: 10, opacity: 0.9 },
    { size: 2, top: 25, left: 80, opacity: 1 },
    { size: 1, top: 35, left: 20, opacity: 0.7 },
    { size: 1, top: 45, left: 70, opacity: 0.8 },
    { size: 2, top: 55, left: 30, opacity: 0.9 },
    { size: 1, top: 60, left: 90, opacity: 0.6 },
    { size: 1, top: 70, left: 15, opacity: 0.8 },
    { size: 2, top: 75, left: 60, opacity: 1 },
    { size: 1, top: 85, left: 40, opacity: 0.7 },
    { size: 1, top: 20, left: 50, opacity: 0.8 },
    { size: 1, top: 40, left: 5, opacity: 0.9 },
    { size: 2, top: 50, left: 85, opacity: 0.8 },
    { size: 1, top: 65, left: 25, opacity: 0.7 },
    { size: 1, top: 80, left: 75, opacity: 0.8 },
    { size: 1, top: 30, left: 95, opacity: 0.6 },
    { size: 2, top: 10, left: 35, opacity: 0.9 },
    { size: 1, top: 5, left: 65, opacity: 0.8 },
    { size: 1, top: 12, left: 75, opacity: 0.6 },
    { size: 1, top: 18, left: 30, opacity: 0.7 },
    { size: 2, top: 28, left: 55, opacity: 0.9 },
    { size: 1, top: 42, left: 15, opacity: 0.8 },
    { size: 2, top: 48, left: 45, opacity: 0.95 },
    { size: 1, top: 58, left: 10, opacity: 0.6 },
    { size: 1, top: 62, left: 50, opacity: 0.8 },
    { size: 1, top: 68, left: 85, opacity: 0.7 },
    { size: 2, top: 72, left: 35, opacity: 1 },
    { size: 1, top: 82, left: 20, opacity: 0.8 },
    { size: 2, top: 88, left: 65, opacity: 0.9 },
    { size: 1, top: 92, left: 5, opacity: 0.7 },
  ];

  return (
    <>
      {stars.map((star, index) => (
        <Star key={index} {...star} />
      ))}
    </>
  );
};

export default function SplashScreen({ onStart }) {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const isLandscape = width > height;
  
  // Calculate margins
  const topMargin = insets.top + (isLandscape ? 8 : 28);
  const bottomMargin = insets.bottom + (isLandscape ? 8 : 24);
  const availableHeight = height - topMargin - bottomMargin;
  
  // Calculate sizes based on orientation
  let titleWidth, titleHeight, shipSize, spacing;
  
  if (isLandscape) {
    // Landscape mode - much smaller elements to fit in limited height
    titleWidth = Math.min(width * 0.7, 450);
    titleHeight = titleWidth * (384 / 1440);
    shipSize = Math.min(width * 0.2, height * 0.45, 140);
    spacing = 8; // Very tight spacing for landscape
  } else {
    // Portrait mode - larger elements
    titleWidth = Math.min(width * 0.85, 520);
    titleHeight = titleWidth * (384 / 1440);
    shipSize = Math.min(width * 0.42, height * 0.35, 200);
    spacing = 30;
  }
  
  const buttonHeight = 50;
  
  // Calculate total content height
  const totalContentHeight = titleHeight + spacing + shipSize + spacing + buttonHeight;
  
  // Position elements
  let titleTop, shipTop, buttonBottom;
  
  if (totalContentHeight <= availableHeight) {
    // Enough space - center everything
    const startY = topMargin + (availableHeight - totalContentHeight) / 2;
    titleTop = startY;
    shipTop = startY + titleHeight + spacing - 20; // Move ship up by 20px
    buttonBottom = bottomMargin + (availableHeight - totalContentHeight) / 2;
  } else {
    // Not enough space - minimal spacing
    const minSpacing = isLandscape ? 5 : 10;
    const adjustedSpacing = Math.max(minSpacing, (availableHeight - titleHeight - shipSize - buttonHeight) / 3);
    titleTop = topMargin;
    shipTop = titleTop + titleHeight + adjustedSpacing - 20; // Move ship up by 20px
    buttonBottom = bottomMargin;
  }
  const handlePress = React.useCallback(() => {
    if (onStart && typeof onStart === 'function') {
      onStart();
    }
  }, [onStart]);

  return (
    <View style={styles.screenContainer}>
      <LinearGradient
        colors={['#0a0e1a', '#050611', '#000000']}
        style={styles.gradient}
      >
        <View style={styles.spaceBackground}>
          <Stars />
          <View style={styles.content}>
            <View
              style={[
                styles.titleWrapper,
                {
                  top: titleTop,
                },
              ]}
            >
              <Image
                source={require('../../assets/spacewars-title.png')}
                style={[
                  styles.gameTitleImage,
                  { width: titleWidth, height: titleHeight },
                ]}
                resizeMode="contain"
                accessible
                accessibilityRole="image"
                accessibilityLabel="Spacewars title"
              />
            </View>

            <View
              pointerEvents="none"
              style={[
                styles.shipContainer,
                { top: shipTop },
              ]}
            >
              <Image
                source={require('../../assets/spaceship.png')}
                style={[
                  styles.bigShip,
                  {
                    width: shipSize,
                    height: shipSize,
                  },
                ]}
                resizeMode="contain"
              />
            </View>

            <View
              style={[
                styles.bottomCenter,
                {
                  bottom: buttonBottom,
                },
              ]}
            >
              <PrimaryButton label="ENTER" onPress={handlePress} />
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gradient: {
    flex: 1,
  },
  spaceBackground: {
    flex: 1,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  titleWrapper: {
    position: 'absolute',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  gameTitleImage: {
    transform: [{ scale: 1.05 }],
  },
  shipContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  bigShip: {
    aspectRatio: 1,
  },
  bottomCenter: {
    position: 'absolute',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'flex-start',
    left: 0,
    right: 0,
    zIndex: 2,
  },
});
