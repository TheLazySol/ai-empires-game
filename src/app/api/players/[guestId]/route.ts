import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Player } from "@/types/game";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guestId: string }> }
) {
  try {
    const { guestId } = await params;

    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("guest_id", guestId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Player not found
        return NextResponse.json({ player: null });
      }
      console.error("Error fetching player:", error);
      return NextResponse.json(
        { error: "Failed to fetch player", details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ player: null });
    }

    const player: Player = {
      id: data.id,
      guestId: data.guest_id,
      nationName: data.nation_name,
      color: data.color,
      population: data.population || 0,
      createdAt: data.created_at,
    };

    return NextResponse.json({ player });
  } catch (error) {
    console.error("Error fetching player:", error);
    return NextResponse.json(
      { error: "Failed to fetch player", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guestId: string }> }
) {
  try {
    const { guestId } = await params;
    const body = await request.json();
    const { nationName, color } = body;

    if (!nationName || !color) {
      return NextResponse.json(
        { error: "Missing required fields: nationName, color" },
        { status: 400 }
      );
    }

    // Check if player exists
    const { data: existing } = await supabase
      .from("players")
      .select("*")
      .eq("guest_id", guestId)
      .single();

    if (existing) {
      // Update existing player
      const { data, error } = await supabase
        .from("players")
        .update({
          nation_name: nationName,
          color: color,
          updated_at: new Date().toISOString(),
        })
        .eq("guest_id", guestId)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: "Failed to update player", details: error.message },
          { status: 500 }
        );
      }

      const player: Player = {
        id: data.id,
        guestId: data.guest_id,
        nationName: data.nation_name,
        color: data.color,
        population: data.population || 0,
        createdAt: data.created_at,
      };

      return NextResponse.json({ player });
    } else {
      // Create new player
      const player: Player = {
        id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        guestId,
        nationName,
        color,
        population: 0,
        createdAt: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("players")
        .insert({
          id: player.id,
          guest_id: player.guestId,
          nation_name: player.nationName,
          color: player.color,
          population: player.population,
          created_at: player.createdAt,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating player:", error);
        return NextResponse.json(
          { error: "Failed to create player", details: error.message },
          { status: 500 }
        );
      }

      const createdPlayer: Player = {
        id: data.id,
        guestId: data.guest_id,
        nationName: data.nation_name,
        color: data.color,
        population: data.population || 0,
        createdAt: data.created_at,
      };

      return NextResponse.json({ player: createdPlayer });
    }
  } catch (error) {
    console.error("Error creating/updating player:", error);
    return NextResponse.json(
      { error: "Failed to create/update player", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

