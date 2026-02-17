/**
 * ChunkManager - Manages infinite space chunks around the player
 * 
 * The world is divided into square chunks. Only chunks within a certain
 * radius of the player are kept active. Chunks are generated and removed
 * dynamically as the player moves.
 */

class ChunkManager {
  constructor(chunkSize = 1000, viewRadius = 2) {
    this.chunkSize = chunkSize; // Size of each chunk in world units
    this.viewRadius = viewRadius; // How many chunks to keep around player (radius)
    this.chunks = new Map(); // Map of chunk keys to chunk data
  }

  /**
   * Convert world coordinates to chunk coordinates
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @returns {Object} Chunk coordinates {chunkX, chunkY}
   */
  worldToChunk(worldX, worldY) {
    const chunkX = Math.floor(worldX / this.chunkSize);
    const chunkY = Math.floor(worldY / this.chunkSize);
    return { chunkX, chunkY };
  }

  /**
   * Convert chunk coordinates to world coordinates (top-left corner of chunk)
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkY - Chunk Y coordinate
   * @returns {Object} World coordinates {worldX, worldY}
   */
  chunkToWorld(chunkX, chunkY) {
    const worldX = chunkX * this.chunkSize;
    const worldY = chunkY * this.chunkSize;
    return { worldX, worldY };
  }

  /**
   * Generate a unique key for a chunk
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkY - Chunk Y coordinate
   * @returns {string} Chunk key
   */
  getChunkKey(chunkX, chunkY) {
    return `${chunkX},${chunkY}`;
  }

  /**
   * Get or create a chunk
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkY - Chunk Y coordinate
   * @returns {Object} Chunk data
   */
  getChunk(chunkX, chunkY) {
    const key = this.getChunkKey(chunkX, chunkY);
    
    if (!this.chunks.has(key)) {
      // Generate new chunk
      const chunk = {
        chunkX,
        chunkY,
        key,
        seed: this.generateSeed(chunkX, chunkY),
        stars: null, // Will be generated when needed
      };
      this.chunks.set(key, chunk);
    }
    
    return this.chunks.get(key);
  }

  /**
   * Generate a deterministic seed for a chunk based on its coordinates
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkY - Chunk Y coordinate
   * @returns {number} Seed value
   */
  generateSeed(chunkX, chunkY) {
    // Simple hash function for deterministic seed
    return ((chunkX * 73856093) ^ (chunkY * 19349663)) & 0x7FFFFFFF;
  }

  /**
   * Update chunks based on player's world position
   * Removes chunks that are too far away and generates new ones nearby
   * @param {number} worldX - Player's world X coordinate
   * @param {number} worldY - Player's world Y coordinate
   * @returns {Array} Array of active chunk keys
   */
  updateChunks(worldX, worldY) {
    const playerChunk = this.worldToChunk(worldX, worldY);
    const activeChunks = new Set();

    // Generate chunks within view radius
    for (let dx = -this.viewRadius; dx <= this.viewRadius; dx++) {
      for (let dy = -this.viewRadius; dy <= this.viewRadius; dy++) {
        const chunkX = playerChunk.chunkX + dx;
        const chunkY = playerChunk.chunkY + dy;
        const chunk = this.getChunk(chunkX, chunkY);
        activeChunks.add(chunk.key);
      }
    }

    // Remove chunks that are too far away
    const chunksToRemove = [];
    for (const [key, chunk] of this.chunks.entries()) {
      if (!activeChunks.has(key)) {
        chunksToRemove.push(key);
      }
    }

    chunksToRemove.forEach(key => this.chunks.delete(key));

    return Array.from(activeChunks).map(key => this.chunks.get(key));
  }

  /**
   * Get all active chunks
   * @returns {Array} Array of chunk data
   */
  getActiveChunks() {
    return Array.from(this.chunks.values());
  }

  /**
   * Clear all chunks
   */
  clear() {
    this.chunks.clear();
  }
}

export { ChunkManager };

