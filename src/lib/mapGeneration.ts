import { HexCell, TerrainType, TileType, MapData } from "@/types/game";
import { ResourceType } from "@/types/resources";
import { 
  MAP_WIDTH, 
  MAP_HEIGHT, 
  HEX_SIZE,
  HEX_ORIENTATION,
  NUMBER_OF_CONTINENTS,
  NUMBER_OF_ISLANDS,
  LAND_VARIANCE,
  LAND_TILE_PERCENTAGE,
  TILE_TYPES,
  RESOURCE_SCARCITY
} from "@/constants";

// Hexagon grid math for pointy-top hexagons
const SQRT3 = Math.sqrt(3);

/**
 * Convert hex grid coordinates (row, col) to pixel coordinates
 */
function hexToPixel(row: number, col: number, hexSize: number): [number, number] {
  const x = hexSize * SQRT3 * (col + (row % 2) * 0.5);
  const y = hexSize * 1.5 * row;
  return [x, y];
}

/**
 * Generate hexagon vertices (6 points) for a pointy-top hexagon
 */
function generateHexagonVertices(centerX: number, centerY: number, hexSize: number): [number, number][] {
  const vertices: [number, number][] = [];
  // Pointy-top: start from top (0°), then 60° intervals
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i; // 60 degrees in radians
    const x = centerX + hexSize * Math.sin(angle);
    const y = centerY - hexSize * Math.cos(angle);
    vertices.push([x, y]);
  }
  return vertices;
}

/**
 * Get hexagon neighbors using offset coordinates
 * For pointy-top hexagons in offset coordinates
 */
function getHexNeighbors(row: number, col: number): [number, number][] {
  const isOddRow = row % 2 === 1;
  if (isOddRow) {
    // Odd rows
    return [
      [row - 1, col],     // Top
      [row - 1, col + 1], // Top-right
      [row, col + 1],     // Right
      [row + 1, col + 1], // Bottom-right
      [row + 1, col],     // Bottom
      [row, col - 1],     // Left
    ];
  } else {
    // Even rows
    return [
      [row - 1, col - 1], // Top-left
      [row - 1, col],     // Top
      [row, col + 1],     // Right
      [row + 1, col],     // Bottom
      [row + 1, col - 1], // Bottom-left
      [row, col - 1],     // Left
    ];
  }
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
  // Higher variance creates more irregular falloff curves
  const falloffPower = 1.3 - (variance * 0.3); // Range: 1.0 to 1.3
  const baseShape = Math.max(0, 1.0 - Math.pow(normalizedDist, falloffPower));
  
  if (baseShape <= 0) return 0;
  
  // Add noise for organic coastlines with variance affecting shape variation
  const continentNoise = fbm(x, y, continent.seed, 3);
  const mediumNoise = fbm(x, y, continent.seed + 5000, 5);
  const detailNoise = fbm(x, y, continent.seed + 10000, 6);
  
  // Variance affects the weight of different noise scales
  const noiseWeight1 = 0.5 - (variance * 0.1); // Less weight on large-scale noise with high variance
  const noiseWeight2 = 0.3 + (variance * 0.1); // More weight on medium-scale noise
  const noiseWeight3 = 0.2 + (variance * 0.1); // More weight on detail noise
  
  const combinedNoise = 
    continentNoise * noiseWeight1 + 
    mediumNoise * noiseWeight2 + 
    detailNoise * noiseWeight3;
  
  // Apply variance to noise influence - higher variance = more dramatic shape variation
  const noiseInfluence = (combinedNoise - 0.5) * variance * 1.5;
  
  // Variance also affects the base shape's distortion
  const shapeDistortion = variance * 0.2 * (combinedNoise - 0.5);
  
  return Math.max(0, Math.min(1, baseShape + noiseInfluence + shapeDistortion));
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
  // Higher variance creates more irregular island shapes
  const falloffPower = 2.0 - (variance * 0.4); // Range: 1.6 to 2.0
  const baseShape = Math.max(0, 1.0 - Math.pow(normalizedDist, falloffPower));
  
  if (baseShape <= 0) return 0;
  
  // Variance affects noise intensity for islands
  const islandNoise = fbm(x, y, island.seed, 4);
  const detailNoise = fbm(x, y, island.seed + 20000, 6);
  
  // Higher variance = more noise influence on island shape
  const noiseInfluence = (islandNoise - 0.5) * variance * 0.6;
  const detailInfluence = (detailNoise - 0.5) * variance * 0.3;
  
  return Math.max(0, Math.min(1, baseShape + noiseInfluence + detailInfluence));
}

