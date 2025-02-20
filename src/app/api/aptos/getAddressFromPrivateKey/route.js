import { Account, Ed25519PrivateKey, SigningScheme } from "@aptos-labs/ts-sdk";

/**
 * Получает Aptos-адрес из приватного ключа
 */
export async function POST(req) {
  try {
    const { privateKey } = await req.json();

    if (!privateKey || typeof privateKey !== "string") {
      return new Response(JSON.stringify({ error: "Invalid private key format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Убираем префикс "0x", если он есть
    const formattedPrivateKey = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;

    // Преобразуем приватный ключ в объект Ed25519PrivateKey
    const ed25519Key = new Ed25519PrivateKey(formattedPrivateKey);

    // Создаем аккаунт из приватного ключа
    const account = Account.fromPrivateKey({
      privateKey: ed25519Key,
      scheme: SigningScheme.Ed25519,
    });

    return new Response(JSON.stringify({ address: account.accountAddress.toString() }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("❌ Ошибка при получении адреса из приватного ключа:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
