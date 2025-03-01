import { tool } from "ai";
import { z } from "zod";
import JOULE_TOKENS from "@/app/api/joule/jouleTokens";

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

      let tokenAddress = tokenType; // ✅ Если `tokenType` передан, используем его

      if (!tokenAddress) {
        // ✅ Если `tokenType` нет, ищем в JOULE_TOKENS по `asset + provider`
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

      return {
        token: tokenAddress,
        amount: amount.toFixed(6),
      };
    } catch (error) {
      return { error: error.message };
    }
  },
});

export default lendOnJoule;
