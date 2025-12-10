"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  HEX_SIZE,
  HEX_ORIENTATION,
  NUMBER_OF_CONTINENTS,
  NUMBER_OF_ISLANDS,
  LAND_VARIANCE,
  LAND_TILE_PERCENTAGE,
  TILE_TYPES,
  RESOURCE_SCARCITY,
} from "@/constants";

interface MapSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MapSettings({ open, onOpenChange }: MapSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Map dimensions
  const [width, setWidth] = useState(MAP_WIDTH);
  const [height, setHeight] = useState(MAP_HEIGHT);
  const [hexSize, setHexSize] = useState(HEX_SIZE);
  const [hexOrientation, setHexOrientation] = useState<"pointy-top" | "flat-top">(HEX_ORIENTATION);
  
  // Terrain generation
  const [numContinents, setNumContinents] = useState(NUMBER_OF_CONTINENTS);
  const [numIslands, setNumIslands] = useState(NUMBER_OF_ISLANDS);
  const [landVariance, setLandVariance] = useState(LAND_VARIANCE);
  const [landTilePercentage, setLandTilePercentage] = useState(LAND_TILE_PERCENTAGE);
  
  // Tile types
  const [tileTypes, setTileTypes] = useState({
    PLAINS: TILE_TYPES.PLAINS,
    WOODS: TILE_TYPES.WOODS,
    MOUNTAINS: TILE_TYPES.MOUNTAINS,
    HILLS: TILE_TYPES.HILLS,
    DESERT: TILE_TYPES.DESERT,
    SWAMP: TILE_TYPES.SWAMP,
  });
  
  // Resource scarcity
  const [resourceScarcity, setResourceScarcity] = useState({
    WHEAT: RESOURCE_SCARCITY.WHEAT,
    WATER: RESOURCE_SCARCITY.WATER,
    WOOD: RESOURCE_SCARCITY.WOOD,
    COTTON: RESOURCE_SCARCITY.COTTON,
    BRONZE: RESOURCE_SCARCITY.BRONZE,
    IRON: RESOURCE_SCARCITY.IRON,
    GOLD: RESOURCE_SCARCITY.GOLD,
    COAL: RESOURCE_SCARCITY.COAL,
    WILDLIFE: RESOURCE_SCARCITY.WILDLIFE,
  });

  // Reset to defaults when dialog opens
  useEffect(() => {
    if (open) {
      setWidth(MAP_WIDTH);
      setHeight(MAP_HEIGHT);
      setHexSize(HEX_SIZE);
      setHexOrientation(HEX_ORIENTATION);
      setNumContinents(NUMBER_OF_CONTINENTS);
      setNumIslands(NUMBER_OF_ISLANDS);
      setLandVariance(LAND_VARIANCE);
      setLandTilePercentage(LAND_TILE_PERCENTAGE);
      setTileTypes({
        PLAINS: TILE_TYPES.PLAINS,
        WOODS: TILE_TYPES.WOODS,
        MOUNTAINS: TILE_TYPES.MOUNTAINS,
        HILLS: TILE_TYPES.HILLS,
        DESERT: TILE_TYPES.DESERT,
        SWAMP: TILE_TYPES.SWAMP,
      });
      setResourceScarcity({
        WHEAT: RESOURCE_SCARCITY.WHEAT,
        WATER: RESOURCE_SCARCITY.WATER,
        WOOD: RESOURCE_SCARCITY.WOOD,
        COTTON: RESOURCE_SCARCITY.COTTON,
        BRONZE: RESOURCE_SCARCITY.BRONZE,
        IRON: RESOURCE_SCARCITY.IRON,
        GOLD: RESOURCE_SCARCITY.GOLD,
        COAL: RESOURCE_SCARCITY.COAL,
        WILDLIFE: RESOURCE_SCARCITY.WILDLIFE,
      });
    }
  }, [open]);

  const handleGenerateMap = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/map/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          width: Number(width),
          height: Number(height),
          hexSize: Number(hexSize),
          numContinents: Number(numContinents),
          numIslands: Number(numIslands),
          landVariance: Number(landVariance),
          landTilePercentage: Number(landTilePercentage),
          tileTypes,
          resourceScarcity,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate map");
      }

      // Close dialog and refresh page
      onOpenChange(false);
      window.location.reload();
    } catch (error) {
      console.error("Error generating map:", error);
      alert(error instanceof Error ? error.message : "Failed to generate map. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Map Generation Settings</DialogTitle>
          <DialogDescription>
            Configure map generation parameters. Changes will regenerate the entire map and clear all territories and settlements.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Map Dimensions */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Map Dimensions</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="width">Width (pixels)</Label>
                <Input
                  id="width"
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  min={500}
                  max={10000}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (pixels)</Label>
                <Input
                  id="height"
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  min={500}
                  max={10000}
                />
              </div>
            </div>
          </div>

          {/* Hexagon Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Hexagon Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hexSize">Hex Size (radius)</Label>
                <Input
                  id="hexSize"
                  type="number"
                  value={hexSize}
                  onChange={(e) => setHexSize(Number(e.target.value))}
                  min={10}
                  max={100}
                  step={1}
                />
                <p className="text-xs text-gray-500">Smaller = more hexagons</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hexOrientation">Orientation</Label>
                <select
                  id="hexOrientation"
                  value={hexOrientation}
                  onChange={(e) => setHexOrientation(e.target.value as "pointy-top" | "flat-top")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="pointy-top">Pointy Top</option>
                  <option value="flat-top">Flat Top</option>
                </select>
              </div>
            </div>
          </div>

          {/* Terrain Generation */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Terrain Generation</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numContinents">Number of Continents</Label>
                <Input
                  id="numContinents"
                  type="number"
                  value={numContinents}
                  onChange={(e) => setNumContinents(Number(e.target.value))}
                  min={1}
                  max={10}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numIslands">Number of Islands</Label>
                <Input
                  id="numIslands"
                  type="number"
                  value={numIslands}
                  onChange={(e) => setNumIslands(Number(e.target.value))}
                  min={0}
                  max={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="landVariance">Land Variance</Label>
                <Input
                  id="landVariance"
                  type="number"
                  value={landVariance}
                  onChange={(e) => setLandVariance(Number(e.target.value))}
                  min={0.1}
                  max={2.0}
                  step={0.1}
                />
                <p className="text-xs text-gray-500">0.1-0.3: Smooth, 0.4-0.7: Natural, 0.8-1.5: Rough</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="landTilePercentage">Land Tile Percentage</Label>
                <Input
                  id="landTilePercentage"
                  type="number"
                  value={landTilePercentage}
                  onChange={(e) => setLandTilePercentage(Number(e.target.value))}
                  min={0.1}
                  max={0.9}
                  step={0.05}
                />
                <p className="text-xs text-gray-500">{(landTilePercentage * 100).toFixed(0)}% land, {((1 - landTilePercentage) * 100).toFixed(0)}% water</p>
              </div>
            </div>
          </div>

          {/* Tile Types */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Tile Type Distribution</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(tileTypes).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`tile-${key}`}>{key.charAt(0) + key.slice(1).toLowerCase()}</Label>
                  <Input
                    id={`tile-${key}`}
                    type="number"
                    value={value}
                    onChange={(e) => setTileTypes({ ...tileTypes, [key]: Number(e.target.value) })}
                    min={0}
                    max={1}
                    step={0.01}
                  />
                  <p className="text-xs text-gray-500">{(value * 100).toFixed(0)}% of land tiles</p>
                </div>
              ))}
            </div>
          </div>

          {/* Resource Scarcity */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Resource Scarcity</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(resourceScarcity).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`resource-${key}`}>{key.charAt(0) + key.slice(1).toLowerCase()}</Label>
                  <Input
                    id={`resource-${key}`}
                    type="number"
                    value={value}
                    onChange={(e) => setResourceScarcity({ ...resourceScarcity, [key]: Number(e.target.value) })}
                    min={0}
                    max={1}
                    step={0.01}
                  />
                  <p className="text-xs text-gray-500">{(value * 100).toFixed(0)}% of land cells</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleGenerateMap}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? "Generating Map..." : "Generate Map"}
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

