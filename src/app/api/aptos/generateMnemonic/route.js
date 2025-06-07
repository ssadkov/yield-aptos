import * as bip39 from "bip39";
import crypto from "crypto";

export async function POST(req) {
  try {
    console.log("🔄 Начало генерации мнемоники...");
    const { email, userId } = await req.json();
    
    console.log("📝 Получены данные:", { email: email ? "✅" : "❌", userId: userId ? "✅" : "❌" });
    
    if (!email || !userId) {
      console.error("❌ Отсутствуют email или userId");
      return new Response(JSON.stringify({ error: "Email and userId are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const SALT = process.env.NEXT_PUBLIC_MNEMONIC_SALT || "yield-aptos-secure-salt-2024";
    console.log("🔑 Используется соль:", SALT);
    
    const seedData = `${email}-${userId}-${SALT}`;
    console.log("📝 Данные для хеширования:", seedData);

    // Создаем 16-байтовый хеш (SHA256) на основе данных
    const hash = crypto.createHash("sha256").update(seedData).digest().subarray(0, 16);
    console.log("🔐 Хеш создан");

    // Проверяем валидность мнемоники перед отправкой
    const mnemonic = bip39.entropyToMnemonic(hash.toString("hex"));
    console.log("📝 Мнемоника сгенерирована:", mnemonic ? "✅" : "❌");
    
    if (!bip39.validateMnemonic(mnemonic)) {
      console.error("❌ Сгенерирована невалидная мнемоника");
      throw new Error("Generated invalid mnemonic");
    }

    console.log("✅ Мнемоника валидна");
    return new Response(JSON.stringify({ mnemonic }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("❌ Error generating mnemonic:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to generate mnemonic",
      details: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
} 