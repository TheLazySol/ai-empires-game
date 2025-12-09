"use client";

import { useState, ReactNode } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { selectedCellAtom, settlementsAtom, playerAtom, mapDataAtom } from "@/store/gameState";
import { VoronoiCell, Settlement } from "@/types/game";
import ContextMenu from "./ContextMenu";

interface MapInteractionsProps {
  children: (handlers: {
    onCellClick: (cell: VoronoiCell, event: MouseEvent) => void;
    onCellRightClick: (cell: VoronoiCell, event: MouseEvent) => void;
  }) => ReactNode;
}

export default function MapInteractions({ children }: MapInteractionsProps) {
  const [contextMenuCell, setContextMenuCell] = useState<VoronoiCell | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const setSelectedCell = useSetAtom(selectedCellAtom);
  const settlements = useAtomValue(settlementsAtom);
  const setSettlements = useSetAtom(settlementsAtom);
  const player = useAtomValue(playerAtom);
  const mapData = useAtomValue(mapDataAtom);

  const handleCellClick = (cell: VoronoiCell, event: MouseEvent) => {
    setSelectedCell(cell);
    // Close context menu on left click
    setContextMenuCell(null);
    setContextMenuPosition(null);
  };

  const handleCellRightClick = (cell: VoronoiCell, event: MouseEvent) => {
    event.preventDefault();
    setContextMenuCell(cell);
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
  };

  const handleSettle = async () => {
    if (!contextMenuCell || !player || !mapData) return;

    // Check if cell already has a settlement
    const existingSettlement = settlements.find((s) => s.cellId === contextMenuCell.id);
    if (existingSettlement) {
      alert("This location already has a settlement!");
      setContextMenuCell(null);
      setContextMenuPosition(null);
      return;
    }

    try {
      const response = await fetch("/api/settlements/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId: player.id,
          cellId: contextMenuCell.id,
          position: contextMenuCell.site,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create settlement");
      }

      const { settlement: newSettlement } = await response.json();
      
      // Update settlements atom
      setSettlements([...settlements, newSettlement]);
      
      // Close context menu
      setContextMenuCell(null);
      setContextMenuPosition(null);
    } catch (error) {
      console.error("Error creating settlement:", error);
      alert(error instanceof Error ? error.message : "Failed to create settlement");
    }
  };

  return (
    <>
      {children({
        onCellClick: handleCellClick,
        onCellRightClick: handleCellRightClick,
      })}
      <ContextMenu
        cell={contextMenuCell}
        position={contextMenuPosition}
        onSettle={handleSettle}
        onClose={() => {
          setContextMenuCell(null);
          setContextMenuPosition(null);
        }}
      />
    </>
  );
}

