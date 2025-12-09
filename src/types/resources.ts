import { 
  Wheat, 
  Droplet, 
  TreePine, 
  Shirt, 
  Hammer, 
  Wrench, 
  Coins, 
  Flame, 
  Rabbit 
} from "lucide-react";

export enum ResourceType {
  Wheat = "wheat",
  Water = "water",
  Wood = "wood",
  Cotton = "cotton",
  Bronze = "bronze",
  Iron = "iron",
  Gold = "gold",
  Coal = "coal",
  Wildlife = "wildlife",
}

export interface ResourceMetadata {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const RESOURCE_METADATA: Record<ResourceType, ResourceMetadata> = {
  [ResourceType.Wheat]: {
    name: "Wheat",
    icon: Wheat,
    color: "#F4D03F",
  },
  [ResourceType.Water]: {
    name: "Water",
    icon: Droplet,
    color: "#3498DB",
  },
  [ResourceType.Wood]: {
    name: "Wood",
    icon: TreePine,
    color: "#8B4513",
  },
  [ResourceType.Cotton]: {
    name: "Cotton",
    icon: Shirt,
    color: "#FFFFFF",
  },
  [ResourceType.Bronze]: {
    name: "Bronze",
    icon: Hammer,
    color: "#CD7F32",
  },
  [ResourceType.Iron]: {
    name: "Iron",
    icon: Wrench,
    color: "#708090",
  },
  [ResourceType.Gold]: {
    name: "Gold",
    icon: Coins,
    color: "#FFD700",
  },
  [ResourceType.Coal]: {
    name: "Coal",
    icon: Flame,
    color: "#2C2C2C",
  },
  [ResourceType.Wildlife]: {
    name: "Wildlife",
    icon: Rabbit,
    color: "#8B7355",
  },
};

