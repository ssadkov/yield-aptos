import * as bip39 from "bip39";
import crypto from "crypto";

export async function POST(req) {
  try {
    const { email, userId } = await req.json();
    
    if (!email || !userId) {
      return new Response(JSON.stringify({ error: "Email and userId are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const SALT = process.env.NEXT_PUBLIC_MNEMONIC_SALT || "default_salt";
    const seedData = `${email}-${userId}-${SALT}`;

    // Создаем 16-байтовый хеш (SHA256) на основе данных
    const hash = crypto.createHash("sha256").update(seedData).digest().subarray(0, 16);

    // Генерируем мнемонику BIP-39 (12 слов)
    const mnemonic = bip39.entropyToMnemonic(hash.toString("hex"));

    return new Response(JSON.stringify({ mnemonic }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("❌ Error generating mnemonic:", error);
    return new Response(JSON.stringify({ error: "Failed to generate mnemonic" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
} 