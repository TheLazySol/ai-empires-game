import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { MapData, MapView } from "@/types/game";
import { generateTile, getTileKey, calculateTileBounds } from "@/lib/tileGeneration";

const TILE_SIZE = 512;
const ZOOM_MULTIPLIERS = [1, 2, 4, 8, 16];

/**
 * Generate all tiles for a map
 * This is a long-running operation, so it should be called asynchronously
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mapId = body.mapId;

    if (!mapId) {
      return NextResponse.json(
        { error: "Missing mapId" },
        { status: 400 }
      );
    }

    // Load map data
    const { data: mapData, error: mapError } = await supabase
      .from("maps")
      .select("*")
      .eq("id", mapId)
      .single();

    if (mapError || !mapData) {
      return NextResponse.json(
        { error: "Map not found", details: mapError?.message },
        { status: 404 }
      );
    }

    const map: MapData = {
      id: mapData.id,
      seed: mapData.seed,
      width: mapData.width,
      height: mapData.height,
      cells: mapData.cells,
      createdAt: mapData.created_at,
      updatedAt: mapData.updated_at,
    };

    // Load territories and players for political view
    const { data: territoriesData } = await supabase.from("territories").select("*");
    const { data: playersData } = await supabase.from("players").select("*");

    const territoriesMap = new Map<string, string>();
    const playerColorsMap = new Map<string, string>();

    if (territoriesData) {
      territoriesData.forEach((t) => {
        territoriesMap.set(t.cell_id, t.player_id);
      });
    }

    if (playersData) {
      playersData.forEach((p) => {
        playerColorsMap.set(p.id, p.color);
      });
    }

    // Calculate number of tiles needed
    const viewModes: MapView[] = [MapView.Terrain, MapView.Political, MapView.Resources];
    let totalTiles = 0;

    for (let zoomLevel = 0; zoomLevel <= 4; zoomLevel++) {
      const multiplier = ZOOM_MULTIPLIERS[zoomLevel];
      const worldTileSize = TILE_SIZE * multiplier;
      const tilesX = Math.ceil(map.width / worldTileSize);
      const tilesY = Math.ceil(map.height / worldTileSize);
      totalTiles += tilesX * tilesY * viewModes.length;
    }

    console.log(`Generating ${totalTiles} tiles for map ${mapId}`);

    // Generate tiles in batches
    const batchSize = 50;
    const tiles: Array<{
      id: string;
      map_id: string;
      zoom_level: number;
      tile_x: number;
      tile_y: number;
      view_mode: string;
      tile_data: Buffer;
      created_at: string;
      updated_at: string;
    }> = [];

    let tilesGenerated = 0;

    for (let zoomLevel = 0; zoomLevel <= 4; zoomLevel++) {
      const multiplier = ZOOM_MULTIPLIERS[zoomLevel];
      const worldTileSize = TILE_SIZE * multiplier;
      const tilesX = Math.ceil(map.width / worldTileSize);
      const tilesY = Math.ceil(map.height / worldTileSize);

      for (let tileX = 0; tileX < tilesX; tileX++) {
        for (let tileY = 0; tileY < tilesY; tileY++) {
          for (const viewMode of viewModes) {
            try {
              const tileBuffer = await generateTile(
                map,
                tileX,
                tileY,
                zoomLevel,
                viewMode,
                territoriesMap,
                playerColorsMap
              );

              const tileId = getTileKey(mapId, zoomLevel, tileX, tileY, viewMode);
              const now = new Date().toISOString();

              tiles.push({
                id: tileId,
                map_id: mapId,
                zoom_level: zoomLevel,
                tile_x: tileX,
                tile_y: tileY,
                view_mode: viewMode,
                tile_data: tileBuffer,
                created_at: now,
                updated_at: now,
              });

              tilesGenerated++;

              // Insert in batches
              if (tiles.length >= batchSize) {
                await supabase.from("map_tiles").upsert(tiles, {
                  onConflict: "id",
                });
                console.log(`Inserted batch, progress: ${((tilesGenerated / totalTiles) * 100).toFixed(1)}%`);
                tiles.length = 0;
              }
            } catch (error) {
              console.error(`Error generating tile ${tileX},${tileY} at zoom ${zoomLevel}:`, error);
            }
          }
        }
      }
    }

    // Insert remaining tiles
    if (tiles.length > 0) {
      await supabase.from("map_tiles").upsert(tiles, {
        onConflict: "id",
      });
    }

    console.log(`Tile generation complete for map ${mapId}`);

    return NextResponse.json({
      success: true,
      message: `Generated tiles for map ${mapId}`,
      totalTiles,
    });
  } catch (error) {
    console.error("Error generating tiles:", error);
    return NextResponse.json(
      {
        error: "Failed to generate tiles",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

