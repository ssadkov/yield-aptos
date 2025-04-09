import JOULE_TOKENS from "@/app/api/joule/jouleTokens";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address) {
      return new Response(JSON.stringify({ error: "Missing address parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`🔍 Запрашиваем балансы для адреса: ${address}`);

    const fullnodeUrl = `https://fullnode.mainnet.aptoslabs.com/v1/accounts/${address}/balance`;
    const balances = [];
    const positions = [];


    // Перебираем ВСЕ токены из JOULE_TOKENS и запрашиваем баланс по каждому
    for (const token of JOULE_TOKENS) {
      const tokenBalanceUrl = `${fullnodeUrl}/${token.token}`;
      const response = await fetch(tokenBalanceUrl);

      if (!response.ok) {
        console.warn(`⚠️ Баланс недоступен для ${token.assetName} (${token.provider})`);
        continue;
      }

      const data = await response.json();
      const balance = parseFloat(data) / token.decimals;

      if (balance > 0) {
        balances.push({
          asset: token.assetName,
          provider: token.provider,
          token: token.token,
          balance: balance,
        });
      }
    }

   // console.log(`✅ Итоговые балансы:`, balances);


      // Запрос позиций в Echelon
      try {
        const echelonResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/echelon/userPositions?address=${address}`);
        if (echelonResponse.ok) {
          const echelonData = await echelonResponse.json();
          for (const position of echelonData.userPositions) {
            const tokenInfo = JOULE_TOKENS.find(t => t.token === position.coin);
            const decimals = tokenInfo ? tokenInfo.decimals : 1; // Если не найдено, используем 1 для предотвращения деления на 0
            positions.push({
              protocol: "Echelon",
              token: position.coin,
              amount: position.supply / decimals,
              market: position.market,
              supplyApr: position.supplyApr,
              position_id: "", // Позиции в Echelon не используют position_id
              asset: tokenInfo ? tokenInfo.assetName : "Unknown",
              provider: tokenInfo ? tokenInfo.provider : "Unknown"
            });
          }
        } else {
          console.warn("⚠️ Не удалось получить позиции в Echelon");
        }
      } catch (error) {
        console.error("❌ Ошибка при получении данных из Echelon:", error);
      }


            // Запрос позиций в Aries
            try {
              const ariesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/aries/userPositions?address=${address}`);
              if (ariesResponse.ok) {
                const ariesData = await ariesResponse.json();
                const profiles = ariesData.profiles?.profiles || {};
      
                for (const [profileName, profile] of Object.entries(profiles)) {
                  const deposits = profile.deposits || {};
                  for (const [tokenAddress, depositData] of Object.entries(deposits)) {
                    const tokenInfo = JOULE_TOKENS.find(t => t.token === tokenAddress);
                    const decimals = tokenInfo ? tokenInfo.decimals : 1;
                    const amount = parseFloat(depositData.collateral_coins) / decimals;
      
                    if (amount > 0) {
                      positions.push({
                        protocol: "Aries",
                        token: tokenAddress,
                        amount: amount,
                        market: "",
                        supplyApr: "",
                        position_id: profile.id,
                        asset: tokenInfo ? tokenInfo.assetName : "Unknown",
                        provider: tokenInfo ? tokenInfo.provider : "Unknown"
                      });
                    }
                  }
                }
              } else {
                console.warn("⚠️ Не удалось получить позиции в Aries");
              }
            } catch (error) {
              console.error("❌ Ошибка при получении данных из Aries:", error);
            }
      


          // Запрос позиций в Joule
          try {
            const jouleResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/joule/userPositions?address=${address}`);
            if (jouleResponse.ok) {
              const jouleData = await jouleResponse.json();
              for (const userPosition of jouleData.userPositions) {
                for (const position of userPosition.positions_map.data) {
                  const positionId = position.key;
                  for (const lendPosition of position.value.lend_positions.data) {
                    const tokenAddress = lendPosition.key.replace("@", "0x");
                    const tokenInfo = JOULE_TOKENS.find(t => t.token === tokenAddress);
                    const decimals = tokenInfo ? tokenInfo.decimals : 1;
                    const amount = parseFloat(lendPosition.value) / decimals;
                    if (amount > 0) {
                      positions.push({
                        protocol: "Joule",
                        token: tokenAddress,
                        amount: amount,
                        market: "",
                        supplyApr: "",
                        position_id: positionId,
                        asset: tokenInfo ? tokenInfo.assetName : "Unknown",
                        provider: tokenInfo ? tokenInfo.provider : "Unknown"
                      });
                    }
                  }
                }
              }
            } else {
              console.warn("⚠️ Не удалось получить позиции в Joule");
            }
          } catch (error) {
            console.error("❌ Ошибка при получении данных из Joule:", error);
          }

              // Запрос данных о пулах в Joule
          try {
            const poolsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/joule/pools`);
            if (poolsResponse.ok) {
              const poolsData = await poolsResponse.json();
              for (const position of positions) {
                if (position.protocol === "Joule") {
                  const pool = poolsData.find(p => p.asset.type === position.token);
                  if (pool) {
                    position.supplyApr = (parseFloat(pool.depositApy) + parseFloat(pool.extraAPY.depositAPY) + parseFloat(pool.extraAPY.stakingAPY)).toFixed(2);
                  }
                }
              }
            } else {
              console.warn("⚠️ Не удалось получить данные о пулах Joule");
            }
          } catch (error) {
            console.error("❌ Ошибка при получении данных о пулах Joule:", error);
          }

  


    return new Response(JSON.stringify({ balances, positions }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Ошибка при получении балансов:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
