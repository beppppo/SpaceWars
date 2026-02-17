import React, { useRef, useCallback } from 'react';
import { View, StyleSheet, PanResponder, Animated } from 'react-native';

export default function Joystick({ onMove, onRelease }) {
  const stickPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const baseRadius = 60; // Base circle radius
  const stickRadius = 25; // Stick circle radius
  const maxDistance = baseRadius - stickRadius; // Max distance stick can move from center
  
  const containerRef = useRef(null);
  const lastPositionRef = useRef({ x: 0, y: 0 });
  const centerRef = useRef({ x: null, y: null });
  const lastUpdateRef = useRef(0);
  const throttleTimeRef = useRef(16); // Throttle to ~60fps (16ms)

  // Throttled onMove function
  const throttledOnMove = useCallback((normalizedX, normalizedY) => {
    const now = Date.now();
    if (now - lastUpdateRef.current >= throttleTimeRef.current) {
      lastUpdateRef.current = now;
      onMove?.(normalizedX, normalizedY);
    }
  }, [onMove]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        updateStickPosition(event.nativeEvent);
      },
      onPanResponderMove: (event) => {
        updateStickPosition(event.nativeEvent);
      },
      onPanResponderRelease: () => {
        // Return stick to center
        lastPositionRef.current = { x: 0, y: 0 };
        animateToCenter();
        onRelease?.();
      },
      onPanResponderTerminate: () => {
        // Return stick to center
        lastPositionRef.current = { x: 0, y: 0 };
        animateToCenter();
        onRelease?.();
      },
    })
  ).current;
  
  const updateStickPosition = (nativeEvent) => {
    // Prefer absolute coords with a measured center; fallback to relative coords
    const touch = (nativeEvent.touches && nativeEvent.touches[0]) || nativeEvent;
    const hasCenter = centerRef.current.x !== null && centerRef.current.y !== null;

    let touchX = touch.pageX;
    let touchY = touch.pageY;
    let centerX = centerRef.current.x;
    let centerY = centerRef.current.y;

    if (!hasCenter || touchX == null || touchY == null) {
      // Fallback to relative coordinates within the joystick view
      touchX = touch.locationX ?? 0;
      touchY = touch.locationY ?? 0;
      centerX = baseRadius;
      centerY = baseRadius;
    }
    
    // Calculate relative position from center
    const relativeX = touchX - centerX;
    const relativeY = touchY - centerY;
    
    // Calculate distance from center
    const distance = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
    
    // Clamp to max distance
    let clampedX = relativeX;
    let clampedY = relativeY;
    
    if (distance > maxDistance) {
      clampedX = (relativeX / distance) * maxDistance;
      clampedY = (relativeY / distance) * maxDistance;
    }
    
    // Always update position
    lastPositionRef.current = { x: clampedX, y: clampedY };
    
    // Update stick position
    stickPosition.setValue({ x: clampedX, y: clampedY });
    
    // Calculate normalized values (-1 to 1) for movement
    const normalizedX = clampedX / maxDistance;
    const normalizedY = clampedY / maxDistance;
    
    // Call throttled onMove with normalized values
    throttledOnMove(normalizedX, normalizedY);
  };

  const handleLayout = () => {
    // Measure once to get absolute center (reduces flicker on native)
    containerRef.current?.measureInWindow((x, y, width, height) => {
      centerRef.current = { x: x + width / 2, y: y + height / 2 };
    });
  };

  const animateToCenter = () => {
    Animated.spring(stickPosition, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
      speed: 15,
      bounciness: 6,
    }).start();
  };
  
  return (
    <View
      ref={containerRef}
      style={[
        styles.joystickContainer,
        {
          width: baseRadius * 2,
          height: baseRadius * 2,
        },
      ]}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      {/* Base circle */}
      <View
        style={[
          styles.base,
          {
            width: baseRadius * 2,
            height: baseRadius * 2,
            borderRadius: baseRadius,
          },
        ]}
      />
      
      {/* Stick */}
      <Animated.View
        style={[
          styles.stick,
          {
            width: stickRadius * 2,
            height: stickRadius * 2,
            borderRadius: stickRadius,
            transform: [
              { translateX: stickPosition.x },
              { translateY: stickPosition.y },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  joystickContainer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  base: {
    position: 'absolute',
    backgroundColor: 'rgba(30, 41, 69, 0.6)',
    borderWidth: 2,
    borderColor: '#8ca1d1',
  },
  stick: {
    position: 'absolute',
    backgroundColor: '#f6a83b',
    borderWidth: 2,
    borderColor: '#ffd700',
  },
});