import { tool } from "ai";
import { z } from "zod";

const getPools = tool({
  description:
    "Fetches the yield farming pools (lending) for a specific asset from the Aptos markets API.",
  parameters: z.object({
    asset: z.string().describe(
      "The asset name (e.g., USD, APT, BTC, ETH) to fetch yield pools for"
    ),
  }),
  execute: async ({ asset }) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/aptos/markets?asset=${encodeURIComponent(asset)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch pools: ${response.statusText}`);
      }

      const pools = await response.json();

      // Проверяем, есть ли в ответе массив данных
      if (!pools || !Array.isArray(pools.data) || pools.data.length === 0) {
        return { message: `No pools found for asset: ${asset}` };
      }

      const poolData = pools.data.map((pool) => ({
        asset: pool.asset,
        provider: pool.provider,
        totalAPY: pool.totalAPY.toFixed(2) + "%",
        token: pool.token,
        protocol: pool.protocol, // ✅ Добавляем протокол
      }));

      poolData.sort((a, b) => parseFloat(b.totalAPY) - parseFloat(a.totalAPY));

      // console.log("🔍 Pools Data:", JSON.stringify(poolData, null, 2));

      return {
        table: poolData,
        link: "🔗 More details here: [Aptos Markets](https://app.aptos.markets)",
      };
    } catch (error) {
      return { error: error.message };
    }
  },
});

export default getPools;
