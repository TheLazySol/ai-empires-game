import { Delaunay } from "d3-delaunay";
import { VoronoiCell, TerrainType, MapData } from "@/types/game";
import { ResourceType } from "@/types/resources";
import { 
  MAP_WIDTH, 
  MAP_HEIGHT, 
  CELL_DENSITY_DIVISOR,
  NUMBER_OF_CONTINENTS,
  NUMBER_OF_ISLANDS,
  LAND_VARIANCE,
  RESOURCE_SCARCITY
} from "@/constants";

// Poisson disc sampling for generating Voronoi sites
function poissonDiscSampling(
  width: number,
  height: number,
  minDistance: number,
  maxAttempts: number = 30
): [number, number][] {
  const points: [number, number][] = [];
  const active: [number, number][] = [];
  const grid: (number | null)[] = [];
  const cellSize = minDistance / Math.SQRT2;
  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);

  // Initialize grid
  for (let i = 0; i < cols * rows; i++) {
    grid[i] = null;
  }

  // Helper to get grid index
  const getGridIndex = (x: number, y: number): number => {
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    return row * cols + col;
  };

  // Helper to check if point is valid
  const isValid = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;

    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    const startCol = Math.max(0, col - 2);
    const endCol = Math.min(cols - 1, col + 2);
    const startRow = Math.max(0, row - 2);
    const endRow = Math.min(rows - 1, row + 2);

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const idx = r * cols + c;
        const neighborIdx = grid[idx];
        if (neighborIdx !== null && typeof neighborIdx === 'number') {
          const neighborPoint = points[neighborIdx];
          if (neighborPoint) {
            const dx = x - neighborPoint[0];
            const dy = y - neighborPoint[1];
            if (dx * dx + dy * dy < minDistance * minDistance) {
              return false;
            }
          }
        }
      }
    }
    return true;
  };

  // Add first point
  const firstX = width / 2;
  const firstY = height / 2;
  points.push([firstX, firstY]);
  active.push([firstX, firstY]);
  grid[getGridIndex(firstX, firstY)] = points.length - 1;

  // Generate more points
  while (active.length > 0) {
    const randomIndex = Math.floor(Math.random() * active.length);
    const point = active[randomIndex];
    let found = false;

    for (let i = 0; i < maxAttempts; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = minDistance + Math.random() * minDistance;
      const newX = point[0] + Math.cos(angle) * distance;
      const newY = point[1] + Math.sin(angle) * distance;

      if (isValid(newX, newY)) {
        points.push([newX, newY]);
        active.push([newX, newY]);
        grid[getGridIndex(newX, newY)] = points.length - 1;
        found = true;
        break;
      }
    }

    if (!found) {
      active.splice(randomIndex, 1);
    }
  }

  return points;
}

// Simple 2D Perlin-like noise function
function noise2D(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

// Improved smooth interpolation (smoothstep)
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

// Smooth noise using bilinear interpolation with smoothstep
function smoothNoise(x: number, y: number, seed: number, scale: number): number {
  const scaledX = x / scale;
  const scaledY = y / scale;
  
  const x1 = Math.floor(scaledX);
  const y1 = Math.floor(scaledY);
  const x2 = x1 + 1;
  const y2 = y1 + 1;

  const fracX = scaledX - x1;
  const fracY = scaledY - y1;
  
  // Apply smoothstep for better interpolation
  const smoothX = smoothstep(fracX);
  const smoothY = smoothstep(fracY);

  const n11 = noise2D(x1, y1, seed);
  const n12 = noise2D(x1, y2, seed);
  const n21 = noise2D(x2, y1, seed);
  const n22 = noise2D(x2, y2, seed);

  // Bilinear interpolation with smoothstep
  const i1 = n11 * (1 - smoothX) + n21 * smoothX;
  const i2 = n12 * (1 - smoothX) + n22 * smoothX;
  return i1 * (1 - smoothY) + i2 * smoothY;
}

// Fractal Brownian Motion (FBM) - creates natural looking patterns
function fbm(x: number, y: number, seed: number, octaves: number = 6): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1.0;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += smoothNoise(x * frequency, y * frequency, seed + i * 1000, 50) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value / maxValue;
}

// Continent data structure
interface Continent {
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  rotation: number;
  seed: number;
}

// Island data structure
interface Island {
  centerX: number;
  centerY: number;
  radius: number;
  seed: number;
}

