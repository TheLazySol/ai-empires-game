"use client";

import { useEffect, useRef, useState } from "react";
import { Application, Graphics, Container, Text, Sprite, Texture } from "pixi.js";
import { useAtomValue } from "jotai";
import { mapDataAtom, mapViewAtom, settlementsAtom, playerAtom } from "@/store/gameState";
import { MapView, VoronoiCell, MapMetadata, MapData, Territory, Player as GamePlayer } from "@/types/game";
import { RESOURCE_METADATA } from "@/types/resources";
import { TileLoader, Viewport, LoadedTile } from "@/lib/tileLoader";
import { getTileSize } from "@/lib/tileGeneration";

interface MapCanvasProps {
  onCellClick?: (cell: VoronoiCell, event: MouseEvent) => void;
  onCellRightClick?: (cell: VoronoiCell, event: MouseEvent) => void;
  onLoadingProgress?: (loaded: number, total: number, currentZoom: number, isComplete: boolean) => void;
}

const ZOOM_MULTIPLIERS = [1, 2, 4, 8, 16];

export default function MapCanvas({ onCellClick, onCellRightClick, onLoadingProgress }: MapCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const tilesContainerRef = useRef<Container | null>(null);
  const interactivityContainerRef = useRef<Container | null>(null);
  const cellsContainerRef = useRef<Container | null>(null);
  const hoverOverlayRef = useRef<Container | null>(null);
  const tooltipRef = useRef<Text | null>(null);
  const tooltipContainerRef = useRef<Container | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const tileLoaderRef = useRef<TileLoader | null>(null);
  const tileSpritesRef = useRef<Map<string, Sprite>>(new Map());
  const cellGraphicsRef = useRef<Map<string, Graphics>>(new Map());
  const hoveredCellRef = useRef<VoronoiCell | null>(null);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRenderParamsRef = useRef<{ scale: number; position: { x: number; y: number }; mapView: MapView } | null>(null);
  
  // Full map data with cells
  const [fullMapData, setFullMapData] = useState<MapData | null>(null);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [allPlayers, setAllPlayers] = useState<GamePlayer[]>([]);

  const mapData = useAtomValue(mapDataAtom);
  const mapView = useAtomValue(mapViewAtom);
  const settlements = useAtomValue(settlementsAtom);
  const player = useAtomValue(playerAtom);

  // Load full map data with cells, territories, and players
  useEffect(() => {
    if (!mapData) return;

    const loadFullMapData = async () => {
      try {
        // Load full map with cells
        const mapResponse = await fetch("/api/map/current");
        if (mapResponse.ok) {
          const { map } = await mapResponse.json();
          if (map && map.cells) {
            setFullMapData(map);
          }
        }

        // Load territories
        const territoriesResponse = await fetch("/api/territories");
        if (territoriesResponse.ok) {
          const { territories: territoriesData } = await territoriesResponse.json();
          setTerritories(territoriesData || []);
        }

        // Load all players
        const playersResponse = await fetch("/api/players");
        if (playersResponse.ok) {
          const { players: playersData } = await playersResponse.json();
          setAllPlayers(playersData || []);
        }
      } catch (error) {
        console.error("Error loading full map data:", error);
      }
    };

    loadFullMapData();
  }, [mapData]);

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
          resolution: Math.max(window.devicePixelRatio || 1, 1),
          autoDensity: true,
          roundPixels: false, // Enable sub-pixel rendering for smoother visuals
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

        // Create cells container for hitboxes (invisible but interactive)
        const cellsContainer = new Container();
        cellsContainer.eventMode = "static";
        cellsContainer.interactiveChildren = true;
        app.stage.addChild(cellsContainer);
        cellsContainerRef.current = cellsContainer;

        // Create hover overlay container
        const hoverOverlay = new Container();
        hoverOverlay.eventMode = "none";
        hoverOverlay.interactiveChildren = false;
        app.stage.addChild(hoverOverlay);
        hoverOverlayRef.current = hoverOverlay;

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

        // Initialize tile loader with progress callback
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
            console.warn("Failed to load tile:", tile.url);
          },
          (loaded: number, total: number, currentZoom: number) => {
            // Progress callback
            const isComplete = tileLoader.isPreloadComplete();
            onLoadingProgress?.(loaded, total, currentZoom, isComplete);
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

        // Start preloading all tiles for current view mode
        tileLoader.preloadAllTiles(mapView);
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
      if (cellsContainerRef.current) {
        cellsContainerRef.current = null;
      }
      if (hoverOverlayRef.current) {
        hoverOverlayRef.current = null;
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
      cellGraphicsRef.current.clear();
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
      
      // Enable high-quality texture filtering
      texture.source.scaleMode = 'linear';
      
      const sprite = new Sprite(texture);

      // Calculate tile position in world coordinates using dynamic tile size
      const multiplier = ZOOM_MULTIPLIERS[tile.coordinate.zoom];
      const tileSize = getTileSize(tile.coordinate.zoom);
      const worldTileSize = tileSize * multiplier;
      sprite.x = tile.coordinate.x * worldTileSize;
      sprite.y = tile.coordinate.y * worldTileSize;
      sprite.width = worldTileSize;
      sprite.height = worldTileSize;
      
      // Ensure sprite uses high-quality rendering
      sprite.roundPixels = false;

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
    if (cellsContainerRef.current && cellsContainerRef.current.parent) {
      cellsContainerRef.current.scale.set(scale);
      cellsContainerRef.current.x = position.x;
      cellsContainerRef.current.y = position.y;
    }
    if (hoverOverlayRef.current && hoverOverlayRef.current.parent) {
      hoverOverlayRef.current.scale.set(scale);
      hoverOverlayRef.current.x = position.x;
      hoverOverlayRef.current.y = position.y;
    }
  }, [scale, position]);

  // Restart preload when view mode changes
  useEffect(() => {
    if (!isReady || !mapData || !tileLoaderRef.current) return;

    // When view mode changes, restart preload for new view mode
    tileLoaderRef.current.preloadAllTiles(mapView);
  }, [isReady, mapData, mapView]);

  // Update hover effect and tooltip
  const updateHoverEffect = (cell: VoronoiCell, mouseX?: number, mouseY?: number) => {
    if (!hoverOverlayRef.current || !tooltipContainerRef.current || !tooltipRef.current || !appRef.current) return;

    const hoverOverlay = hoverOverlayRef.current;
    const tooltipContainer = tooltipContainerRef.current;
    const tooltip = tooltipRef.current;

    // Clear previous hover effect
    hoverOverlay.removeChildren();

    // Draw border highlight
    const hoverGraphics = new Graphics();
    hoverGraphics.setStrokeStyle({ width: Math.max(2, 2 / scale), color: 0x3b82f6, alpha: 1 });
    hoverGraphics.beginPath();
    const firstPoint = cell.polygon[0];
    hoverGraphics.moveTo(firstPoint[0], firstPoint[1]);
    for (let i = 1; i < cell.polygon.length; i++) {
      const [x, y] = cell.polygon[i];
      hoverGraphics.lineTo(x, y);
    }
    hoverGraphics.closePath();
    hoverGraphics.stroke();
    hoverOverlay.addChild(hoverGraphics);

    // Update tooltip with game info
    const territory = territories.find(t => t.cellId === cell.id);
    const territoryPlayer = territory ? allPlayers.find(p => p.id === territory.playerId) : null;
    const settlement = settlements.find(s => s.cellId === cell.id);
    const settlementPlayer = settlement ? allPlayers.find(p => p.id === settlement.playerId) : null;

    let tooltipText = `Terrain: ${cell.terrain === "water" ? "Water" : "Land"}`;
    if (cell.resource) {
      const resourceMeta = RESOURCE_METADATA[cell.resource];
      tooltipText += `\nResource: ${resourceMeta.name}`;
    }
    if (territoryPlayer) {
      tooltipText += `\nTerritory: ${territoryPlayer.nationName}`;
    }
    if (settlement) {
      const settlementOwner = settlementPlayer || allPlayers.find(p => p.id === settlement.playerId);
      tooltipText += `\nSettlement: ${settlementOwner?.nationName || "Unknown"} (Pop: ${settlement.population})`;
    }

    tooltip.text = tooltipText;
    
    if (mouseX !== undefined && mouseY !== undefined) {
      tooltipContainer.x = mouseX;
      tooltipContainer.y = mouseY - 20;
    }
    tooltipContainer.visible = true;
    (tooltipContainer as any).updateBackground();
  };

  // Render cell hitboxes
  useEffect(() => {
    if (!isReady || !fullMapData || !cellsContainerRef.current) return;

    const container = cellsContainerRef.current;
    container.removeChildren();
    cellGraphicsRef.current.clear();

    fullMapData.cells.forEach((cell) => {
      if (!cell.polygon || cell.polygon.length < 3) return;

      const graphics = new Graphics();
      
      // Draw polygon path (invisible but interactive)
      graphics.beginPath();
      const firstPoint = cell.polygon[0];
      graphics.moveTo(firstPoint[0], firstPoint[1]);
      
      for (let i = 1; i < cell.polygon.length; i++) {
        const [x, y] = cell.polygon[i];
        graphics.lineTo(x, y);
      }
      graphics.closePath();
      
      // Make invisible but interactive
      graphics.alpha = 0;
      graphics.eventMode = "static";
      graphics.cursor = "pointer";
      
      // Store cell data for click/hover handlers
      (graphics as any).cellData = cell;
      
      // Add click handlers
      graphics.on("pointerdown", (e: any) => {
        const event = e.data.originalEvent as MouseEvent;
        if (event.button === 0) {
          onCellClick?.(cell, event);
        } else if (event.button === 2) {
          onCellRightClick?.(cell, event);
        }
      });

      // Add hover handlers
      graphics.on("pointerenter", (e: any) => {
        hoveredCellRef.current = cell;
        const canvas = appRef.current?.canvas;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const mouseX = e.data.global.x;
          const mouseY = e.data.global.y;
          updateHoverEffect(cell, mouseX, mouseY);
        } else {
          updateHoverEffect(cell);
        }
      });

      graphics.on("pointermove", (e: any) => {
        if (hoveredCellRef.current === cell) {
          const canvas = appRef.current?.canvas;
          if (canvas && tooltipContainerRef.current) {
            const mouseX = e.data.global.x;
            const mouseY = e.data.global.y;
            tooltipContainerRef.current.x = mouseX;
            tooltipContainerRef.current.y = mouseY - 20;
            (tooltipContainerRef.current as any).updateBackground();
          }
        }
      });

      graphics.on("pointerleave", () => {
        hoveredCellRef.current = null;
        if (hoverOverlayRef.current) {
          hoverOverlayRef.current.removeChildren();
        }
        if (tooltipContainerRef.current) {
          tooltipContainerRef.current.visible = false;
        }
      });

      container.addChild(graphics);
      cellGraphicsRef.current.set(cell.id, graphics);
    });
  }, [isReady, fullMapData, onCellClick, onCellRightClick, territories, allPlayers, settlements, scale]);

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
