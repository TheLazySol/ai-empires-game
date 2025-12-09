import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { MapData, MapView } from "@/types/game";
import { generateTile, getTileKey } from "@/lib/tileGeneration";
import { isTileInvalidated, clearTileInvalidation } from "@/lib/tileCache";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mapId: string; zoom: string; x: string; y: string }> }
) {
  try {
    const resolvedParams = await params;
    const mapId = resolvedParams.mapId;
    const zoomLevel = parseInt(resolvedParams.zoom);
    const tileX = parseInt(resolvedParams.x);
    const tileY = parseInt(resolvedParams.y);
    const viewParam = request.nextUrl.searchParams.get("view") || "terrain";
    
    // Validate parameters
    if (isNaN(zoomLevel) || zoomLevel < 0 || zoomLevel > 4) {
      return NextResponse.json(
        { error: "Invalid zoom level. Must be between 0 and 4." },
        { status: 400 }
      );
    }

    if (isNaN(tileX) || isNaN(tileY)) {
      return NextResponse.json(
        { error: "Invalid tile coordinates." },
        { status: 400 }
      );
    }

    const viewMode = viewParam as MapView;
    if (!Object.values(MapView).includes(viewMode)) {
      return NextResponse.json(
        { error: "Invalid view mode." },
        { status: 400 }
      );
    }

    const tileId = getTileKey(mapId, zoomLevel, tileX, tileY, viewMode);

    // Check if tile is invalidated
    const invalidated = await isTileInvalidated(mapId, tileX, tileY, zoomLevel, viewMode);

    // Try to get tile from cache
    if (!invalidated) {
      const { data: cachedTile, error: cacheError } = await supabase
        .from("map_tiles")
        .select("tile_data")
        .eq("id", tileId)
        .single();

      if (!cacheError && cachedTile && cachedTile.tile_data) {
        try {
          // Return cached tile - convert Buffer/ArrayBuffer/Uint8Array to Buffer
          let buffer: Buffer;
          if (Buffer.isBuffer(cachedTile.tile_data)) {
            buffer = cachedTile.tile_data;
          } else if (cachedTile.tile_data instanceof Uint8Array) {
            buffer = Buffer.from(cachedTile.tile_data);
          } else if (cachedTile.tile_data instanceof ArrayBuffer) {
            buffer = Buffer.from(cachedTile.tile_data);
          } else {
            // Handle PostgreSQL bytea format (base64 or hex)
            buffer = Buffer.from(cachedTile.tile_data as any);
          }
          
          // Validate buffer is not empty
          if (buffer.length === 0) {
            throw new Error("Empty tile buffer");
          }
          
          // Convert to ArrayBuffer for NextResponse
          const arrayBuffer = buffer.buffer.slice(
            buffer.byteOffset, 
            buffer.byteOffset + buffer.byteLength
          ) as ArrayBuffer;
          
          return new NextResponse(arrayBuffer, {
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        } catch (bufferError) {
          console.error("Error processing cached tile buffer:", bufferError);
          // Fall through to regenerate tile
        }
      }
    }

    // Generate tile if not cached or invalidated
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

    // Generate tile
    let tileBuffer: Buffer;
    try {
      tileBuffer = await generateTile(
        map,
        tileX,
        tileY,
        zoomLevel,
        viewMode,
        territoriesMap,
        playerColorsMap
      );
      
      // Validate generated tile buffer
      if (!tileBuffer || tileBuffer.length === 0) {
        throw new Error("Generated tile buffer is empty");
      }
    } catch (genError) {
      console.error(`Error generating tile ${tileX},${tileY} at zoom ${zoomLevel}:`, genError);
      return NextResponse.json(
        {
          error: "Failed to generate tile",
          details: genError instanceof Error ? genError.message : "Unknown generation error",
        },
        { status: 500 }
      );
    }

    // Save tile to cache (don't block on this)
    const now = new Date().toISOString();
    (async () => {
      try {
        await supabase.from("map_tiles").upsert({
          id: tileId,
          map_id: mapId,
          zoom_level: zoomLevel,
          tile_x: tileX,
          tile_y: tileY,
          view_mode: viewMode,
          tile_data: tileBuffer,
          created_at: now,
          updated_at: now,
        }, {
          onConflict: "id",
        });
      } catch (saveError) {
        console.error("Error saving tile to cache:", saveError);
        // Don't fail the request if cache save fails
      }
    })();

    // Clear invalidation record if it exists (don't block on this)
    if (invalidated) {
      clearTileInvalidation(mapId, tileX, tileY, zoomLevel, viewMode).catch((clearError) => {
        console.error("Error clearing tile invalidation:", clearError);
      });
    }

    // Return tile - convert Buffer to ArrayBuffer for NextResponse
    const arrayBuffer = tileBuffer.buffer.slice(
      tileBuffer.byteOffset, 
      tileBuffer.byteOffset + tileBuffer.byteLength
    ) as ArrayBuffer;
    
    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving tile:", error);
    return NextResponse.json(
      {
        error: "Failed to serve tile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

