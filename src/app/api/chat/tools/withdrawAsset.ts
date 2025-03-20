import { tool } from "ai";
import { z } from "zod";
import JOULE_TOKENS from "@/app/api/joule/jouleTokens";

export const SUPPORTED_PROTOCOLS = ["Joule", "Echelon"]; // Экспортируем список поддерживаемых протоколов

const withdrawAsset = tool({
  description: "Withdraws an asset from the selected protocol (Joule, Echelon).",
  parameters: z.object({
    protocol: z.string().describe("The protocol to withdraw from (Joule or Echelon)."),
    asset: z.string().describe("The asset name (e.g., USDC, APT, BTC, ETH)."),
    provider: z.string().optional().describe("The provider name (only required if token type is not provided)."),
    amount: z.number().describe("The exact amount of the asset to withdraw."),
    tokenType: z.string().optional().describe("The token type (if already available, provider is not required)."),
  }),
  execute: async ({ protocol, asset, provider, amount, tokenType }) => {
    try {
      console.log("🔍 withdrawAsset request:", { protocol, asset, provider, amount, tokenType });

      let tokenAddress = tokenType;

      if (!tokenAddress) {
        let tokenData;

        if (!provider) throw new Error("❌ Provider is required if token type is not provided.");
        tokenData = JOULE_TOKENS.find((t) => t.assetName === asset && t.provider === provider);
        
        if (!tokenData) throw new Error(`❌ Token not found for ${asset} (${provider}) in ${protocol}`);
        tokenAddress = tokenData.token;
      }

      if (amount <= 0 || isNaN(amount)) throw new Error(`❌ Invalid amount: ${amount}`);

      return {
        protocol,
        token: tokenAddress,
        amount: amount.toFixed(6),
      };
    } catch (error) {
      return { error: error.message };
    }
  },
});

export default withdrawAsset;
