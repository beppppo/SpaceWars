import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const SHOOT_SOUND_SOURCE = require('../../assets/Sounds/shoot.wav');
const LEVEL_UP_SOUND_SOURCE = require('../../assets/Sounds/level-up.wav');
const DEATH_SOUND_SOURCE = require('../../assets/Sounds/game-over.wav');
const WIN_SOUND_SOURCE = require('../../assets/Sounds/win.wav');
const BACKGROUND_MUSIC_SOURCE = require('../../assets/Sounds/bg-music.mp3');

const SHOOT_SOUND_COOLDOWN_MS = 90;
const SHOOT_SOUND_VOLUME = 0.05;
const LEVEL_UP_SOUND_VOLUME = 0.15;
const DEATH_SOUND_VOLUME = 0.3;
const WIN_SOUND_VOLUME = 0.22;
const MENU_MUSIC_VOLUME = 0.18;

let audioInitialized = false;
let initializationPromise = null;
let musicEnabled = true;
let sfxEnabled = true;
let lastShootSoundAt = 0;
let players = null;
let backgroundMusicVolume = MENU_MUSIC_VOLUME;

function shouldPlayBackgroundMusic() {
  return musicEnabled && backgroundMusicVolume > 0;
}

function shouldPlaySfx() {
  return sfxEnabled;
}

function createPlayers() {
  const shootPlayer = createAudioPlayer(SHOOT_SOUND_SOURCE);
  shootPlayer.volume = SHOOT_SOUND_VOLUME;

  const levelUpPlayer = createAudioPlayer(LEVEL_UP_SOUND_SOURCE);
  levelUpPlayer.volume = LEVEL_UP_SOUND_VOLUME;

  const deathPlayer = createAudioPlayer(DEATH_SOUND_SOURCE);
  deathPlayer.volume = DEATH_SOUND_VOLUME;

  const winPlayer = createAudioPlayer(WIN_SOUND_SOURCE);
  winPlayer.volume = WIN_SOUND_VOLUME;

  const backgroundMusicPlayer = createAudioPlayer(BACKGROUND_MUSIC_SOURCE);
  backgroundMusicPlayer.loop = true;
  backgroundMusicPlayer.volume = backgroundMusicVolume;

  return {
    shootPlayer,
    levelUpPlayer,
    deathPlayer,
    winPlayer,
    backgroundMusicPlayer,
  };
}

async function restartPlayer(player, source, volume) {
  if (!player || !shouldPlaySfx()) {
    return;
  }

  try {
    player.muted = false;
    player.volume = volume;

    if (player.playing) {
      player.pause();
    }
  } catch (error) {
    console.warn('Failed to pause sound before replay:', error);
  }

  try {
    if (player.currentTime > 0 || player.paused) {
      await player.seekTo(0);
    }
  } catch (error) {
    try {
      player.replace(source);
      player.volume = volume;
      player.muted = false;
    } catch (replaceError) {
      console.warn('Failed to reset sound before replay:', error);
      console.warn('Failed to replace sound source before replay:', replaceError);
    }
  }

  try {
    player.play();
  } catch (error) {
    console.warn('Failed to play sound:', error);
  }
}

export async function initializeAudio() {
  if (audioInitialized) {
    return;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'duckOthers',
      });
      players = createPlayers();
      audioInitialized = true;
    } catch (error) {
      console.warn('Failed to initialize audio:', error);
    } finally {
      initializationPromise = null;
    }
  })();

  return initializationPromise;
}

export function setMusicEnabled(enabled) {
  musicEnabled = enabled;

  if (!shouldPlayBackgroundMusic()) {
    stopBackgroundMusic();
  }
}

export function setSfxEnabled(enabled) {
  sfxEnabled = enabled;
}

