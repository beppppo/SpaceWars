import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const FpsCounter = () => {
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const fpsIntervalRef = useRef(null);

  useEffect(() => {
    const updateFps = () => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      
      frameCountRef.current++;
      
      // Update FPS every second
      if (delta >= 1000) {
        const currentFps = Math.round((frameCountRef.current * 1000) / delta);
        setFps(currentFps);
        
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      
      fpsIntervalRef.current = requestAnimationFrame(updateFps);
    };

    fpsIntervalRef.current = requestAnimationFrame(updateFps);

    return () => {
      if (fpsIntervalRef.current) {
        cancelAnimationFrame(fpsIntervalRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>FPS: {fps}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1000,
  },
  text: {
    color: '#f6e7c1',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default FpsCounter;