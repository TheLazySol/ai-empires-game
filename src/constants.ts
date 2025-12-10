/**
 * Game Constants
 * 
 * Centralized configuration for map dimensions and cell density.
 * Adjust these values to change the map size and cell granularity.
 */

// Map dimensions in pixels
export const MAP_WIDTH = 2400;
export const MAP_HEIGHT = 1500;

// Hexagon grid configuration
// Hexagon size (radius from center to vertex) in pixels
// Smaller values = more hexagons, larger values = fewer hexagons
// Recommended: 20-40 for good balance of detail and performance
export const HEX_SIZE = 30;

// Hexagon orientation: "pointy-top" or "flat-top"
// Pointy-top: hexagons are oriented with a point at the top
// Flat-top: hexagons are oriented with a flat edge at the top
export const HEX_ORIENTATION: "pointy-top" | "flat-top" = "pointy-top";

// Terrain generation settings
// Number of major continents to generate (1-5 recommended)
// Each continent will have a unique shape and position
export const NUMBER_OF_CONTINENTS = 6;

// Number of small islands to scatter (0-20 recommended)
// Islands are smaller landmasses separate from continents
export const NUMBER_OF_ISLANDS = 12;

// Land variance/roughness (0.1 - 1.5)
// Controls how irregular and varied the coastlines are
// - 0.1-0.3: Smooth, gentle coastlines
// - 0.4-0.7: Moderate variance, natural looking (recommended)
// - 0.8-1.5: Very rough, jagged coastlines with many peninsulas
export const LAND_VARIANCE = 1.5;

// Resource scarcity percentages (0.0 - 1.0)
// Controls the percentage of land cells that will contain each resource type
// Values represent the probability that a land cell will have that resource
// Note: Resources are randomly distributed across all available land cells
export const RESOURCE_SCARCITY = {
  WHEAT: 0.12,      // 12% of land cells
  WATER: 0.10,      // 10% of land cells (coastal/inland water sources)
  WOOD: 0.15,       // 15% of land cells
  COTTON: 0.10,     // 10% of land cells
  BRONZE: 0.08,     // 8% of land cells
  IRON: 0.08,       // 8% of land cells
  GOLD: 0.02,       // 2% of land cells (very rare)
  COAL: 0.08,       // 8% of land cells
  WILDLIFE: 0.12,   // 12% of land cells
} as const;

