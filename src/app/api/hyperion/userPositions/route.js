import { NextResponse } from "next/server";
import sdk from "../config";

export async function GET(req) {
  try {
    // Получаем адрес из query параметров
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Address parameter is required" 
        }, 
        { status: 400 }
      );
    }

    // Получаем позиции через SDK
    const positions = await sdk.Position.fetchAllPositionsByAddress({
      address: address
    });
    
    // Возвращаем сырые данные
    return NextResponse.json({
      success: true,
      data: positions
    });

  } catch (error) {
    console.error("❌ Hyperion user positions error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch Hyperion user positions",
        details: error.message 
      }, 
      { status: 500 }
    );
  }
} 