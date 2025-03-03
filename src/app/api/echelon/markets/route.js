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
    // Выводим список всех функций EchelonClient
    console.log("Available methods:", Object.keys(Object.getPrototypeOf(client)));

    // Массив для хранения информации о каждом рынке
    const marketData = [];

    // Проходим по каждому marketId и получаем coin и APR
    for (const market of markets) {
      const coin = await client.getMarketCoin(market); // Получаем coin
      const apr = await client.getSupplyApr(market); // Получаем Supply APR
      const bapr = await client.getBorrowApr(market); // Получаем Borrow APR

      marketData.push({
        market,
        coin,
        supplyAPR: apr,
        borrowAPR: bapr,
      });
    }

    return NextResponse.json({ success: true, marketData });
  } catch (error) {
    console.error("Error fetching market data:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
