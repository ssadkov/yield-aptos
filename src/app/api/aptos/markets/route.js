import { NextResponse } from "next/server";
import JOULE_TOKENS from "@/app/api/joule/jouleTokens";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const assetName = searchParams.get("asset");
    const protocol = searchParams.get("protocol");

    let combinedPools = [];
    let protocolStatus = { Joule: 0, Echelon: 0 }; // Отслеживаем, какие API отработали

    // 🟢 Запрос к Joule API
    try {
      const jouleResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/joule/pools`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (jouleResponse.ok) {
        let joulePools = await jouleResponse.json();

        if (Array.isArray(joulePools)) {
          protocolStatus.Joule = 1; // Joule API отработал
          joulePools = joulePools.map((pool) => ({
            asset: pool.asset.assetName,
            provider: pool.asset.provider,
            totalAPY:
              parseFloat(pool.depositApy) +
              parseFloat(pool.extraAPY.depositAPY) +
              parseFloat(pool.extraAPY.stakingAPY),
            depositApy: parseFloat(pool.depositApy),
            extraAPY: parseFloat(pool.extraAPY.depositAPY),
            borrowAPY: parseFloat(pool.borrowApy),
            extraBorrowAPY: parseFloat(pool.extraAPY.borrowAPY),
            extraStakingAPY: parseFloat(pool.extraAPY.stakingAPY),
            token: pool.asset.type,
            protocol: "Joule",
          }));
          combinedPools.push(...joulePools);
        } else {
          console.error("⚠️ Joule API вернул некорректный формат данных.");
        }
      } else {
        console.error(`⚠️ Joule API не отвечает: ${jouleResponse.statusText}`);
      }
    } catch (error) {
      console.error("❌ Ошибка запроса к Joule API:", error.message);
    }

    // 🔵 Запрос к Echelon API
    try {
      const echelonResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/echelon/markets`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (echelonResponse.ok) {
        let echelonData = await echelonResponse.json();

        if (echelonData.success && Array.isArray(echelonData.marketData)) {
          protocolStatus.Echelon = 1; // Echelon API отработал
          let echelonPools = echelonData.marketData.map((market) => {
            // Найдем токен в JOULE_TOKENS
            const tokenData = JOULE_TOKENS.find((t) => t.token === market.coin);

            return {
              asset: tokenData ? tokenData.assetName : market.coin,
              provider: tokenData ? tokenData.provider : "Unknown",
              totalAPY: (parseFloat(market.supplyAPR) * 100) || 0, // Приводим к процентам
              depositApy: (parseFloat(market.supplyAPR) * 100) || 0, // Приводим к процентам
              extraAPY: 0,
              borrowAPY: (parseFloat(market.borrowAPR) * 100) || 0, // Приводим к процентам
              extraBorrowAPY: 0,
              extraStakingAPY: 0,
              token: market.coin || "Unknown",
              protocol: "Echelon",
            };
          });
          combinedPools.push(...echelonPools);
        } else {
          console.error("⚠️ Echelon API вернул некорректный формат данных.");
        }
      } else {
        console.error(`⚠️ Echelon API не отвечает: ${echelonResponse.statusText}`);
      }
    } catch (error) {
      console.error("❌ Ошибка запроса к Echelon API:", error.message);
    }

    // ❗ Если оба API недоступны, возвращаем ошибку
    if (combinedPools.length === 0) {
      return NextResponse.json({ error: "Все API недоступны", protocols: protocolStatus }, { status: 500 });
    }

    // 🏷️ Фильтрация по assetName, если параметр передан
    if (assetName) {
      combinedPools = combinedPools.filter((pool) =>
        pool.asset.toUpperCase().includes(assetName.toUpperCase()) ||
        pool.token.toUpperCase().includes(assetName.toUpperCase())
      );
    }

    // 🔍 Фильтрация по protocol, если параметр передан
    if (protocol) {
      combinedPools = combinedPools.filter((pool) => pool.protocol.toUpperCase() === protocol.toUpperCase());
    }

    // Возвращаем объект с `protocols` и `data`
    return NextResponse.json({
      protocols: protocolStatus, // Блок со статусом API
      data: combinedPools,       // Таблица с рынками
    });

  } catch (error) {
    return NextResponse.json({ error: "Ошибка обработки запроса: " + error.message }, { status: 500 });
  }
}
