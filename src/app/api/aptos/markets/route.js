import { NextResponse } from "next/server";
import JOULE_TOKENS from "@/app/api/joule/jouleTokens";

// Кэшируем объединенные данные о рынках на 2 минуты (120 секунд)
export const revalidate = 120;

// Простое кэширование в памяти для dev режима
let cacheData = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 120000; // 2 минуты в миллисекундах

export async function GET(req) {
  const startTime = Date.now();
  const cacheKey = `aptos-markets-${Math.floor(Date.now() / (120 * 1000))}`; // Ключ кэша на 2 минуты
  const isDev = process.env.NODE_ENV === 'development';
  
  console.log(`🔄 [${new Date().toISOString()}] Aptos Markets API called`);
  console.log(`📦 Cache key: ${cacheKey}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV}`);
  
  // Проверяем кэш в dev режиме
  if (isDev && cacheData && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
    console.log(`💾 Returning cached data (dev mode)`);
    console.log(`⏱️ Cache age: ${Math.round((Date.now() - cacheTimestamp) / 1000)}s`);
    
    return NextResponse.json({ 
      success: true, 
      ...cacheData,
      cacheInfo: {
        key: cacheKey,
        cachedUntil: new Date(cacheTimestamp + CACHE_DURATION).toISOString(),
        processingTime: 0,
        totalPools: cacheData.data.length,
        fromCache: true
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
        'ETag': `"${cacheKey}"`,
        'X-Cache-Status': 'HIT',
        'X-Processing-Time': '0'
      }
    });
  }
  
  try {
    const { searchParams } = new URL(req.url);
    const assetName = searchParams.get("asset");
    const protocol = searchParams.get("protocol");

    console.log(`🔍 Fetching data from all protocols...`);

    let combinedPools = [];
    let protocolStatus = { Joule: 0, Echelon: 0, Aries: 0, Hyperion: 0 };
    const errors = [];

    // 🟢 Joule API
    try {
      console.log(`📡 Fetching Joule data...`);
      const jouleResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/joule/pools`);
      if (jouleResponse.ok) {
        let joulePools = await jouleResponse.json();
        if (Array.isArray(joulePools) && joulePools.length > 0) {
          protocolStatus.Joule = 1;
          joulePools = joulePools
            .filter(pool => pool && pool.asset && pool.asset.assetName)
            .map((pool) => ({
              asset: pool.asset.assetName || "Unknown",
              provider: pool.asset.provider || "Unknown",
              totalAPY: (parseFloat(pool.depositApy) || 0) + 
                       (parseFloat(pool.extraAPY?.depositAPY) || 0) + 
                       (parseFloat(pool.extraAPY?.stakingAPY) || 0),
              depositApy: parseFloat(pool.depositApy) || 0,
              extraAPY: parseFloat(pool.extraAPY?.depositAPY) || 0,
              borrowAPY: parseFloat(pool.borrowApy) || 0,
              extraBorrowAPY: parseFloat(pool.extraAPY?.borrowAPY) || 0,
              extraStakingAPY: parseFloat(pool.extraAPY?.stakingAPY) || 0,
              token: pool.asset.type || "Unknown",
              protocol: "Joule",
            }));
          combinedPools.push(...joulePools);
          console.log(`✅ Joule: ${joulePools.length} pools`);
        } else {
          errors.push({ protocol: 'Joule', message: 'No pools returned' });
        }
      } else {
        errors.push({ protocol: 'Joule', message: `HTTP ${jouleResponse.status}` });
      }
    } catch (error) {
      errors.push({ protocol: 'Joule', message: error?.message || String(error) });
      console.error("❌ Joule API error:", error.message);
    }

    // 🔵 Echelon API
    try {
      console.log(`📡 Fetching Echelon data...`);
      const echelonResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/echelon/markets`);
      if (echelonResponse.ok) {
        let echelonData = await echelonResponse.json();
        if (echelonData?.success && Array.isArray(echelonData.marketData) && echelonData.marketData.length > 0) {
          protocolStatus.Echelon = 1;
          const echelonPools = echelonData.marketData
            .filter(market => market && market.coin)
            .map((market) => {
              const tokenData = JOULE_TOKENS.find((t) => t.token === market.coin);
              return {
                asset: tokenData?.assetName || market.coin || "Unknown",
                provider: tokenData?.provider || "Unknown",
                totalAPY: (parseFloat(market.supplyAPR) * 100) || 0,
                depositApy: (parseFloat(market.supplyAPR) * 100) || 0,
                extraAPY: 0,
                borrowAPY: (parseFloat(market.borrowAPR) * 100) || 0,
                extraBorrowAPY: 0,
                extraStakingAPY: 0,
                token: market.coin || "Unknown",
                protocol: "Echelon",
              };
            });
          combinedPools.push(...echelonPools);
          console.log(`✅ Echelon: ${echelonPools.length} markets`);
        } else {
          errors.push({ protocol: 'Echelon', message: 'No markets returned or error in Echelon API', details: echelonData?.error });
        }
      } else {
        errors.push({ protocol: 'Echelon', message: `HTTP ${echelonResponse.status}` });
      }
    } catch (error) {
      errors.push({ protocol: 'Echelon', message: error?.message || String(error) });
      console.error("❌ Echelon API error:", error.message);
    }

    // 🟣 Aries API
    try {
      console.log(`📡 Fetching Aries data...`);
      const ariesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/aries/markets`);
      if (ariesResponse.ok) {
        const ariesData = await ariesResponse.json();
        if (ariesData?.success && Array.isArray(ariesData.marketData) && ariesData.marketData.length > 0) {
          protocolStatus.Aries = 1;
          const ariesPools = ariesData.marketData
            .filter(item => item && item.coinAddress)
            .map((item) => ({
              asset: item.coinAddress?.split("::")[2] || item.coinAddress || "Unknown",
              provider: "Aries",
              totalAPY: (parseFloat(item.depositAPR) * 100) || 0,
              depositApy: (parseFloat(item.depositAPR) * 100) || 0,
              extraAPY: 0,
              borrowAPY: (parseFloat(item.borrowAPR) * 100) || 0,
              extraBorrowAPY: 0,
              extraStakingAPY: 0,
              token: item.coinAddress || "Unknown",
              protocol: "Aries",
            }));
          combinedPools.push(...ariesPools);
          console.log(`✅ Aries: ${ariesPools.length} markets`);
        } else {
          errors.push({ protocol: 'Aries', message: 'No markets returned or error in Aries API', details: ariesData?.error });
        }
      } else {
        errors.push({ protocol: 'Aries', message: `HTTP ${ariesResponse.status}` });
      }
    } catch (error) {
      errors.push({ protocol: 'Aries', message: error?.message || String(error) });
      console.error("❌ Aries API error:", error.message);
    }

    // 🔶 Hyperion API
    try {
      console.log(`📡 Fetching Hyperion data...`);
      const hyperionResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hyperion/pools`);
      if (hyperionResponse.ok) {
        const hyperionData = await hyperionResponse.json();
        if (hyperionData?.success && Array.isArray(hyperionData.data) && hyperionData.data.length > 0) {
          protocolStatus.Hyperion = 1;
          const hyperionPools = hyperionData.data
            .filter(pool => pool && pool.asset)
            .map(pool => ({
              asset: pool.asset || "Unknown",
              provider: pool.provider || "Unknown",
              totalAPY: parseFloat(pool.totalAPY) || 0,
              depositApy: parseFloat(pool.depositApy) || 0,
              extraAPY: parseFloat(pool.extraAPY) || 0,
              borrowAPY: parseFloat(pool.borrowAPY) || 0,
              extraBorrowAPY: parseFloat(pool.extraBorrowAPY) || 0,
              extraStakingAPY: parseFloat(pool.extraStakingAPY) || 0,
              token: pool.token || "Unknown",
              protocol: "Hyperion",
            }));
          combinedPools.push(...hyperionPools);
          console.log(`✅ Hyperion: ${hyperionPools.length} pools`);
        } else {
          errors.push({ protocol: 'Hyperion', message: 'No pools returned or error in Hyperion API', details: hyperionData?.error });
        }
      } else {
        errors.push({ protocol: 'Hyperion', message: `HTTP ${hyperionResponse.status}` });
      }
    } catch (error) {
      errors.push({ protocol: 'Hyperion', message: error?.message || String(error) });
      console.error("❌ Hyperion API error:", error.message);
    }

    if (combinedPools.length === 0) {
      return NextResponse.json({ error: "Все API недоступны", protocols: protocolStatus, errors }, { status: 500 });
    }

    if (assetName) {
      combinedPools = combinedPools.filter((pool) => {
        if (!pool || !pool.asset || !pool.token) return false;
        const poolAsset = (pool.asset || "").toUpperCase();
        const poolToken = (pool.token || "").toUpperCase();
        const searchAsset = assetName.toUpperCase();
        return poolAsset.includes(searchAsset) || poolToken.includes(searchAsset);
      });
    }

    if (protocol) {
      combinedPools = combinedPools.filter((pool) => {
        if (!pool || !pool.protocol) return false;
        return (pool.protocol || "").toUpperCase() === protocol.toUpperCase();
      });
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`\n=== FINAL COMBINED DATA ===`);
    console.log(`⏱️ Total processing time: ${duration}ms`);
    console.log(`📊 Total pools: ${combinedPools.length}`);
    console.log(`🔧 Protocols status:`, protocolStatus);
    console.log(`💾 Data will be cached for 2 minutes (until ${new Date(Date.now() + 120000).toISOString()})`);

    // Если есть ошибки — не кэшируем, возвращаем ошибку и частичные данные
    if (errors.length > 0) {
      console.warn('⚠️ Not all protocols loaded, cache NOT updated!');
      return NextResponse.json({
        success: false,
        incomplete: true,
        error: 'Some protocols failed to load, cache not updated',
        errors,
        protocols: protocolStatus,
        data: combinedPools,
        cacheInfo: {
          key: cacheKey,
          cachedUntil: null,
          processingTime: duration,
          totalPools: combinedPools.length,
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
      cacheData = { protocols: protocolStatus, data: combinedPools };
      cacheTimestamp = Date.now();
      console.log(`💾 Data cached in memory (dev mode)`);
    }

    return NextResponse.json({
      success: true,
      protocols: protocolStatus,
      data: combinedPools,
      cacheInfo: {
        key: cacheKey,
        cachedUntil: new Date(Date.now() + 120000).toISOString(),
        processingTime: duration,
        totalPools: combinedPools.length,
        fromCache: false
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
        'ETag': `"${cacheKey}"`,
        'X-Cache-Status': 'MISS',
        'X-Processing-Time': duration.toString()
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Ошибка обработки запроса: " + error.message }, { status: 500 });
  }
}
