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
          joulePools = joulePools.map((pool) => ({
            asset: pool.asset.assetName,
            provider: pool.asset.provider,
            totalAPY: parseFloat(pool.depositApy) + parseFloat(pool.extraAPY.depositAPY) + parseFloat(pool.extraAPY.stakingAPY),
            depositApy: parseFloat(pool.depositApy),
            extraAPY: parseFloat(pool.extraAPY.depositAPY),
            borrowAPY: parseFloat(pool.borrowApy),
            extraBorrowAPY: parseFloat(pool.extraAPY.borrowAPY),
            extraStakingAPY: parseFloat(pool.extraAPY.stakingAPY),
            token: pool.asset.type,
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
        if (echelonData.success && Array.isArray(echelonData.marketData)) {
          protocolStatus.Echelon = 1;
          const echelonPools = echelonData.marketData.map((market) => {
            const tokenData = JOULE_TOKENS.find((t) => t.token === market.coin);
            return {
              asset: tokenData ? tokenData.assetName : market.coin,
              provider: tokenData ? tokenData.provider : "Unknown",
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
        if (ariesData.success && Array.isArray(ariesData.marketData)) {
          protocolStatus.Aries = 1;
          const ariesPools = ariesData.marketData.map((item) => ({
            asset: item.coinAddress.split("::")[2] || item.coinAddress,
            provider: "Aries",
            totalAPY: (parseFloat(item.depositAPR) * 100) || 0,
            depositApy: (parseFloat(item.depositAPR) * 100) || 0,
            extraAPY: 0,
            borrowAPY: (parseFloat(item.borrowAPR) * 100) || 0,
            extraBorrowAPY: 0,
            extraStakingAPY: 0,
            token: item.coinAddress,
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
        if (hyperionData.success && Array.isArray(hyperionData.data)) {
          protocolStatus.Hyperion = 1;
          combinedPools.push(...hyperionData.data);
        }
      }
    } catch (error) {
      console.error("❌ Hyperion API error:", error.message);
    }

    if (combinedPools.length === 0) {
      return NextResponse.json({ error: "Все API недоступны", protocols: protocolStatus }, { status: 500 });
    }

    if (assetName) {
      combinedPools = combinedPools.filter((pool) =>
        pool.asset.toUpperCase().includes(assetName.toUpperCase()) ||
        pool.token.toUpperCase().includes(assetName.toUpperCase())
      );
    }

    if (protocol) {
      combinedPools = combinedPools.filter((pool) => pool.protocol.toUpperCase() === protocol.toUpperCase());
    }

    return NextResponse.json({
      protocols: protocolStatus,
      data: combinedPools,
    });
  } catch (error) {
    return NextResponse.json({ error: "Ошибка обработки запроса: " + error.message }, { status: 500 });
  }
}
