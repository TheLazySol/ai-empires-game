"use client";

import { useEffect } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { mapDataAtom, settlementsAtom, playerAtom } from "@/store/gameState";
import { MapData, Settlement, Player } from "@/types/game";

export function useGameData() {
  const setMapData = useSetAtom(mapDataAtom);
  const setSettlements = useSetAtom(settlementsAtom);
  const setPlayer = useSetAtom(playerAtom);
  const player = useAtomValue(playerAtom);

  useEffect(() => {
    // Load map data
    const loadMap = async () => {
      try {
        const response = await fetch("/api/map/current");
        if (response.ok) {
          const { map } = await response.json();
          if (map) {
            setMapData(map);
          }
        }
      } catch (error) {
        console.error("Error loading map:", error);
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

    loadMap();
    loadSettlements();
    loadPlayer();

    // Set up polling for settlements (simple approach - in production use WebSockets)
    const interval = setInterval(() => {
      loadSettlements();
    }, 5000);

    return () => clearInterval(interval);
  }, [setMapData, setSettlements, setPlayer]);
}

