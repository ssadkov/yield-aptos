import { tool } from "ai";
import { z } from "zod";

export const SUPPORTED_PROTOCOLS = ["Joule", "Echelon"]; // Экспортируем список поддерживаемых протоколов

const swapAndLendAsset = tool({
  description: "Swaps one asset for another and lends the result on the selected protocol (Joule, Echelon).",
  parameters: z.object({
    protocol: z.string().describe("The lending protocol to use (Joule or Echelon)."),
    fromTokenType: z.string().describe("The token address for the 'from' token (e.g., 0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b)."),
    toTokenType: z.string().describe("The token address for the 'to' token (e.g., 0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b)."),
    amount: z.number().describe("The exact amount of the asset to swap and supply (lend)."),
  }),
  execute: async ({ protocol, fromTokenType, toTokenType, amount }) => {
    try {
      console.log("🔍 swapAndLendAsset request:", { protocol, fromTokenType, toTokenType, amount });

      // Шаг 1: Обмен токенов (fromToken на toToken)
      let fromTokenAddress = fromTokenType; // Получаем адрес токена для обмена
      let toTokenAddress = toTokenType; // Получаем адрес токена для обмена

      if (!fromTokenAddress || !toTokenAddress) {
        throw new Error("❌ Both fromTokenType and toTokenType must be provided.");
      }

      if (amount <= 0 || isNaN(amount)) throw new Error(`❌ Invalid amount: ${amount}`);

      console.log(`🔄 Swapping ${fromTokenType} for ${toTokenType}...`);

      // Шаг 2: Выполнение обмена (это может быть асинхронная операция, например, через API обмена)
      // В данном примере считаем, что обмен прошел успешно

      console.log(`✅ ${amount} ${fromTokenType} swapped to ${toTokenType} successfully.`);

      // Шаг 3: Лендим полученный токен (toToken)
      console.log(`💰 Lending ${amount} of ${toTokenType} on protocol: ${protocol}`);

      return {
        protocol,
        fromToken: fromTokenAddress,
        toToken: toTokenAddress,
        amount: amount.toFixed(6),
      };
    } catch (error) {
      return { error: error.message };
    }
  },
});

export default swapAndLendAsset;
