"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { mapViewAtom } from "@/store/gameState";
import { MapView } from "@/types/game";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const VIEWS = [
  { value: MapView.Terrain, label: "Terrain" },
  { value: MapView.Political, label: "Political" },
  { value: MapView.Resources, label: "Resources" },
];

export default function MapViewSelector() {
  const mapView = useAtomValue(mapViewAtom);
  const setMapView = useSetAtom(mapViewAtom);

  return (
    <div className="absolute top-4 left-4 z-50 flex gap-2 bg-white rounded-lg shadow-lg p-1 border border-gray-200">
      {VIEWS.map((view) => (
        <Button
          key={view.value}
          variant={mapView === view.value ? "default" : "ghost"}
          size="sm"
          onClick={() => setMapView(view.value)}
          className={cn(
            "px-4 py-2",
            mapView === view.value 
              ? "bg-gray-900 text-white" 
              : "text-black"
          )}
        >
          {view.label}
        </Button>
      ))}
    </div>
  );
}