// Generate continent positions and sizes
function generateContinents(
  width: number,
  height: number,
  count: number,
  seed: number
): Continent[] {
  const continents: Continent[] = [];
  const padding = 0.15; // Keep continents away from edges
  
  // Use seeded random for continent generation
  let rng = seed;
  const seededRandom = () => {
    rng = (rng * 9301 + 49297) % 233280;
    return rng / 233280;
  };
  
  for (let i = 0; i < count; i++) {
    // Position continents with some spacing
    const angle = (i / count) * Math.PI * 2 + seededRandom() * 0.5;
    const distanceFromCenter = 0.15 + seededRandom() * 0.35;
    
    const centerX = width * (0.5 + Math.cos(angle) * distanceFromCenter);
    const centerY = height * (0.5 + Math.sin(angle) * distanceFromCenter);
    
    // Vary continent sizes
    const baseRadius = Math.min(width, height) * (0.2 + seededRandom() * 0.15);
    const radiusX = baseRadius * (0.8 + seededRandom() * 0.4);
    const radiusY = baseRadius * (0.8 + seededRandom() * 0.4);
    
    // Random rotation for variety
    const rotation = seededRandom() * Math.PI * 2;
    
    continents.push({
      centerX,
      centerY,
      radiusX,
      radiusY,
      rotation,
      seed: seed + i * 12345
    });
  }
  
  return continents;
}

// Generate island positions and sizes
function generateIslands(
  width: number,
  height: number,
  count: number,
  seed: number,
  continents: Continent[]
): Island[] {
  const islands: Island[] = [];
  
  // Use seeded random for island generation
  let rng = seed + 99999;
  const seededRandom = () => {
    rng = (rng * 9301 + 49297) % 233280;
    return rng / 233280;
  };
  
  const minIslandRadius = Math.min(width, height) * 0.03;
  const maxIslandRadius = Math.min(width, height) * 0.08;
  
  for (let i = 0; i < count; i++) {
    // Random position, avoiding continents
    let attempts = 0;
    let centerX = 0;
    let centerY = 0;
    let tooClose = true;
    
    while (tooClose && attempts < 50) {
      centerX = width * (0.1 + seededRandom() * 0.8);
      centerY = height * (0.1 + seededRandom() * 0.8);
      
      // Check distance from continents
      tooClose = false;
      for (const continent of continents) {
        const dx = centerX - continent.centerX;
        const dy = centerY - continent.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < (continent.radiusX + continent.radiusY) / 2) {
          tooClose = true;
          break;
        }
      }
      attempts++;
    }
    
    if (attempts >= 50) continue; // Skip if can't find good position
    
    const radius = minIslandRadius + seededRandom() * (maxIslandRadius - minIslandRadius);
    
    islands.push({
      centerX,
      centerY,
      radius,
      seed: seed + i * 54321
    });
  }
  
  return islands;
}

// Evaluate elevation for a single continent
function evaluateContinent(
  x: number,
  y: number,
  continent: Continent,
  variance: number
): number {
  // Rotate point relative to continent center
  const dx = x - continent.centerX;
  const dy = y - continent.centerY;
  
  const rotatedX = dx * Math.cos(-continent.rotation) - dy * Math.sin(-continent.rotation);
  const rotatedY = dx * Math.sin(-continent.rotation) + dy * Math.cos(-continent.rotation);
  
  // Normalized distance from continent center (elliptical)
  const normalizedDist = Math.sqrt(
    (rotatedX * rotatedX) / (continent.radiusX * continent.radiusX) +
    (rotatedY * rotatedY) / (continent.radiusY * continent.radiusY)
  );
  
  // Base shape - falloff from center
  const baseShape = Math.max(0, 1.0 - Math.pow(normalizedDist, 1.3));
  
  if (baseShape <= 0) return 0;
  
  // Add noise for organic coastlines
  const continentNoise = fbm(x, y, continent.seed, 3);
  const mediumNoise = fbm(x, y, continent.seed + 5000, 5);
  const detailNoise = fbm(x, y, continent.seed + 10000, 6);
  
  const combinedNoise = 
    continentNoise * 0.5 + 
    mediumNoise * 0.3 + 
    detailNoise * 0.2;
  
  // Apply variance to noise influence
  const noiseInfluence = (combinedNoise - 0.5) * variance;
  
  return baseShape + noiseInfluence;
}

