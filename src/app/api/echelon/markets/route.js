import { NextResponse } from "next/server";
import { EchelonClient } from "@echelonmarket/echelon-sdk";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

// Создаём экземпляр Aptos SDK
const aptos = new Aptos(
  new AptosConfig({
    network: Network.MAINNET, // Используем основную сеть Aptos
    fullnode: process.env.APTOS_RPC_URL, // RPC-эндпоинт берём из .env
  })
);

// Инициализируем EchelonClient с контрактным адресом
const client = new EchelonClient(
  aptos,
  process.env.ECHELON_CONTRACT_ADDRESS // Деплойнутый контракт Echelon
);

export async function GET() {
  try {
    // Получаем список всех рынков
    const markets = await client.getAllMarkets();
    console.log("=== ALL MARKETS ===");
    console.log(JSON.stringify(markets, null, 2));

    // Массив для хранения информации о каждом рынке
    const marketData = [];

    // Проходим по каждому marketId и получаем coin и APR
    for (const market of markets) {
      console.log(`\n=== Processing Market: ${market} ===`);
      
      const coin = await client.getMarketCoin(market);
      console.log("Market Coin:", JSON.stringify(coin, null, 2));
      
      const apr = await client.getSupplyApr(market);
      console.log("Supply APR:", JSON.stringify(apr, null, 2));
      
      const bapr = await client.getBorrowApr(market);
      console.log("Borrow APR:", JSON.stringify(bapr, null, 2));

      const marketInfo = {
        market,
        coin,
        supplyAPR: apr,
        borrowAPR: bapr,
      };
      
      console.log("Combined Market Info:", JSON.stringify(marketInfo, null, 2));
      marketData.push(marketInfo);
    }

    console.log("\n=== FINAL MARKET DATA ===");
    console.log(JSON.stringify(marketData, null, 2));

    return NextResponse.json({ success: true, marketData });
  } catch (error) {
    console.error("Error fetching market data:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
