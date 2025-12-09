"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { playerAtom } from "@/store/gameState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { Player } from "@/types/game";

export default function OverviewTab() {
  const player = useAtomValue(playerAtom);
  const setPlayer = useSetAtom(playerAtom);
  const [nationName, setNationName] = useState(player?.nationName || "");

  useEffect(() => {
    if (player) {
      setNationName(player.nationName);
    }
  }, [player]);

  const handleNameChange = async (newName: string) => {
    setNationName(newName);
    if (!player) return;

    try {
      const response = await fetch(`/api/players/${player.guestId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nationName: newName,
          color: player.color,
        }),
      });

      if (response.ok) {
        const { player: updatedPlayer } = await response.json();
        setPlayer(updatedPlayer);
      }
    } catch (error) {
      console.error("Error updating nation name:", error);
    }
  };

  // Calculate population and territory from settlements
  const population = player?.population || 0;
  const territoryCount = 0; // Will be calculated from territories table later

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="nation-name">Nation Name</Label>
        <Input
          id="nation-name"
          value={nationName}
          onChange={(e) => setNationName(e.target.value)}
          onBlur={(e) => handleNameChange(e.target.value)}
          placeholder="Enter your nation name"
          className="max-w-md"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div className="space-y-1">
          <Label className="text-sm text-gray-500">Population</Label>
          <p className="text-2xl font-semibold">{population.toLocaleString()}</p>
        </div>
        <div className="space-y-1">
          <Label className="text-sm text-gray-500">Territory</Label>
          <p className="text-2xl font-semibold">{territoryCount} tiles</p>
        </div>
      </div>
    </div>
  );
}

