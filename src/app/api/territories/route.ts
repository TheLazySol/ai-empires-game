import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Territory } from "@/types/game";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("territories")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching territories:", error);
      return NextResponse.json(
        { error: "Failed to fetch territories", details: error.message },
        { status: 500 }
      );
    }

    const territories: Territory[] = (data || []).map((t) => ({
      id: t.id,
      cellId: t.cell_id,
      playerId: t.player_id,
      settlementId: t.settlement_id || undefined,
      createdAt: t.created_at,
    }));

    return NextResponse.json({ territories });
  } catch (error) {
    console.error("Error fetching territories:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch territories",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

