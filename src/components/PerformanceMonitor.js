import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PerformanceMonitor = () => {
  const [stats, setStats] = useState({
    fps: 0,
    minFps: 60,
    maxFps: 0,
    avgFrameTime: 16.67,
    minFrameTime: 16.67,
    maxFrameTime: 16.67,
    lastFrameTime: 16.67,
    frameTimeJitter: 0,
    longFrames: 0 // Count of frames taking longer than 16ms (60fps threshold)
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const frameTimesRef = useRef([]);
  const animationFrameRef = useRef(null);
  const lastFrameTimeRef = useRef(performance.now());
  const longFrameCountRef = useRef(0);

  useEffect(() => {
    const updateStats = () => {
      const now = performance.now();
      const frameTime = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      // Count long frames (>16ms which is the 60fps threshold)
      if (frameTime > 16) {
        longFrameCountRef.current++;
      }

      // Store frame times for jitter calculation
      frameTimesRef.current.push(frameTime);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      // Update FPS counter (every second)
      const deltaTime = now - lastTimeRef.current;
      frameCountRef.current++;
      
      if (deltaTime >= 1000) {
        const currentFps = Math.round((frameCountRef.current * 1000) / deltaTime);
        const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
        
        // Calculate min/max frame times
        const minFrameTime = Math.min(...frameTimesRef.current);
        const maxFrameTime = Math.max(...frameTimesRef.current);
        
        // Calculate jitter (standard deviation of frame times)
        const mean = avgFrameTime;
        const variance = frameTimesRef.current.reduce((acc, time) => acc + Math.pow(time - mean, 2), 0) / frameTimesRef.current.length;
        const jitter = Math.sqrt(variance);
        
        setStats({
          fps: currentFps,
          minFps: Math.min(stats.minFps, currentFps),
          maxFps: Math.max(stats.maxFps, currentFps),
          avgFrameTime: parseFloat(avgFrameTime.toFixed(2)),
          minFrameTime: parseFloat(minFrameTime.toFixed(2)),
          maxFrameTime: parseFloat(maxFrameTime.toFixed(2)),
          lastFrameTime: parseFloat(frameTime.toFixed(2)),
          frameTimeJitter: parseFloat(jitter.toFixed(2)),
          longFrames: longFrameCountRef.current
        });
        
        frameCountRef.current = 0;
        longFrameCountRef.current = 0; // Reset long frame counter
        lastTimeRef.current = now;
      }
      
      animationFrameRef.current = requestAnimationFrame(updateStats);
    };

    animationFrameRef.current = requestAnimationFrame(updateStats);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [stats.minFps, stats.maxFps]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>FPS: {stats.fps}</Text>
      <Text style={styles.text}>Frame: {stats.lastFrameTime}ms</Text>
      <Text style={styles.text}>Jitter: ±{stats.frameTimeJitter}ms</Text>
      <Text style={styles.text}>Long: {stats.longFrames}/s</Text>
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
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default PerformanceMonitor;