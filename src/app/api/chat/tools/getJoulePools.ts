import { tool } from "ai";
import { z } from "zod";

const getJoulePools = tool({
  description:
    "Fetches the yield farming pools (lending) for a specific asset from Joule Finance.",
  parameters: z.object({
    asset: z.string().describe(
      "The asset name (e.g., USD, APT, BTC, ETH) to fetch yield pools for"
    ),
  }),
  execute: async ({ asset }) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/joule/pools`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch Joule pools: ${response.statusText}`);
      }

      const pools = await response.json();

      const filteredPools = pools.filter((pool: any) =>
        pool.asset.assetName.toUpperCase().includes(asset.toUpperCase())
      );

      if (filteredPools.length === 0) {
        return { message: `No pools found for asset: ${asset}` };
      }

      const poolData = filteredPools.map((pool: any) => ({
        asset: pool.asset.assetName,
        provider: pool.asset.provider,
        totalAPY:
          (parseFloat(pool.depositApy) + parseFloat(pool.extraAPY.depositAPY)).toFixed(2) + "%",
        depositApy: pool.depositApy + "%",
        extraAPY: pool.extraAPY.depositAPY + "%",
      }));

      poolData.sort((a, b) => parseFloat(b.totalAPY) - parseFloat(a.totalAPY));

      return {
        table: poolData,
        link: "🔗 More details: [Joule Finance](https://app.joule.finance/market)",
      };
    } catch (error) {
      return { error: error.message };
    }
  },
});

export default getJoulePools;