// Evaluate elevation for a single island
function evaluateIsland(
  x: number,
  y: number,
  island: Island,
  variance: number
): number {
  const dx = x - island.centerX;
  const dy = y - island.centerY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  const normalizedDist = dist / island.radius;
  
  // Island shape - smaller and more circular than continents
  const baseShape = Math.max(0, 1.0 - Math.pow(normalizedDist, 2.0));
  
  if (baseShape <= 0) return 0;
  
  // Less noise for islands (they're smaller and simpler)
  const islandNoise = fbm(x, y, island.seed, 4);
  const noiseInfluence = (islandNoise - 0.5) * variance * 0.5;
  
  return baseShape + noiseInfluence;
}

// Generate terrain type with multiple continents and islands
function getTerrainType(
  x: number, 
  y: number, 
  continents: Continent[],
  islands: Island[],
  variance: number
): TerrainType {
  let maxElevation = 0;
  
  // Check all continents
  if (continents && Array.isArray(continents)) {
    for (const continent of continents) {
      if (continent) {
        const elevation = evaluateContinent(x, y, continent, variance);
        maxElevation = Math.max(maxElevation, elevation);
      }
    }
  }
  
  // Check all islands
  if (islands && Array.isArray(islands)) {
    for (const island of islands) {
      if (island) {
        const elevation = evaluateIsland(x, y, island, variance);
        maxElevation = Math.max(maxElevation, elevation);
      }
    }
  }
  
  // Threshold for land vs water
  const waterThreshold = 0.15;
  
  return maxElevation > waterThreshold ? TerrainType.Land : TerrainType.Water;
}

// Assign resources randomly across available lands based on scarcity percentages
function assignResource(terrain: TerrainType, x: number, y: number, width: number, height: number): ResourceType | undefined {
  const rand = Math.random();
  
  if (terrain === TerrainType.Water) {
    // Water resources can appear in water terrain
    return rand < RESOURCE_SCARCITY.WATER ? ResourceType.Water : undefined;
  }

  // Land resources - randomly distributed based on scarcity percentages
  // Use cumulative probability to ensure only one resource per cell
  let cumulative = 0;
  
  // Check each resource type in order (rarest first)
  if (rand < (cumulative += RESOURCE_SCARCITY.GOLD)) {
    return ResourceType.Gold;
  }
  if (rand < (cumulative += RESOURCE_SCARCITY.BRONZE)) {
    return ResourceType.Bronze;
  }
  if (rand < (cumulative += RESOURCE_SCARCITY.IRON)) {
    return ResourceType.Iron;
  }
  if (rand < (cumulative += RESOURCE_SCARCITY.COAL)) {
    return ResourceType.Coal;
  }
  if (rand < (cumulative += RESOURCE_SCARCITY.WHEAT)) {
    return ResourceType.Wheat;
  }
  if (rand < (cumulative += RESOURCE_SCARCITY.WOOD)) {
    return ResourceType.Wood;
  }
  if (rand < (cumulative += RESOURCE_SCARCITY.COTTON)) {
    return ResourceType.Cotton;
  }
  if (rand < (cumulative += RESOURCE_SCARCITY.WILDLIFE)) {
    return ResourceType.Wildlife;
  }
  if (rand < (cumulative += RESOURCE_SCARCITY.WATER)) {
    return ResourceType.Water; // Water sources on land
  }

  return undefined;
}

