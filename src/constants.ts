/**
 * Game Constants
 * 
 * Centralized configuration for map dimensions and cell density.
 * Adjust these values to change the map size and cell granularity.
 */

// Map dimensions in pixels
export const MAP_WIDTH = 2400;
export const MAP_HEIGHT = 1500;

// Cell density divisor - higher values = smaller cells (more cells)
// This controls the minimum distance between Voronoi sites
// Formula: minDistance = Math.min(MAP_WIDTH, MAP_HEIGHT) / CELL_DENSITY_DIVISOR
// 
// Examples:
// - 15: Larger cells (fewer cells) - original default
// - 30: Medium cells - recommended for performance
// - 40: Smaller cells (more cells) - may impact performance
// - 50+: Very small cells (many cells) - significant performance impact
// Optimized for performance: reduced from 80 to 30
export const CELL_DENSITY_DIVISOR = 50;

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

