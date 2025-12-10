"use client";

import { useState, useEffect } from "react";
import { useAtomValue } from "jotai";
import { playerAtom, mapDataAtom } from "@/store/gameState";
import { useGameData } from "@/hooks/useGameData";
import Map from "@/components/map/Map";
import MapViewSelector from "@/components/map/MapViewSelector";
import MapSettings from "@/components/map/MapSettings";
import BottomPanel from "@/components/ui/BottomPanel";
import PlayerSetup from "@/components/modals/PlayerSetup";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [showPlayerSetup, setShowPlayerSetup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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
          {/* Settings button in top-right */}
          <Button
            onClick={() => setShowSettings(true)}
            variant="outline"
            size="icon"
            className="absolute top-4 right-4 z-50 bg-white shadow-lg hover:bg-gray-50"
            aria-label="Open settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
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
      <MapSettings
        open={showSettings}
        onOpenChange={setShowSettings}
      />
    </div>
  );
}
