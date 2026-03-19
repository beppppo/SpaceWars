import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Image, Vibration } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import SpaceChunk from '../components/SpaceChunk';
import Joystick from '../components/Joystick';
import GameTimer from '../components/GameTimer';
import { ChunkManager } from '../utils/ChunkManager';
import { playDeathSound, playLevelUpSound, playShootSound, stopBackgroundMusic } from '../services/audioManager';
import enemySprite from '../../assets/enemy.png';
import expCrystalSprite from '../../assets/expcrystal.png';
import spaceshipSprite from '../../assets/spaceship.png';
import spaceshipShootingSprite from '../../assets/spaceshipShooting.png';

const MAIN_MENU_ROUTE = 'MainMenu';
const INITIAL_MAX_HEALTH = 100;
const BASE_ENEMY_HEALTH = 20;
const BASE_ENEMY_SPEED = 70;
const BASE_ENEMY_SPAWN_INTERVAL_MS = 900;
const DAMAGE_PER_HIT = 10;
const DAMAGE_COOLDOWN_MS = 800;
const INITIAL_FIRE_INTERVAL_MS = 550;
const INITIAL_BULLET_DAMAGE = 15;
const BULLET_SPEED = 550;
const INITIAL_BULLET_SIZE = 10;
const INITIAL_PLAYER_SPEED = 150;
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
const HEALTH_DROP_CHANCE = 0.005;
const HEALTH_DROP_HEAL_AMOUNT = 50;
const MAX_HEALTH_DROPS = 5;
const HEALTH_DROP_LIFETIME = 24000;
const HEALTH_DROP_PICKUP_RADIUS = 18;
const HEALTH_DROP_SIZE = 18;
const MAGNET_DROP_CHANCE = 0.002;
const MAX_MAGNET_DROPS = 2;
const MAGNET_DROP_LIFETIME = 24000;
const MAGNET_DROP_ATTRACTION_RADIUS = 24;
const MAGNET_DROP_COLLECT_RADIUS = 10;
const MAGNET_DROP_SIZE = 20;
const EXP_CRYSTAL_VALUE = 10;
const EXP_CRYSTAL_SIZE = 16;
const EXP_CRYSTAL_MERGE_RADIUS = 40;
const EXP_CRYSTAL_MEDIUM_COUNT_THRESHOLD = 60;
const EXP_CRYSTAL_HIGH_COUNT_THRESHOLD = 90;
const EXP_CRYSTAL_MEDIUM_COUNT_MERGE_RADIUS = 55;
const EXP_CRYSTAL_HIGH_COUNT_MERGE_RADIUS = 70;
const EXP_CRYSTAL_MERGE_INTERVAL_MS = 750;
const CRYSTAL_RENDER_MARGIN = 80;
const INITIAL_PLAYER_LEVEL = 1;
const INITIAL_EXP_TO_NEXT_LEVEL = 100;
const INITIAL_PICKUP_RADIUS = 28;
const EXP_CRYSTAL_PICKUP_RADIUS = 12;
const CRYSTAL_COLLECT_SPEED = 400;
const CRYSTAL_COLLECT_COMPLETE_RADIUS = 8;
const EXP_BAR_WIDTH = 160;
const EXP_BAR_FLASH_DURATION_MS = 700;
const RENDER_SYNC_INTERVAL_MS = 33;
const INITIAL_EXP_MULTIPLIER = 1;
const INITIAL_BULLET_PIERCE_COUNT = 1;
const INITIAL_SHOT_COUNT = 1;
// Victory condition (10 minutes)
// For testing you can temporarily change to something like 10000 (10s)
const VICTORY_TIME_MS = 10 * 60 * 1000;
const DOUBLE_SHOT_SPAWN_OFFSET = 8;
const DOUBLE_SHOT_ANGLE_OFFSET_DEG = 8;
const TRIPLE_SHOT_ANGLE_OFFSET_DEG = 12;

const UPGRADE_POOL = [
  { id: 'damage_up', title: 'Power Shots', description: 'Increase bullet damage by 5', repeatable: true },
  { id: 'fire_rate', title: 'Rapid Fire', description: 'Shoot 10% faster', repeatable: true },
  { id: 'hp_up', title: 'Reinforced Hull', description: 'Increase max HP by 20 and heal 20 HP', repeatable: true },
  { id: 'move_speed', title: 'Engine Boost', description: 'Increase movement speed by 20', repeatable: true },
  { id: 'exp_worth', title: 'Knowledge Core', description: 'Increase EXP gained by 15%', repeatable: true },
  { id: 'magnet_size', title: 'Gravity Field', description: 'Increase crystal pickup radius', repeatable: true },
  {
    id: 'piercing',
    title: 'Piercing Rounds',
    description: '+1 bullet piercing',
    repeatable: true,
  },
  {
    id: 'double_shot',
    title: 'Twin Fire',
    description: 'Shoot 2 bullets at once',
    repeatable: false,
    exclusiveWith: 'triple_shot',
  },
  {
    id: 'triple_shot',
    title: 'Spread Burst',
    description: 'Shoot 3 bullets at once, but slower',
    repeatable: false,
    exclusiveWith: 'double_shot',
  },
];

function isColliding(x1, y1, r1, x2, y2, r2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distanceSq = dx * dx + dy * dy;
  const radiusSum = r1 + r2;
  return distanceSq <= radiusSum * radiusSum;
}

function getNextExpRequirement(currentRequirement) {
  return Math.floor(currentRequirement * 1.25);
}

function getSpawnInterval(timeSeconds) {
  const spawnLevel = Math.floor(timeSeconds / 12);
  return Math.max(300, Math.floor(BASE_ENEMY_SPAWN_INTERVAL_MS * Math.pow(0.95, spawnLevel)));
}

function getEnemyHealth(timeSeconds) {
  const spawnLevel = Math.floor(timeSeconds / 90);
  return BASE_ENEMY_HEALTH + spawnLevel * 2;
}

function getEnemySpeed(timeSeconds) {
  const speedLevel = Math.floor(timeSeconds / 120);
  return BASE_ENEMY_SPEED + speedLevel * 3;
}

function getMinimumActiveEnemies(timeSeconds) {
  if (timeSeconds < 30) {
    return 14;
  }

  if (timeSeconds < 60) {
    return 18;
  }

  if (timeSeconds < 120) {
    return 24;
  }

  if (timeSeconds < 300) {
    return 30;
  }

  return 36;
}

function getSpawnMargin(timeSeconds) {
  if (timeSeconds < 300) {
    return 80;
  }

  return 180;
}

function getExpCrystalMergeRadius(crystalCount) {
  if (crystalCount > EXP_CRYSTAL_HIGH_COUNT_THRESHOLD) {
    return EXP_CRYSTAL_HIGH_COUNT_MERGE_RADIUS;
  }

  if (crystalCount > EXP_CRYSTAL_MEDIUM_COUNT_THRESHOLD) {
    return EXP_CRYSTAL_MEDIUM_COUNT_MERGE_RADIUS;
  }

  return EXP_CRYSTAL_MERGE_RADIUS;
}

