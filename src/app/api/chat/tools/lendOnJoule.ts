import { tool } from "ai";
import { z } from "zod";
import JOULE_TOKENS from "@/app/api/joule/jouleTokens";
import { generateMnemonicForUser } from "@/utils/mnemonic";
import { Aptos, AptosConfig, Mnemonic, Network } from "@aptos-labs/ts-sdk";

// ✅ Настройка Aptos SDK
const aptosConfig = new AptosConfig({ network: Network.MAINNET });
const aptos = new Aptos(aptosConfig);

const lendOnJoule = tool({
  description:
    "Lends an asset on Joule Finance. If a token type is already provided, it will be used directly without requiring a provider name.",
  parameters: z.object({
    asset: z.string().describe("The asset name (e.g., USDC, APT, BTC, ETH)."),
    provider: z
      .string()
      .optional()
      .describe("The provider name (only required if token type is not provided)."),
    amount: z.number().describe("The exact amount of the asset to lend."),
    tokenType: z
      .string()
      .optional()
      .describe("The token type (if already available, provider is not required)."),
  }),
  execute: async ({ asset, provider, amount, tokenType }) => {
    try {
      console.log("🔍 lendOnJoule request:", { asset, provider, amount, tokenType });

      let tokenAddress = tokenType;

      if (!tokenAddress) {
        if (!provider) {
          throw new Error(`❌ Provider is required if token type is not provided.`);
        }

        const tokenData = JOULE_TOKENS.find(
          (t) => t.assetName === asset && t.provider === provider
        );

        if (!tokenData) {
          throw new Error(`❌ Token not found for ${asset} (${provider})`);
        }

        tokenAddress = tokenData.token;
      }

      if (amount <= 0 || isNaN(amount)) {
        throw new Error(`❌ Invalid amount: ${amount}`);
      }

      // 🔹 **Проверяем, работаем ли в браузере**
      const isBrowser = typeof window !== "undefined";

      if (!isBrowser) {
        throw new Error("❌ localStorage is not available on the server.");
      }

      // 🔹 **Получение email и id из localStorage (только в браузере)**
      const email = localStorage.getItem("userEmail");
      const id = localStorage.getItem("userId");

      if (!email || !id) {
        throw new Error("❌ User email or ID not found in localStorage. Please log in.");
      }

      console.log("🔑 User Data from localStorage:", { email, id });

      // 🔹 **Генерация мнемоники и privateKeyHex перед отправкой транзакции**
      const mnemonic = generateMnemonicForUser(email, id);
      console.log("🔑 Generated Mnemonic:", mnemonic);

      const wallet = await aptos.deriveAccountFromMnemonic({ mnemonic });
      const privateKeyHex = wallet.privateKeyHex;

      console.log("🔐 Derived privateKeyHex:", privateKeyHex);

      const positionId = "1234"; // Пока фиксированное значение

      // ✅ Отправляем запрос на API /api/joule/lend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/joule/lend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privateKeyHex,
          token: tokenAddress,
          amount: amount.toFixed(6),
          positionId,
        }),
      });

      const data = await response.json();
      console.log("✅ LEND API response:", data);

      return {
        token: tokenAddress,
        amount: amount.toFixed(6),
        transactionHash: data.transactionHash || null,
        error: data.error || null,
      };
    } catch (error) {
      console.error("❌ Error in lendOnJoule:", error);
      return { error: error.message };
    }
  },
});

export default lendOnJoule;
