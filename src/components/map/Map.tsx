"use client";

import { useState } from "react";
import { useAtomValue } from "jotai";
import { mapDataAtom } from "@/store/gameState";
import MapCanvas from "./MapCanvas";
import MapInteractions from "./MapInteractions";
import MapLoadingBar from "./MapLoadingBar";

export default function Map() {
  const mapData = useAtomValue(mapDataAtom);
  const [isLoading, setIsLoading] = useState(true);

  const handleLoadingProgress = (isComplete: boolean) => {
    setIsLoading(!isComplete);
  };

  return (
    <div className="relative h-screen w-screen">
      <MapInteractions>
        {(handlers) => (
          <MapCanvas {...handlers} onLoadingProgress={handleLoadingProgress} />
        )}
      </MapInteractions>
      {mapData && (
        <MapLoadingBar isComplete={!isLoading} />
      )}
    </div>
  );
}

