import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import PlayerShip from '../components/PlayerShip';
import SpaceChunk from '../components/SpaceChunk';
import Joystick from '../components/Joystick';
import PerformanceMonitor from '../components/PerformanceMonitor';
import GameTimer from '../components/GameTimer';
import { ChunkManager } from '../utils/ChunkManager';

const MAIN_MENU_ROUTE = 'MainMenu';

export default function GameScreen({ navigation }) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [, setFinalTime] = useState(0);

  // World and chunk management
  const chunkManagerRef = useRef(null);
  const [activeChunks, setActiveChunks] = useState([]);

  // Game area dimensions (measured from actual layout)
  const [gameAreaLayout, setGameAreaLayout] = useState({ width: screenWidth, height: screenHeight });

  // Player world position (infinite space coordinates) - use refs to avoid state updates
  const playerWorldPositionRef = useRef({ x: 0, y: 0 });
  const [, setPlayerWorldPosition] = useState({ x: 0, y: 0 });

  // For interpolation
  const previousWorldPositionRef = useRef({ x: 0, y: 0 });
  const alphaRef = useRef(0);

  // Player screen position (always centered on game area)
  const playerScreenPosition = {
    x: gameAreaLayout.width / 2,
    y: gameAreaLayout.height / 2,
  };

  const shipRotationRef = useRef(0);
  const [shipRotation, setShipRotation] = useState(0); // Rotation angle in radians
  const joystickInputRef = useRef({ x: 0, y: 0 }); // Normalized joystick input (-1 to 1)
  const animationFrameRef = useRef(null);
  const restartFrameRef = useRef(null);
  const isLoopRunningRef = useRef(false);
  const accumulatorRef = useRef(0);
  const isPlayingRef = useRef(isPlaying);
  const isPausedRef = useRef(isPaused);
  const gameOverRef = useRef(gameOver);
  const lastUpdateTimeRef = useRef(Date.now());
  const lastChunkUpdateRef = useRef({ chunkX: null, chunkY: null });
  const frameCountRef = useRef(0);

  // Ship properties
  const shipSize = 50;
  const shipSpeed = 5; // pixels per frame

  // Chunk properties
  const chunkSize = 1000; // Size of each chunk in world units
  const viewRadius = 1; // How many chunks to keep around player (reduced for performance)

  const stopGameLoop = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    isLoopRunningRef.current = false;
    accumulatorRef.current = 0;
  }, []);

  const resetRunState = useCallback(() => {
    playerWorldPositionRef.current = { x: 0, y: 0 };
    previousWorldPositionRef.current = { x: 0, y: 0 };
    alphaRef.current = 0;
    shipRotationRef.current = 0;
    joystickInputRef.current = { x: 0, y: 0 };
    lastUpdateTimeRef.current = null;
    frameCountRef.current = 0;

    setPlayerWorldPosition({ x: 0, y: 0 });
    setShipRotation(0);

    if (chunkManagerRef.current) {
      const chunks = chunkManagerRef.current.updateChunks(0, 0);
      setActiveChunks(chunks);
      lastChunkUpdateRef.current = chunkManagerRef.current.worldToChunk(0, 0);
      return;
    }

    setActiveChunks([]);
    lastChunkUpdateRef.current = { chunkX: null, chunkY: null };
  }, []);

  // Initialize chunk manager
  useEffect(() => {
    chunkManagerRef.current = new ChunkManager(chunkSize, viewRadius);
    resetRunState();
  }, [chunkSize, viewRadius, resetRunState]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    isPausedRef.current = isPaused;
    gameOverRef.current = gameOver;
  }, [isPlaying, isPaused, gameOver]);

  // Joystick handlers
  const handleJoystickMove = useCallback((normalizedX, normalizedY) => {
    if (!isPlayingRef.current || isPausedRef.current || gameOverRef.current) {
      return;
    }
    joystickInputRef.current = { x: normalizedX, y: normalizedY };
  }, []);

  const handleJoystickRelease = useCallback(() => {
    joystickInputRef.current = { x: 0, y: 0 };
  }, []);

  const togglePause = useCallback(() => {
    if (gameOver || !isPlaying) {
      return;
    }

    setIsPaused((prevPaused) => {
      const nextPaused = !prevPaused;
      if (nextPaused) {
        joystickInputRef.current = { x: 0, y: 0 };
      }
      return nextPaused;
    });
  }, [gameOver, isPlaying]);

  const resumeGame = useCallback(() => {
    if (gameOver || !isPlaying) {
      return;
    }
    joystickInputRef.current = { x: 0, y: 0 };
    setIsPaused(false);
  }, [gameOver, isPlaying]);

  const restartGame = useCallback(() => {
    stopGameLoop();
    joystickInputRef.current = { x: 0, y: 0 };
    setIsPaused(false);
    setGameOver(false);
    setFinalTime(0);
    resetRunState();

    // Force an isPlaying false -> true transition so timer/run state resets cleanly.
    setIsPlaying(false);
    if (restartFrameRef.current !== null) {
      cancelAnimationFrame(restartFrameRef.current);
    }
    restartFrameRef.current = requestAnimationFrame(() => {
      restartFrameRef.current = null;
      setIsPlaying(true);
    });
  }, [resetRunState, stopGameLoop]);

  const handleExitToMenu = useCallback(() => {
    stopGameLoop();
    if (restartFrameRef.current !== null) {
      cancelAnimationFrame(restartFrameRef.current);
      restartFrameRef.current = null;
    }

    joystickInputRef.current = { x: 0, y: 0 };
    setIsPaused(false);
    setIsPlaying(false);
    setGameOver(false);
    setFinalTime(0);
    resetRunState();

    navigation.reset({
      index: 0,
      routes: [{ name: MAIN_MENU_ROUTE }],
    });
  }, [navigation, resetRunState, stopGameLoop]);

  // Game loop
  useEffect(() => {
    if (!isPlaying || isPaused || gameOver) {
      stopGameLoop();
      return;
    }

    if (isLoopRunningRef.current) {
      return;
    }

    isLoopRunningRef.current = true;

    // Use a fixed timestep for smoother movement
    const FIXED_TIMESTEP = 16.67; // ~60fps in ms
    accumulatorRef.current = 0;
    lastUpdateTimeRef.current = null;

    const gameLoop = (timestamp) => {
      if (!isPlayingRef.current || isPausedRef.current || gameOverRef.current) {
        stopGameLoop();
        return;
      }

      if (lastUpdateTimeRef.current === null) {
        lastUpdateTimeRef.current = timestamp;
      }

      const now = timestamp;
      const deltaTime = now - lastUpdateTimeRef.current;
      lastUpdateTimeRef.current = now;

      accumulatorRef.current += deltaTime;

      // Fixed timestep updates
      while (accumulatorRef.current >= FIXED_TIMESTEP) {
        const joystickInput = joystickInputRef.current;

        // Update player world position based on joystick input
        if (joystickInput.x !== 0 || joystickInput.y !== 0) {
          // Calculate movement based on joystick input
          const moveX = joystickInput.x * shipSpeed;
          const moveY = joystickInput.y * shipSpeed;

          // Update world position (no boundaries - infinite space!)
          playerWorldPositionRef.current.x += moveX;
          playerWorldPositionRef.current.y += moveY;

          // Calculate rotation angle (in radians)
          const angle = Math.atan2(joystickInput.y, joystickInput.x) + Math.PI / 2;
          shipRotationRef.current = angle;

          // Only update state for rotation (needed for rendering)
          setShipRotation(angle);

          // Check if player moved to a new chunk (only update chunks when crossing chunk boundaries)
          if (chunkManagerRef.current) {
            const currentChunk = chunkManagerRef.current.worldToChunk(
              playerWorldPositionRef.current.x,
              playerWorldPositionRef.current.y
            );

            // Only update chunks if we moved to a different chunk
            if (
              lastChunkUpdateRef.current.chunkX !== currentChunk.chunkX ||
              lastChunkUpdateRef.current.chunkY !== currentChunk.chunkY
            ) {
              const chunks = chunkManagerRef.current.updateChunks(
                playerWorldPositionRef.current.x,
                playerWorldPositionRef.current.y
              );

              // Use functional update to prevent race conditions
              setActiveChunks((prevChunks) => {
                // Only update if chunks actually changed
                if (prevChunks.length !== chunks.length) {
                  return chunks;
                }

                // Check if chunk keys are different
                const prevKeys = new Set(prevChunks.map((c) => c.key));
                const newKeys = new Set(chunks.map((c) => c.key));

                if (prevKeys.size !== newKeys.size || ![...prevKeys].every((key) => newKeys.has(key))) {
                  return chunks;
                }

                return prevChunks;
              });
              lastChunkUpdateRef.current = currentChunk;
            }
          }
        }

        // Store previous position for interpolation
        previousWorldPositionRef.current = {
          x: playerWorldPositionRef.current.x,
          y: playerWorldPositionRef.current.y,
        };

        accumulatorRef.current -= FIXED_TIMESTEP;
      }

      // Calculate interpolation alpha for smooth rendering
      alphaRef.current = accumulatorRef.current / FIXED_TIMESTEP;

      // Update state for world position less frequently (throttle to reduce re-renders)
      // Only update every 3 frames to reduce re-renders while keeping smooth camera
      frameCountRef.current += 1;
      if (frameCountRef.current % 3 === 0) {
        setPlayerWorldPosition({
          x: playerWorldPositionRef.current.x,
          y: playerWorldPositionRef.current.y,
        });
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      stopGameLoop();
    };
  }, [isPlaying, isPaused, gameOver, shipSpeed, stopGameLoop]);

  useEffect(() => {
    return () => {
      stopGameLoop();
      if (restartFrameRef.current !== null) {
        cancelAnimationFrame(restartFrameRef.current);
        restartFrameRef.current = null;
      }
    };
  }, [stopGameLoop]);

  // World offset for camera (camera follows player, keeping them centered)
  // Use ref for calculation to avoid state dependency
  // Apply interpolation for smoother movement
  const alpha = alphaRef.current;
  const interpolatedWorldX = previousWorldPositionRef.current.x * (1 - alpha) + playerWorldPositionRef.current.x * alpha;
  const interpolatedWorldY = previousWorldPositionRef.current.y * (1 - alpha) + playerWorldPositionRef.current.y * alpha;

  const worldOffsetX = interpolatedWorldX - gameAreaLayout.width / 2;
  const worldOffsetY = interpolatedWorldY - gameAreaLayout.height / 2;

  const handleGameAreaLayout = (event) => {
    const { width, height } = event.nativeEvent.layout;
    setGameAreaLayout({ width, height });
  };

  return (
    <SafeAreaView style={styles.screenContainer} edges={['top', 'bottom']}>
      <View style={styles.gameArea} onLayout={handleGameAreaLayout}>
        {/* Render space chunks */}
        {activeChunks.map((chunk) => (
          <SpaceChunk
            key={chunk.key}
            chunkX={chunk.chunkX}
            chunkY={chunk.chunkY}
            chunkSize={chunkSize}
            worldOffsetX={worldOffsetX}
            worldOffsetY={worldOffsetY}
            seed={chunk.seed}
          />
        ))}

        {/* Game content - Player ship (always centered on screen) */}
        <PlayerShip position={playerScreenPosition} size={shipSize} rotation={shipRotation} />

        {/* UI Overlay */}
        <View style={styles.uiOverlay}>
          {/* Performance Monitor */}
          <PerformanceMonitor />

          {/* Game Timer */}
          <GameTimer
            isPlaying={isPlaying && !gameOver}
            isPaused={isPaused}
            onGameEnd={(finalTimeMs) => {
              setFinalTime(finalTimeMs);
              console.log('Game ended with time:', finalTimeMs);
            }}
          />

          {/* Joystick */}
          <Joystick onMove={handleJoystickMove} onRelease={handleJoystickRelease} />

          {isPaused && !gameOver && (
            <View style={styles.pauseOverlay}>
              <View style={styles.pausePanel}>
                <Text style={styles.pauseTitle}>Paused</Text>
                <TouchableOpacity style={styles.pausePrimaryButton} onPress={resumeGame} activeOpacity={0.8}>
                  <Text style={styles.pausePrimaryButtonText}>Resume</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pauseSecondaryButton} onPress={restartGame} activeOpacity={0.8}>
                  <Text style={styles.pauseSecondaryButtonText}>Restart</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pauseSecondaryButton} onPress={handleExitToMenu} activeOpacity={0.8}>
                  <Text style={styles.pauseSecondaryButtonText}>Main Menu</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {gameOver && (
            <View style={styles.gameOverOverlay}>
              {/* Game Over UI can be added here */}
            </View>
          )}

          {isPlaying && !gameOver && (
            <TouchableOpacity
              style={[styles.pauseToggleButton, { top: insets.top + 8 }]}
              onPress={togglePause}
              activeOpacity={0.8}
            >
              <Text style={styles.pauseToggleButtonText}>{isPaused ? 'Resume' : 'Pause'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#0a1220',
  },
  gameArea: {
    flex: 1,
    backgroundColor: '#0a1220',
  },
  uiOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  pausePanel: {
    width: 240,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: 'rgba(10, 18, 32, 0.95)',
    borderWidth: 2,
    borderColor: '#8ca1d1',
    alignItems: 'center',
  },
  pauseTitle: {
    color: '#f6e7c1',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 20,
    letterSpacing: 1,
  },
  pausePrimaryButton: {
    width: '100%',
    backgroundColor: '#1e2945',
    borderRadius: 8,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: '#f6a83b',
    alignItems: 'center',
    marginBottom: 12,
  },
  pausePrimaryButtonText: {
    color: '#f6e7c1',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pauseSecondaryButton: {
    width: '100%',
    backgroundColor: '#101522',
    borderRadius: 8,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: '#8ca1d1',
    alignItems: 'center',
    marginTop: 12,
  },
  pauseSecondaryButtonText: {
    color: '#f6e7c1',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pauseToggleButton: {
    position: 'absolute',
    right: 12,
    backgroundColor: 'rgba(16, 21, 34, 0.95)',
    borderWidth: 2,
    borderColor: '#8ca1d1',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    zIndex: 30,
  },
  pauseToggleButtonText: {
    color: '#f6e7c1',
    fontSize: 14,
    fontWeight: 'bold',
  },
  gameOverOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
