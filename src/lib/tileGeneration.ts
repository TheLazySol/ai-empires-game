import { createCanvas, CanvasRenderingContext2D } from "canvas";
import { HexCell, MapView, TerrainType, MapData } from "@/types/game";
import { ResourceType, RESOURCE_METADATA } from "@/types/resources";
import { TileCoordinate } from "@/types/game";

const BASE_TILE_SIZE = 512;
const HIGH_RES_TILE_SIZE = 1024;
const ZOOM_MULTIPLIERS = [1, 2, 4, 8, 16]; // For zoom levels 0-4

/**
 * Get tile size based on zoom level
 * Higher zoom levels (2-4) use 1024px for better quality
 * Lower zoom levels (0-1) use 512px for better performance
 */
export function getTileSize(zoomLevel: number): number {
  return zoomLevel >= 2 ? HIGH_RES_TILE_SIZE : BASE_TILE_SIZE;
}

export interface TileBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Calculate which cells belong to a tile based on tile coordinates and zoom level
 */
export function calculateTileBounds(
  tileX: number,
  tileY: number,
  zoomLevel: number,
  mapWidth: number,
  mapHeight: number
): TileBounds {
  const multiplier = ZOOM_MULTIPLIERS[zoomLevel];
  const tileSize = getTileSize(zoomLevel);
  const worldTileSize = tileSize * multiplier;
  
  const minX = tileX * worldTileSize;
  const maxX = minX + worldTileSize;
  const minY = tileY * worldTileSize;
  const maxY = minY + worldTileSize;
  
  return {
    minX: Math.max(0, minX),
    maxX: Math.min(mapWidth, maxX),
    minY: Math.max(0, minY),
    maxY: Math.min(mapHeight, maxY),
  };
}

/**
 * Get hexagons that intersect with a tile's bounds
 */
export function getCellsForTile(
  cells: HexCell[],
  bounds: TileBounds,
  zoomLevel: number
): HexCell[] {
  const tileSize = getTileSize(zoomLevel);
  const padding = tileSize * 0.1; // Add padding to include hexagons near edges
  const expandedBounds = {
    minX: bounds.minX - padding,
    maxX: bounds.maxX + padding,
    minY: bounds.minY - padding,
    maxY: bounds.maxY + padding,
  };
  
  return cells.filter((cell) => {
    const [x, y] = cell.site;
    return (
      x >= expandedBounds.minX &&
      x <= expandedBounds.maxX &&
      y >= expandedBounds.minY &&
      y <= expandedBounds.maxY
    );
  });
}

// Hexagons are uniform shapes, no simplification needed

/**
 * Get fill color for a hexagon based on view mode
 */
function getCellFillColor(
  cell: HexCell,
  viewMode: MapView,
  territories: Map<string, string>, // cellId -> playerId
  playerColors: Map<string, string> // playerId -> color
): { color: string; alpha: number } {
  if (viewMode === MapView.Terrain) {
    return {
      color: cell.terrain === TerrainType.Water ? "#3498db" : "#ffffff",
      alpha: 1,
    };
  }
  
  if (viewMode === MapView.Political) {
    const playerId = territories.get(cell.id);
    if (playerId) {
      const color = playerColors.get(playerId) || "#9b59b6";
      return { color, alpha: 1 };
    }
    return {
      color: cell.terrain === TerrainType.Water ? "#3498db" : "#ffffff",
      alpha: 1,
    };
  }
  
  if (viewMode === MapView.Resources) {
    if (cell.resource) {
      const resourceMeta = RESOURCE_METADATA[cell.resource];
      return { color: resourceMeta.color, alpha: 0.3 };
    }
    return {
      color: cell.terrain === TerrainType.Water ? "#3498db" : "#ffffff",
      alpha: 1,
    };
  }
  
  return { color: "#ffffff", alpha: 1 };
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 255, b: 255 };
}

/**
 * Render hexagons to a tile canvas
 */
