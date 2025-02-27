import { tool } from "ai";
import { z } from "zod";
import JOULE_TOKENS from "@/app/api/joule/jouleTokens";

const lendOnJoule = tool({
  description:
    "Determines the token and validates the amount for lending on Joule Finance.",
  parameters: z.object({
    asset: z.string().describe("The asset name (e.g., USDC, APT, BTC, ETH)."),
    provider: z
      .string()
      .describe("The provider name (e.g., Tether, Circle USDC, LayerZero USDT)."),
    amount: z.number().describe("The exact amount of the asset to lend."),
  }),
  execute: async ({ asset, provider, amount }) => {
    try {
      console.log("🔍 lendOnJoule request:", { asset, provider, amount });

      const tokenData = JOULE_TOKENS.find(
        (t) => t.assetName === asset && t.provider === provider
      );

      if (!tokenData) {
        throw new Error(`❌ Token not found for ${asset} (${provider})`);
      }

      if (amount <= 0 || isNaN(amount)) {
        throw new Error(`❌ Invalid amount: ${amount}`);
      }

      return {
        token: tokenData.token,
        amount: amount.toFixed(6),
      };
    } catch (error) {
      return { error: error.message };
    }
  },
});

export default lendOnJoule;
