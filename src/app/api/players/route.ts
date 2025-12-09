import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Player } from "@/types/game";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching players:", error);
      return NextResponse.json(
        { error: "Failed to fetch players", details: error.message },
        { status: 500 }
      );
    }

    const players: Player[] = (data || []).map((p) => ({
      id: p.id,
      guestId: p.guest_id,
      nationName: p.nation_name,
      color: p.color,
      population: p.population,
      createdAt: p.created_at,
    }));

    return NextResponse.json({ players });
  } catch (error) {
    console.error("Error fetching players:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch players",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

