import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

const GameTimer = ({ isPlaying, isPaused, onGameEnd, initialTime = 0, dimmed = false }) => {
  const [, setTime] = useState(initialTime);
  const startTimeRef = useRef(Date.now() - initialTime);
  const animationFrameRef = useRef(null);
  const pauseStartedAtRef = useRef(null);
  const prevIsPlayingRef = useRef(false);
  const prevIsPausedRef = useRef(false);
  const didEndRef = useRef(false);
  const latestElapsedRef = useRef(initialTime);
  const [displayTime, setDisplayTime] = useState('00:00');

  // Format time as MM:SS
  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const stopAnimationFrame = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const updateElapsed = (elapsed) => {
    latestElapsedRef.current = elapsed;
    setTime(elapsed);
    setDisplayTime(formatTime(elapsed));
  };

  const runTimer = () => {
    const elapsedTime = Date.now() - startTimeRef.current;
    updateElapsed(elapsedTime);
    animationFrameRef.current = requestAnimationFrame(runTimer);
  };

  useEffect(() => {
    const wasPlaying = prevIsPlayingRef.current;
    const wasPaused = prevIsPausedRef.current;

    // New run setup (false -> true): reset timer using optional initial offset.
    if (!wasPlaying && isPlaying) {
      startTimeRef.current = Date.now() - initialTime;
      pauseStartedAtRef.current = null;
      didEndRef.current = false;
      updateElapsed(initialTime);
    }

    // Pause transition: freeze value and stop RAF.
    if (isPlaying && !wasPaused && isPaused) {
      pauseStartedAtRef.current = Date.now();
      updateElapsed(Date.now() - startTimeRef.current);
      stopAnimationFrame();
    }

    // Resume transition: shift logical start forward by paused duration.
    if (isPlaying && wasPaused && !isPaused) {
      if (pauseStartedAtRef.current !== null) {
        const pausedDuration = Date.now() - pauseStartedAtRef.current;
        startTimeRef.current += pausedDuration;
        pauseStartedAtRef.current = null;
      }
    }

    // Run timer only while actively playing and not paused.
    if (isPlaying && !isPaused) {
      stopAnimationFrame();
      animationFrameRef.current = requestAnimationFrame(runTimer);
    } else {
      stopAnimationFrame();
    }

    // End transition (true -> false): fire once with elapsed excluding pauses.
    if (wasPlaying && !isPlaying && !didEndRef.current) {
      const finalElapsed = isPaused
        ? latestElapsedRef.current
        : Date.now() - startTimeRef.current;
      updateElapsed(finalElapsed);
      didEndRef.current = true;
      if (onGameEnd) {
        onGameEnd(finalElapsed);
      }
    }

    prevIsPlayingRef.current = isPlaying;
    prevIsPausedRef.current = isPaused;

    return () => {
      stopAnimationFrame();
    };
  }, [isPlaying, isPaused, initialTime, onGameEnd]);

  return (
    <View style={[styles.container, dimmed && styles.containerDimmed]}>
      <Text style={[styles.timerText, dimmed && styles.timerTextDimmed]}>{displayTime}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 2,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  containerDimmed: {
    opacity: 0.45,
  },
  timerText: {
    color: '#f6e7c1',
    fontSize: 20,
    fontWeight: '900',
    fontFamily: Platform.OS === 'web' ? 'monospace, monospace' : 'Courier New, monospace',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 2,
    letterSpacing: 1,
  },
  timerTextDimmed: {
    color: '#9aa3b5',
  },
});

export default GameTimer;
