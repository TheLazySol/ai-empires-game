"use client";

import { useState } from "react";
import { useAtomValue } from "jotai";
import { mapDataAtom } from "@/store/gameState";
import MapCanvas from "./MapCanvas";
import MapInteractions from "./MapInteractions";
import MapLoadingBar from "./MapLoadingBar";

export default function Map() {
  const mapData = useAtomValue(mapDataAtom);
  const [loadingProgress, setLoadingProgress] = useState({
    loaded: 0,
    total: 0,
    currentZoom: 0,
    isComplete: false,
  });

  const handleLoadingProgress = (
    loaded: number,
    total: number,
    currentZoom: number,
    isComplete: boolean
  ) => {
    setLoadingProgress({ loaded, total, currentZoom, isComplete });
  };

  return (
    <div className="relative h-screen w-screen">
      <MapInteractions>
        {(handlers) => (
          <MapCanvas {...handlers} onLoadingProgress={handleLoadingProgress} />
        )}
      </MapInteractions>
      {mapData && (
        <MapLoadingBar
          loaded={loadingProgress.loaded}
          total={loadingProgress.total}
          currentZoom={loadingProgress.currentZoom}
          isComplete={loadingProgress.isComplete}
        />
      )}
    </div>
  );
}

