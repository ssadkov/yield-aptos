import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
  try {
    const { email, userId, tokenType, protocol, amount, startDate, enabled, strategyType } = await req.json();

    if (!email || !userId || !tokenType || !protocol || !amount || !startDate || !strategyType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await db.query(
        "INSERT INTO exec_strategies (email, user_id, token_type, protocol, amount, start_date, enabled, strategy_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
        [email, userId, tokenType, protocol, amount, new Date(startDate), enabled, strategyType]
      );
      

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    console.error("Error saving strategy:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
