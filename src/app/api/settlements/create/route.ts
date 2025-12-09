import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Settlement } from "@/types/game";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId, cellId, position } = body;

    if (!playerId || !cellId || !position) {
      return NextResponse.json(
        { error: "Missing required fields: playerId, cellId, position" },
        { status: 400 }
      );
    }

    // Check if settlement already exists in this cell
    const { data: existing } = await supabase
      .from("settlements")
      .select("*")
      .eq("cell_id", cellId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Settlement already exists in this cell" },
        { status: 400 }
      );
    }

    // Create settlement
    const settlement: Settlement = {
      id: `settlement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      cellId,
      position: [position[0], position[1]],
      radius: 5, // Initial visual radius
      population: 100, // Starting population
      createdAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("settlements")
      .insert({
        id: settlement.id,
        player_id: settlement.playerId,
        cell_id: settlement.cellId,
        position: settlement.position,
        radius: settlement.radius,
        population: settlement.population,
        created_at: settlement.createdAt,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating settlement:", error);
      return NextResponse.json(
        { error: "Failed to create settlement", details: error.message },
        { status: 500 }
      );
    }

    // Transform back to Settlement format
    const createdSettlement: Settlement = {
      id: data.id,
      playerId: data.player_id,
      cellId: data.cell_id,
      position: data.position,
      radius: data.radius,
      population: data.population,
      createdAt: data.created_at,
    };

    return NextResponse.json({ settlement: createdSettlement });
  } catch (error) {
    console.error("Error creating settlement:", error);
    return NextResponse.json(
      { error: "Failed to create settlement", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