// Calculate elevation for a point (used for terrain assignment)
function calculateElevation(
  x: number, 
  y: number, 
  continents: Continent[],
  islands: Island[],
  variance: number
): number {
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
  
  return maxElevation;
}

// Assign tile type to land tiles based on distribution percentages
function assignTileType(tileTypes: typeof TILE_TYPES): TileType {
  const rand = Math.random();
  let cumulative = 0;
  
  // Check each tile type in order
  if (rand < (cumulative += tileTypes.PLAINS)) {
    return TileType.Plains;
  }
  if (rand < (cumulative += tileTypes.WOODS)) {
    return TileType.Woods;
  }
  if (rand < (cumulative += tileTypes.MOUNTAINS)) {
    return TileType.Mountains;
  }
  if (rand < (cumulative += tileTypes.HILLS)) {
    return TileType.Hills;
  }
  if (rand < (cumulative += tileTypes.DESERT)) {
    return TileType.Desert;
  }
  if (rand < (cumulative += tileTypes.SWAMP)) {
    return TileType.Swamp;
  }
  
  // Default to Plains if somehow we exceed 1.0
  return TileType.Plains;
}

// Assign resources randomly across available lands based on scarcity percentages
// IMPORTANT: Resources are ONLY assigned to land tiles
function assignResource(terrain: TerrainType, x: number, y: number, width: number, height: number, resourceScarcity: typeof RESOURCE_SCARCITY): ResourceType | undefined {
  // Only assign resources to land tiles
  if (terrain !== TerrainType.Land) {
    return undefined;
  }

  const rand = Math.random();
  
  // Land resources - randomly distributed based on scarcity percentages
  // Use cumulative probability to ensure only one resource per cell
  let cumulative = 0;
  
  // Check each resource type in order (rarest first)
  if (rand < (cumulative += resourceScarcity.GOLD)) {
    return ResourceType.Gold;
  }
  if (rand < (cumulative += resourceScarcity.BRONZE)) {
    return ResourceType.Bronze;
  }
  if (rand < (cumulative += resourceScarcity.IRON)) {
    return ResourceType.Iron;
  }
  if (rand < (cumulative += resourceScarcity.COAL)) {
    return ResourceType.Coal;
  }
  if (rand < (cumulative += resourceScarcity.WHEAT)) {
    return ResourceType.Wheat;
  }
  if (rand < (cumulative += resourceScarcity.WOOD)) {
    return ResourceType.Wood;
  }
  if (rand < (cumulative += resourceScarcity.COTTON)) {
    return ResourceType.Cotton;
  }
  if (rand < (cumulative += resourceScarcity.WILDLIFE)) {
    return ResourceType.Wildlife;
  }
  if (rand < (cumulative += resourceScarcity.WATER)) {
    return ResourceType.Water; // Water sources on land
  }

  return undefined;
}

