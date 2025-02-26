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
          balance: balance,
        });
      }
    }

    console.log(`✅ Итоговые балансы:`, balances);

    return new Response(JSON.stringify({ balances }), {
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
