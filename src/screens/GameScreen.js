import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import SpaceChunk from '../components/SpaceChunk';
import Joystick from '../components/Joystick';
import GameTimer from '../components/GameTimer';
import { ChunkManager } from '../utils/ChunkManager';
import enemySprite from '../../assets/enemy.png';
import spaceshipSprite from '../../assets/spaceship.png';
import spaceshipShootingSprite from '../../assets/spaceshipShooting.png';

const MAIN_MENU_ROUTE = 'MainMenu';
const MAX_HEALTH = 100;
const ENEMY_MAX_HEALTH = 30;
const DAMAGE_PER_HIT = 20;
const DAMAGE_COOLDOWN_MS = 800;
const FIRE_INTERVAL_MS = 600;
const BULLET_DAMAGE = 10;
const BULLET_SPEED = 550;
const BULLET_SIZE = 10;
const BULLET_RENDER_SIZE = 45;
const BULLET_MAX_LIFETIME_MS = 2000;
const BULLET_SPRITE_ROTATION_OFFSET_DEG = 90;
const ENEMY_RENDER_SCALE = 1.65;
const ENEMY_FLASH_DURATION_MS = 120;
const BLINK_INTERVAL_MS = 80;
const PLAYER_FLASH_DURATION_MS = DAMAGE_COOLDOWN_MS * 0.75;
const ENEMY_COLLISION_RADIUS = 16;
const BULLET_COLLISION_RADIUS = 6;
const BULLET_ENEMY_HIT_RADIUS = 3;
const ENEMY_BULLET_HIT_RADIUS = 12;

function isColliding(x1, y1, r1, x2, y2, r2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distanceSq = dx * dx + dy * dy;
  const radiusSum = r1 + r2;
  return distanceSq <= radiusSum * radiusSum;
}

