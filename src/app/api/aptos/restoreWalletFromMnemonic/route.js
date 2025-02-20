import { Account, SigningScheme } from "@aptos-labs/ts-sdk";

/**
 * Восстанавливает кошелек Aptos из мнемоники (12 слов)
 */
export async function POST(req) {
  try {
    const { mnemonic } = await req.json();
    
    if (!mnemonic || typeof mnemonic !== "string") {
      return new Response(JSON.stringify({ error: "Invalid mnemonic format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const derivationPath = "m/44'/637'/0'/0'/0'";

    const account = Account.fromDerivationPath({
      path: derivationPath,
      mnemonic,
      scheme: SigningScheme.Ed25519,
      legacy: true,
    });

    const response = {
      address: account.accountAddress.toString(),
      privateKeyHex: account.privateKey.toString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("❌ Ошибка при восстановлении кошелька:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
