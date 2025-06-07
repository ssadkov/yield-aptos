import { NextResponse } from "next/server";
import JOULE_TOKENS from "@/app/api/joule/jouleTokens";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const assetName = searchParams.get("asset");
    const protocol = searchParams.get("protocol");

    let combinedPools = [];
    let protocolStatus = { Joule: 0, Echelon: 0, Aries: 0, Hyperion: 0 };

    // 🟢 Joule API
    try {
      const jouleResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/joule/pools`);
      if (jouleResponse.ok) {
        let joulePools = await jouleResponse.json();
        if (Array.isArray(joulePools)) {
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
        }
      }
    } catch (error) {
      console.error("❌ Joule API error:", error.message);
    }

    // 🔵 Echelon API
    try {
      const echelonResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/echelon/markets`);
      if (echelonResponse.ok) {
        let echelonData = await echelonResponse.json();
        if (echelonData?.success && Array.isArray(echelonData.marketData)) {
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
        }
      }
    } catch (error) {
      console.error("❌ Echelon API error:", error.message);
    }

    // 🟣 Aries API
    try {
      const ariesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/aries/markets`);
      if (ariesResponse.ok) {
        const ariesData = await ariesResponse.json();
        if (ariesData?.success && Array.isArray(ariesData.marketData)) {
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
        }
      }
    } catch (error) {
      console.error("❌ Aries API error:", error.message);
    }

    // 🔶 Hyperion API
    try {
      const hyperionResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hyperion/pools`);
      if (hyperionResponse.ok) {
        const hyperionData = await hyperionResponse.json();
        if (hyperionData?.success && Array.isArray(hyperionData.data)) {
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
        }
      }
    } catch (error) {
      console.error("❌ Hyperion API error:", error.message);
    }

    if (combinedPools.length === 0) {
      return NextResponse.json({ error: "Все API недоступны", protocols: protocolStatus }, { status: 500 });
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

    return NextResponse.json({
      protocols: protocolStatus,
      data: combinedPools,
    });
  } catch (error) {
    return NextResponse.json({ error: "Ошибка обработки запроса: " + error.message }, { status: 500 });
  }
}
