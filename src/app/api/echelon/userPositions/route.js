import { EchelonClient } from "@echelonmarket/echelon-sdk";
import {
    Aptos,
    AptosConfig,
    Network,
} from "@aptos-labs/ts-sdk";

const aptosConfig = new AptosConfig({ network: Network.MAINNET });
const aptos = new Aptos(aptosConfig);
const echelonClient = new EchelonClient(aptos, "0xc6bc659f1649553c1a3fa05d9727433dc03843baac29473c817d06d39e7621ba"); // Адрес контракта Echelon

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address) {
        return new Response(JSON.stringify({ error: "Address is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        console.log(`🔍 Fetching Echelon positions for ${address}`);
        
        // Получаем список всех рынков
        const markets = await echelonClient.getAllMarkets();
        
        // Получаем данные по рынкам
        const marketData = await Promise.all(
            markets.map(async (market) => {
                const supply = await echelonClient.getAccountSupply(address, market);
                const supplyApr = await echelonClient.getSupplyApr(market);
                const coin = await echelonClient.getMarketCoin(market);
                return supply > 0 ? { market, coin, supply, supplyApr } : null;
            })
        );
        
        const userPositions = marketData.filter(Boolean);

        return new Response(JSON.stringify({ userPositions }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error("❌ Error fetching Echelon positions:", error);
        return new Response(JSON.stringify({ error: "Failed to fetch positions" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
