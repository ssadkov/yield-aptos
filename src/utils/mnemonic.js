import * as bip39 from "bip39";
import crypto from "crypto";

/**
 * Генерирует детерминированную BIP-39 мнемонику из email + userId + salt
 * @param {string} email - Email пользователя
 * @param {string} userId - Уникальный ID пользователя
 * @returns {string} 12-словная мнемоническая фраза
 */
export function generateMnemonicForUser(email, userId) {
  const SALT = process.env.NEXT_PUBLIC_MNEMONIC_SALT || "default_salt"; // Безопасная соль из .env
  const seedData = `${email}-${userId}-${SALT}`;

  // Создаем 16-байтовый хеш (SHA256) на основе данных
  const hash = crypto.createHash("sha256").update(seedData).digest().subarray(0, 16);

  // Генерируем мнемонику BIP-39 (12 слов)
  const mnemonic = bip39.entropyToMnemonic(hash.toString("hex"));

  return mnemonic;
}