export function generateMap(
  seed: string, 
  width: number = MAP_WIDTH, 
  height: number = MAP_HEIGHT,
  hexSize: number = HEX_SIZE,
  numContinents: number = NUMBER_OF_CONTINENTS,
  numIslands: number = NUMBER_OF_ISLANDS,
  landVariance: number = LAND_VARIANCE,
  landTilePercentage: number = LAND_TILE_PERCENTAGE,
  tileTypes: typeof TILE_TYPES = TILE_TYPES,
  resourceScarcity: typeof RESOURCE_SCARCITY = RESOURCE_SCARCITY
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
    
    // Generate hexagon grid
    // Calculate grid dimensions
    const hexWidth = hexSize * SQRT3;
    const hexHeight = hexSize * 2;
    
    // Calculate number of hexagons needed to cover the map
    const cols = Math.ceil(width / hexWidth) + 1;
    const rows = Math.ceil(height / hexHeight) + 1;
    
    // First pass: Generate all cells with elevation data
    interface CellWithElevation {
      cell: HexCell;
      elevation: number;
      row: number;
      col: number;
    }
    
    const cellsWithElevation: CellWithElevation[] = [];
    const cellMap = new Map<string, HexCell>(); // For neighbor lookup: "row,col" -> cell
    
    // Generate hexagons and calculate elevation
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const [centerX, centerY] = hexToPixel(row, col, hexSize);
        
        // Skip hexagons that are completely outside the map bounds
        if (centerX < -hexSize || centerX > width + hexSize || 
            centerY < -hexSize || centerY > height + hexSize) {
          continue;
        }
        
        const id = `hex-${row}-${col}`;
        const vertices = generateHexagonVertices(centerX, centerY, hexSize);
        
        // Calculate elevation for terrain assignment
        const elevation = calculateElevation(centerX, centerY, continents, islands, landVariance);
        
        // Create cell (terrain and resource will be assigned after sorting)
        const cell: HexCell = {
          id,
          site: [centerX, centerY],
          polygon: vertices,
          neighbors: [], // Will be populated below
          terrain: TerrainType.Water, // Default, will be updated
        };
        
        cellsWithElevation.push({
          cell,
          elevation,
          row,
          col,
        });
        
        cellMap.set(`${row},${col}`, cell);
      }
    }
    
    // Sort cells by elevation (highest first)
    // This ensures cells near continent/island centers (higher elevation) are selected first
    // which naturally forms cohesive landmasses
    cellsWithElevation.sort((a, b) => b.elevation - a.elevation);
    
    // Assign land/water based on percentage
    // Take the top N% of cells by elevation, which naturally groups into continents/islands
    const totalCells = cellsWithElevation.length;
    const landCellCount = Math.floor(totalCells * landTilePercentage);
    
    // Debug: Check elevation distribution
    const maxElevation = cellsWithElevation.length > 0 ? cellsWithElevation[0].elevation : 0;
    const minElevation = cellsWithElevation.length > 0 ? cellsWithElevation[cellsWithElevation.length - 1].elevation : 0;
    const cellsWithElevationAboveZero = cellsWithElevation.filter(c => c.elevation > 0).length;
    console.log(`Map generation: ${totalCells} total cells, ${landCellCount} target land cells`);
    console.log(`Elevation range: ${minElevation.toFixed(3)} to ${maxElevation.toFixed(3)}, ${cellsWithElevationAboveZero} cells with elevation > 0`);
    
    // Assign terrain types
    for (let i = 0; i < totalCells; i++) {
      const cellData = cellsWithElevation[i];
      
      // Store elevation, row, and col in cell for tooltip display
      cellData.cell.elevation = cellData.elevation;
      cellData.cell.row = cellData.row;
      cellData.cell.col = cellData.col;
      
      if (i < landCellCount) {
        cellData.cell.terrain = TerrainType.Land;
        // Assign tile type to land cells
        cellData.cell.tileType = assignTileType(tileTypes);
        // Assign resources only to land cells
        cellData.cell.resource = assignResource(
          TerrainType.Land,
          cellData.cell.site[0],
          cellData.cell.site[1],
          width,
          height,
          resourceScarcity
        );
      } else {
        cellData.cell.terrain = TerrainType.Water;
        // Water tiles don't get resources or tile types
      }
    }
    
    // Extract cells array
    const cells = cellsWithElevation.map(c => c.cell);
    
    // Log resource distribution statistics
    const resourceCounts = new Map<ResourceType, number>();
    let landCellsWithResources = 0;
    cells.forEach(cell => {
      if (cell.terrain === TerrainType.Land && cell.resource) {
        landCellsWithResources++;
        resourceCounts.set(cell.resource, (resourceCounts.get(cell.resource) || 0) + 1);
      }
    });
    const totalLandCells = cells.filter(c => c.terrain === TerrainType.Land).length;
    console.log(`Terrain assignment: ${totalLandCells} land cells created (target was ${landCellCount}, ${((totalLandCells / totalCells) * 100).toFixed(1)}% of total)`);
    console.log(`Resource distribution: ${landCellsWithResources}/${totalLandCells} land cells have resources (${totalLandCells > 0 ? ((landCellsWithResources / totalLandCells) * 100).toFixed(1) : 0}%)`);
    resourceCounts.forEach((count, resource) => {
      console.log(`  ${resource}: ${count} cells (${((count / totalLandCells) * 100).toFixed(1)}% of land)`);
    });
    
    // Set neighbors for each hexagon
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cellKey = `${row},${col}`;
        const cell = cellMap.get(cellKey);
        if (!cell) continue;
        
        const neighborCoords = getHexNeighbors(row, col);
        for (const [nRow, nCol] of neighborCoords) {
          const neighborKey = `${nRow},${nCol}`;
          const neighbor = cellMap.get(neighborKey);
          if (neighbor) {
            cell.neighbors.push(neighbor.id);
          }
        }
      }
    }
    
    console.log(`Generated ${cells.length} hexagons`);
    
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
