import * as bip39 from "bip39";
import crypto from "crypto";

/**
 * Генерирует детерминированную BIP-39 мнемонику из email + userId + salt
 * @param {string} email - Email пользователя
 * @param {string} userId - Уникальный ID пользователя
 * @returns {Promise<string>} 12-словная мнемоническая фраза
 */
export async function generateMnemonicForUser(email, userId) {
  try {
    const response = await fetch("/api/aptos/generateMnemonic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, userId }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate mnemonic");
    }

    const data = await response.json();
    return data.mnemonic;
  } catch (error) {
    console.error("❌ Error generating mnemonic:", error);
    throw error;
  }
}
