"use client";

import { useAtomValue } from "jotai";
import { mapDataAtom, mapViewAtom, playerAtom } from "@/store/gameState";
import { ResourceType, RESOURCE_METADATA } from "@/types/resources";
import { TerrainType, MapView } from "@/types/game";
import { useEffect, useState } from "react";

interface ResourceStats {
  type: ResourceType;
  count: number;
  percentage: number;
  playerOwned?: number;
}

export default function ResourcesPanel() {
  const mapData = useAtomValue(mapDataAtom);
  const mapView = useAtomValue(mapViewAtom);
  const player = useAtomValue(playerAtom);
  const [resourceStats, setResourceStats] = useState<ResourceStats[]>([]);
  const [totalLandCells, setTotalLandCells] = useState(0);
  const [playerResources, setPlayerResources] = useState<Map<ResourceType, number>>(new Map());

  // Calculate resource statistics
  useEffect(() => {
    if (!mapData || !mapData.cells) {
      setResourceStats([]);
      setTotalLandCells(0);
      return;
    }

    const landCells = mapData.cells.filter(cell => cell.terrain === TerrainType.Land);
    const totalLand = landCells.length;
    setTotalLandCells(totalLand);

    // Count resources
    const resourceCounts = new Map<ResourceType, number>();
    landCells.forEach(cell => {
      if (cell.resource) {
        resourceCounts.set(cell.resource, (resourceCounts.get(cell.resource) || 0) + 1);
      }
    });

    // Calculate player-owned resources if player exists
    const playerResourceCounts = new Map<ResourceType, number>();
    if (player) {
      // Load territories to calculate player-owned resources
      fetch("/api/territories")
        .then(res => res.json())
        .then(data => {
          const territories = data.territories || [];
          const playerTerritories = territories.filter((t: any) => t.playerId === player.id);
          const playerCellIds = new Set(playerTerritories.map((t: any) => t.cellId));

          landCells.forEach(cell => {
            if (playerCellIds.has(cell.id) && cell.resource) {
              playerResourceCounts.set(
                cell.resource,
                (playerResourceCounts.get(cell.resource) || 0) + 1
              );
            }
          });

          setPlayerResources(playerResourceCounts);
        })
        .catch(err => console.error("Error loading territories:", err));
    }

    // Create stats array
    const stats: ResourceStats[] = Object.values(ResourceType).map(type => {
      const count = resourceCounts.get(type) || 0;
      const percentage = totalLand > 0 ? (count / totalLand) * 100 : 0;
      const playerOwned = playerResourceCounts.get(type) || 0;

      return {
        type,
        count,
        percentage,
        playerOwned: player ? playerOwned : undefined,
      };
    });

    setResourceStats(stats);
  }, [mapData, player]);

  // Only show panel when Resources view is selected
  if (mapView !== MapView.Resources) {
    return null;
  }

  const ResourceIcon = ({ type }: { type: ResourceType }) => {
    const Icon = RESOURCE_METADATA[type].icon;
    return (
      <div style={{ color: RESOURCE_METADATA[type].color }}>
        <Icon className="w-5 h-5" />
      </div>
    );
  };

  return (
    <div className="absolute top-16 left-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-md max-h-[80vh] overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4 text-black">Resources</h2>

      {/* Resource Statistics */}
      <div className="space-y-3 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Resource Distribution</h3>
        {resourceStats.map((stat) => {
          const meta = RESOURCE_METADATA[stat.type];
          return (
            <div
              key={stat.type}
              className="flex items-center justify-between p-2 rounded border border-gray-200 hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <ResourceIcon type={stat.type} />
                <span className="text-sm font-medium text-black">{meta.name}</span>
              </div>
              <div className="text-right">
                <div className="text-sm text-black">
                  {stat.count.toLocaleString()} / {totalLandCells.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {stat.percentage.toFixed(1)}% of land
                </div>
                {stat.playerOwned !== undefined && (
                  <div className="text-xs text-blue-600 font-medium">
                    You own: {stat.playerOwned}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Statistics */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Summary</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Land Cells:</span>
            <span className="text-black font-medium">{totalLandCells.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Cells with Resources:</span>
            <span className="text-black font-medium">
              {resourceStats.reduce((sum, stat) => sum + stat.count, 0).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Resource Coverage:</span>
            <span className="text-black font-medium">
              {totalLandCells > 0
                ? (
                    (resourceStats.reduce((sum, stat) => sum + stat.count, 0) / totalLandCells) *
                    100
                  ).toFixed(1)
                : "0.0"}
              %
            </span>
          </div>
        </div>
      </div>

      {/* Resource List with Icons */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">All Resource Types</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.values(ResourceType).map((type) => {
            const meta = RESOURCE_METADATA[type];
            return (
              <div
                key={type}
                className="flex items-center gap-2 p-2 rounded border border-gray-200 hover:bg-gray-50"
              >
                <ResourceIcon type={type} />
                <span className="text-xs text-black">{meta.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

