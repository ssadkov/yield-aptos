import { EchelonClient } from "@echelonmarket/echelon-sdk";
import {
    Aptos,
    AptosConfig,
    Network,
} from "@aptos-labs/ts-sdk";

// Отключаем кэширование для этого API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const address = searchParams.get("address");
        const aptosConfig = new AptosConfig({ 
            network: Network.MAINNET,
            apiKey: process.env.APTOS_API_KEY 
        });
        const aptos = new Aptos(aptosConfig);
        const echelonClient = new EchelonClient(aptos, "0xc6bc659f1649553c1a3fa05d9727433dc03843baac29473c817d06d39e7621ba"); // Адрес контракта Echelon

        if (!address) {
            return new Response(JSON.stringify({ error: "Address is required" }), {
                status: 400,
                headers: { 
                    "Content-Type": "application/json",
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0"
                }
            });
        }

        // console.log(`🔍 Fetching Echelon positions for ${address}`);
        
        // Получаем список всех рынков
        const markets = await echelonClient.getAllMarkets();
        
        // Получаем данные по рынкам
        const marketData = await Promise.all(
            markets.map(async (market) => {
                try {
                    const supply = await echelonClient.getAccountSupply(address, market);
                    const supplyApr = await echelonClient.getSupplyApr(market);
                    const coin = await echelonClient.getMarketCoin(market);
                    
                    // Получаем borrow данные
                    let borrowed = 0;
                    let borrowApr = 0;
                    try {
                        borrowed = await echelonClient.getAccountLiability(address, market);
                        borrowApr = await echelonClient.getBorrowApr(market);
                    } catch (borrowError) {
                        console.log(`Borrow data error for market ${market}:`, borrowError.message);
                    }
                    
                    const positions = [];
                    
                    // Добавляем supply позицию, если есть депозиты
                    if (supply > 0) {
                        positions.push({
                            market,
                            coin,
                            type: 'supply',
                            amount: supply,
                            apr: supplyApr
                        });
                    }
                    
                    // Добавляем borrow позицию, если есть займы
                    if (borrowed > 0) {
                        positions.push({
                            market,
                            coin,
                            type: 'borrow',
                            amount: borrowed,
                            apr: borrowApr
                        });
                    }
                    
                    return positions;
                } catch (error) {
                    console.log(`Error processing market ${market}:`, error.message);
                    return [];
                }
            })
        );
        
        // Объединяем все позиции в один массив
        const userPositions = marketData.flat().filter(Boolean);

        return new Response(JSON.stringify({ userPositions }), {
            status: 200,
            headers: { 
                "Content-Type": "application/json",
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        });
    } catch (error) {
        console.error("❌ Error fetching Echelon positions:", error);
        return new Response(JSON.stringify({ error: "Failed to fetch positions" }), {
            status: 500,
            headers: { 
                "Content-Type": "application/json",
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        });
    }
}
