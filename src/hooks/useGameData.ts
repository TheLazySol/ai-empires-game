"use client";

import { useEffect } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { mapDataAtom, settlementsAtom, playerAtom } from "@/store/gameState";
import { MapData, MapMetadata, Settlement, Player } from "@/types/game";

export function useGameData() {
  const setMapData = useSetAtom(mapDataAtom);
  const setSettlements = useSetAtom(settlementsAtom);
  const setPlayer = useSetAtom(playerAtom);
  const player = useAtomValue(playerAtom);

  useEffect(() => {
    // Load map metadata only (not full map data with cells)
    const loadMapMetadata = async () => {
      try {
        const response = await fetch("/api/map/metadata");
        if (response.ok) {
          const { map } = await response.json();
          if (map) {
            // Convert MapMetadata to MapData format (without cells)
            // MapCanvas expects MapData but only uses id, width, height
            const mapData: MapData = {
              id: map.id,
              seed: map.seed,
              width: map.width,
              height: map.height,
              cells: [], // Empty - tiles will be loaded instead
              createdAt: map.createdAt,
              updatedAt: map.updatedAt,
            };
            setMapData(mapData);
          }
        }
      } catch (error) {
        console.error("Error loading map metadata:", error);
      }
    };

    // Load settlements
    const loadSettlements = async () => {
      try {
        const response = await fetch("/api/settlements");
        if (response.ok) {
          const { settlements } = await response.json();
          setSettlements(settlements || []);
        }
      } catch (error) {
        console.error("Error loading settlements:", error);
      }
    };

    // Load player data
    const loadPlayer = async () => {
      const guestId = localStorage.getItem("guestId");
      if (guestId) {
        try {
          const response = await fetch(`/api/players/${guestId}`);
          if (response.ok) {
            const { player: playerData } = await response.json();
            if (playerData) {
              setPlayer(playerData);
            }
          }
        } catch (error) {
          console.error("Error loading player:", error);
        }
      }
    };

    loadMapMetadata();
    loadSettlements();
    loadPlayer();

    // Set up polling for settlements (simple approach - in production use WebSockets)
    const interval = setInterval(() => {
      loadSettlements();
    }, 5000);

    return () => clearInterval(interval);
  }, [setMapData, setSettlements, setPlayer]);
}

