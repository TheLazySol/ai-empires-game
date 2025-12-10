"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface MapLoadingBarProps {
  isComplete: boolean;
}

export default function MapLoadingBar({
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

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-4 min-w-[200px] transition-opacity duration-500",
        isFadingOut && "opacity-0"
      )}
    >
      <div className="text-sm text-gray-700">
        <div className="font-medium">
          {isComplete ? "Map loaded" : "Loading map..."}
        </div>
      </div>
    </div>
  );
}

