import { Account, SigningScheme } from "@aptos-labs/ts-sdk";

/**
 * Восстанавливает кошелек Aptos из мнемоники (12 слов)
 */
export async function POST(req) {
  try {
    console.log("🔄 Начало восстановления кошелька...");
    const { mnemonic } = await req.json();
    
    console.log("📝 Получена мнемоника:", mnemonic ? "✅" : "❌");
    
    if (!mnemonic || typeof mnemonic !== "string") {
      console.error("❌ Неверный формат мнемоники");
      return new Response(JSON.stringify({ error: "Invalid mnemonic format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const derivationPath = "m/44'/637'/0'/0'/0'";
    console.log("🔑 Путь деривации:", derivationPath);

    try {
      console.log("🔄 Попытка создания аккаунта...");
      const account = Account.fromDerivationPath({
        path: derivationPath,
        mnemonic,
        scheme: SigningScheme.Ed25519,
      });

      console.log("✅ Аккаунт успешно создан");
      const response = {
        address: account.accountAddress.toString(),
        privateKeyHex: account.privateKey.toString(),
      };

      console.log("📝 Адрес кошелька:", response.address);
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (derivationError) {
      console.error("❌ Ошибка при деривации кошелька:", derivationError);
      return new Response(JSON.stringify({ 
        error: "Failed to derive wallet from mnemonic",
        details: derivationError.message 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
  } catch (error) {
    console.error("❌ Ошибка при восстановлении кошелька:", error);
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
