import { atom } from "jotai";
import { MapData, MapView, Player, Settlement, HexCell } from "@/types/game";

export const mapDataAtom = atom<MapData | null>(null);
export const mapViewAtom = atom<MapView>(MapView.Terrain);
export const playerAtom = atom<Player | null>(null);
export const settlementsAtom = atom<Settlement[]>([]);
export const selectedCellAtom = atom<HexCell | null>(null);

