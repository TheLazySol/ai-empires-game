import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { MapData } from "@/types/game";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("maps")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No map found
        return NextResponse.json({ map: null });
      }
      console.error("Error fetching map:", error);
      return NextResponse.json(
        { error: "Failed to fetch map", details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ map: null });
    }

    // Transform database format to MapData format
    const mapData: MapData = {
      id: data.id,
      seed: data.seed,
      width: data.width,
      height: data.height,
      cells: data.cells,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({ map: mapData });
  } catch (error) {
    console.error("Error fetching map:", error);
    return NextResponse.json(
      { error: "Failed to fetch map", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

