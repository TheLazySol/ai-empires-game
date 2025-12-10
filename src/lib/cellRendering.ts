import { HexCell, MapView, TerrainType } from "@/types/game";
import { RESOURCE_METADATA } from "@/types/resources";

/**
 * Convert hex color string to number (for PixiJS)
 */
export function hexToNumber(hex: string): number {
  // Remove # if present
  const cleanHex = hex.replace("#", "");
  return parseInt(cleanHex, 16);
}

/**
 * Get fill color for a hexagon based on view mode
 * Returns PixiJS-compatible color number and alpha
 */
export function getCellFillColor(
  cell: HexCell,
  viewMode: MapView,
  territories: Map<string, string>, // cellId -> playerId
  playerColors: Map<string, string> // playerId -> color
): { color: number; alpha: number } {
  if (viewMode === MapView.Terrain) {
    const colorHex = cell.terrain === TerrainType.Water ? "#3498db" : "#ffffff";
    return {
      color: hexToNumber(colorHex),
      alpha: 1,
    };
  }
  
  if (viewMode === MapView.Political) {
    const playerId = territories.get(cell.id);
    if (playerId) {
      const colorHex = playerColors.get(playerId) || "#9b59b6";
      return { 
        color: hexToNumber(colorHex), 
        alpha: 1 
      };
    }
    const colorHex = cell.terrain === TerrainType.Water ? "#3498db" : "#ffffff";
    return {
      color: hexToNumber(colorHex),
      alpha: 1,
    };
  }
  
  if (viewMode === MapView.Resources) {
    if (cell.resource) {
      const resourceMeta = RESOURCE_METADATA[cell.resource];
      return { 
        color: hexToNumber(resourceMeta.color), 
        alpha: 0.3 
      };
    }
    const colorHex = cell.terrain === TerrainType.Water ? "#3498db" : "#ffffff";
    return {
      color: hexToNumber(colorHex),
      alpha: 1,
    };
  }
  
  return { color: hexToNumber("#ffffff"), alpha: 1 };
}

