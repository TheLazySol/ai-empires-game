"use client";

import { useAtomValue } from "jotai";
import { mapDataAtom } from "@/store/gameState";
import MapCanvas from "./MapCanvas";
import MapInteractions from "./MapInteractions";

export default function Map() {
  const mapData = useAtomValue(mapDataAtom);

  return (
    <div className="relative h-screen w-screen">
      <MapInteractions>
        {(handlers) => <MapCanvas {...handlers} />}
      </MapInteractions>
    </div>
  );
}

