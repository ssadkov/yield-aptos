import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
    tools: {
      createAptosWallet: tool({
        description: 'Creates a new Aptos wallet using an API.',
        parameters: z.object({}),
        execute: async () => {
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/aptos/createWallet`, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
            });

            if (!response.ok) {
              throw new Error('Failed to create Aptos wallet');
            }

            const walletData = await response.json();

            // Ensure all necessary data is returned
            return {
              address: walletData.address,
              privateKeyHex: walletData.privateKeyHex,
              mnemonic: walletData.mnemonic,
            };
          } catch (error) {
            return { error: error.message };
          }
        },
      }),

      getJoulePools: tool({
        description: 'Fetches the yield farming pools (lending) for a specific asset from Joule Finance.',
        parameters: z.object({
          asset: z.string().describe('The asset name (e.g., USD, APT, BTC, ETH) to fetch yield pools for'),
        }),
        execute: async ({ asset }) => {
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/joule/pools`, {
              method: 'GET',
              headers: { 'Accept': 'application/json' },
            });

            if (!response.ok) {
              throw new Error(`Failed to fetch Joule pools: ${response.statusText}`);
            }

            const pools = await response.json();

            // Фильтруем по активу
            const filteredPools = pools.filter((pool: any) => 
              pool.asset.assetName.toUpperCase().includes(asset.toUpperCase())
            );

            if (filteredPools.length === 0) {
              return { message: `No pools found for asset: ${asset}` };
            }

            // Формируем таблицу данных
            const poolData = filteredPools.map((pool: any) => ({
              asset: pool.asset.assetName,
              provider: pool.asset.provider,
              totalAPY: (parseFloat(pool.depositApy) + parseFloat(pool.extraAPY.depositAPY)).toFixed(2) + "%",
              depositApy: pool.depositApy + "%",
              extraAPY: pool.extraAPY.depositAPY + "%",
            }));

            // Сортируем по total APY (по убыванию)
            poolData.sort((a, b) => parseFloat(b.totalAPY) - parseFloat(a.totalAPY));

            return {
              table: poolData,
              link: "🔗 More details: [Joule Finance](https://app.joule.finance/market)",
            };

          } catch (error) {
            return { error: error.message };
          }
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}
