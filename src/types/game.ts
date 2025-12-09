import { ResourceType } from "./resources";

export enum MapView {
  Terrain = "terrain",
  Political = "political",
  Resources = "resources",
}

export enum TerrainType {
  Water = "water",
  Land = "land",
}

export interface VoronoiCell {
  id: string;
  site: [number, number]; // Center point
  polygon: [number, number][]; // Polygon vertices
  neighbors: string[]; // IDs of neighboring cells
  terrain: TerrainType;
  resource?: ResourceType;
  ownerId?: string; // Player ID who owns this cell
}

export interface MapData {
  id: string;
  seed: string;
  width: number;
  height: number;
  cells: VoronoiCell[];
  createdAt: string;
  updatedAt: string;
}

export interface Player {
  id: string;
  guestId: string;
  nationName: string;
  color: string;
  population: number;
  createdAt: string;
}

export interface Settlement {
  id: string;
  playerId: string;
  cellId: string;
  position: [number, number];
  radius: number; // Visual radius for now
  population: number;
  createdAt: string;
}

export interface Territory {
  id: string;
  cellId: string;
  playerId: string;
  settlementId?: string;
  createdAt: string;
}