async function applyBackgroundMusicVolume() {
  console.log('[audio] applyBackgroundMusicVolume', {
    volume: backgroundMusicVolume,
    hasPlayer: Boolean(players?.backgroundMusicPlayer),
    playerId: players?.backgroundMusicPlayer?.id ?? null,
  });

  if (!players?.backgroundMusicPlayer) {
    return;
  }

  const player = players.backgroundMusicPlayer;
  const shouldKeepPlaying = shouldPlayBackgroundMusic();

  player.volume = backgroundMusicVolume;
  player.muted = !shouldKeepPlaying;

  if (!shouldKeepPlaying) {
    try {
      if (player.playing) {
        player.pause();
      }
      await player.seekTo(0);
    } catch (error) {
      console.warn('Failed to stop background music while applying volume:', error);
    }
    return;
  }

  if (!player.playing) {
    return;
  }

  const currentTime = player.currentTime;

  try {
    player.pause();
    await player.seekTo(currentTime);
    player.play();
  } catch (error) {
    console.warn('Failed to refresh background music playback after volume change:', error);
  }
}

export function setMenuMusicMode() {
  backgroundMusicVolume = MENU_MUSIC_VOLUME;
  console.log('[audio] setMenuMusicMode', { volume: backgroundMusicVolume });
  void applyBackgroundMusicVolume();
}

export function setGameplayMusicMode() {
  backgroundMusicVolume = GAMEPLAY_MUSIC_VOLUME;
  console.log('[audio] setGameplayMusicMode', { volume: backgroundMusicVolume });
  void applyBackgroundMusicVolume();
}

export async function startBackgroundMusic() {
  if (!shouldPlayBackgroundMusic()) {
    stopBackgroundMusic();
    return;
  }

  await initializeAudio();
  if (!players?.backgroundMusicPlayer) {
    return;
  }

  try {
    console.log('[audio] startBackgroundMusic', {
      volume: backgroundMusicVolume,
      playerId: players.backgroundMusicPlayer.id,
      isPlaying: players.backgroundMusicPlayer.playing,
    });
    await applyBackgroundMusicVolume();

    if (players.backgroundMusicPlayer.playing) {
      return;
    }

    if (players.backgroundMusicPlayer.paused || players.backgroundMusicPlayer.currentTime > 0) {
      await players.backgroundMusicPlayer.seekTo(0);
    }

    players.backgroundMusicPlayer.play();
  } catch (error) {
    console.warn('Failed to start background music:', error);
  }
}

export function stopBackgroundMusic() {
  if (!players?.backgroundMusicPlayer) {
    return;
  }

  try {
    players.backgroundMusicPlayer.muted = true;
    players.backgroundMusicPlayer.pause();
    void players.backgroundMusicPlayer.seekTo(0);
  } catch (error) {
    console.warn('Failed to stop background music:', error);
  }
}

export function playShootSound() {
  if (!shouldPlaySfx()) {
    return;
  }

  const now = Date.now();
  if (now - lastShootSoundAt < SHOOT_SOUND_COOLDOWN_MS) {
    return;
  }

  lastShootSoundAt = now;
  void initializeAudio().then(() => restartPlayer(players?.shootPlayer, SHOOT_SOUND_SOURCE, SHOOT_SOUND_VOLUME));
}

export function playLevelUpSound() {
  if (!shouldPlaySfx()) {
    return;
  }

  console.log('[audio] level up sound triggered');
  void initializeAudio().then(() => restartPlayer(players?.levelUpPlayer, LEVEL_UP_SOUND_SOURCE, LEVEL_UP_SOUND_VOLUME));
}

export function playDeathSound() {
  if (!shouldPlaySfx()) {
    return;
  }

  console.log('[audio] death sound triggered');
  void initializeAudio().then(() => restartPlayer(players?.deathPlayer, DEATH_SOUND_SOURCE, DEATH_SOUND_VOLUME));
}

export function playWinSound() {
  if (!shouldPlaySfx()) {
    return;
  }

  console.log('Victory sound played');
  void initializeAudio().then(() => restartPlayer(players?.winPlayer, WIN_SOUND_SOURCE, WIN_SOUND_VOLUME));
}

export function cleanupAudio() {
  if (!players) {
    return;
  }

  players.shootPlayer?.remove();
  players.levelUpPlayer?.remove();
  players.deathPlayer?.remove();
  players.winPlayer?.remove();
  players.backgroundMusicPlayer?.remove();
  players = null;
  audioInitialized = false;
}
