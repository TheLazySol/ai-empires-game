"use client";

import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HexCell, TerrainType } from "@/types/game";

interface ContextMenuProps {
  cell: HexCell | null;
  position: { x: number; y: number } | null;
  onSettle?: () => void;
  onClose?: () => void;
}

export default function ContextMenu({ cell, position, onSettle, onClose }: ContextMenuProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (cell && position) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [cell, position]);

  if (!cell || !position) return null;

  const canSettle = cell.terrain === TerrainType.Land;

  return (
    <div
      className="fixed z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <DropdownMenu open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          onClose?.();
        }
      }}>
        <DropdownMenuTrigger asChild>
          <div className="w-0 h-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {canSettle && (
            <DropdownMenuItem onClick={onSettle}>
              Settle
            </DropdownMenuItem>
          )}
          {!canSettle && (
            <DropdownMenuItem disabled>
              Cannot settle on water
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

