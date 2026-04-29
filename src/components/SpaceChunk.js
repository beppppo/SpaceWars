import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * Simple seeded random number generator
 */
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Generate stars for a chunk using a seeded random generator
 * This ensures the same chunk always has the same stars
 */
function generateChunkStars(chunkX, chunkY, chunkSize, seed, starsPerChunk = 35) {
  const stars = [];
  
  for (let i = 0; i < starsPerChunk; i++) {
    // Use seed + i to get different random values for each star
    const starSeed = seed + i * 1000;
    
    const x = seededRandom(starSeed) * chunkSize;
    const y = seededRandom(starSeed + 1) * chunkSize;
    const size = seededRandom(starSeed + 2) * 2 + 0.5; // 0.5 to 2.5 pixels
    const opacity = seededRandom(starSeed + 3) * 0.8 + 0.2; // 0.2 to 1.0
    
    stars.push({ id: i, x, y, size, opacity });
  }
  
  return stars;
}

// Renders one deterministic star chunk based on its chunk coordinates and seed.
const SpaceChunk = React.memo(({ chunkX, chunkY, chunkSize, worldOffsetX, worldOffsetY, seed }) => {
  // Generate stars for this chunk (memoized)
  const stars = useMemo(() => {
    return generateChunkStars(chunkX, chunkY, chunkSize, seed);
  }, [chunkX, chunkY, chunkSize, seed]);

  // Calculate screen position of this chunk
  const screenX = (chunkX * chunkSize) - worldOffsetX;
  const screenY = (chunkY * chunkSize) - worldOffsetY;

  return (
    <View
      style={[
        styles.chunk,
        {
          left: screenX,
          top: screenY,
          width: chunkSize,
          height: chunkSize,
        },
      ]}
      pointerEvents="none"
    >
      {stars.map((star) => (
        <View
          key={star.id}
          style={[
            styles.star,
            {
              left: star.x,
              top: star.y,
              width: star.size,
              height: star.size,
              borderRadius: star.size / 2,
              opacity: star.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
});

export default SpaceChunk;

const styles = StyleSheet.create({
  chunk: {
    position: 'absolute',
    overflow: 'hidden',
  },
  star: {
    position: 'absolute',
    backgroundColor: '#ffffff',
  },
});
