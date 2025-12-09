"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface MapLoadingBarProps {
  loaded: number;
  total: number;
  currentZoom: number;
  isComplete: boolean;
}

export default function MapLoadingBar({
  loaded,
  total,
  currentZoom,
  isComplete,
}: MapLoadingBarProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (isComplete && !isFadingOut) {
      setIsFadingOut(true);
      // Fade out animation
      setTimeout(() => {
        setIsVisible(false);
      }, 500);
    }
  }, [isComplete, isFadingOut]);

  if (!isVisible) {
    return null;
  }

  const progress = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-4 min-w-[280px] transition-opacity duration-500",
        isFadingOut && "opacity-0"
      )}
    >
      <Progress value={progress} className="h-2 mb-2" />
      <div className="text-sm text-gray-700 space-y-1">
        <div className="font-medium">
          {isComplete ? "Map loaded" : `Loading zoom level ${currentZoom}...`}
        </div>
        <div className="text-xs text-gray-500">
          {loaded}/{total} tiles
        </div>
      </div>
    </div>
  );
}

