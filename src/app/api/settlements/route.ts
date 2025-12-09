import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Settlement } from "@/types/game";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("settlements")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching settlements:", error);
      return NextResponse.json(
        { error: "Failed to fetch settlements", details: error.message },
        { status: 500 }
      );
    }

    const settlements: Settlement[] = (data || []).map((item) => ({
      id: item.id,
      playerId: item.player_id,
      cellId: item.cell_id,
      position: item.position,
      radius: item.radius,
      population: item.population,
      createdAt: item.created_at,
    }));

    return NextResponse.json({ settlements });
  } catch (error) {
    console.error("Error fetching settlements:", error);
    return NextResponse.json(
      { error: "Failed to fetch settlements", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

