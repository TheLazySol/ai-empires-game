"use client";

import { useEffect, useRef, useState } from "react";
import { Application, Graphics, Container, Text, Sprite, Texture } from "pixi.js";
import { useAtomValue } from "jotai";
import { mapDataAtom, mapViewAtom, settlementsAtom, playerAtom } from "@/store/gameState";
import { MapView, VoronoiCell, MapMetadata } from "@/types/game";
import { RESOURCE_METADATA } from "@/types/resources";
import { TileLoader, Viewport, LoadedTile } from "@/lib/tileLoader";

interface MapCanvasProps {
  onCellClick?: (cell: VoronoiCell, event: MouseEvent) => void;
  onCellRightClick?: (cell: VoronoiCell, event: MouseEvent) => void;
}

const TILE_SIZE = 512;
const ZOOM_MULTIPLIERS = [1, 2, 4, 8, 16];

export default function MapCanvas({ onCellClick, onCellRightClick }: MapCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const tilesContainerRef = useRef<Container | null>(null);
  const interactivityContainerRef = useRef<Container | null>(null);
  const tooltipRef = useRef<Text | null>(null);
  const tooltipContainerRef = useRef<Container | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const tileLoaderRef = useRef<TileLoader | null>(null);
  const tileSpritesRef = useRef<Map<string, Sprite>>(new Map());
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRenderParamsRef = useRef<{ scale: number; position: { x: number; y: number }; mapView: MapView } | null>(null);

  const mapData = useAtomValue(mapDataAtom);
  const mapView = useAtomValue(mapViewAtom);
  const settlements = useAtomValue(settlementsAtom);
  const player = useAtomValue(playerAtom);

  // Initialize PixiJS
  useEffect(() => {
    if (!canvasRef.current || !mapData) return;

    let isMounted = true;

    const initPixi = async () => {
      try {
        const app = new Application();
        await app.init({
          width: window.innerWidth,
          height: window.innerHeight,
          backgroundColor: 0xf5f5f5,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });

        if (!isMounted || !canvasRef.current) {
          app.destroy(true, { children: true });
          return;
        }

        canvasRef.current.appendChild(app.canvas);

        if (!app.stage) {
          console.error("PixiJS stage not available");
          app.destroy(true, { children: true });
          return;
        }

        // Create containers
        const tilesContainer = new Container();
        app.stage.addChild(tilesContainer);
        tilesContainerRef.current = tilesContainer;

        const interactivityContainer = new Container();
        app.stage.addChild(interactivityContainer);
        interactivityContainerRef.current = interactivityContainer;

        // Create tooltip container
        const tooltipContainer = new Container();
        tooltipContainer.visible = false;
        app.stage.addChild(tooltipContainer);
        tooltipContainerRef.current = tooltipContainer;

        const tooltipBackground = new Graphics();
        tooltipContainer.addChild(tooltipBackground);

        const tooltip = new Text({
          text: "",
          style: {
            fontSize: 14,
            fill: 0x000000,
            fontWeight: "bold",
          },
        });
        tooltip.anchor.set(0.5);
        tooltipContainer.addChild(tooltip);
        tooltipRef.current = tooltip;

        const updateTooltipBackground = () => {
          if (!tooltip.text) return;
          const padding = 8;
          const width = tooltip.width + padding * 2;
          const height = tooltip.height + padding * 2;
          tooltipBackground.clear();
          tooltipBackground.roundRect(-width / 2, -height / 2, width, height, 4);
          tooltipBackground.fill({ color: 0xffffff, alpha: 0.95 });
          tooltipBackground.stroke({ color: 0xcccccc, width: 1 });
        };
        (tooltipContainer as any).updateBackground = updateTooltipBackground;

        // Initialize tile loader
        const tileLoader = new TileLoader(
          mapData.id,
          mapData.width,
          mapData.height,
          (tile: LoadedTile) => {
            // Tile loaded callback
            if (!tilesContainerRef.current || !tile.image) return;
            renderTile(tile);
          },
          (tile: LoadedTile) => {
            console.error("Failed to load tile:", tile.url);
          }
        );
        tileLoaderRef.current = tileLoader;

        // Center the map initially
        const initialX = (window.innerWidth - mapData.width) / 2;
        const initialY = (window.innerHeight - mapData.height) / 2;
        tilesContainer.x = initialX;
        tilesContainer.y = initialY;
        interactivityContainer.x = initialX;
        interactivityContainer.y = initialY;
        setPosition({ x: initialX, y: initialY });

        appRef.current = app;
        setIsReady(true);
      } catch (error) {
        console.error("Error initializing PixiJS:", error);
        if (!isMounted) return;
        if (appRef.current) {
          appRef.current.destroy(true, { children: true });
          appRef.current = null;
        }
      }
    };

    initPixi();

    return () => {
      isMounted = false;
      if (tileLoaderRef.current) {
        tileLoaderRef.current.destroy();
        tileLoaderRef.current = null;
      }
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
      if (tilesContainerRef.current) {
        tilesContainerRef.current = null;
      }
      if (interactivityContainerRef.current) {
        interactivityContainerRef.current = null;
      }
      if (tooltipRef.current) {
        tooltipRef.current = null;
      }
      if (tooltipContainerRef.current) {
        tooltipContainerRef.current = null;
      }
      tileSpritesRef.current.clear();
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [mapData]);

  // Render a tile sprite
  const renderTile = (tile: LoadedTile) => {
    if (!tilesContainerRef.current || !tile.image || !appRef.current) return;

    const key = `${tile.coordinate.zoom}-${tile.coordinate.x}-${tile.coordinate.y}-${tile.viewMode}`;

    // Check if sprite already exists
    if (tileSpritesRef.current.has(key)) {
      return;
    }

    try {
      const texture = Texture.from(tile.image);
      const sprite = new Sprite(texture);

      // Calculate tile position in world coordinates
      const multiplier = ZOOM_MULTIPLIERS[tile.coordinate.zoom];
      const worldTileSize = TILE_SIZE * multiplier;
      sprite.x = tile.coordinate.x * worldTileSize;
      sprite.y = tile.coordinate.y * worldTileSize;
      sprite.width = worldTileSize;
      sprite.height = worldTileSize;

      tilesContainerRef.current.addChild(sprite);
      tileSpritesRef.current.set(key, sprite);
    } catch (error) {
      console.error("Error rendering tile:", error);
    }
  };

  // Handle pan and zoom
  useEffect(() => {
    if (!isReady || !tilesContainerRef.current || !interactivityContainerRef.current) return;

    const tilesContainer = tilesContainerRef.current;
    const interactivityContainer = interactivityContainerRef.current;
    const canvas = canvasRef.current?.querySelector("canvas");

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.25, Math.min(5, scale * delta));
      setScale(newScale);

      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldX = (mouseX - position.x) / scale;
        const worldY = (mouseY - position.y) / scale;

        const newX = mouseX - worldX * newScale;
        const newY = mouseY - worldY * newScale;

        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isDraggingRef.current = true;
        dragStartRef.current = {
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        };
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        setPosition({
          x: e.clientX - dragStartRef.current.x,
          y: e.clientY - dragStartRef.current.y,
        });
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    if (canvas) {
      canvas.addEventListener("wheel", handleWheel);
      canvas.addEventListener("mousedown", handleMouseDown);
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener("wheel", handleWheel);
        canvas.removeEventListener("mousedown", handleMouseDown);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      }
    };
  }, [isReady, scale, position]);

  // Update container transforms
  useEffect(() => {
    if (tilesContainerRef.current && tilesContainerRef.current.parent) {
      tilesContainerRef.current.scale.set(scale);
      tilesContainerRef.current.x = position.x;
      tilesContainerRef.current.y = position.y;
    }
    if (interactivityContainerRef.current && interactivityContainerRef.current.parent) {
      interactivityContainerRef.current.scale.set(scale);
      interactivityContainerRef.current.x = position.x;
      interactivityContainerRef.current.y = position.y;
    }
  }, [scale, position]);

  // Update tiles based on viewport
  useEffect(() => {
    if (!isReady || !mapData || !tileLoaderRef.current) return;

    const currentParams = { scale, position, mapView };
    const lastParams = lastRenderParamsRef.current;
    const needsUpdate =
      !lastParams ||
      lastParams.mapView !== mapView ||
      Math.abs(lastParams.scale - scale) > 0.1 ||
      Math.abs(lastParams.position.x - position.x) > 50 ||
      Math.abs(lastParams.position.y - position.y) > 50;

    if (!needsUpdate && lastParams) {
      return;
    }

    lastRenderParamsRef.current = currentParams;

    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }

    const delay = isDraggingRef.current ? 100 : 16;
    renderTimeoutRef.current = setTimeout(() => {
      if (!mapData || !tileLoaderRef.current) return;

      // Calculate viewport
      const viewport: Viewport = {
        x: -position.x / scale,
        y: -position.y / scale,
        width: window.innerWidth / scale,
        height: window.innerHeight / scale,
      };

      // Update tile loader
      tileLoaderRef.current.updateViewport(viewport, scale, mapView, true);

      // Clean up tiles outside viewport
      cleanupTiles(viewport, scale);
    }, delay);

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [isReady, mapData, mapView, scale, position]);

  // Clean up tiles outside viewport
  const cleanupTiles = (viewport: Viewport, currentScale: number) => {
    if (!tilesContainerRef.current) return;

    const padding = TILE_SIZE * 2; // Keep tiles slightly outside viewport
    const expandedViewport = {
      x: viewport.x - padding,
      y: viewport.y - padding,
      width: viewport.width + padding * 2,
      height: viewport.height + padding * 2,
    };

    const tilesToRemove: string[] = [];

    tileSpritesRef.current.forEach((sprite, key) => {
      const [zoomStr, xStr, yStr] = key.split("-");
      const zoom = parseInt(zoomStr);
      const x = parseInt(xStr);
      const y = parseInt(yStr);

      const multiplier = ZOOM_MULTIPLIERS[zoom];
      const worldTileSize = TILE_SIZE * multiplier;
      const tileWorldX = x * worldTileSize;
      const tileWorldY = y * worldTileSize;

      const isVisible =
        tileWorldX + worldTileSize >= expandedViewport.x &&
        tileWorldX <= expandedViewport.x + expandedViewport.width &&
        tileWorldY + worldTileSize >= expandedViewport.y &&
        tileWorldY <= expandedViewport.y + expandedViewport.height;

      // Also remove tiles from different zoom levels that are too far off
      const currentZoom = scaleToZoomLevel(currentScale);
      const zoomDiff = Math.abs(zoom - currentZoom);

      if (!isVisible || zoomDiff > 1) {
        tilesToRemove.push(key);
      }
    });

    tilesToRemove.forEach((key) => {
      const sprite = tileSpritesRef.current.get(key);
      if (sprite && tilesContainerRef.current) {
        tilesContainerRef.current.removeChild(sprite);
        sprite.destroy();
        tileSpritesRef.current.delete(key);
      }
    });
  };

  const scaleToZoomLevel = (scale: number): number => {
    if (scale < 0.5) return 0;
    if (scale < 1) return 1;
    if (scale < 2) return 2;
    if (scale < 4) return 3;
    return 4;
  };

  // Render settlements overlay
  useEffect(() => {
    if (!isReady || !interactivityContainerRef.current || !mapData) return;

    const container = interactivityContainerRef.current;
    container.removeChildren();

    settlements.forEach((settlement) => {
      const [x, y] = settlement.position;
      const settlementGraphics = new Graphics();

      const points: number[] = [];
      const outerRadius = 8;
      const innerRadius = 4;
      const spikes = 5;

      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI / spikes) * i - Math.PI / 2;
        points.push(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
      }

      settlementGraphics.poly(points);

      const settlementPlayer = player?.id === settlement.playerId ? player : null;
      const color = settlementPlayer?.color
        ? parseInt(settlementPlayer.color.replace("#", ""), 16)
        : 0x9b59b6;

      settlementGraphics.fill({ color, alpha: 1 });
      settlementGraphics.stroke({ color: 0x000000, width: 1 });
      settlementGraphics.eventMode = "static";
      settlementGraphics.cursor = "pointer";

      container.addChild(settlementGraphics);
    });
  }, [isReady, settlements, player, mapData]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (appRef.current) {
        appRef.current.renderer.resize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent context menu
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const canvas = canvasRef.current?.querySelector("canvas");
    if (canvas) {
      canvas.addEventListener("contextmenu", handleContextMenu);
      return () => canvas.removeEventListener("contextmenu", handleContextMenu);
    }
  }, [isReady]);

  if (!mapData) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-gray-500">Loading map...</p>
      </div>
    );
  }

  return <div ref={canvasRef} className="h-screen w-screen" />;
}
