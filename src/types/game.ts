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

export interface HexCell {
  id: string;
  site: [number, number]; // Center point
  polygon: [number, number][]; // Hexagon vertices (always 6 points)
  neighbors: string[]; // IDs of neighboring hexagons (always 6 neighbors)
  terrain: TerrainType;
  resource?: ResourceType;
  ownerId?: string; // Player ID who owns this cell
}

export interface MapData {
  id: string;
  seed: string;
  width: number;
  height: number;
  cells: HexCell[];
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

export interface TileCoordinate {
  x: number;
  y: number;
  zoom: number;
}

export interface MapTile {
  id: string;
  mapId: string;
  zoomLevel: number;
  tileX: number;
  tileY: number;
  viewMode: MapView;
  tileData: Uint8Array; // PNG image data
  createdAt: string;
  updatedAt: string;
}

export interface TileRequest {
  mapId: string;
  zoom: number;
  x: number;
  y: number;
  view: MapView;
}

export interface MapMetadata {
  id: string;
  seed: string;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
}

