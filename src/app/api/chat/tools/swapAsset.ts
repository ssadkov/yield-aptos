import { tool } from "ai";
import { z } from "zod";

const swapAsset = tool({
  description: "Formats asset swap request for further processing without additional validation.",
  parameters: z.object({
    fromAsset: z.string().describe("The asset to swap from (e.g., USDT, APT, BTC, ETH)."),
    fromProvider: z.string().optional().default("").describe("The provider of the 'from' asset (e.g., LayerZero, Circle, Tether)."),
    fromTokenType: z.string().optional().default("").describe("The token type or address of the 'from' asset."),
    toAsset: z.string().describe("The asset to swap to (e.g., USDC, MOD, APT, BTC)."),
    toProvider: z.string().optional().default("").describe("The provider of the 'to' asset."),
    toTokenType: z.string().optional().default("").describe("The token type or address of the 'to' asset."),
    amount: z.union([z.string(), z.number()]).describe(
      "The amount to swap. Can be an exact number or percentage (e.g., '100%' for full swap)."
    ),
  }),
  execute: async ({ fromAsset, fromProvider, fromTokenType, toAsset, toProvider, toTokenType, amount }) => {
    console.log("🔄 Swap request received:", { fromAsset, fromProvider, fromTokenType, toAsset, toProvider, toTokenType, amount });
    
    // Возвращаем данные в неизменном виде без валидации и дополнительных запросов
    return {
      fromAsset,
      fromProvider: fromProvider || "", // Если не указано, передаём пустую строку
      fromTokenType: fromTokenType || "",
      toAsset,
      toProvider: toProvider || "",
      toTokenType: toTokenType || "",
      amount,
    };
  },
});

export default swapAsset;
