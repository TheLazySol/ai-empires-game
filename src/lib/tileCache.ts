import { supabase } from "@/lib/supabase";
import { TileCoordinate, MapView } from "@/types/game";
import { worldToTile, getTilesForViewport } from "./tileGeneration";

export type InvalidationReason = "territory-change" | "settlement-change" | "resource-change";

/**
 * Invalidate tiles that contain a specific cell
 */
export async function invalidateCellTiles(
  mapId: string,
  cellX: number,
  cellY: number,
  reason: InvalidationReason
): Promise<void> {
  // Invalidate tiles at all zoom levels and view modes
  const viewModes: MapView[] = [MapView.Terrain, MapView.Political, MapView.Resources];
  
  for (let zoomLevel = 0; zoomLevel <= 4; zoomLevel++) {
    const tileCoord = worldToTile(cellX, cellY, zoomLevel);
    
    for (const viewMode of viewModes) {
      await markTileForInvalidation(
        mapId,
        tileCoord.x,
        tileCoord.y,
        zoomLevel,
        viewMode,
        reason
      );
    }
  }
}

/**
 * Invalidate tiles for multiple cells
 */
export async function invalidateCellsTiles(
  mapId: string,
  cellCoordinates: Array<{ x: number; y: number }>,
  reason: InvalidationReason
): Promise<void> {
  const uniqueTiles = new Set<string>();
  const viewModes: MapView[] = [MapView.Terrain, MapView.Political, MapView.Resources];
  
  for (const coord of cellCoordinates) {
    for (let zoomLevel = 0; zoomLevel <= 4; zoomLevel++) {
      const tileCoord = worldToTile(coord.x, coord.y, zoomLevel);
      
      for (const viewMode of viewModes) {
        const key = `${zoomLevel}-${tileCoord.x}-${tileCoord.y}-${viewMode}`;
        uniqueTiles.add(key);
      }
    }
  }
  
  // Batch insert invalidations
  const invalidations = Array.from(uniqueTiles).map((key) => {
    const [zoomLevel, tileX, tileY, viewMode] = key.split("-");
    return {
      id: `${mapId}-${key}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      map_id: mapId,
      tile_x: parseInt(tileX),
      tile_y: parseInt(tileY),
      zoom_level: parseInt(zoomLevel),
      view_mode: viewMode,
      reason,
    };
  });
  
  if (invalidations.length > 0) {
    await supabase.from("tile_cache_invalidation").insert(invalidations);
  }
}

/**
 * Mark a specific tile for invalidation
 */
async function markTileForInvalidation(
  mapId: string,
  tileX: number,
  tileY: number,
  zoomLevel: number,
  viewMode: MapView,
  reason: InvalidationReason
): Promise<void> {
  const id = `${mapId}-${zoomLevel}-${tileX}-${tileY}-${viewMode}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  await supabase.from("tile_cache_invalidation").insert({
    id,
    map_id: mapId,
    tile_x: tileX,
    tile_y: tileY,
    zoom_level: zoomLevel,
    view_mode: viewMode,
    reason,
  });
}

/**
 * Invalidate tiles when a territory changes
 */
export async function invalidateTerritoryTiles(
  mapId: string,
  cellId: string,
  cellX: number,
  cellY: number
): Promise<void> {
  await invalidateCellTiles(mapId, cellX, cellY, "territory-change");
}

/**
 * Invalidate tiles when a settlement is created or destroyed
 */
export async function invalidateSettlementTiles(
  mapId: string,
  cellId: string,
  cellX: number,
  cellY: number
): Promise<void> {
  // Invalidate tiles in a radius around the settlement
  const radius = 500; // pixels
  const coordinates: Array<{ x: number; y: number }> = [];
  
  // Sample points in a grid around the settlement
  const step = 100;
  for (let x = cellX - radius; x <= cellX + radius; x += step) {
    for (let y = cellY - radius; y <= cellY + radius; y += step) {
      const dist = Math.sqrt(Math.pow(x - cellX, 2) + Math.pow(y - cellY, 2));
      if (dist <= radius) {
        coordinates.push({ x, y });
      }
    }
  }
  
  await invalidateCellsTiles(mapId, coordinates, "settlement-change");
}

/**
 * Invalidate tiles when a resource changes
 */
export async function invalidateResourceTiles(
  mapId: string,
  cellId: string,
  cellX: number,
  cellY: number
): Promise<void> {
  await invalidateCellTiles(mapId, cellX, cellY, "resource-change");
}

/**
 * Check if a tile needs regeneration
 */
export async function isTileInvalidated(
  mapId: string,
  tileX: number,
  tileY: number,
  zoomLevel: number,
  viewMode: MapView
): Promise<boolean> {
  const { data, error } = await supabase
    .from("tile_cache_invalidation")
    .select("id")
    .eq("map_id", mapId)
    .eq("tile_x", tileX)
    .eq("tile_y", tileY)
    .eq("zoom_level", zoomLevel)
    .eq("view_mode", viewMode)
    .limit(1)
    .single();
  
  return !error && data !== null;
}

/**
 * Clear invalidation records after tile regeneration
 */
export async function clearTileInvalidation(
  mapId: string,
  tileX: number,
  tileY: number,
  zoomLevel: number,
  viewMode: MapView
): Promise<void> {
  await supabase
    .from("tile_cache_invalidation")
    .delete()
    .eq("map_id", mapId)
    .eq("tile_x", tileX)
    .eq("tile_y", tileY)
    .eq("zoom_level", zoomLevel)
    .eq("view_mode", viewMode);
}

/**
 * Invalidate tiles for a viewport area (useful for bulk operations)
 */
export async function invalidateViewportTiles(
  mapId: string,
  viewport: { x: number; y: number; width: number; height: number },
  mapWidth: number,
  mapHeight: number,
  reason: InvalidationReason
): Promise<void> {
  const viewModes: MapView[] = [MapView.Terrain, MapView.Political, MapView.Resources];
  
  for (let zoomLevel = 0; zoomLevel <= 4; zoomLevel++) {
    const tiles = getTilesForViewport(viewport, zoomLevel, mapWidth, mapHeight);
    
    for (const tile of tiles) {
      for (const viewMode of viewModes) {
        await markTileForInvalidation(
          mapId,
          tile.x,
          tile.y,
          zoomLevel,
          viewMode,
          reason
        );
      }
    }
  }
}

