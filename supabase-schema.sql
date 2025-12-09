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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_settlements_player_id ON settlements(player_id);
CREATE INDEX IF NOT EXISTS idx_settlements_cell_id ON settlements(cell_id);
CREATE INDEX IF NOT EXISTS idx_territories_player_id ON territories(player_id);
CREATE INDEX IF NOT EXISTS idx_territories_cell_id ON territories(cell_id);
CREATE INDEX IF NOT EXISTS idx_players_guest_id ON players(guest_id);

-- Enable Row Level Security (RLS) - adjust policies as needed
ALTER TABLE maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for now (adjust for production)
CREATE POLICY "Allow all operations on maps" ON maps FOR ALL USING (true);
CREATE POLICY "Allow all operations on players" ON players FOR ALL USING (true);
CREATE POLICY "Allow all operations on settlements" ON settlements FOR ALL USING (true);
CREATE POLICY "Allow all operations on territories" ON territories FOR ALL USING (true);

