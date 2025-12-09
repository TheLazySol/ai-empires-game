import { NextRequest, NextResponse } from "next/server";
import { TileRequest } from "@/types/game";

/**
 * Batch tile request endpoint
 * Accepts multiple tile requests and returns URLs or base64 data
 * Optimized for progressive loading (low-res first)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tiles, progressive = true } = body;

    if (!Array.isArray(tiles) || tiles.length === 0) {
      return NextResponse.json(
        { error: "Invalid tiles array" },
        { status: 400 }
      );
    }

    // Sort tiles by zoom level (low-res first for progressive loading)
    const sortedTiles = progressive
      ? [...tiles].sort((a, b) => a.zoom - b.zoom)
      : tiles;

    // Generate tile URLs
    const tileUrls = sortedTiles.map((tile: TileRequest) => {
      const url = `/api/map/tiles/${tile.mapId}/${tile.zoom}/${tile.x}/${tile.y}?view=${tile.view}`;
      return {
        ...tile,
        url,
      };
    });

    return NextResponse.json({
      tiles: tileUrls,
      count: tileUrls.length,
    });
  } catch (error) {
    console.error("Error processing batch tile request:", error);
    return NextResponse.json(
      {
        error: "Failed to process batch request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

