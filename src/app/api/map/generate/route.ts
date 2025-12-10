import { NextRequest, NextResponse } from "next/server";
import { generateMap } from "@/lib/mapGeneration";
import { supabase } from "@/lib/supabase";
import { 
  MAP_WIDTH, 
  MAP_HEIGHT, 
  HEX_SIZE,
  NUMBER_OF_CONTINENTS,
  NUMBER_OF_ISLANDS,
  LAND_VARIANCE
} from "@/constants";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const seed = body.seed || `seed-${Date.now()}`;
    const width = body.width || MAP_WIDTH;
    const height = body.height || MAP_HEIGHT;
    const hexSize = body.hexSize || HEX_SIZE;
    const numContinents = body.numContinents || NUMBER_OF_CONTINENTS;
    const numIslands = body.numIslands || NUMBER_OF_ISLANDS;
    const landVariance = body.landVariance || LAND_VARIANCE;

    console.log(`Generating map with seed: ${seed}`);
    console.log(`Size: ${width}x${height}`);
    console.log(`Hex size: ${hexSize}`);
    console.log(`Continents: ${numContinents}, Islands: ${numIslands}, Variance: ${landVariance}`);

    // Generate the map
    let mapData;
    try {
      mapData = generateMap(seed, width, height, hexSize, numContinents, numIslands, landVariance);
      console.log(`Map generated: ${mapData.cells.length} hexagons`);
    } catch (genError) {
      console.error("Error in map generation:", genError);
      return NextResponse.json(
        { 
          error: "Failed to generate map", 
          details: genError instanceof Error ? genError.message : "Unknown generation error" 
        },
        { status: 500 }
      );
    }

    // Clear existing map data
    try {
      await supabase.from("territories").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("settlements").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("maps").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      console.log("Cleared existing map data");
    } catch (clearError) {
      console.error("Error clearing existing data:", clearError);
      // Continue anyway - might be first run
    }

    // Store map in database
    const { data, error } = await supabase
      .from("maps")
      .insert({
        id: mapData.id,
        seed: mapData.seed,
        width: mapData.width,
        height: mapData.height,
        cells: mapData.cells,
        created_at: mapData.createdAt,
        updated_at: mapData.updatedAt,
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving map to database:", error);
      return NextResponse.json(
        { 
          error: "Failed to save map to database", 
          details: error.message,
          code: error.code,
          hint: error.hint 
        },
        { status: 500 }
      );
    }

    console.log("Map saved successfully:", data.id);
    
    // Trigger tile generation asynchronously (don't wait for it)
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/map/tiles/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mapId: mapData.id }),
    }).catch((error) => {
      console.error("Error triggering tile generation:", error);
      // Don't fail the request if tile generation fails
    });
    
    return NextResponse.json({ map: mapData });
  } catch (error) {
    console.error("Unexpected error in map generation API:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate map", 
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

