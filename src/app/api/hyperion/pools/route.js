import { NextResponse } from "next/server";
import sdk from "../config";
import { getCacheHeaders } from "../../../../lib/utils";

export async function GET(req) {
  try {
    // Получаем все пулы через SDK
    const poolItems = await sdk.Pool.fetchAllPools();
    
    // Возвращаем сырые данные с настройками кэширования
    return NextResponse.json({
      success: true,
      data: poolItems
    }, {
      headers: getCacheHeaders(5)
    });

  } catch (error) {
    console.error("❌ Hyperion pools error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch Hyperion pools",
        details: error.message 
      }, 
      { status: 500 }
    );
  }
} 