import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { EchelonClient } from "../../../../echelon-sdk/src/index";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const address = searchParams.get("address");
        
        // 🔍 Логируем заголовки запроса для определения источника
        console.log("🌐 Request headers:");
        console.log("  - User-Agent:", req.headers.get("user-agent") || "NOT SET");
        console.log("  - Origin:", req.headers.get("origin") || "NOT SET");
        console.log("  - Referer:", req.headers.get("referer") || "NOT SET");
        console.log("  - Host:", req.headers.get("host") || "NOT SET");
        
        // 🔍 Логируем переменные окружения для отладки
        console.log("🔧 Environment variables check:");
        console.log("  - APTOS_API_KEY:", process.env.APTOS_API_KEY ? `${process.env.APTOS_API_KEY.substring(0, 8)}...` : "NOT SET");
        console.log("  - NODE_ENV:", process.env.NODE_ENV || "NOT SET");
        
        if (!address) {
            return new Response(JSON.stringify({ error: "Address parameter is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Создаем Aptos клиент с API ключом
        const aptosConfig = new AptosConfig({ 
            network: Network.MAINNET,
            fullnode: 'https://fullnode.mainnet.aptoslabs.com/v1',
            apiKey: process.env.APTOS_API_KEY
        });
        const aptos = new Aptos(aptosConfig);
        
        // Создаем Echelon клиент
        const echelonClient = new EchelonClient(
            aptos, 
            "0xc6bc659f1649553c1a3fa05d9727433dc03843baac29473c817d06d39e7621ba" // Адрес контракта Echelon
        );

        console.log(`🔍 Fetching user positions for address: ${address}`);
        
        // Получаем все рынки напрямую через SDK
        console.log("📡 Fetching all markets via SDK...");
        const allMarkets = await echelonClient.getAllMarkets();
        console.log(`✅ Got ${allMarkets.length} markets from SDK`);

        const userPositions = [];
        const errors = [];
        let processedMarkets = 0;
        let failedMarkets = 0;

        // Обрабатываем каждый рынок
        for (let i = 0; i < allMarkets.length; i++) {
            const market = allMarkets[i];
            console.log(`Processing market ${i + 1}/${allMarkets.length}: ${market}`);
            
            try {
                // Получаем APR для рынка
                const supplyAPR = await echelonClient.getSupplyApr(market);
                const borrowAPR = await echelonClient.getBorrowApr(market);

                // Получаем позиции пользователя
                const supply = await echelonClient.getAccountSupply(address, market);
                const liability = await echelonClient.getAccountLiability(address, market);

                // Получаем информацию о монете
                let coinInfo;
                try {
                    coinInfo = await echelonClient.getMarketCoin(market);
                } catch (e) {
                    coinInfo = "Unknown";
                }

                // Добавляем позиции если они есть
                if (supply > 0) {
                    userPositions.push({
                        market,
                        coin: coinInfo,
                        type: "supply",
                        amount: supply,
                        apr: supplyAPR
                    });
                }

                if (liability > 0) {
                    userPositions.push({
                        market,
                        coin: coinInfo,
                        type: "borrow",
                        amount: liability,
                        apr: borrowAPR
                    });
                }

                processedMarkets++;
                
            } catch (error) {
                console.error(`❌ Error processing market ${market}:`, error.message);
                errors.push({
                    market,
                    message: error.message
                });
                failedMarkets++;
            }
        }

        console.log(`✅ Successfully processed ${processedMarkets}/${allMarkets.length} markets`);
        console.log(`📊 Found ${userPositions.length} positions for address ${address}`);

        const response = {
            userPositions,
            summary: {
                totalMarkets: allMarkets.length,
                processedMarkets,
                failedMarkets,
                totalPositions: userPositions.length,
                incomplete: failedMarkets > 0
            }
        };

        if (errors.length > 0) {
            response.errors = errors;
        }

        return new Response(JSON.stringify(response), {
            status: 200,
            headers: { 
                "Content-Type": "application/json",
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        });

    } catch (error) {
        console.error("❌ Error in userPositionsDirect API:", error);
        return new Response(JSON.stringify({ 
            error: error.message,
            debug: {
                aptosApiKey: process.env.APTOS_API_KEY ? "SET" : "NOT SET",
                nodeEnv: process.env.NODE_ENV || "NOT SET"
            }
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
} 