export default function GameScreen({ navigation }) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [playerHealth, setPlayerHealth] = useState(MAX_HEALTH);
  const [finalTime, setFinalTime] = useState(0);
  const [renderedEnemies, setRenderedEnemies] = useState([]);
  const [renderedBullets, setRenderedBullets] = useState([]);

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
  const isPlayingRef = useRef(isPlaying);
  const isPausedRef = useRef(isPaused);
  const gameOverRef = useRef(gameOver);
  const playerHealthRef = useRef(MAX_HEALTH);
  const lastUpdateTimeRef = useRef(Date.now());
  const lastChunkUpdateRef = useRef({ chunkX: null, chunkY: null });
  const frameCountRef = useRef(0);
  const enemiesRef = useRef([]);
  const bulletsRef = useRef([]);
  const enemySpawnAccumulatorRef = useRef(0);
  const fireAccumulatorRef = useRef(0);
  const enemyIdCounterRef = useRef(0);
  const bulletIdCounterRef = useRef(0);
  const lastDamageTimeRef = useRef(0);
  const didGameOverRef = useRef(false);

  // Ship properties
  const shipSize = 50;
  const shipSpeed = 130; // pixels per second

  // Chunk properties
  const chunkSize = 1000; // Size of each chunk in world units
  const viewRadius = 1; // How many chunks to keep around player (reduced for performance)
  const enemySpawnIntervalMs = 1500;
  const enemyMinSpeed = 70;
  const enemyMaxSpeed = 90;
  const enemySize = 32;
  const playerCollisionRadius = shipSize * 0.4;

  const getEnemySpawnAndDespawnRadii = useCallback(() => {
    const width = gameAreaLayout.width || screenWidth;
    const height = gameAreaLayout.height || screenHeight;
    const halfDiagonal = Math.sqrt(width * width + height * height) / 2;
    return {
      spawnRadius: halfDiagonal + 180,
      despawnRadius: halfDiagonal * 3 + 600,
    };
  }, [gameAreaLayout.height, gameAreaLayout.width, screenHeight, screenWidth]);

  const createEnemy = useCallback((playerX, playerY) => {
    const angle = Math.random() * Math.PI * 2;
    const { spawnRadius } = getEnemySpawnAndDespawnRadii();
    const speed = enemyMinSpeed + Math.random() * (enemyMaxSpeed - enemyMinSpeed);
    enemyIdCounterRef.current += 1;

    return {
      id: enemyIdCounterRef.current,
      x: playerX + Math.cos(angle) * spawnRadius,
      y: playerY + Math.sin(angle) * spawnRadius,
      maxHealth: ENEMY_MAX_HEALTH,
      health: ENEMY_MAX_HEALTH,
      flashUntil: 0,
      speed,
      size: enemySize,
    };
  }, [enemyMaxSpeed, enemyMinSpeed, enemySize, getEnemySpawnAndDespawnRadii]);

  const findNearestEnemy = useCallback((playerX, playerY, enemies) => {
    let nearestEnemy = null;
    let nearestDistanceSq = Infinity;

    for (let i = 0; i < enemies.length; i += 1) {
      const enemy = enemies[i];
      const dx = enemy.x - playerX;
      const dy = enemy.y - playerY;
      const distanceSq = dx * dx + dy * dy;

      if (distanceSq < nearestDistanceSq) {
        nearestDistanceSq = distanceSq;
        nearestEnemy = enemy;
      }
    }

    return nearestEnemy;
  }, []);

  const createBullet = useCallback((playerX, playerY, targetX, targetY) => {
    const dx = targetX - playerX;
    const dy = targetY - playerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= 0.0001) {
      return null;
    }

    bulletIdCounterRef.current += 1;
    const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;

    return {
      id: bulletIdCounterRef.current,
      x: playerX,
      y: playerY,
      dirX: dx / distance,
      dirY: dy / distance,
      angleDeg,
      damage: BULLET_DAMAGE,
      speed: BULLET_SPEED,
      size: BULLET_SIZE,
      ageMs: 0,
    };
  }, []);

  const stopGameLoop = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    isLoopRunningRef.current = false;
  }, []);

  const handleGameOver = useCallback(() => {
    if (didGameOverRef.current) {
      return;
    }

    didGameOverRef.current = true;
    gameOverRef.current = true;
    isPlayingRef.current = false;
    isPausedRef.current = false;
    joystickInputRef.current = { x: 0, y: 0 };
    stopGameLoop();
    setGameOver(true);
    setIsPlaying(false);
    setIsPaused(false);
  }, [stopGameLoop]);

  const resetRunState = useCallback(() => {
    playerWorldPositionRef.current = { x: 0, y: 0 };
    previousWorldPositionRef.current = { x: 0, y: 0 };
    alphaRef.current = 0;
    shipRotationRef.current = 0;
    joystickInputRef.current = { x: 0, y: 0 };
    lastUpdateTimeRef.current = null;
    frameCountRef.current = 0;
    enemySpawnAccumulatorRef.current = 0;
    fireAccumulatorRef.current = 0;
    enemyIdCounterRef.current = 0;
    bulletIdCounterRef.current = 0;
    enemiesRef.current = [];
    bulletsRef.current = [];
    playerHealthRef.current = MAX_HEALTH;
    lastDamageTimeRef.current = 0;
    didGameOverRef.current = false;
    gameOverRef.current = false;

    setPlayerWorldPosition({ x: 0, y: 0 });
    setShipRotation(0);
    setPlayerHealth(MAX_HEALTH);
    setRenderedEnemies([]);
    setRenderedBullets([]);

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

  useEffect(() => {
    playerHealthRef.current = playerHealth;
  }, [playerHealth]);

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
      const dt = Math.min(deltaTime / 1000, 0.05); // Clamp to avoid large jumps after stalls

      // Store previous position before applying movement
      previousWorldPositionRef.current = {
        x: playerWorldPositionRef.current.x,
        y: playerWorldPositionRef.current.y,
      };

      const joystickInput = joystickInputRef.current;

      // Update player world position based on joystick input
      if (joystickInput.x !== 0 || joystickInput.y !== 0) {
        // Time-based movement (frame-rate independent)
        const moveX = joystickInput.x * shipSpeed * dt;
        const moveY = joystickInput.y * shipSpeed * dt;

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

      // Enemy spawn/update/despawn
      const playerX = playerWorldPositionRef.current.x;
      const playerY = playerWorldPositionRef.current.y;
      const { despawnRadius } = getEnemySpawnAndDespawnRadii();
      const despawnRadiusSq = despawnRadius * despawnRadius;

      enemySpawnAccumulatorRef.current += deltaTime;
      while (enemySpawnAccumulatorRef.current >= enemySpawnIntervalMs) {
        enemySpawnAccumulatorRef.current -= enemySpawnIntervalMs;
        enemiesRef.current.push(createEnemy(playerX, playerY));
      }

      fireAccumulatorRef.current += deltaTime;
      while (fireAccumulatorRef.current >= FIRE_INTERVAL_MS) {
        fireAccumulatorRef.current -= FIRE_INTERVAL_MS;

        const nearestEnemy = findNearestEnemy(playerX, playerY, enemiesRef.current);
        if (!nearestEnemy) {
          continue;
        }

        const bullet = createBullet(playerX, playerY, nearestEnemy.x, nearestEnemy.y);
        if (bullet) {
          bulletsRef.current.push(bullet);
        }
      }

      const nextEnemies = [];
      let tookDamageThisFrame = false;
      for (let i = 0; i < enemiesRef.current.length; i += 1) {
        const enemy = enemiesRef.current[i];
        const dx = playerX - enemy.x;
        const dy = playerY - enemy.y;
        const distanceSq = dx * dx + dy * dy;

        // Despawn enemies that drift too far away to keep memory stable.
        if (distanceSq > despawnRadiusSq) {
          continue;
        }

        const distance = Math.sqrt(distanceSq);
        if (distance > 0.0001) {
          const dirX = dx / distance;
          const dirY = dy / distance;
          enemy.x += dirX * enemy.speed * dt;
          enemy.y += dirY * enemy.speed * dt;
        }

        const collisionDx = playerX - enemy.x;
        const collisionDy = playerY - enemy.y;
        const collisionDistanceSq = collisionDx * collisionDx + collisionDy * collisionDy;
        const collisionDistance = playerCollisionRadius + enemy.size / 2;
        if (
          !tookDamageThisFrame &&
          collisionDistanceSq <= collisionDistance * collisionDistance
        ) {
          const damageNow = Date.now();
          if (damageNow - lastDamageTimeRef.current >= DAMAGE_COOLDOWN_MS) {
            lastDamageTimeRef.current = damageNow;
            tookDamageThisFrame = true;

            const nextHealth = Math.max(playerHealthRef.current - DAMAGE_PER_HIT, 0);
            playerHealthRef.current = nextHealth;
            setPlayerHealth(nextHealth);

            if (nextHealth <= 0) {
              handleGameOver();
            }
          }
        }

        nextEnemies.push(enemy);
      }
      const bulletDespawnDistance = Math.max(gameAreaLayout.width, gameAreaLayout.height) * 2 + 400;
      const bulletDespawnDistanceSq = bulletDespawnDistance * bulletDespawnDistance;
      const nextBullets = [];

      for (let i = 0; i < bulletsRef.current.length; i += 1) {
        const bullet = bulletsRef.current[i];
        bullet.x += bullet.dirX * bullet.speed * dt;
        bullet.y += bullet.dirY * bullet.speed * dt;
        bullet.ageMs += deltaTime;

        if (bullet.ageMs > BULLET_MAX_LIFETIME_MS) {
          continue;
        }

        const dxFromPlayer = bullet.x - playerX;
        const dyFromPlayer = bullet.y - playerY;
        const distanceFromPlayerSq = dxFromPlayer * dxFromPlayer + dyFromPlayer * dyFromPlayer;
        if (distanceFromPlayerSq > bulletDespawnDistanceSq) {
          continue;
        }

        nextBullets.push(bullet);
      }

      const bulletsToRemove = new Set();
      const enemiesToRemove = new Set();

      for (let bulletIndex = 0; bulletIndex < nextBullets.length; bulletIndex += 1) {
        const bullet = nextBullets[bulletIndex];

        for (let enemyIndex = 0; enemyIndex < nextEnemies.length; enemyIndex += 1) {
          const enemy = nextEnemies[enemyIndex];

          if (enemiesToRemove.has(enemy.id)) {
            continue;
          }

          if (
            isColliding(
              bullet.x,
              bullet.y,
              BULLET_ENEMY_HIT_RADIUS,
              enemy.x,
              enemy.y,
              ENEMY_BULLET_HIT_RADIUS
            )
          ) {
            enemy.health -= bullet.damage;
            enemy.flashUntil = Date.now() + ENEMY_FLASH_DURATION_MS;
            bulletsToRemove.add(bullet.id);

            if (enemy.health <= 0) {
              enemiesToRemove.add(enemy.id);
            }
            break;
          }
        }
      }

      enemiesRef.current = nextEnemies.filter((enemy) => !enemiesToRemove.has(enemy.id));
      bulletsRef.current = nextBullets.filter((bullet) => !bulletsToRemove.has(bullet.id));

      // Render uses latest world position each frame
      alphaRef.current = 1;

      // Update state for world position less frequently (throttle to reduce re-renders)
      // Only update every 3 frames to reduce re-renders while keeping smooth camera
      frameCountRef.current += 1;
      if (frameCountRef.current % 3 === 0) {
        setPlayerWorldPosition({
          x: playerWorldPositionRef.current.x,
          y: playerWorldPositionRef.current.y,
        });
        setRenderedEnemies([...enemiesRef.current]);
        setRenderedBullets([...bulletsRef.current]);
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      stopGameLoop();
    };
  }, [
    createBullet,
    createEnemy,
    findNearestEnemy,
    handleGameOver,
    enemySpawnIntervalMs,
    gameOver,
    getEnemySpawnAndDespawnRadii,
    gameAreaLayout.height,
    gameAreaLayout.width,
    isPaused,
    isPlaying,
    playerCollisionRadius,
    shipSpeed,
    stopGameLoop,
  ]);

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

  const formatElapsedTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const healthRatio = Math.max(0, Math.min(playerHealth / MAX_HEALTH, 1));
  const healthBarColor = healthRatio > 0.6 ? '#63d471' : healthRatio > 0.3 ? '#f6a83b' : '#d63f3f';
  const now = Date.now();
  const playerFlashUntil = lastDamageTimeRef.current + PLAYER_FLASH_DURATION_MS;
  const isPlayerFlashing = now < playerFlashUntil;
  const shouldShowPlayerFlash = isPlayerFlashing && Math.floor(now / BLINK_INTERVAL_MS) % 2 === 0;
  const playerShipTransform = [{ rotate: `${shipRotation}rad` }];

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

        {/* Enemies in world space */}
        {renderedEnemies.map((enemy) => {
          const renderSize = enemy.size * ENEMY_RENDER_SCALE;
          const isEnemyFlashing = now < enemy.flashUntil;
          const shouldShowEnemyFlash = isEnemyFlashing && Math.floor(now / BLINK_INTERVAL_MS) % 2 === 0;

          return (
            <View
              key={enemy.id}
              pointerEvents="none"
              style={[
                styles.enemy,
                {
                  width: renderSize,
                  height: renderSize,
                  left: enemy.x - worldOffsetX - renderSize / 2,
                  top: enemy.y - worldOffsetY - renderSize / 2,
                },
              ]}
            >
              <Image source={enemySprite} style={styles.enemySprite} resizeMode="contain" />
              {shouldShowEnemyFlash && (
                <Image
                  source={enemySprite}
                  style={[styles.enemySprite, styles.flashSpriteOverlay]}
                  resizeMode="contain"
                  pointerEvents="none"
                />
              )}
            </View>
          );
        })}

        {renderedBullets.map((bullet) => (
          <Image
            key={bullet.id}
            source={spaceshipShootingSprite}
            pointerEvents="none"
            style={[
              styles.bullet,
              {
                width: BULLET_RENDER_SIZE,
                height: BULLET_RENDER_SIZE,
                left: bullet.x - worldOffsetX - BULLET_RENDER_SIZE / 2,
                top: bullet.y - worldOffsetY - BULLET_RENDER_SIZE / 2,
                transform: [{ rotate: `${bullet.angleDeg + BULLET_SPRITE_ROTATION_OFFSET_DEG}deg` }],
              },
            ]}
            resizeMode="contain"
          />
        ))}

        {/* Game content - Player ship (always centered on screen) */}
        <View
          pointerEvents="none"
          style={[
            styles.playerShipWrapper,
            {
              left: playerScreenPosition.x - shipSize / 2,
              top: playerScreenPosition.y - shipSize / 2,
              width: shipSize,
              height: shipSize,
              transform: playerShipTransform,
            },
          ]}
        >
          <Image source={spaceshipSprite} style={styles.playerShipSprite} resizeMode="contain" />
          {shouldShowPlayerFlash && (
            <Image
              source={spaceshipSprite}
              style={[styles.playerShipSprite, styles.playerFlashSpriteOverlay]}
              resizeMode="contain"
              pointerEvents="none"
            />
          )}
        </View>

        {/* UI Overlay */}
        <View style={styles.uiOverlay}>
          {/* Game Timer */}
          <GameTimer
            isPlaying={isPlaying && !gameOver}
            isPaused={isPaused}
            dimmed={isPaused}
            onGameEnd={(finalTimeMs) => {
              setFinalTime(finalTimeMs);
              console.log('Game ended with time:', finalTimeMs);
            }}
          />

          {!gameOver && (
            <View style={[styles.healthHud, isPaused && styles.healthHudDimmed, { top: 2, left: 20 }]}>
              <Text style={[styles.healthLabel, isPaused && styles.healthTextDimmed]}>HP</Text>
              <View style={styles.healthBarTrack}>
                <View
                  style={[
                    styles.healthBarFill,
                    { width: `${healthRatio * 100}%`, backgroundColor: healthBarColor },
                  ]}
                />
              </View>
              <Text style={[styles.healthValueText, isPaused && styles.healthTextDimmed]}>
                {playerHealth} / {MAX_HEALTH}
              </Text>
            </View>
          )}

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
              <View style={styles.gameOverPanel}>
                <Text style={styles.gameOverTitle}>Game Over</Text>
                <Text style={styles.gameOverTimeText}>Survived: {formatElapsedTime(finalTime)}</Text>
                <TouchableOpacity style={styles.pausePrimaryButton} onPress={restartGame} activeOpacity={0.8}>
                  <Text style={styles.pausePrimaryButtonText}>Restart</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pauseSecondaryButton} onPress={handleExitToMenu} activeOpacity={0.8}>
                  <Text style={styles.pauseSecondaryButtonText}>Main Menu</Text>
                </TouchableOpacity>
              </View>
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
  enemy: {
    position: 'absolute',
  },
  enemySprite: {
    width: '100%',
    height: '100%',
  },
  bullet: {
    position: 'absolute',
  },
  playerShipWrapper: {
    position: 'absolute',
  },
  playerShipSprite: {
    width: '100%',
    height: '100%',
  },
  flashSpriteOverlay: {
    ...StyleSheet.absoluteFillObject,
    tintColor: '#ffffff',
    opacity: 0.9,
  },
  playerFlashSpriteOverlay: {
    ...StyleSheet.absoluteFillObject,
    tintColor: '#ffffff',
    opacity: 0.5,
  },
  uiOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
  healthHud: {
    position: 'absolute',
    alignItems: 'flex-start',
    zIndex: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#0a1220',
  },
  healthHudDimmed: {
    opacity: 0.45,
  },
  healthLabel: {
    color: '#f6e7c1',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
    letterSpacing: 1,
  },
  healthBarTrack: {
    width: 160,
    height: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  healthBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  healthValueText: {
    color: '#f6e7c1',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 2,
    letterSpacing: 0.5,
  },
  healthTextDimmed: {
    color: '#9aa3b5',
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  gameOverPanel: {
    width: 240,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: 'rgba(10, 18, 32, 0.95)',
    borderWidth: 2,
    borderColor: '#d63f3f',
    alignItems: 'center',
  },
  gameOverTitle: {
    color: '#f6e7c1',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 12,
    letterSpacing: 1,
  },
  gameOverTimeText: {
    color: '#f6e7c1',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});