export default function GameScreen({ navigation, vibrationEnabled = true, showFpsEnabled = true }) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isLevelUpMenuOpen, setIsLevelUpMenuOpen] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [isVictoryMenuOpen, setIsVictoryMenuOpen] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [playerHealth, setPlayerHealth] = useState(INITIAL_MAX_HEALTH);
  const [playerMaxHealth, setPlayerMaxHealth] = useState(INITIAL_MAX_HEALTH);
  const [playerExp, setPlayerExp] = useState(0);
  const [playerLevel, setPlayerLevel] = useState(INITIAL_PLAYER_LEVEL);
  const [expToNextLevel, setExpToNextLevel] = useState(INITIAL_EXP_TO_NEXT_LEVEL);
  const [currentUpgradeOptions, setCurrentUpgradeOptions] = useState([]);
  const [pendingLevelUps, setPendingLevelUps] = useState(0);
  const [acquiredUpgradeIds, setAcquiredUpgradeIds] = useState([]);
  const [fireIntervalMs, setFireIntervalMs] = useState(INITIAL_FIRE_INTERVAL_MS);
  const [bulletDamage, setBulletDamage] = useState(INITIAL_BULLET_DAMAGE);
  const [bulletSize, setBulletSize] = useState(INITIAL_BULLET_SIZE);
  const [playerSpeed, setPlayerSpeed] = useState(INITIAL_PLAYER_SPEED);
  const [expMultiplier, setExpMultiplier] = useState(INITIAL_EXP_MULTIPLIER);
  const [pickupRadius, setPickupRadius] = useState(INITIAL_PICKUP_RADIUS);
  const [bulletPierceCount, setBulletPierceCount] = useState(INITIAL_BULLET_PIERCE_COUNT);
  const [shotCount, setShotCount] = useState(INITIAL_SHOT_COUNT);
  const [finalTime, setFinalTime] = useState(0);
  const [fps, setFps] = useState(0);
  const [, setRenderTick] = useState(0);

  // World and chunk management
  const chunkManagerRef = useRef(null);
  const [activeChunks, setActiveChunks] = useState([]);

  // Game area dimensions (measured from actual layout)
  const [gameAreaLayout, setGameAreaLayout] = useState({ width: screenWidth, height: screenHeight });

  // Player world position (infinite space coordinates) - simulation stays in refs
  const playerWorldPositionRef = useRef({ x: 0, y: 0 });

  // For interpolation
  const previousWorldPositionRef = useRef({ x: 0, y: 0 });
  const alphaRef = useRef(0);

  // Player screen position (always centered on game area)
  const playerScreenPosition = {
    x: gameAreaLayout.width / 2,
    y: gameAreaLayout.height / 2,
  };

  const shipRotationRef = useRef(0);
  const joystickInputRef = useRef({ x: 0, y: 0 }); // Normalized joystick input (-1 to 1)
  const animationFrameRef = useRef(null);
  const restartFrameRef = useRef(null);
  const isLoopRunningRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);
  const isPausedRef = useRef(isPaused);
  const isLevelUpMenuOpenRef = useRef(isLevelUpMenuOpen);
  const hasWonRef = useRef(hasWon);
  const isVictoryMenuOpenRef = useRef(isVictoryMenuOpen);
  const gameOverRef = useRef(gameOver);
  const playerHealthRef = useRef(INITIAL_MAX_HEALTH);
  const playerMaxHealthRef = useRef(INITIAL_MAX_HEALTH);
  const playerExpRef = useRef(0);
  const playerLevelRef = useRef(INITIAL_PLAYER_LEVEL);
  const expToNextLevelRef = useRef(INITIAL_EXP_TO_NEXT_LEVEL);
  const pendingLevelUpsRef = useRef(0);
  const acquiredUpgradeIdsRef = useRef(new Set());
  const fireIntervalMsRef = useRef(INITIAL_FIRE_INTERVAL_MS);
  const bulletDamageRef = useRef(INITIAL_BULLET_DAMAGE);
  const bulletSizeRef = useRef(INITIAL_BULLET_SIZE);
  const playerSpeedRef = useRef(INITIAL_PLAYER_SPEED);
  const expMultiplierRef = useRef(INITIAL_EXP_MULTIPLIER);
  const pickupRadiusRef = useRef(INITIAL_PICKUP_RADIUS);
  const bulletPierceCountRef = useRef(INITIAL_BULLET_PIERCE_COUNT);
  const shotCountRef = useRef(INITIAL_SHOT_COUNT);
  const lastUpdateTimeRef = useRef(Date.now());
  const lastChunkUpdateRef = useRef({ chunkX: null, chunkY: null });
  const lastRenderSyncTimeRef = useRef(0);
  const enemiesRef = useRef([]);
  const bulletsRef = useRef([]);
  const expCrystalsRef = useRef([]);
  const healthDropsRef = useRef([]);
  const magnetDropsRef = useRef([]);
  const enemySpawnAccumulatorRef = useRef(0);
  const fireAccumulatorRef = useRef(0);
  const enemyIdCounterRef = useRef(0);
  const bulletIdCounterRef = useRef(0);
  const expCrystalIdCounterRef = useRef(0);
  const healthDropIdCounterRef = useRef(0);
  const magnetDropIdCounterRef = useRef(0);
  const fpsFrameCountRef = useRef(0);
  const lastFpsUpdateTimeRef = useRef(0);
  const lastCrystalMergeTimeRef = useRef(0);
  const lastDamageTimeRef = useRef(0);
  const didGameOverRef = useRef(false);
  const gameOverTimeoutRef = useRef(null);
  const expBarFlashUntilRef = useRef(0);
  const survivalTimeMsRef = useRef(0);

  // Ship properties
  const shipSize = 50;
  // Chunk properties
  const chunkSize = 1000; // Size of each chunk in world units
  const viewRadius = 1; // How many chunks to keep around player (reduced for performance)
  const enemySize = 32;
  const playerCollisionRadius = shipSize * 0.4;

  useFocusEffect(
    useCallback(() => {
      console.log('[audio] GameScreen stopping background music');
      stopBackgroundMusic();

      return undefined;
    }, [])
  );

  const getEnemySpawnAndDespawnRadii = useCallback((timeSeconds = Number.POSITIVE_INFINITY) => {
    const width = gameAreaLayout.width || screenWidth;
    const height = gameAreaLayout.height || screenHeight;
    const halfDiagonal = Math.sqrt(width * width + height * height) / 2;
    const spawnMargin = getSpawnMargin(timeSeconds);
    return {
      spawnRadius: halfDiagonal + spawnMargin,
      despawnRadius: halfDiagonal * 3 + 600,
    };
  }, [gameAreaLayout.height, gameAreaLayout.width, screenHeight, screenWidth]);

  const createEnemy = useCallback((playerX, playerY, timeSeconds) => {
    const angle = Math.random() * Math.PI * 2;
    const { spawnRadius } = getEnemySpawnAndDespawnRadii(timeSeconds);
    let speed = getEnemySpeed(timeSeconds);
    const maxEnemySpeed = playerSpeedRef.current * 0.75;
    speed = Math.min(speed, maxEnemySpeed);
    const maxHealth = getEnemyHealth(timeSeconds);
    enemyIdCounterRef.current += 1;

    return {
      id: enemyIdCounterRef.current,
      x: playerX + Math.cos(angle) * spawnRadius,
      y: playerY + Math.sin(angle) * spawnRadius,
      maxHealth,
      health: maxHealth,
      flashUntil: 0,
      speed,
      size: enemySize,
    };
  }, [enemySize, getEnemySpawnAndDespawnRadii]);

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

  const createBullet = useCallback((playerX, playerY, targetX, targetY, angleOffsetDeg = 0, spawnOffset = null) => {
    const dx = targetX - playerX;
    const dy = targetY - playerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= 0.0001) {
      return null;
    }

    bulletIdCounterRef.current += 1;
    const baseAngleRad = Math.atan2(dy, dx);
    const angleRad = baseAngleRad + (angleOffsetDeg * Math.PI) / 180;
    const dirX = Math.cos(angleRad);
    const dirY = Math.sin(angleRad);
    const angleDeg = angleRad * 180 / Math.PI;

    return {
      id: bulletIdCounterRef.current,
      x: spawnOffset ? playerX + spawnOffset.x : playerX,
      y: spawnOffset ? playerY + spawnOffset.y : playerY,
      dirX,
      dirY,
      angleDeg,
      damage: bulletDamageRef.current,
      speed: BULLET_SPEED,
      size: bulletSizeRef.current,
      hitRadius: Math.max(BULLET_ENEMY_HIT_RADIUS, Math.floor(bulletSizeRef.current * 0.35)),
      maxPierces: bulletPierceCountRef.current,
      hitCount: 0,
      piercedEnemyIds: new Set(),
      ageMs: 0,
    };
  }, []);

  const createExpCrystal = useCallback((x, y, value = EXP_CRYSTAL_VALUE) => {
    expCrystalIdCounterRef.current += 1;

    return {
      id: expCrystalIdCounterRef.current,
      x,
      y,
      value,
      size: EXP_CRYSTAL_SIZE,
      isCollecting: false,
      collectSpeed: CRYSTAL_COLLECT_SPEED,
    };
  }, []);

  const createHealthDrop = useCallback((x, y) => {
    healthDropIdCounterRef.current += 1;

    return {
      id: healthDropIdCounterRef.current,
      x,
      y,
      size: HEALTH_DROP_SIZE,
      isCollecting: false,
      collectSpeed: CRYSTAL_COLLECT_SPEED,
      ageMs: 0,
    };
  }, []);

  const trySpawnHealthDrop = useCallback((x, y) => {
    if (playerHealthRef.current >= playerMaxHealthRef.current) {
      return null;
    }

    if (healthDropsRef.current.length >= MAX_HEALTH_DROPS) {
      return null;
    }

    if (Math.random() > HEALTH_DROP_CHANCE) {
      return null;
    }

    const healthDrop = createHealthDrop(x, y);
    healthDropsRef.current.push(healthDrop);
    return healthDrop;
  }, [createHealthDrop]);

  const createMagnetDrop = useCallback((x, y) => {
    magnetDropIdCounterRef.current += 1;

    return {
      id: magnetDropIdCounterRef.current,
      x,
      y,
      size: MAGNET_DROP_SIZE,
      isCollecting: false,
      collectSpeed: CRYSTAL_COLLECT_SPEED,
      ageMs: 0,
    };
  }, []);

  const trySpawnMagnetDrop = useCallback((x, y) => {
    if (magnetDropsRef.current.length >= MAX_MAGNET_DROPS) {
      return null;
    }

    if (Math.random() > MAGNET_DROP_CHANCE) {
      return null;
    }

    const magnetDrop = createMagnetDrop(x, y);
    magnetDropsRef.current.push(magnetDrop);
    return magnetDrop;
  }, [createMagnetDrop]);

  const activateMagnetEffect = useCallback(() => {
    const crystals = expCrystalsRef.current;

    for (let i = 0; i < crystals.length; i += 1) {
      const crystal = crystals[i];
      if (crystal.isCollecting) {
        continue;
      }

      crystal.isCollecting = true;
    }
  }, []);

  const addExpCrystal = useCallback((x, y, value = EXP_CRYSTAL_VALUE) => {
    const crystals = expCrystalsRef.current;
    const mergeRadius = getExpCrystalMergeRadius(crystals.length);
    const mergeRadiusSq = mergeRadius * mergeRadius;
    let nearestCrystal = null;
    let nearestDistanceSq = Infinity;

    for (let i = 0; i < crystals.length; i += 1) {
      const crystal = crystals[i];
      if (crystal.isCollecting) {
        continue;
      }

      const dx = crystal.x - x;
      const dy = crystal.y - y;
      const distanceSq = dx * dx + dy * dy;

      if (distanceSq <= mergeRadiusSq && distanceSq < nearestDistanceSq) {
        nearestDistanceSq = distanceSq;
        nearestCrystal = crystal;
      }
    }

    if (nearestCrystal) {
      nearestCrystal.value += value;
      return nearestCrystal;
    }

    const newCrystal = createExpCrystal(x, y, value);
    crystals.push(newCrystal);
    return newCrystal;
  }, [createExpCrystal]);

  const mergeNearbyExpCrystals = useCallback(() => {
    const crystals = expCrystalsRef.current;
    const crystalCount = crystals.length;

    if (crystalCount < 2) {
      return;
    }

    const mergeRadius = getExpCrystalMergeRadius(crystalCount);
    const mergeRadiusSq = mergeRadius * mergeRadius;
    let hasMerged = false;

    for (let i = 0; i < crystalCount; i += 1) {
      const baseCrystal = crystals[i];
      if (baseCrystal.isCollecting || baseCrystal._merged) {
        continue;
      }

      for (let j = i + 1; j < crystalCount; j += 1) {
        const candidateCrystal = crystals[j];
        if (candidateCrystal.isCollecting || candidateCrystal._merged) {
          continue;
        }

        const dx = baseCrystal.x - candidateCrystal.x;
        const dy = baseCrystal.y - candidateCrystal.y;
        const distanceSq = dx * dx + dy * dy;

        if (distanceSq <= mergeRadiusSq) {
          baseCrystal.value += candidateCrystal.value;
          candidateCrystal._merged = true;
          hasMerged = true;
        }
      }
    }

    if (!hasMerged) {
      return;
    }

    let writeIndex = 0;
    for (let i = 0; i < crystalCount; i += 1) {
      const crystal = crystals[i];
      if (crystal._merged) {
        crystal._merged = false;
        continue;
      }

      crystals[writeIndex] = crystal;
      writeIndex += 1;
    }

    crystals.length = writeIndex;
  }, []);

  const stopGameLoop = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    isLoopRunningRef.current = false;
  }, []);

  const getRandomUpgradeOptions = useCallback((count = 3) => {
    const pool = UPGRADE_POOL.filter((upgrade) => {
      if (!upgrade.repeatable && acquiredUpgradeIdsRef.current.has(upgrade.id)) {
        return false;
      }

      if (upgrade.exclusiveWith && acquiredUpgradeIdsRef.current.has(upgrade.exclusiveWith)) {
        return false;
      }

      return true;
    });

    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const selectedOptions = [];
    const selectedUpgradeIds = new Set();

    for (let i = 0; i < pool.length && selectedOptions.length < count; i += 1) {
      const upgrade = pool[i];

      if (selectedUpgradeIds.has(upgrade.id)) {
        continue;
      }

      if (upgrade.exclusiveWith && selectedUpgradeIds.has(upgrade.exclusiveWith)) {
        continue;
      }

      selectedOptions.push(upgrade);
      selectedUpgradeIds.add(upgrade.id);
    }

    return selectedOptions;
  }, []);

  const openLevelUpMenu = useCallback(() => {
    setCurrentUpgradeOptions(getRandomUpgradeOptions(3));
    setIsLevelUpMenuOpen(true);
  }, [getRandomUpgradeOptions]);

  const addPlayerExp = useCallback((amount) => {
    if (amount <= 0 || gameOverRef.current) {
      return;
    }

    let newExp = playerExpRef.current + amount;
    let newLevel = playerLevelRef.current;
    let newRequiredExp = expToNextLevelRef.current;
    let levelsGained = 0;

    while (newExp >= newRequiredExp) {
      newExp -= newRequiredExp;
      newLevel += 1;
      levelsGained += 1;
      newRequiredExp = getNextExpRequirement(newRequiredExp);
      expBarFlashUntilRef.current = Date.now() + EXP_BAR_FLASH_DURATION_MS;
    }

    playerExpRef.current = newExp;
    playerLevelRef.current = newLevel;
    expToNextLevelRef.current = newRequiredExp;

    setPlayerExp(newExp);
    setPlayerLevel(newLevel);
    setExpToNextLevel(newRequiredExp);
    if (levelsGained > 0) {
      playLevelUpSound();
      pendingLevelUpsRef.current += levelsGained;
      setPendingLevelUps(pendingLevelUpsRef.current);

      if (!isLevelUpMenuOpenRef.current) {
        openLevelUpMenu();
      }
    }
  }, [openLevelUpMenu]);

  const handleSelectUpgrade = useCallback((upgradeId) => {
    const selectedUpgrade = UPGRADE_POOL.find((upgrade) => upgrade.id === upgradeId);

    switch (upgradeId) {
      case 'fire_rate': {
        const nextFireIntervalMs = Math.max(150, Math.floor(fireIntervalMsRef.current * 0.9));
        fireIntervalMsRef.current = nextFireIntervalMs;
        setFireIntervalMs(nextFireIntervalMs);
        break;
      }
      case 'damage_up': {
        const nextBulletDamage = bulletDamageRef.current + 5;
        bulletDamageRef.current = nextBulletDamage;
        setBulletDamage(nextBulletDamage);
        break;
      }
      case 'hp_up': {
        const nextMaxHealth = playerMaxHealthRef.current + 20;
        const nextHealth = Math.min(playerHealthRef.current + 20, nextMaxHealth);
        playerMaxHealthRef.current = nextMaxHealth;
        playerHealthRef.current = nextHealth;
        setPlayerMaxHealth(nextMaxHealth);
        setPlayerHealth(nextHealth);
        break;
      }
      case 'move_speed': {
        const nextPlayerSpeed = playerSpeedRef.current + 20;
        playerSpeedRef.current = nextPlayerSpeed;
        setPlayerSpeed(nextPlayerSpeed);
        break;
      }
      case 'exp_worth': {
        const nextExpMultiplier = expMultiplierRef.current + 0.15;
        expMultiplierRef.current = nextExpMultiplier;
        setExpMultiplier(nextExpMultiplier);
        break;
      }
      case 'magnet_size': {
        const nextPickupRadius = pickupRadiusRef.current + 20;
        pickupRadiusRef.current = nextPickupRadius;
        setPickupRadius(nextPickupRadius);
        break;
      }
      case 'piercing': {
        const nextBulletPierceCount = bulletPierceCountRef.current + 1;
        bulletPierceCountRef.current = nextBulletPierceCount;
        setBulletPierceCount(nextBulletPierceCount);
        break;
      }
      case 'double_shot': {
        shotCountRef.current = 2;
        setShotCount(2);
        break;
      }
      case 'triple_shot': {
        shotCountRef.current = 3;
        setShotCount(3);
        const slowerFireInterval = Math.max(150, Math.floor(fireIntervalMsRef.current * 1.15));
        fireIntervalMsRef.current = slowerFireInterval;
        setFireIntervalMs(slowerFireInterval);
        break;
      }
      default:
        break;
    }

    if (selectedUpgrade && !selectedUpgrade.repeatable) {
      const nextAcquiredUpgradeIds = [...acquiredUpgradeIdsRef.current, selectedUpgrade.id];
      acquiredUpgradeIdsRef.current = new Set(nextAcquiredUpgradeIds);
      setAcquiredUpgradeIds(nextAcquiredUpgradeIds);
    }

    const remainingLevelUps = Math.max(pendingLevelUpsRef.current - 1, 0);
    pendingLevelUpsRef.current = remainingLevelUps;
    setPendingLevelUps(remainingLevelUps);

    if (remainingLevelUps > 0) {
      setCurrentUpgradeOptions(getRandomUpgradeOptions(3));
      return;
    }

    setCurrentUpgradeOptions([]);
    setIsLevelUpMenuOpen(false);
  }, [getRandomUpgradeOptions]);

  const handleGameOver = useCallback(() => {
    if (didGameOverRef.current) {
      return;
    }

    didGameOverRef.current = true;
    console.log('[audio] player death triggered');
    playDeathSound();
    if (vibrationEnabled) {
      Vibration.vibrate([0, 200, 100, 300]);
    }
    joystickInputRef.current = { x: 0, y: 0 };

    if (gameOverTimeoutRef.current !== null) {
      clearTimeout(gameOverTimeoutRef.current);
    }

    gameOverTimeoutRef.current = setTimeout(() => {
      gameOverRef.current = true;
      isPlayingRef.current = false;
      isPausedRef.current = false;
      stopGameLoop();
      setGameOver(true);
      setIsPlaying(false);
      setIsPaused(false);
      gameOverTimeoutRef.current = null;
    }, 300);
  }, [stopGameLoop, vibrationEnabled]);

  const resetRunState = useCallback(() => {
    playerWorldPositionRef.current = { x: 0, y: 0 };
    previousWorldPositionRef.current = { x: 0, y: 0 };
    alphaRef.current = 0;
    shipRotationRef.current = 0;
    joystickInputRef.current = { x: 0, y: 0 };
    lastUpdateTimeRef.current = null;
    lastRenderSyncTimeRef.current = 0;
    enemySpawnAccumulatorRef.current = 0;
    fireAccumulatorRef.current = 0;
    enemyIdCounterRef.current = 0;
    bulletIdCounterRef.current = 0;
    expCrystalIdCounterRef.current = 0;
    healthDropIdCounterRef.current = 0;
    magnetDropIdCounterRef.current = 0;
    fpsFrameCountRef.current = 0;
    lastFpsUpdateTimeRef.current = 0;
    lastCrystalMergeTimeRef.current = 0;
    enemiesRef.current = [];
    bulletsRef.current = [];
    expCrystalsRef.current = [];
    healthDropsRef.current = [];
    magnetDropsRef.current = [];
    if (gameOverTimeoutRef.current !== null) {
      clearTimeout(gameOverTimeoutRef.current);
      gameOverTimeoutRef.current = null;
    }
    playerHealthRef.current = INITIAL_MAX_HEALTH;
    playerMaxHealthRef.current = INITIAL_MAX_HEALTH;
    lastDamageTimeRef.current = 0;
    didGameOverRef.current = false;
    isLevelUpMenuOpenRef.current = false;
    hasWonRef.current = false;
    isVictoryMenuOpenRef.current = false;
    gameOverRef.current = false;
    pendingLevelUpsRef.current = 0;
    acquiredUpgradeIdsRef.current = new Set();
    fireIntervalMsRef.current = INITIAL_FIRE_INTERVAL_MS;
    bulletDamageRef.current = INITIAL_BULLET_DAMAGE;
    bulletSizeRef.current = INITIAL_BULLET_SIZE;
    playerSpeedRef.current = INITIAL_PLAYER_SPEED;
    expMultiplierRef.current = INITIAL_EXP_MULTIPLIER;
    pickupRadiusRef.current = INITIAL_PICKUP_RADIUS;
    bulletPierceCountRef.current = INITIAL_BULLET_PIERCE_COUNT;
    shotCountRef.current = INITIAL_SHOT_COUNT;
    expBarFlashUntilRef.current = 0;
    survivalTimeMsRef.current = 0;

    setPlayerHealth(INITIAL_MAX_HEALTH);
    setPlayerMaxHealth(INITIAL_MAX_HEALTH);
    playerExpRef.current = 0;
    playerLevelRef.current = INITIAL_PLAYER_LEVEL;
    expToNextLevelRef.current = INITIAL_EXP_TO_NEXT_LEVEL;
    setPlayerExp(0);
    setPlayerLevel(INITIAL_PLAYER_LEVEL);
    setExpToNextLevel(INITIAL_EXP_TO_NEXT_LEVEL);
    setPendingLevelUps(0);
    setAcquiredUpgradeIds([]);
    setFireIntervalMs(INITIAL_FIRE_INTERVAL_MS);
    setBulletDamage(INITIAL_BULLET_DAMAGE);
    setBulletSize(INITIAL_BULLET_SIZE);
    setPlayerSpeed(INITIAL_PLAYER_SPEED);
    setExpMultiplier(INITIAL_EXP_MULTIPLIER);
    setPickupRadius(INITIAL_PICKUP_RADIUS);
    setBulletPierceCount(INITIAL_BULLET_PIERCE_COUNT);
    setShotCount(INITIAL_SHOT_COUNT);
    setIsLevelUpMenuOpen(false);
    setHasWon(false);
    setIsVictoryMenuOpen(false);
    setCurrentUpgradeOptions([]);
    setFps(0);
    setRenderTick((tick) => tick + 1);

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
    isLevelUpMenuOpenRef.current = isLevelUpMenuOpen;
    hasWonRef.current = hasWon;
    isVictoryMenuOpenRef.current = isVictoryMenuOpen;
    gameOverRef.current = gameOver;
  }, [gameOver, hasWon, isLevelUpMenuOpen, isPaused, isPlaying, isVictoryMenuOpen]);

  useEffect(() => {
    playerHealthRef.current = playerHealth;
    playerMaxHealthRef.current = playerMaxHealth;
  }, [playerHealth, playerMaxHealth]);

  useEffect(() => {
    playerExpRef.current = playerExp;
    playerLevelRef.current = playerLevel;
    expToNextLevelRef.current = expToNextLevel;
    pendingLevelUpsRef.current = pendingLevelUps;
    acquiredUpgradeIdsRef.current = new Set(acquiredUpgradeIds);
    fireIntervalMsRef.current = fireIntervalMs;
    bulletDamageRef.current = bulletDamage;
    bulletSizeRef.current = bulletSize;
    playerSpeedRef.current = playerSpeed;
    expMultiplierRef.current = expMultiplier;
    pickupRadiusRef.current = pickupRadius;
    bulletPierceCountRef.current = bulletPierceCount;
    shotCountRef.current = shotCount;
  }, [
    acquiredUpgradeIds,
    bulletDamage,
    bulletPierceCount,
    bulletSize,
    expMultiplier,
    expToNextLevel,
    fireIntervalMs,
    pendingLevelUps,
    pickupRadius,
    playerExp,
    playerLevel,
    playerSpeed,
    shotCount,
  ]);

  // Joystick handlers
  const handleJoystickMove = useCallback((normalizedX, normalizedY) => {
    if (!isPlayingRef.current || isPausedRef.current || isVictoryMenuOpenRef.current || gameOverRef.current) {
      return;
    }
    joystickInputRef.current = { x: normalizedX, y: normalizedY };
  }, []);

  const handleJoystickRelease = useCallback(() => {
    joystickInputRef.current = { x: 0, y: 0 };
  }, []);

  const togglePause = useCallback(() => {
    if (gameOver || !isPlaying || isLevelUpMenuOpen || isVictoryMenuOpen) {
      return;
    }

    setIsPaused((prevPaused) => {
      const nextPaused = !prevPaused;
      if (nextPaused) {
        joystickInputRef.current = { x: 0, y: 0 };
      }
      return nextPaused;
    });
  }, [gameOver, isLevelUpMenuOpen, isPlaying, isVictoryMenuOpen]);

  const resumeGame = useCallback(() => {
    if (gameOver || !isPlaying || isLevelUpMenuOpen || isVictoryMenuOpen) {
      return;
    }
    joystickInputRef.current = { x: 0, y: 0 };
    setIsPaused(false);
  }, [gameOver, isLevelUpMenuOpen, isPlaying, isVictoryMenuOpen]);

  const restartGame = useCallback(() => {
    stopGameLoop();
    joystickInputRef.current = { x: 0, y: 0 };
    setIsPaused(false);
    setHasWon(false);
    setIsVictoryMenuOpen(false);
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
    setHasWon(false);
    setIsVictoryMenuOpen(false);
    setGameOver(false);
    setFinalTime(0);
    resetRunState();

    navigation.reset({
      index: 0,
      routes: [{ name: MAIN_MENU_ROUTE }],
    });
  }, [navigation, resetRunState, stopGameLoop]);

  const handleContinueEndless = useCallback(() => {
    joystickInputRef.current = { x: 0, y: 0 };
    isVictoryMenuOpenRef.current = false;
    setIsVictoryMenuOpen(false);
  }, []);

  const handleExitAfterVictory = useCallback(() => {
    isVictoryMenuOpenRef.current = false;
    setIsVictoryMenuOpen(false);
    handleExitToMenu();
  }, [handleExitToMenu]);

  // Game loop
  useEffect(() => {
    if (!isPlaying || isPaused || isLevelUpMenuOpen || isVictoryMenuOpen || gameOver) {
      stopGameLoop();
      return;
    }

    if (isLoopRunningRef.current) {
      return;
    }

    isLoopRunningRef.current = true;

    lastUpdateTimeRef.current = null;

    const gameLoop = (timestamp) => {
      if (!isPlayingRef.current || isPausedRef.current || isLevelUpMenuOpenRef.current || isVictoryMenuOpenRef.current || gameOverRef.current) {
        stopGameLoop();
        return;
      }

      if (lastUpdateTimeRef.current === null) {
        lastUpdateTimeRef.current = timestamp;
      }

      const now = timestamp;
      const deltaTime = now - lastUpdateTimeRef.current;
      const frameNowMs = Date.now();
      lastUpdateTimeRef.current = now;
      fpsFrameCountRef.current += 1;
      if (lastFpsUpdateTimeRef.current === 0) {
        lastFpsUpdateTimeRef.current = now;
      } else if (now - lastFpsUpdateTimeRef.current >= 1000) {
        setFps(fpsFrameCountRef.current);
        fpsFrameCountRef.current = 0;
        lastFpsUpdateTimeRef.current = now;
      }
      const dt = Math.min(deltaTime / 1000, 0.05); // Clamp to avoid large jumps after stalls
      survivalTimeMsRef.current += deltaTime;

      if (!hasWonRef.current && survivalTimeMsRef.current >= VICTORY_TIME_MS) {
        hasWonRef.current = true;
        isVictoryMenuOpenRef.current = true;
        joystickInputRef.current = { x: 0, y: 0 };
        setHasWon(true);
        setIsVictoryMenuOpen(true);
        stopGameLoop();
        return;
      }

      // Store previous position before applying movement
      previousWorldPositionRef.current.x = playerWorldPositionRef.current.x;
      previousWorldPositionRef.current.y = playerWorldPositionRef.current.y;

      const joystickInput = joystickInputRef.current;

      // Update player world position based on joystick input
      if (joystickInput.x !== 0 || joystickInput.y !== 0) {
        // Time-based movement (frame-rate independent)
        const moveX = joystickInput.x * playerSpeedRef.current * dt;
        const moveY = joystickInput.y * playerSpeedRef.current * dt;

        // Update world position (no boundaries - infinite space!)
        playerWorldPositionRef.current.x += moveX;
        playerWorldPositionRef.current.y += moveY;

        // Calculate rotation angle (in radians)
        const angle = Math.atan2(joystickInput.y, joystickInput.x) + Math.PI / 2;
        shipRotationRef.current = angle;

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
      const survivalTimeSeconds = survivalTimeMsRef.current / 1000;
      const { despawnRadius } = getEnemySpawnAndDespawnRadii(survivalTimeSeconds);
      const despawnRadiusSq = despawnRadius * despawnRadius;
      const currentSpawnIntervalMs = getSpawnInterval(survivalTimeSeconds);

      enemySpawnAccumulatorRef.current += deltaTime;
      while (enemySpawnAccumulatorRef.current >= currentSpawnIntervalMs) {
        enemySpawnAccumulatorRef.current -= currentSpawnIntervalMs;
        enemiesRef.current.push(createEnemy(playerX, playerY, survivalTimeSeconds));
      }

      const minimumActiveEnemies = getMinimumActiveEnemies(survivalTimeSeconds);
      const missingEnemies = minimumActiveEnemies - enemiesRef.current.length;
      for (let i = 0; i < missingEnemies; i += 1) {
        enemiesRef.current.push(createEnemy(playerX, playerY, survivalTimeSeconds));
      }

      fireAccumulatorRef.current += deltaTime;
      while (fireAccumulatorRef.current >= fireIntervalMsRef.current) {
        fireAccumulatorRef.current -= fireIntervalMsRef.current;

        const nearestEnemy = findNearestEnemy(playerX, playerY, enemiesRef.current);
        if (!nearestEnemy) {
          continue;
        }

        playShootSound();

        if (shotCountRef.current === 2) {
          const dx = nearestEnemy.x - playerX;
          const dy = nearestEnemy.y - playerY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 0.0001) {
            const dirX = dx / distance;
            const dirY = dy / distance;
            const perpendicularX = -dirY;
            const perpendicularY = dirX;
            const spawnOffsets = [
              { x: perpendicularX * DOUBLE_SHOT_SPAWN_OFFSET, y: perpendicularY * DOUBLE_SHOT_SPAWN_OFFSET },
              { x: -perpendicularX * DOUBLE_SHOT_SPAWN_OFFSET, y: -perpendicularY * DOUBLE_SHOT_SPAWN_OFFSET },
            ];

            for (let i = 0; i < spawnOffsets.length; i += 1) {
              const bullet = createBullet(playerX, playerY, nearestEnemy.x, nearestEnemy.y, 0, spawnOffsets[i]);
              if (bullet) {
                bulletsRef.current.push(bullet);
              }
            }
          }
        } else {
          const shotOffsets =
            shotCountRef.current === 3
              ? [-TRIPLE_SHOT_ANGLE_OFFSET_DEG, 0, TRIPLE_SHOT_ANGLE_OFFSET_DEG]
              : [0];

          for (let i = 0; i < shotOffsets.length; i += 1) {
            const bullet = createBullet(playerX, playerY, nearestEnemy.x, nearestEnemy.y, shotOffsets[i]);
            if (bullet) {
              bulletsRef.current.push(bullet);
            }
          }
        }
      }

      const enemies = enemiesRef.current;
      let nextEnemyCount = 0;
      let tookDamageThisFrame = false;
      for (let i = 0; i < enemies.length; i += 1) {
        const enemy = enemies[i];
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
          const damageNow = frameNowMs;
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

        enemy._removed = false;
        enemies[nextEnemyCount] = enemy;
        nextEnemyCount += 1;
      }
      enemies.length = nextEnemyCount;
      const bulletDespawnDistance = Math.max(gameAreaLayout.width, gameAreaLayout.height) * 2 + 400;
      const bulletDespawnDistanceSq = bulletDespawnDistance * bulletDespawnDistance;
      const bullets = bulletsRef.current;
      let nextBulletCount = 0;

      for (let i = 0; i < bullets.length; i += 1) {
        const bullet = bullets[i];
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

        bullet._removed = false;
        bullets[nextBulletCount] = bullet;
        nextBulletCount += 1;
      }
      bullets.length = nextBulletCount;

      let hasRemovedEnemies = false;
      let hasRemovedBullets = false;
      if (bullets.length > 0 && enemies.length > 0) {
        for (let bulletIndex = 0; bulletIndex < bullets.length; bulletIndex += 1) {
          const bullet = bullets[bulletIndex];
          if (bullet._removed) {
            continue;
          }

          for (let enemyIndex = 0; enemyIndex < enemies.length; enemyIndex += 1) {
            const enemy = enemies[enemyIndex];

            if (enemy._removed || bullet.piercedEnemyIds.has(enemy.id)) {
              continue;
            }

            if (
              isColliding(
                bullet.x,
                bullet.y,
                bullet.hitRadius,
                enemy.x,
                enemy.y,
                ENEMY_BULLET_HIT_RADIUS
              )
            ) {
              enemy.health -= bullet.damage;
              enemy.flashUntil = frameNowMs + ENEMY_FLASH_DURATION_MS;
              bullet.piercedEnemyIds.add(enemy.id);
              bullet.hitCount += 1;

              if (bullet.hitCount >= bullet.maxPierces) {
                bullet._removed = true;
                hasRemovedBullets = true;
              }

              if (enemy.health <= 0) {
                addExpCrystal(enemy.x, enemy.y);
                trySpawnHealthDrop(enemy.x, enemy.y);
                trySpawnMagnetDrop(enemy.x, enemy.y);
                enemy._removed = true;
                hasRemovedEnemies = true;
              }
              break;
            }
          }
        }
      }

      if (hasRemovedEnemies) {
        let writeEnemyIndex = 0;
        for (let i = 0; i < enemies.length; i += 1) {
          const enemy = enemies[i];
          if (enemy._removed) {
            continue;
          }
          enemies[writeEnemyIndex] = enemy;
          writeEnemyIndex += 1;
        }
        enemies.length = writeEnemyIndex;
      }

      if (hasRemovedBullets) {
        let writeBulletIndex = 0;
        for (let i = 0; i < bullets.length; i += 1) {
          const bullet = bullets[i];
          if (bullet._removed) {
            continue;
          }
          bullets[writeBulletIndex] = bullet;
          writeBulletIndex += 1;
        }
        bullets.length = writeBulletIndex;
      }

      let expGainedThisFrame = 0;
      const crystals = expCrystalsRef.current;
      let nextCrystalCount = 0;

      if (
        crystals.length > 1 &&
        (lastCrystalMergeTimeRef.current === 0 ||
          now - lastCrystalMergeTimeRef.current >= EXP_CRYSTAL_MERGE_INTERVAL_MS)
      ) {
        mergeNearbyExpCrystals();
        lastCrystalMergeTimeRef.current = now;
      }

      if (crystals.length > 0) {
        for (let i = 0; i < crystals.length; i += 1) {
          const crystal = crystals[i];
          if (!crystal.isCollecting) {
            if (
              isColliding(
                playerX,
                playerY,
                pickupRadiusRef.current,
                crystal.x,
                crystal.y,
                EXP_CRYSTAL_PICKUP_RADIUS
              )
            ) {
              crystal.isCollecting = true;
            }
          }

          if (crystal.isCollecting) {
            const dx = playerX - crystal.x;
            const dy = playerY - crystal.y;
            const distanceSq = dx * dx + dy * dy;

            if (distanceSq <= CRYSTAL_COLLECT_COMPLETE_RADIUS * CRYSTAL_COLLECT_COMPLETE_RADIUS) {
              expGainedThisFrame += Math.max(1, Math.round(crystal.value * expMultiplierRef.current));
              continue;
            }

            const distance = Math.sqrt(distanceSq);
            if (distance > 0.0001) {
              const dirX = dx / distance;
              const dirY = dy / distance;
              crystal.x += dirX * crystal.collectSpeed * dt;
              crystal.y += dirY * crystal.collectSpeed * dt;
            }
          }

          crystals[nextCrystalCount] = crystal;
          nextCrystalCount += 1;
        }
      }

      crystals.length = nextCrystalCount;
      if (expGainedThisFrame > 0) {
        addPlayerExp(expGainedThisFrame);
      }

      const healthDrops = healthDropsRef.current;
      let nextHealthDropCount = 0;
      const healthDropPickupRadiusSq = HEALTH_DROP_PICKUP_RADIUS * HEALTH_DROP_PICKUP_RADIUS;
      const healthDropCollectCompleteRadiusSq = CRYSTAL_COLLECT_COMPLETE_RADIUS * CRYSTAL_COLLECT_COMPLETE_RADIUS;

      for (let i = 0; i < healthDrops.length; i += 1) {
        const healthDrop = healthDrops[i];
        healthDrop.ageMs += deltaTime;

        if (healthDrop.ageMs > HEALTH_DROP_LIFETIME) {
          continue;
        }

        const dx = playerX - healthDrop.x;
        const dy = playerY - healthDrop.y;
        const distanceSq = dx * dx + dy * dy;

        if (!healthDrop.isCollecting && distanceSq <= healthDropPickupRadiusSq) {
          healthDrop.isCollecting = true;
        }

        if (healthDrop.isCollecting) {
          if (distanceSq <= healthDropCollectCompleteRadiusSq) {
            const nextHealth = Math.min(playerHealthRef.current + HEALTH_DROP_HEAL_AMOUNT, playerMaxHealthRef.current);
            if (nextHealth !== playerHealthRef.current) {
              playerHealthRef.current = nextHealth;
              setPlayerHealth(nextHealth);
            }
            continue;
          }

          const distance = Math.sqrt(distanceSq);
          if (distance > 0.0001) {
            const dirX = dx / distance;
            const dirY = dy / distance;
            healthDrop.x += dirX * healthDrop.collectSpeed * dt;
            healthDrop.y += dirY * healthDrop.collectSpeed * dt;
          }
        }

        healthDrops[nextHealthDropCount] = healthDrop;
        nextHealthDropCount += 1;
      }

      healthDrops.length = nextHealthDropCount;

      const magnetDrops = magnetDropsRef.current;
      let nextMagnetDropCount = 0;
      const magnetDropAttractionRadiusSq = MAGNET_DROP_ATTRACTION_RADIUS * MAGNET_DROP_ATTRACTION_RADIUS;
      const magnetDropCollectRadiusSq = MAGNET_DROP_COLLECT_RADIUS * MAGNET_DROP_COLLECT_RADIUS;

      for (let i = 0; i < magnetDrops.length; i += 1) {
        const magnetDrop = magnetDrops[i];
        magnetDrop.ageMs += deltaTime;

        if (magnetDrop.ageMs > MAGNET_DROP_LIFETIME) {
          continue;
        }

        const dx = playerX - magnetDrop.x;
        const dy = playerY - magnetDrop.y;
        const distanceSq = dx * dx + dy * dy;

        if (!magnetDrop.isCollecting && distanceSq <= magnetDropAttractionRadiusSq) {
          magnetDrop.isCollecting = true;
        }

        if (magnetDrop.isCollecting) {
          if (distanceSq <= magnetDropCollectRadiusSq) {
            activateMagnetEffect();
            continue;
          }

          const distance = Math.sqrt(distanceSq);
          if (distance > 0.0001) {
            const dirX = dx / distance;
            const dirY = dy / distance;
            magnetDrop.x += dirX * magnetDrop.collectSpeed * dt;
            magnetDrop.y += dirY * magnetDrop.collectSpeed * dt;
          }
        }

        magnetDrops[nextMagnetDropCount] = magnetDrop;
        nextMagnetDropCount += 1;
      }

      magnetDrops.length = nextMagnetDropCount;

      // Render uses latest simulation refs and syncs at a capped rate to reduce reconciliation cost.
      alphaRef.current = 1;
      if (lastRenderSyncTimeRef.current === 0 || now - lastRenderSyncTimeRef.current >= RENDER_SYNC_INTERVAL_MS) {
        lastRenderSyncTimeRef.current = now;
        setRenderTick((tick) => tick + 1);
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      stopGameLoop();
    };
  }, [
    addPlayerExp,
    createBullet,
    createEnemy,
    addExpCrystal,
    trySpawnHealthDrop,
    trySpawnMagnetDrop,
    activateMagnetEffect,
    mergeNearbyExpCrystals,
    findNearestEnemy,
    handleGameOver,
    gameOver,
    getEnemySpawnAndDespawnRadii,
    gameAreaLayout.height,
    gameAreaLayout.width,
    isLevelUpMenuOpen,
    isPaused,
    isPlaying,
    isVictoryMenuOpen,
    playerCollisionRadius,
    stopGameLoop,
  ]);

  useEffect(() => {
    return () => {
      if (gameOverTimeoutRef.current !== null) {
        clearTimeout(gameOverTimeoutRef.current);
        gameOverTimeoutRef.current = null;
      }
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

  const healthRatio = Math.max(0, Math.min(playerHealth / playerMaxHealth, 1));
  const healthBarColor = healthRatio > 0.6 ? '#63d471' : healthRatio > 0.3 ? '#f6a83b' : '#d63f3f';
  const expProgressRatio = Math.max(0, Math.min(playerExp / expToNextLevel, 1));
  const now = Date.now();
  const isExpBarFlashing = now < expBarFlashUntilRef.current;
  const shouldShowExpBarFlash = isExpBarFlashing && Math.floor(now / BLINK_INTERVAL_MS) % 2 === 0;
  const playerFlashUntil = lastDamageTimeRef.current + PLAYER_FLASH_DURATION_MS;
  const isPlayerFlashing = now < playerFlashUntil;
  const shouldShowPlayerFlash = isPlayerFlashing && Math.floor(now / BLINK_INTERVAL_MS) % 2 === 0;
  const playerShipTransform = [{ rotate: `${shipRotationRef.current}rad` }];
  const visibleCrystals = [];
  for (let i = 0; i < expCrystalsRef.current.length; i += 1) {
    const crystal = expCrystalsRef.current[i];
    const screenX = crystal.x - worldOffsetX;
    const screenY = crystal.y - worldOffsetY;

    if (
      screenX >= -CRYSTAL_RENDER_MARGIN &&
      screenX <= gameAreaLayout.width + CRYSTAL_RENDER_MARGIN &&
      screenY >= -CRYSTAL_RENDER_MARGIN &&
      screenY <= gameAreaLayout.height + CRYSTAL_RENDER_MARGIN
    ) {
      visibleCrystals.push(crystal);
    }
  }

  const getUpgradeCurrentValue = useCallback((upgradeId) => {
    switch (upgradeId) {
      case 'damage_up':
        return `Current: ${bulletDamage} damage`;
      case 'fire_rate':
        return `Current: ${fireIntervalMs} ms`;
      case 'hp_up':
        return `Current: ${playerMaxHealth} max HP`;
      case 'move_speed':
        return `Current: ${playerSpeed} speed`;
      case 'exp_worth':
        return `Current: +${Math.round((expMultiplier - 1) * 100)}% EXP`;
      case 'magnet_size':
        return `Current: ${pickupRadius} radius`;
      default:
        return null;
    }
  }, [bulletDamage, expMultiplier, fireIntervalMs, pickupRadius, playerMaxHealth, playerSpeed]);

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
        {enemiesRef.current.map((enemy) => {
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

        {bulletsRef.current.map((bullet) => {
          const renderSize = BULLET_RENDER_SIZE * (bullet.size / INITIAL_BULLET_SIZE);

          return (
            <Image
              key={bullet.id}
              source={spaceshipShootingSprite}
              pointerEvents="none"
              style={[
                styles.bullet,
                {
                  width: renderSize,
                  height: renderSize,
                  left: bullet.x - worldOffsetX - renderSize / 2,
                  top: bullet.y - worldOffsetY - renderSize / 2,
                  transform: [{ rotate: `${bullet.angleDeg + BULLET_SPRITE_ROTATION_OFFSET_DEG}deg` }],
                },
              ]}
              resizeMode="contain"
            />
          );
        })}

        {visibleCrystals.map((crystal) => (
          <Image
            key={crystal.id}
            source={expCrystalSprite}
            pointerEvents="none"
            style={[
              styles.expCrystal,
              {
                width: crystal.size,
                height: crystal.size,
                left: crystal.x - worldOffsetX - crystal.size / 2,
                top: crystal.y - worldOffsetY - crystal.size / 2,
              },
            ]}
            resizeMode="contain"
          />
        ))}

        {healthDropsRef.current.map((healthDrop) => (
          <View
            key={healthDrop.id}
            pointerEvents="none"
            style={[
              styles.healthDrop,
              {
                width: healthDrop.size,
                height: healthDrop.size,
                left: healthDrop.x - worldOffsetX - healthDrop.size / 2,
                top: healthDrop.y - worldOffsetY - healthDrop.size / 2,
              },
            ]}
          >
            <View style={styles.healthDropCore}>
              <View style={styles.healthDropCrossVertical} />
              <View style={styles.healthDropCrossHorizontal} />
            </View>
          </View>
        ))}

        {magnetDropsRef.current.map((magnetDrop) => (
          <View
            key={magnetDrop.id}
            pointerEvents="none"
            style={[
              styles.magnetDrop,
              {
                width: magnetDrop.size,
                height: magnetDrop.size,
                left: magnetDrop.x - worldOffsetX - magnetDrop.size / 2,
                top: magnetDrop.y - worldOffsetY - magnetDrop.size / 2,
              },
            ]}
          >
            <View style={styles.magnetDropCore}>
              <View style={styles.magnetDropInner} />
            </View>
          </View>
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
            isPaused={isPaused || isLevelUpMenuOpen || isVictoryMenuOpen}
            dimmed={isPaused || isLevelUpMenuOpen || isVictoryMenuOpen}
            onGameEnd={(finalTimeMs) => {
              setFinalTime(finalTimeMs);
              console.log('Game ended with time:', finalTimeMs);
            }}
          />

          {!gameOver && (
            <View style={[styles.expHud, (isPaused || isLevelUpMenuOpen || isVictoryMenuOpen) && styles.expHudDimmed, { top: 54, left: 20 }]}>
              <View style={styles.expBarTrack}>
                <View style={[styles.expBarFill, { width: `${expProgressRatio * 100}%` }]} />
                {shouldShowExpBarFlash && <View style={styles.expBarFlashOverlay} pointerEvents="none" />}
              </View>
            </View>
          )}

          {!gameOver && (
            <View style={[styles.healthHud, (isPaused || isLevelUpMenuOpen || isVictoryMenuOpen) && styles.healthHudDimmed, { top: 2, left: 20 }]}>
              <View style={styles.hpHeaderRow}>
                <Text style={[styles.healthLabel, (isPaused || isLevelUpMenuOpen || isVictoryMenuOpen) && styles.healthTextDimmed]}>HP</Text>
                <Text style={[styles.healthValueText, (isPaused || isLevelUpMenuOpen || isVictoryMenuOpen) && styles.healthTextDimmed]}>
                  {playerHealth} / {playerMaxHealth}
                </Text>
              </View>
              <View style={styles.healthBarTrack}>
                <View
                  style={[
                    styles.healthBarFill,
                    { width: `${healthRatio * 100}%`, backgroundColor: healthBarColor },
                  ]}
                />
              </View>
            </View>
          )}

          {showFpsEnabled && (
            <View style={[styles.fpsContainer, { top: insets.top - 14 }]}>
              <Text style={styles.fpsText}>FPS: {fps}</Text>
            </View>
          )}

          {/* Joystick */}
          <Joystick onMove={handleJoystickMove} onRelease={handleJoystickRelease} />

          {isPaused && !isLevelUpMenuOpen && !isVictoryMenuOpen && !gameOver && (
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

          {isLevelUpMenuOpen && !isVictoryMenuOpen && !gameOver && (
            <View style={styles.levelUpOverlay}>
              <View style={styles.levelUpPanel}>
                <Text style={styles.levelUpBigText}>LEVEL UP!</Text>
                <Text style={styles.levelNumberText}>Level {playerLevel}</Text>
                <Text style={styles.levelUpTitle}>Choose an Upgrade</Text>
                <View style={styles.upgradeRow}>
                {currentUpgradeOptions.map((option) => (
                  <TouchableOpacity
                      key={option.id}
                      style={styles.upgradeCard}
                      onPress={() => handleSelectUpgrade(option.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.upgradeTitle}>{option.title}</Text>
                    <Text style={styles.upgradeDescription}>{option.description}</Text>
                    {getUpgradeCurrentValue(option.id) && (
                      <Text style={styles.upgradeCurrentValue}>{getUpgradeCurrentValue(option.id)}</Text>
                    )}
                    <View style={styles.upgradeBadge}>
                      <Text style={styles.upgradeBadgeText}>
                        {option.repeatable ? 'STACKABLE' : 'UNIQUE'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              </View>
            </View>
          )}

          {isVictoryMenuOpen && !gameOver && (
            <View style={styles.victoryOverlay}>
              <View style={styles.victoryPanel}>
                <Text style={styles.victoryTitle}>Victory!</Text>
                <Text style={styles.victoryMessage}>You survived 20 minutes</Text>
                <TouchableOpacity style={styles.pausePrimaryButton} onPress={handleContinueEndless} activeOpacity={0.8}>
                  <Text style={styles.pausePrimaryButtonText}>Endless</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pauseSecondaryButton} onPress={handleExitAfterVictory} activeOpacity={0.8}>
                  <Text style={styles.pauseSecondaryButtonText}>Exit</Text>
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

          {isPlaying && !gameOver && !isLevelUpMenuOpen && !isVictoryMenuOpen && (
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
  expCrystal: {
    position: 'absolute',
  },
  healthDrop: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthDropCore: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#b22035',
    borderWidth: 2,
    borderColor: '#ffd6dc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthDropCrossVertical: {
    position: 'absolute',
    width: 4,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  healthDropCrossHorizontal: {
    position: 'absolute',
    width: 10,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  magnetDrop: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  magnetDropCore: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#1d4d91',
    borderWidth: 2,
    borderColor: '#b8e3ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  magnetDropInner: {
    width: '45%',
    height: '45%',
    borderRadius: 999,
    backgroundColor: '#ffffff',
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
  expHud: {
    position: 'absolute',
    alignItems: 'flex-start',
    zIndex: 10,
  },
  expHudDimmed: {
    opacity: 0.45,
  },
  fpsContainer: {
    position: 'absolute',
    right: 12,
    zIndex: 40,
  },
  fpsText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  expBarTrack: {
    width: EXP_BAR_WIDTH,
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  expBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#4db8ff',
  },
  expBarFlashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    opacity: 0.5,
    borderRadius: 999,
  },
  levelUpOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 35,
  },
  levelUpPanel: {
    width: '92%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: 'rgba(10, 18, 32, 0.96)',
    borderWidth: 2,
    borderColor: '#9ad6ff',
  },
  levelUpBigText: {
    color: '#ffe082',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 1.5,
  },
  levelNumberText: {
    color: '#d9f0ff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  levelUpTitle: {
    color: '#f6e7c1',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1,
  },
  upgradeRow: {
    width: '100%',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  upgradeCard: {
    flex: 1,
    backgroundColor: '#101522',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#283a63',
    paddingHorizontal: 8,
    paddingVertical: 12,
    marginHorizontal: 4,
    minHeight: 130,
    justifyContent: 'center',
  },
  upgradeTitle: {
    color: '#f6e7c1',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
    textAlign: 'center',
  },
  upgradeDescription: {
    color: '#9fb5de',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  upgradeCurrentValue: {
    color: 'rgba(246, 231, 193, 0.72)',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  upgradeBadge: {
    marginTop: 6,
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  upgradeBadgeText: {
    color: 'rgba(246, 231, 193, 0.8)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
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
    backgroundColor: 'transparent',
  },
  healthHudDimmed: {
    opacity: 0.45,
  },
  hpHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  healthLabel: {
    color: '#f6e7c1',
    fontSize: 12,
    fontWeight: '900',
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
    marginLeft: 8,
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
  victoryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 32,
  },
  victoryPanel: {
    width: 260,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: 'rgba(10, 18, 32, 0.95)',
    borderWidth: 2,
    borderColor: '#f6a83b',
    alignItems: 'center',
  },
  victoryTitle: {
    color: '#f6e7c1',
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 10,
    letterSpacing: 1,
  },
  victoryMessage: {
    color: '#f6e7c1',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
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
