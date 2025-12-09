"use client";

import { useEffect, useRef, useState } from "react";
import { Application, Graphics, Container, Text } from "pixi.js";
import { useAtomValue } from "jotai";
import { mapDataAtom, mapViewAtom, settlementsAtom, playerAtom } from "@/store/gameState";
import { MapView, TerrainType, VoronoiCell } from "@/types/game";
import { RESOURCE_METADATA } from "@/types/resources";

interface MapCanvasProps {
  onCellClick?: (cell: VoronoiCell, event: MouseEvent) => void;
  onCellRightClick?: (cell: VoronoiCell, event: MouseEvent) => void;
}

export default function MapCanvas({ onCellClick, onCellRightClick }: MapCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const cellsContainerRef = useRef<Container | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const mapData = useAtomValue(mapDataAtom);
  const mapView = useAtomValue(mapViewAtom);
  const settlements = useAtomValue(settlementsAtom);
  const player = useAtomValue(playerAtom);

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

        // Check if component is still mounted
        if (!isMounted || !canvasRef.current) {
          app.destroy(true, { children: true });
          return;
        }

        canvasRef.current.appendChild(app.canvas);

        // Ensure stage exists
        if (!app.stage) {
          console.error("PixiJS stage not available");
          app.destroy(true, { children: true });
          return;
        }

        const cellsContainer = new Container();
        app.stage.addChild(cellsContainer);

        // Center the map initially
        const initialX = (window.innerWidth - mapData.width) / 2;
        const initialY = (window.innerHeight - mapData.height) / 2;
        cellsContainer.x = initialX;
        cellsContainer.y = initialY;
        setPosition({ x: initialX, y: initialY });

        appRef.current = app;
        cellsContainerRef.current = cellsContainer;

        setIsReady(true);
      } catch (error) {
        console.error("Error initializing PixiJS:", error);
        if (!isMounted) return;
        // Clean up on error
        if (appRef.current) {
          appRef.current.destroy(true, { children: true });
          appRef.current = null;
        }
      }
    };

    initPixi();

    return () => {
      isMounted = false;
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
      if (cellsContainerRef.current) {
        cellsContainerRef.current = null;
      }
    };
  }, [mapData]);

  // Handle pan and zoom
  useEffect(() => {
    if (!isReady || !cellsContainerRef.current) return;

    const container = cellsContainerRef.current;
    const canvas = canvasRef.current?.querySelector("canvas");

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.25, Math.min(5, scale * delta));
      setScale(newScale);
      
      // Zoom towards mouse position
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
      if (e.button === 0) { // Left click
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

  // Update container transform
  useEffect(() => {
    if (cellsContainerRef.current && cellsContainerRef.current.parent) {
      cellsContainerRef.current.scale.set(scale);
      cellsContainerRef.current.x = position.x;
      cellsContainerRef.current.y = position.y;
    }
  }, [scale, position]);

  // Render cells
  useEffect(() => {
    if (!isReady || !mapData || !cellsContainerRef.current || !appRef.current) return;

    const container = cellsContainerRef.current;
    // Ensure container is still part of the stage
    if (!container.parent) return;
    
    container.removeChildren();

    mapData.cells.forEach((cell) => {
      const graphics = new Graphics();

      // Determine fill color based on view mode
      let fillColor = 0xffffff;
      let alpha = 1;

      if (mapView === MapView.Terrain) {
        fillColor = cell.terrain === TerrainType.Water ? 0x3498db : 0xffffff;
      } else if (mapView === MapView.Political) {
        // Find owner of this cell - check if any settlement owns it
        // For now, we'll use a simple check - in future this will use territories table
        const ownerSettlement = settlements.find((s) => s.cellId === cell.id);
        if (ownerSettlement && player) {
          // Parse hex color
          const colorHex = player.color.replace("#", "");
          fillColor = parseInt(colorHex, 16) || 0x9b59b6;
        } else {
          fillColor = cell.terrain === TerrainType.Water ? 0x3498db : 0xffffff;
        }
      } else if (mapView === MapView.Resources) {
        fillColor = cell.terrain === TerrainType.Water ? 0x3498db : 0xffffff;
        if (cell.resource) {
          const resourceMeta = RESOURCE_METADATA[cell.resource];
          const tint = parseInt(resourceMeta.color.replace("#", ""), 16);
          fillColor = tint;
          alpha = 0.3;
        }
      }

      // Draw polygon
      if (cell.polygon && cell.polygon.length > 0) {
        graphics.poly(cell.polygon.flat());
        graphics.fill({ color: fillColor, alpha });
        graphics.stroke({ color: 0xcccccc, width: 0.5 });
      }

      // Add click handlers
      graphics.eventMode = "static";
      graphics.cursor = "pointer";
      graphics.on("pointerdown", (event) => {
        // Don't handle clicks if we're dragging
        if (isDraggingRef.current) return;
        
        const originalEvent = event.data.originalEvent;
        if (!originalEvent) {
          return;
        }
        
        // Convert through unknown first, then check if it's a MouseEvent
        const nativeEvent = originalEvent as unknown as MouseEvent | PointerEvent | TouchEvent;
        if (!(nativeEvent instanceof MouseEvent)) {
          return;
        }
        if (nativeEvent.button === 2) {
          // Right click
          event.stopPropagation();
          onCellRightClick?.(cell, nativeEvent);
        } else if (nativeEvent.button === 0) {
          // Left click - only if not starting a drag
          const startX = nativeEvent.clientX;
          const startY = nativeEvent.clientY;
          
          const handleMouseUp = () => {
            const endX = nativeEvent.clientX;
            const endY = nativeEvent.clientY;
            const dist = Math.sqrt(
              Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
            );
            
            // Only trigger click if we didn't drag much
            if (dist < 5) {
              onCellClick?.(cell, nativeEvent);
            }
            
            window.removeEventListener("mouseup", handleMouseUp);
          };
          
          window.addEventListener("mouseup", handleMouseUp);
        }
      });

      container.addChild(graphics);

      // Add resource icons in Resources view
      if (mapView === MapView.Resources && cell.resource && cell.terrain === TerrainType.Land) {
        const resourceMeta = RESOURCE_METADATA[cell.resource];
        const [x, y] = cell.site;

        // Create text sprite for resource icon (simplified - using text for now)
        const text = new Text({
          text: resourceMeta.name.charAt(0),
          style: {
            fontSize: 12,
            fill: resourceMeta.color,
            fontWeight: "bold",
          },
        });
        text.anchor.set(0.5);
        text.x = x;
        text.y = y;
        container.addChild(text);
      }
    });

    // Render settlements
    settlements.forEach((settlement) => {
      const [x, y] = settlement.position;
      const settlementGraphics = new Graphics();

      // Draw star shape
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
      
      // Get settlement owner color
      const settlementPlayer = player?.id === settlement.playerId ? player : null;
      const color = settlementPlayer?.color 
        ? parseInt(settlementPlayer.color.replace("#", ""), 16) 
        : 0x9b59b6; // Default purple
      
      settlementGraphics.fill({ color, alpha: 1 });
      settlementGraphics.stroke({ color: 0x000000, width: 1 });

      container.addChild(settlementGraphics);
    });
  }, [isReady, mapData, mapView, settlements, player, onCellClick, onCellRightClick]);

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

  // Prevent context menu on right click
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

