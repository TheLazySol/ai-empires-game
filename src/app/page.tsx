"use client";

import { useState, useEffect } from "react";
import { useAtomValue } from "jotai";
import { playerAtom, mapDataAtom } from "@/store/gameState";
import { useGameData } from "@/hooks/useGameData";
import Map from "@/components/map/Map";
import MapViewSelector from "@/components/map/MapViewSelector";
import BottomPanel from "@/components/ui/BottomPanel";
import PlayerSetup from "@/components/modals/PlayerSetup";

export default function Home() {
  const [showPlayerSetup, setShowPlayerSetup] = useState(false);
  const player = useAtomValue(playerAtom);
  const mapData = useAtomValue(mapDataAtom);

  useGameData();

  useEffect(() => {
    // Check if player needs to be set up
    const guestId = localStorage.getItem("guestId");
    if (!guestId || !player) {
      setShowPlayerSetup(true);
    } else {
      setShowPlayerSetup(false);
    }
  }, [player]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-50">
      {mapData ? (
        <>
          <Map />
          <MapViewSelector />
          <BottomPanel />
        </>
      ) : (
        <div className="flex h-screen w-full items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-gray-500">Loading map...</p>
            <p className="text-sm text-gray-400">
              If no map exists, run the regeneration script to create one.
            </p>
          </div>
        </div>
      )}
      <PlayerSetup
        open={showPlayerSetup}
        onComplete={() => setShowPlayerSetup(false)}
      />
    </div>
  );
}
