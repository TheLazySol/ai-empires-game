#!/usr/bin/env node

/**
 * Map Regeneration Script
 * 
 * Usage:
 *   pnpm tsx scripts/regenerate-map.ts [seed]
 * 
 * Examples:
 *   pnpm tsx scripts/regenerate-map.ts
 *   pnpm tsx scripts/regenerate-map.ts my-custom-seed
 */

import { generateMap } from "../src/lib/mapGeneration";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { 
  MAP_WIDTH, 
  MAP_HEIGHT, 
  HEX_SIZE,
  NUMBER_OF_CONTINENTS,
  NUMBER_OF_ISLANDS,
  LAND_VARIANCE
} from "../src/constants";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Missing Supabase credentials.");
  console.error("Please create a .env.local file with:");
  console.error("SUPABASE_URL=your_supabase_url");
  console.error("SUPABASE_ANON_KEY=your_supabase_anon_key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function regenerateMap(seed?: string) {
  const seedValue = seed || `seed-${Date.now()}`;
  const width = MAP_WIDTH;
  const height = MAP_HEIGHT;
  const hexSize = HEX_SIZE;
  const numContinents = NUMBER_OF_CONTINENTS;
  const numIslands = NUMBER_OF_ISLANDS;
  const landVariance = LAND_VARIANCE;
  
  console.log(`🗺️  Generating new map with seed: ${seedValue}`);
  console.log(`📏 Size: ${width}x${height}`);
  console.log(`🔢 Hex size: ${hexSize} (smaller = more hexagons)`);
  console.log(`🌍 Continents: ${numContinents}`);
  console.log(`🏝️  Islands: ${numIslands}`);
  console.log(`🌊 Land variance: ${landVariance}`);

  try {
    // Generate the map
    console.log("\n⚙️  Generating map data...");
    const mapData = generateMap(seedValue, width, height, hexSize, numContinents, numIslands, landVariance);
    console.log(`Map generated: ${mapData.cells.length} hexagons`);

    // Clear existing map data
    try {
      console.log("Clearing existing map data...");
      await supabase.from("territories").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("settlements").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("maps").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      console.log("Cleared existing map data");
    } catch (clearError) {
      console.warn("Warning: Error clearing existing data (might be first run):", clearError);
      // Continue anyway - might be first run
    }

    // Store map in database
    console.log("Saving map to database...");
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
      throw new Error(`Failed to save map to database: ${error.message}`);
    }

    console.log("✅ Map generated successfully!");
    console.log(`Map ID: ${data.id}`);
    console.log(`Seed: ${mapData.seed}`);
    console.log(`Hexagons: ${mapData.cells.length}`);
    console.log(`\nYou can now refresh your browser to see the new map.`);
  } catch (error) {
    console.error("❌ Error generating map:");
    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
      if (error.cause) {
        console.error("Cause:", error.cause);
      }
    } else {
      console.error("Unknown error:", error);
    }
    process.exit(1);
  }
}

// Get seed from command line arguments
const seed = process.argv[2];

regenerateMap(seed);

