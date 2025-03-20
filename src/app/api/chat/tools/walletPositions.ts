import { tool } from "ai";
import { z } from "zod";

const walletPositions = tool({
  description:
    "Fetches the wallet balances and positions for a specific Aptos wallet address.",
  parameters: z.object({
    address: z.string().describe(
      "The Aptos wallet address to fetch balances and positions for."
    ),
  }),
  execute: async ({ address }) => {
    try {
      // Формируем URL для запроса балансов и позиций
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/aptos/balances?address=${encodeURIComponent(address)}`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch wallet data: ${response.statusText}`);
      }
      
      const { balances, positions } = await response.json();
      
      if ((!balances || balances.length === 0) && (!positions || positions.length === 0)) {
        return { message: `No balances or positions found for wallet: ${address}` };
      }
      
      // Обрабатываем данные перед выводом
      const walletData = [...balances.map(balance => ({
        asset: balance.asset,
        provider: balance.provider,
        token: balance.token,
        balance: isNaN(parseFloat(balance.balance)) ? "0" : parseFloat(balance.balance).toFixed(10), // ✅ Исправлено
        protocol: "-",
        market: "-",
        supplyApr: "-",
      })),
      ...positions.map(position => ({
        asset: position.asset,
        provider: position.provider,
        token: position.token,
        balance: isNaN(parseFloat(position.amount)) ? "0" : parseFloat(position.amount).toFixed(10), // ✅ Исправлено
        protocol: position.protocol,
        market: position.market || "-",
        supplyApr: `${position.supplyApr}%`,
      }))];
      console.log("📊 Итоговые данные для таблицы:", walletData);

      return {
        table: walletData,
        link: `🔗 More details here: [Aptos Explorer](https://explorer.aptoslabs.com/account/${address})`,
      };
    } catch (error) {
      return { error: error.message };
    }
  },
});

export default walletPositions;