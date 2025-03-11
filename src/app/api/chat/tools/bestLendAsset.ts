import { tool } from "ai";
import { z } from "zod";
import getPools from "./getPools"; // Подключаем getPools, который делает запрос к рынкам


const bestLend = tool({
  description: "Lend an asset to the best available pool on the selected protocol.",
  parameters: z.object({
    asset: z.string().describe("The asset to stake (e.g., USDT, USDC, BTC, ETH, APT)."),
    amount: z.number().describe("The amount of the asset to lend (or use the entire wallet balance)."),
  }),
  execute: async ({ asset, amount }) => {
    try {
      console.log("🔍 bestLend request:", { asset, amount });

      // Проверяем, является ли актив одним из стейблкоинов
      const stablecoins = ["USDT", "USDC"]; // Конкретные стейблкоины
      const stablecoinKeywords = ["USD", "stablecoins", "stables", "dollars"]; // Общие названия для стейблкоинов

      // Если актив — это один из конкретных стейблкоинов (например, USDT, USDC), то ищем по нему
      const searchAsset = stablecoins.includes(asset) 
        ? asset
        // Если актив соответствует одному из общих стейблкоинов (USD, stablecoins, stables, dollars)
        : stablecoinKeywords.some(keyword => asset.toLowerCase().includes(keyword.toLowerCase())) 
        ? "USD"
        : asset;

      // Запрашиваем лучшие пулы для выбранного актива
      const poolsResponse = await getPools.execute({ asset: searchAsset }, { toolCallId: "bestLend", messages: [] });

      if (poolsResponse.error) {
        throw new Error(poolsResponse.error);
      }

      const bestPool = poolsResponse.table ? poolsResponse.table[0] : null;

      if (!bestPool) {
        throw new Error(`❌ No pool found for asset: ${asset}`);
      }

      // Возвращаем результаты
      return {
        protocol: bestPool.protocol,
        apr: bestPool.totalAPY,
        asset: bestPool.asset, // Мы показываем только провайдера пула, без ссылки на пул
        token: bestPool.token,
        amount: amount.toFixed(6), // Количество стейкнутого актива
      };
    } catch (error) {
      return { error: error.message };
    }
  },
});

export default bestLend;
