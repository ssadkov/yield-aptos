import { EchelonClient } from "../../../../echelon-sdk/dist/index.js";
import {
    Aptos,
    AptosConfig,
    Network,
} from "@aptos-labs/ts-sdk";

// Отключаем кэширование для этого API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Функция задержки для избежания лимитов API
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const address = searchParams.get("address");
        
        // 🔍 Логируем заголовки запроса для определения источника
        console.log("🌐 Request headers:");
        console.log("  - User-Agent:", req.headers.get('user-agent') || "NOT SET");
        console.log("  - Origin:", req.headers.get('origin') || "NOT SET");
        console.log("  - Referer:", req.headers.get('referer') || "NOT SET");
        console.log("  - Host:", req.headers.get('host') || "NOT SET");
        
        // 🔍 Логируем переменные окружения для отладки
        console.log("🔧 Environment variables check:");
        console.log("  - APTOS_API_KEY:", process.env.APTOS_API_KEY ? `${process.env.APTOS_API_KEY.substring(0, 8)}...` : "NOT SET");
        console.log("  - NEXT_PUBLIC_API_URL:", process.env.NEXT_PUBLIC_API_URL || "NOT SET");
        console.log("  - NODE_ENV:", process.env.NODE_ENV || "NOT SET");
        
        const aptosConfig = new AptosConfig({ 
            network: Network.MAINNET,
            fullnode: 'https://fullnode.mainnet.aptoslabs.com/v1',
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

        console.log(`🔍 Fetching Echelon positions for ${address}`);
        
        // Получаем кэшированные данные о рынках (включая APR)
        console.log(`📡 Fetching markets data from cache...`);
        const marketsUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/echelon/markets`;
        console.log(`🔗 Markets URL: ${marketsUrl}`);
        const marketsResponse = await fetch(marketsUrl);
        let marketsData = [];
        
        console.log(`📡 Markets response status: ${marketsResponse.status}`);
        if (marketsResponse.ok) {
            const marketsResult = await marketsResponse.json();
            console.log(`📡 Markets response data:`, marketsResult);
            if (marketsResult.success && Array.isArray(marketsResult.marketData)) {
                marketsData = marketsResult.marketData;
                console.log(`✅ Got ${marketsData.length} markets from cache`);
            } else {
                console.log(`❌ Markets response format error:`, marketsResult);
            }
        } else {
            console.log(`❌ Markets fetch failed with status: ${marketsResponse.status}`);
            const errorText = await marketsResponse.text();
            console.log(`❌ Error response:`, errorText);
        }
        
        if (marketsData.length === 0) {
            console.log(`❌ No markets data available, returning error`);
            return new Response(JSON.stringify({ 
                error: "No markets data available",
                debug: {
                    nextPublicApiUrl: process.env.NEXT_PUBLIC_API_KEY ? "SET" : "NOT SET",
                    aptosApiKey: process.env.APTOS_API_KEY ? "SET" : "NOT SET",
                    marketsResponseStatus: marketsResponse.status
                }
            }), {
                status: 500,
                headers: { 
                    "Content-Type": "application/json",
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0"
                }
            });
        }
        
        // Получаем данные по рынкам с задержками
        const userPositions = [];
        const errors = [];
        let processedMarkets = 0;
        
        for (let i = 0; i < marketsData.length; i++) {
            const market = marketsData[i];
            try {
                console.log(`Processing market ${i + 1}/${marketsData.length}: ${market.market}`);
                
                // Добавляем задержку между рынками (20ms)
                if (i > 0) {
                    await delay(20);
                }
                
                // Получаем APR из кэшированных данных
                const supplyApr = market.supplyAPR || 0;
                const borrowApr = market.borrowAPR || 0;
                const coin = market.coin;
                
                const supply = await echelonClient.getAccountSupply(address, market.market);
                
                // Получаем borrow данные
                let borrowed = 0;
                try {
                    borrowed = await echelonClient.getAccountLiability(address, market.market);
                } catch (borrowError) {
                    console.log(`Borrow data error for market ${market.market}:`, borrowError.message);
                    // Не считаем это критической ошибкой, продолжаем
                }
                
                // Добавляем supply позицию, если есть депозиты
                if (supply > 0) {
                    userPositions.push({
                        market: market.market,
                        coin,
                        type: 'supply',
                        amount: supply,
                        apr: supplyApr
                    });
                }
                
                // Добавляем borrow позицию, если есть займы
                if (borrowed > 0) {
                    userPositions.push({
                        market: market.market,
                        coin,
                        type: 'borrow',
                        amount: borrowed,
                        apr: borrowApr
                    });
                }
                
                processedMarkets++;
            } catch (error) {
                errors.push({ market: market.market, message: error?.message || String(error) });
                console.log(`Error processing market ${market.market}:`, error.message);
                // Продолжаем обработку других рынков
            }
        }

        console.log(`✅ Successfully processed ${processedMarkets}/${marketsData.length} markets`);
        console.log(`📊 Found ${userPositions.length} positions for address ${address}`);
        
        if (errors.length > 0) {
            console.warn(`⚠️ ${errors.length} markets failed to load`);
            console.log('Failed markets:', errors.map(e => e.market).join(', '));
        }

        return new Response(JSON.stringify({ 
            userPositions,
            summary: {
                totalMarkets: marketsData.length,
                processedMarkets,
                failedMarkets: errors.length,
                totalPositions: userPositions.length,
                incomplete: errors.length > 0
            },
            errors: errors.length > 0 ? errors : undefined
        }), {
            status: errors.length > 0 ? 206 : 200, // 206 Partial Content если есть ошибки
            headers: { 
                "Content-Type": "application/json",
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
                "X-Processing-Status": errors.length > 0 ? "PARTIAL" : "COMPLETE"
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
