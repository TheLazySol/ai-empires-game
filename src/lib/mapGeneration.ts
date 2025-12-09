import { Delaunay } from "d3-delaunay";
import { VoronoiCell, TerrainType, MapData } from "@/types/game";
import { ResourceType } from "@/types/resources";

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

// Generate terrain type based on position (water around edges)
function getTerrainType(x: number, y: number, width: number, height: number): TerrainType {
  const edgeThreshold = Math.min(width, height) * 0.15;
  const distFromEdge = Math.min(
    x,
    y,
    width - x,
    height - y
  );

  // Add some randomness for more natural borders
  const noise = (Math.random() - 0.5) * edgeThreshold * 0.3;
  
  return distFromEdge + noise < edgeThreshold ? TerrainType.Water : TerrainType.Land;
}

// Assign resources based on biome/terrain
function assignResource(terrain: TerrainType, x: number, y: number, width: number, height: number): ResourceType | undefined {
  if (terrain === TerrainType.Water) {
    // Water resources only in water
    return Math.random() < 0.3 ? ResourceType.Water : undefined;
  }

  // Land resources - biome-based distribution
  const centerX = width / 2;
  const centerY = height / 2;
  const distFromCenter = Math.sqrt(
    Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
  );
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
  const normalizedDist = distFromCenter / maxDist;

  // Resource probability based on location
  const rand = Math.random();
  
  // Coastal areas (near water) - more likely to have water-adjacent resources
  if (normalizedDist > 0.7) {
    if (rand < 0.15) return ResourceType.Water;
    if (rand < 0.25) return ResourceType.Wildlife;
    if (rand < 0.35) return ResourceType.Wood;
  }

  // Central areas - more diverse resources
  if (rand < 0.12) {
    const resources: ResourceType[] = [
      ResourceType.Wheat,
      ResourceType.Wood,
      ResourceType.Cotton,
      ResourceType.Wildlife,
    ];
    return resources[Math.floor(Math.random() * resources.length)];
  }

  // Mineral resources - rarer, more clustered
  if (rand < 0.18) {
    const minerals: ResourceType[] = [
      ResourceType.Bronze,
      ResourceType.Iron,
      ResourceType.Coal,
    ];
    return minerals[Math.floor(Math.random() * minerals.length)];
  }

  // Gold - very rare
  if (rand < 0.02) {
    return ResourceType.Gold;
  }

  return undefined;
}

export function generateMap(seed: string, width: number = 200, height: number = 200): MapData {
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
    // Generate Voronoi sites using Poisson disc sampling
    const minDistance = Math.min(width, height) / 15; // Adjust density
    const sites = poissonDiscSampling(width, height, minDistance);

    // Create Delaunay triangulation
    const delaunay = Delaunay.from(sites);

    // Create Voronoi diagram
    const voronoi = delaunay.voronoi([0, 0, width, height]);

    // Generate cells
    const cells: VoronoiCell[] = [];
    const neighborMap = new Map<string, Set<string>>();

    sites.forEach((site, i) => {
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
      for (let i = 0; i < points.length; i++) {
        const prev = uniquePoints[uniquePoints.length - 1];
        const curr = points[i];
        if (!prev || prev[0] !== curr[0] || prev[1] !== curr[1]) {
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

      const terrain = getTerrainType(site[0], site[1], width, height);
      const resource = terrain === TerrainType.Land 
        ? assignResource(terrain, site[0], site[1], width, height)
        : undefined;

      // Find neighbors
      const neighbors: string[] = [];
      const triangles = delaunay.neighbors(i);
      for (const neighborIdx of triangles) {
        if (neighborIdx !== -1) {
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
    });

    // Ensure bidirectional neighbor relationships
    cells.forEach((cell) => {
      cell.neighbors.forEach((neighborId) => {
        const neighbor = cells.find((c) => c.id === neighborId);
        if (neighbor && !neighbor.neighbors.includes(cell.id)) {
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

