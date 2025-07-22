import { NextResponse } from "next/server";
import { EchelonClient } from "../../../../echelon-sdk/dist/index.js";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

// Кэшируем данные о рынках на 10 минут (600 секунд)
export const revalidate = 600;

// Функция задержки для избежания лимитов API
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Исправленный конфиг: fullnode без api_key, ключ отдельным параметром
const aptos = new Aptos(
  new AptosConfig({
    network: Network.MAINNET,
    fullnode: 'https://fullnode.mainnet.aptoslabs.com/v1',
    apiKey: process.env.APTOS_API_KEY
  })
);

// Инициализируем EchelonClient с контрактным адресом
const client = new EchelonClient(
  aptos,
  process.env.ECHELON_CONTRACT_ADDRESS // Деплойнутый контракт Echelon
);

// Простое кэширование в памяти для dev режима
let cacheData = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 600000; // 10 минут в миллисекундах

export async function GET(req) {
  const startTime = Date.now();
  const cacheKey = `echelon-markets-${Math.floor(Date.now() / (600 * 1000))}`; // Ключ кэша на 10 минут
  const isDev = process.env.NODE_ENV === 'development';
  
  console.log(`🔄 [${new Date().toISOString()}] Echelon Markets API called`);
  console.log(`📦 Cache key: ${cacheKey}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV}`);
  
  // 🔍 Логируем заголовки запроса для определения источника
  console.log("🌐 Request headers:");
  console.log("  - User-Agent:", req.headers.get('user-agent') || "NOT SET");
  console.log("  - Origin:", req.headers.get('origin') || "NOT SET");
  console.log("  - Referer:", req.headers.get('referer') || "NOT SET");
  console.log("  - Host:", req.headers.get('host') || "NOT SET");
  
  // 🔍 Логируем переменные окружения для отладки
  console.log("🔧 Environment variables check:");
  console.log("  - APTOS_API_KEY:", process.env.APTOS_API_KEY ? `${process.env.APTOS_API_KEY.substring(0, 8)}...` : "NOT SET");
  console.log("  - ECHELON_CONTRACT_ADDRESS:", process.env.ECHELON_CONTRACT_ADDRESS || "NOT SET");
  
  // Проверяем кэш в dev режиме
  if (isDev && cacheData && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
    console.log(`💾 Returning cached data (dev mode)`);
    console.log(`⏱️ Cache age: ${Math.round((Date.now() - cacheTimestamp) / 1000)}s`);
    
    return NextResponse.json({ 
      success: true, 
      marketData: cacheData,
      cacheInfo: {
        key: cacheKey,
        cachedUntil: new Date(cacheTimestamp + CACHE_DURATION).toISOString(),
        processingTime: 0,
        marketsCount: cacheData.length,
        fromCache: true
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
        'ETag': `"${cacheKey}"`,
        'X-Cache-Status': 'HIT',
        'X-Processing-Time': '0'
      }
    });
  }
  
  try {
    // Получаем список всех рынков
    console.log(`🔍 Fetching markets from blockchain...`);
    const markets = await client.getAllMarkets();
    console.log(`✅ Found ${markets.length} markets`);
    console.log("=== ALL MARKETS ===");
    console.log(JSON.stringify(markets, null, 2));

    // Получаем данные по всем рынкам с задержками
    const marketData = [];
    let hadError = false;
    const errors = [];
    for (let i = 0; i < markets.length; i++) {
      const market = markets[i];
      try {
        console.log(`\n=== Processing Market ${i + 1}/${markets.length}: ${market} ===`);
        
        // Добавляем задержку между рынками (100ms)
        if (i > 0) {
          await delay(100);
        }
        
        // Параллельно получаем все данные для одного рынка
        const [coin, apr, bapr] = await Promise.all([
          client.getMarketCoin(market),
          client.getSupplyApr(market),
          client.getBorrowApr(market)
        ]);
        
        console.log("Market Coin:", JSON.stringify(coin, null, 2));
        console.log("Supply APR:", JSON.stringify(apr, null, 2));
        console.log("Borrow APR:", JSON.stringify(bapr, null, 2));

        const marketInfo = {
          market,
          coin,
          supplyAPR: apr,
          borrowAPR: bapr,
        };
        
        console.log("Combined Market Info:", JSON.stringify(marketInfo, null, 2));
        marketData.push(marketInfo);
      } catch (error) {
        hadError = true;
        errors.push({ market, message: error?.message || String(error) });
        console.error(`Error processing market ${market}:`, error.message);
        // Продолжаем обработку других рынков
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`\n=== FINAL MARKET DATA ===`);
    console.log(`⏱️ Total processing time: ${duration}ms`);
    console.log(`📊 Processed ${marketData.length} markets successfully`);
    console.log(`💾 Data will be cached for 10 minutes (until ${new Date(Date.now() + 600000).toISOString()})`);
    console.log(JSON.stringify(marketData, null, 2));

    if (hadError) {
      // Не обновляем кэш, возвращаем ошибку и частичные данные
      console.warn('⚠️ Not all markets loaded, cache NOT updated!');
      return NextResponse.json({
        success: false,
        incomplete: true,
        error: 'Some markets failed to load, cache not updated',
        errors,
        marketData,
        cacheInfo: {
          key: cacheKey,
          cachedUntil: null,
          processingTime: duration,
          marketsCount: marketData.length,
          fromCache: false
        }
      }, {
        status: 502,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Cache-Status': 'ERROR',
          'X-Processing-Time': duration.toString()
        }
      });
    }

    // Сохраняем в кэш для dev режима
    if (isDev) {
      cacheData = marketData;
      cacheTimestamp = Date.now();
      console.log(`💾 Data cached in memory (dev mode)`);
    }

    return NextResponse.json({ 
      success: true, 
      marketData,
      cacheInfo: {
        key: cacheKey,
        cachedUntil: new Date(Date.now() + 600000).toISOString(),
        processingTime: duration,
        marketsCount: marketData.length,
        fromCache: false
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
        'ETag': `"${cacheKey}"`,
        'X-Cache-Status': 'MISS', // Показываем, что данные загружены заново
        'X-Processing-Time': duration.toString()
      }
    });
  } catch (error) {
    console.error("Error fetching market data:", error);
    return NextResponse.json({ success: false, error: error.message }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}