export function renderCellsToTile(
  cells: HexCell[],
  bounds: TileBounds,
  zoomLevel: number,
  viewMode: MapView,
  territories: Map<string, string> = new Map(),
  playerColors: Map<string, string> = new Map()
): Buffer {
  const tileSize = getTileSize(zoomLevel);
  const canvas = createCanvas(tileSize, tileSize);
  const ctx = canvas.getContext("2d");
  
  // Enable high-quality rendering
  ctx.imageSmoothingEnabled = true;
  
  // Clear canvas with background color
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(0, 0, tileSize, tileSize);
  
  // Calculate scale and offset to transform world coordinates to tile coordinates
  const multiplier = ZOOM_MULTIPLIERS[zoomLevel];
  const worldTileSize = tileSize * multiplier;
  const offsetX = -bounds.minX;
  const offsetY = -bounds.minY;
  const scale = tileSize / worldTileSize;
  
  // Render hexagons
  for (const cell of cells) {
    if (!cell.polygon || cell.polygon.length !== 6) {
      continue; // Skip invalid hexagons
    }
    
    // Get fill color
    const { color, alpha } = getCellFillColor(cell, viewMode, territories, playerColors);
    const rgb = hexToRgb(color);
    
    // Begin path and draw hexagon (always 6 vertices)
    ctx.beginPath();
    const firstPoint = cell.polygon[0];
    const [firstX, firstY] = [
      (firstPoint[0] + offsetX) * scale,
      (firstPoint[1] + offsetY) * scale,
    ];
    ctx.moveTo(firstX, firstY);
    
    for (let i = 1; i < 6; i++) {
      const [x, y] = [
        (cell.polygon[i][0] + offsetX) * scale,
        (cell.polygon[i][1] + offsetY) * scale,
      ];
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    
    // Fill hexagon
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    ctx.fill();
    
    // Draw stroke only for higher zoom levels
    if (zoomLevel >= 2) {
      ctx.strokeStyle = "rgba(153, 153, 153, 0.5)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }
  
  // Return PNG buffer with high quality (compressionLevel: 0 = no compression, 9 = max compression)
  // Using level 6 for a balance between quality and file size
  return canvas.toBuffer("image/png", { compressionLevel: 6 });
}

/**
 * Generate a single tile
 */
export async function generateTile(
  mapData: MapData,
  tileX: number,
  tileY: number,
  zoomLevel: number,
  viewMode: MapView,
  territories: Map<string, string> = new Map(),
  playerColors: Map<string, string> = new Map()
): Promise<Buffer> {
  const bounds = calculateTileBounds(
    tileX,
    tileY,
    zoomLevel,
    mapData.width,
    mapData.height
  );
  
  const cells = getCellsForTile(mapData.cells, bounds, zoomLevel);
  
  return renderCellsToTile(
    cells,
    bounds,
    zoomLevel,
    viewMode,
    territories,
    playerColors
  );
}

/**
 * Generate unique tile identifier
 */
export function getTileKey(
  mapId: string,
  zoomLevel: number,
  tileX: number,
  tileY: number,
  viewMode: MapView
): string {
  return `${mapId}-${zoomLevel}-${tileX}-${tileY}-${viewMode}`;
}

/**
 * Calculate tile coordinates from world coordinates
 */
export function worldToTile(
  worldX: number,
  worldY: number,
  zoomLevel: number
): TileCoordinate {
  const multiplier = ZOOM_MULTIPLIERS[zoomLevel];
  const tileSize = getTileSize(zoomLevel);
  const worldTileSize = tileSize * multiplier;
  
  return {
    x: Math.floor(worldX / worldTileSize),
    y: Math.floor(worldY / worldTileSize),
    zoom: zoomLevel,
  };
}

/**
 * Get all tiles needed for a viewport
 */
export function getTilesForViewport(
  viewport: { x: number; y: number; width: number; height: number },
  zoomLevel: number,
  mapWidth: number,
  mapHeight: number
): TileCoordinate[] {
  const multiplier = ZOOM_MULTIPLIERS[zoomLevel];
  const tileSize = getTileSize(zoomLevel);
  const worldTileSize = tileSize * multiplier;
  
  const minTileX = Math.floor(Math.max(0, viewport.x) / worldTileSize);
  const maxTileX = Math.ceil(Math.min(mapWidth, viewport.x + viewport.width) / worldTileSize);
  const minTileY = Math.floor(Math.max(0, viewport.y) / worldTileSize);
  const maxTileY = Math.ceil(Math.min(mapHeight, viewport.y + viewport.height) / worldTileSize);
  
  const tiles: TileCoordinate[] = [];
  
  for (let x = minTileX; x <= maxTileX; x++) {
    for (let y = minTileY; y <= maxTileY; y++) {
      tiles.push({ x, y, zoom: zoomLevel });
    }
  }
  
  return tiles;
}

