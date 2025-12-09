"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSetAtom } from "jotai";
import { playerAtom } from "@/store/gameState";
import { Player } from "@/types/game";
import { useRouter } from "next/navigation";

const NATION_COLORS = [
  "#9b59b6", // Purple
  "#e74c3c", // Red
  "#3498db", // Blue
  "#2ecc71", // Green
  "#f39c12", // Orange
  "#1abc9c", // Turquoise
  "#e67e22", // Dark Orange
  "#34495e", // Dark Gray
  "#16a085", // Dark Turquoise
  "#c0392b", // Dark Red
  "#8e44ad", // Dark Purple
  "#2980b9", // Dark Blue
  "#27ae60", // Dark Green
  "#d35400", // Dark Orange
  "#7f8c8d", // Gray
];

interface PlayerSetupProps {
  open: boolean;
  onComplete: () => void;
}

export default function PlayerSetup({ open, onComplete }: PlayerSetupProps) {
  const [nationName, setNationName] = useState("");
  const [selectedColor, setSelectedColor] = useState(NATION_COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const setPlayer = useSetAtom(playerAtom);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!nationName.trim()) {
      alert("Please enter a nation name");
      return;
    }

    setIsLoading(true);

    try {
      // Generate or get guest ID
      let guestId = localStorage.getItem("guestId");
      if (!guestId) {
        guestId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem("guestId", guestId);
      }

      // Create or update player
      const response = await fetch(`/api/players/${guestId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nationName: nationName.trim(),
          color: selectedColor,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create player");
      }

      const { player: playerData } = await response.json();
      setPlayer(playerData);
      onComplete();
      router.refresh();
    } catch (error) {
      console.error("Error setting up player:", error);
      alert("Failed to set up player. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to Your Empire</DialogTitle>
          <DialogDescription>
            Create your nation to begin your journey. Choose a name and color for your empire.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="nation-name">Nation Name</Label>
            <Input
              id="nation-name"
              value={nationName}
              onChange={(e) => setNationName(e.target.value)}
              placeholder="Enter your nation name"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmit();
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Nation Color</Label>
            <div className="grid grid-cols-5 gap-2">
              {NATION_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-12 h-12 rounded border-2 transition-all ${
                    selectedColor === color
                      ? "border-gray-900 scale-110"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!nationName.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? "Creating..." : "Begin"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

