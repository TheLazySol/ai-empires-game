import { TileCoordinate, MapView, TileRequest } from "@/types/game";

const TILE_SIZE = 512;
const ZOOM_MULTIPLIERS = [1, 2, 4, 8, 16];
const MAX_REQUESTS_PER_SECOND = 10;
const VIEWPORT_DEBOUNCE_MS = 100;

export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LoadedTile {
  coordinate: TileCoordinate;
  viewMode: MapView;
  url: string;
  image?: HTMLImageElement;
  loaded: boolean;
  error?: boolean;
}

export type TileLoadCallback = (tile: LoadedTile) => void;

/**
 * Client-side tile loader with throttling and progressive loading
 */
export class TileLoader {
  private mapId: string;
  private mapWidth: number;
  private mapHeight: number;
  private requestQueue: TileRequest[] = [];
  private loadedTiles: Map<string, LoadedTile> = new Map();
  private loadingTiles: Set<string> = new Set();
  private requestInterval: NodeJS.Timeout | null = null;
  private viewportDebounceTimeout: NodeJS.Timeout | null = null;
  private onTileLoad?: TileLoadCallback;
  private onTileError?: (tile: LoadedTile) => void;

  constructor(
    mapId: string,
    mapWidth: number,
    mapHeight: number,
    onTileLoad?: TileLoadCallback,
    onTileError?: (tile: LoadedTile) => void
  ) {
    this.mapId = mapId;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.onTileLoad = onTileLoad;
    this.onTileError = onTileError;
    this.startRequestProcessor();
  }

  /**
   * Calculate zoom level from scale factor
   */
  private scaleToZoomLevel(scale: number): number {
    // Map scale to zoom level
    // scale < 0.5 -> zoom 0
    // scale < 1 -> zoom 1
    // scale < 2 -> zoom 2
    // scale < 4 -> zoom 3
    // scale >= 4 -> zoom 4
    if (scale < 0.5) return 0;
    if (scale < 1) return 1;
    if (scale < 2) return 2;
    if (scale < 4) return 3;
    return 4;
  }

  /**
   * Get tiles needed for a viewport
   */
  private getTilesForViewport(
    viewport: Viewport,
    zoomLevel: number
  ): TileCoordinate[] {
    const multiplier = ZOOM_MULTIPLIERS[zoomLevel];
    const worldTileSize = TILE_SIZE * multiplier;

    const minTileX = Math.floor(Math.max(0, viewport.x) / worldTileSize);
    const maxTileX = Math.ceil(
      Math.min(this.mapWidth, viewport.x + viewport.width) / worldTileSize
    );
    const minTileY = Math.floor(Math.max(0, viewport.y) / worldTileSize);
    const maxTileY = Math.ceil(
      Math.min(this.mapHeight, viewport.y + viewport.height) / worldTileSize
    );

    const tiles: TileCoordinate[] = [];

    for (let x = minTileX; x <= maxTileX; x++) {
      for (let y = minTileY; y <= maxTileY; y++) {
        tiles.push({ x, y, zoom: zoomLevel });
      }
    }

    return tiles;
  }

  /**
   * Generate tile key
   */
  private getTileKey(
    coordinate: TileCoordinate,
    viewMode: MapView
  ): string {
    return `${coordinate.zoom}-${coordinate.x}-${coordinate.y}-${viewMode}`;
  }

  /**
   * Update viewport and load tiles
   */
  updateViewport(
    viewport: Viewport,
    scale: number,
    viewMode: MapView,
    progressive: boolean = true
  ): void {
    // Debounce viewport updates
    if (this.viewportDebounceTimeout) {
      clearTimeout(this.viewportDebounceTimeout);
    }

    this.viewportDebounceTimeout = setTimeout(() => {
      const zoomLevel = this.scaleToZoomLevel(scale);
      const tiles = this.getTilesForViewport(viewport, zoomLevel);

      // For progressive loading, also load lower zoom levels
      if (progressive && zoomLevel > 0) {
        // Load current zoom level and one level below
        const lowerZoomTiles = this.getTilesForViewport(
          viewport,
          zoomLevel - 1
        );
        tiles.push(...lowerZoomTiles);
      }

      // Request tiles for all view modes (or just current)
      const viewModes = progressive ? [viewMode] : [viewMode];
      
      for (const tile of tiles) {
        for (const mode of viewModes) {
          const key = this.getTileKey(tile, mode);
          
          // Skip if already loaded or loading
          if (this.loadedTiles.has(key) || this.loadingTiles.has(key)) {
            continue;
          }

          const request: TileRequest = {
            mapId: this.mapId,
            zoom: tile.zoom,
            x: tile.x,
            y: tile.y,
            view: mode,
          };

          this.requestQueue.push(request);
        }
      }
    }, VIEWPORT_DEBOUNCE_MS);
  }

  /**
   * Start the request processor
   */
  private startRequestProcessor(): void {
    const intervalMs = 1000 / MAX_REQUESTS_PER_SECOND;
    
    this.requestInterval = setInterval(() => {
      if (this.requestQueue.length === 0) {
        return;
      }

      const request = this.requestQueue.shift()!;
      this.loadTile(request);
    }, intervalMs);
  }

  /**
   * Load a single tile
   */
  private async loadTile(request: TileRequest): Promise<void> {
    const coordinate: TileCoordinate = {
      x: request.x,
      y: request.y,
      zoom: request.zoom,
    };
    const key = this.getTileKey(coordinate, request.view);
    
    if (this.loadingTiles.has(key)) {
      return;
    }

    this.loadingTiles.add(key);

    const url = `/api/map/tiles/${request.mapId}/${request.zoom}/${request.x}/${request.y}?view=${request.view}`;
    
    const tile: LoadedTile = {
      coordinate,
      viewMode: request.view,
      url,
      loaded: false,
    };

    try {
      const img = new Image();
      
      img.onload = () => {
        tile.image = img;
        tile.loaded = true;
        this.loadedTiles.set(key, tile);
        this.loadingTiles.delete(key);
        this.onTileLoad?.(tile);
      };

      img.onerror = () => {
        tile.error = true;
        this.loadedTiles.set(key, tile);
        this.loadingTiles.delete(key);
        this.onTileError?.(tile);
      };

      img.src = url;
    } catch (error) {
      tile.error = true;
      this.loadedTiles.set(key, tile);
      this.loadingTiles.delete(key);
      this.onTileError?.(tile);
    }
  }

  /**
   * Get a loaded tile
   */
  getTile(coordinate: TileCoordinate, viewMode: MapView): LoadedTile | undefined {
    const key = this.getTileKey(coordinate, viewMode);
    return this.loadedTiles.get(key);
  }

  /**
   * Clear tile cache
   */
  clearCache(): void {
    this.loadedTiles.clear();
    this.loadingTiles.clear();
    this.requestQueue = [];
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.requestInterval) {
      clearInterval(this.requestInterval);
      this.requestInterval = null;
    }
    if (this.viewportDebounceTimeout) {
      clearTimeout(this.viewportDebounceTimeout);
      this.viewportDebounceTimeout = null;
    }
    this.clearCache();
  }
}

