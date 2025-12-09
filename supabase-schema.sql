-- Supabase Database Schema for AI Empires Game
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Maps table - stores generated map data
CREATE TABLE IF NOT EXISTS maps (
  id TEXT PRIMARY KEY,
  seed TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  cells JSONB NOT NULL, -- Array of VoronoiCell objects
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Players table - stores player/nation information
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  guest_id TEXT UNIQUE NOT NULL,
  nation_name TEXT NOT NULL,
  color TEXT NOT NULL, -- Hex color code
  population INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settlements table - stores settlement locations
CREATE TABLE IF NOT EXISTS settlements (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  cell_id TEXT NOT NULL,
  position JSONB NOT NULL, -- [x, y] coordinates as JSON array
  radius NUMERIC DEFAULT 5,
  population INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Territories table - stores which cells belong to which players
CREATE TABLE IF NOT EXISTS territories (
  id TEXT PRIMARY KEY,
  cell_id TEXT NOT NULL,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  settlement_id TEXT REFERENCES settlements(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Map tiles table - stores pre-rendered map tiles
CREATE TABLE IF NOT EXISTS map_tiles (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  zoom_level INTEGER NOT NULL CHECK (zoom_level >= 0 AND zoom_level <= 4),
  tile_x INTEGER NOT NULL,
  tile_y INTEGER NOT NULL,
  view_mode TEXT NOT NULL CHECK (view_mode IN ('terrain', 'political', 'resources')),
  tile_data BYTEA NOT NULL, -- PNG image data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(map_id, zoom_level, tile_x, tile_y, view_mode)
);

-- Tile cache invalidation table - tracks tiles that need regeneration
CREATE TABLE IF NOT EXISTS tile_cache_invalidation (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  tile_x INTEGER NOT NULL,
  tile_y INTEGER NOT NULL,
  zoom_level INTEGER NOT NULL CHECK (zoom_level >= 0 AND zoom_level <= 4),
  view_mode TEXT NOT NULL CHECK (view_mode IN ('terrain', 'political', 'resources')),
  reason TEXT NOT NULL CHECK (reason IN ('territory-change', 'settlement-change', 'resource-change')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_settlements_player_id ON settlements(player_id);
CREATE INDEX IF NOT EXISTS idx_settlements_cell_id ON settlements(cell_id);
CREATE INDEX IF NOT EXISTS idx_territories_player_id ON territories(player_id);
CREATE INDEX IF NOT EXISTS idx_territories_cell_id ON territories(cell_id);
CREATE INDEX IF NOT EXISTS idx_players_guest_id ON players(guest_id);
CREATE INDEX IF NOT EXISTS idx_map_tiles_map_id ON map_tiles(map_id);
CREATE INDEX IF NOT EXISTS idx_map_tiles_coords ON map_tiles(map_id, zoom_level, tile_x, tile_y, view_mode);
CREATE INDEX IF NOT EXISTS idx_tile_invalidation_map_id ON tile_cache_invalidation(map_id);
CREATE INDEX IF NOT EXISTS idx_tile_invalidation_coords ON tile_cache_invalidation(map_id, zoom_level, tile_x, tile_y, view_mode);

-- Enable Row Level Security (RLS) - adjust policies as needed
ALTER TABLE maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_tiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tile_cache_invalidation ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for now (adjust for production)
CREATE POLICY "Allow all operations on maps" ON maps FOR ALL USING (true);
CREATE POLICY "Allow all operations on players" ON players FOR ALL USING (true);
CREATE POLICY "Allow all operations on settlements" ON settlements FOR ALL USING (true);
CREATE POLICY "Allow all operations on territories" ON territories FOR ALL USING (true);
CREATE POLICY "Allow all operations on map_tiles" ON map_tiles FOR ALL USING (true);
CREATE POLICY "Allow all operations on tile_cache_invalidation" ON tile_cache_invalidation FOR ALL USING (true);