export function generateMap(
  seed: string, 
  width: number = MAP_WIDTH, 
  height: number = MAP_HEIGHT,
  cellDensityDivisor: number = CELL_DENSITY_DIVISOR,
  numContinents: number = NUMBER_OF_CONTINENTS,
  numIslands: number = NUMBER_OF_ISLANDS,
  landVariance: number = LAND_VARIANCE
): MapData {
  // Set seed for reproducibility
  let seedValue = 0;
  for (let i = 0; i < seed.length; i++) {
    seedValue = ((seedValue << 5) - seedValue) + seed.charCodeAt(i);
    seedValue = seedValue & seedValue;
  }
  
  // Simple seeded random
  let rng = seedValue;
  const random = () => {
    rng = (rng * 9301 + 49297) % 233280;
    return rng / 233280;
  };

  // Override Math.random temporarily
  const originalRandom = Math.random;
  Math.random = random;

  try {
    // Generate continents and islands
    const continents = generateContinents(width, height, numContinents, seedValue);
    const islands = generateIslands(width, height, numIslands, seedValue, continents);
    
    console.log(`Generated ${continents.length} continents and ${islands.length} islands`);
    
    // Generate Voronoi sites using Poisson disc sampling
    // Higher divisor = smaller cells (more cells)
    const minDistance = Math.min(width, height) / cellDensityDivisor;
    const sites = poissonDiscSampling(width, height, minDistance);

    // Create Delaunay triangulation
    const delaunay = Delaunay.from(sites);

    // Create Voronoi diagram
    const voronoi = delaunay.voronoi([0, 0, width, height]);

    // Generate cells
    const cells: VoronoiCell[] = [];
    const neighborMap = new Map<string, Set<string>>();

    sites.forEach((site, i) => {
      try {
        // Validate site exists and has coordinates
        if (!site || !Array.isArray(site) || site.length < 2 || site[0] === undefined || site[1] === undefined) {
          console.warn(`Skipping invalid site at index ${i}:`, site);
          return;
        }
        
        const id = `cell-${i}`;
        const cellPath = voronoi.renderCell(i);
        
        if (!cellPath) return;

        // Parse SVG path string to extract polygon points
        // Format: "M x1,y1 L x2,y2 L x3,y3 ... Z" or "M x1 y1 L x2 y2 ..."
        const points: [number, number][] = [];
        
        // Remove M, L, Z commands and split by commas or spaces
        const cleanedPath = cellPath
          .replace(/[MLZ]/g, " ")
          .replace(/,/g, " ")
          .trim();
        
        const numbers = cleanedPath.match(/[\d.e-]+/g);
        
        if (numbers && numbers.length >= 2) {
          for (let j = 0; j < numbers.length; j += 2) {
            if (j + 1 < numbers.length) {
              const x = parseFloat(numbers[j]);
              const y = parseFloat(numbers[j + 1]);
              if (!isNaN(x) && !isNaN(y)) {
                points.push([x, y]);
              }
            }
          }
        }
        
        // Remove duplicate consecutive points
        const uniquePoints: [number, number][] = [];
        for (let j = 0; j < points.length; j++) {
          const prev = uniquePoints[uniquePoints.length - 1];
          const curr = points[j];
          if (!prev || (prev[0] !== curr[0] || prev[1] !== curr[1])) {
            uniquePoints.push(curr);
          }
        }
        
        // If parsing failed or we have too few points, create a simple square around the site
        if (uniquePoints.length < 3) {
          const size = minDistance * 0.5;
          uniquePoints.length = 0;
          uniquePoints.push(
            [site[0] - size, site[1] - size],
            [site[0] + size, site[1] - size],
            [site[0] + size, site[1] + size],
            [site[0] - size, site[1] + size]
          );
        }
        
        const finalPoints = uniquePoints;

        const terrain = getTerrainType(site[0], site[1], continents, islands, landVariance);
        const resource = terrain === TerrainType.Land 
          ? assignResource(terrain, site[0], site[1], width, height)
          : undefined;

        // Find neighbors
        const neighbors: string[] = [];
        const triangles = delaunay.neighbors(i);
        // delaunay.neighbors() returns a Generator, convert to array
        const triangleArray = triangles ? Array.from(triangles) : [];
        for (const neighborIdx of triangleArray) {
          if (neighborIdx !== undefined && neighborIdx !== null && neighborIdx !== -1) {
            neighbors.push(`cell-${neighborIdx}`);
          }
        }

        cells.push({
          id,
          site,
          polygon: finalPoints,
          neighbors,
          terrain,
          resource,
        });

        neighborMap.set(id, new Set(neighbors));
      } catch (error) {
        console.error(`Error processing site ${i}:`, error);
        console.error(`Site value:`, site);
        console.error(`Error stack:`, error instanceof Error ? error.stack : 'No stack');
        throw error;
      }
    });

    // Ensure bidirectional neighbor relationships
    cells.forEach((cell) => {
      if (!cell || !cell.neighbors) return;
      cell.neighbors.forEach((neighborId) => {
        if (!neighborId) return;
        const neighbor = cells.find((c) => c && c.id === neighborId);
        if (neighbor && neighbor.neighbors && !neighbor.neighbors.includes(cell.id)) {
          neighbor.neighbors.push(cell.id);
        }
      });
    });

    return {
      id: `map-${Date.now()}`,
      seed,
      width,
      height,
      cells,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } finally {
    // Restore original Math.random
    Math.random = originalRandom;
  }
}

