import { NextResponse } from "next/server";
import { AptosClient } from "aptos";
import { AriesSDK } from "@aries-markets/tssdk";

const aptosClient = new AptosClient(process.env.APTOS_RPC_URL);
const sdk = new AriesSDK(aptosClient);

export async function GET() {
  try {
    // Получаем список резервов (монет)
    const reservesWrapper = await sdk.getReserves();
    const reserveList = reservesWrapper.getList();

    // Создаём массив с полной информацией о каждом рынке
    const marketData = await Promise.all(
      reserveList.map(async (reserve) => {
        const coinAddress = reserve.coinAddress;

        return {
          coinAddress,
          reserve: reservesWrapper.getReserve(coinAddress),
          interestConfig: reservesWrapper.getInterestConfig(coinAddress),
          reserveConfig: reservesWrapper.getReserveConfig(coinAddress),
          totalAsset: reservesWrapper.getTotalAsset(coinAddress),
          borrowed: reservesWrapper.getBorrowed(coinAddress),
          borrowAPR: reservesWrapper.getBorrowApy(coinAddress),
          depositAPR: reservesWrapper.getDepositApy(coinAddress),
        };
      })
    );

    return NextResponse.json({ success: true, marketData });
  } catch (error) {
    console.error("Error fetching Aries market data:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
