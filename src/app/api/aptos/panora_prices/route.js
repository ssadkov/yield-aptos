import JOULE_TOKENS from "@/app/api/joule/jouleTokens";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const tokenAddress = searchParams.get("tokenAddress");
    const chainId = searchParams.get("chainId") || "1";

    console.log(`🔍 Запрашиваем цены для токенов`);

    const end_point = 'https://api.panora.exchange/prices';
    const query = {
      chainId,
      ...(tokenAddress && { tokenAddress })
    };

    const queryString = new URLSearchParams(query).toString();
    const url = `${end_point}?${queryString}`;

    const response = await fetch(url, {
      headers: {
        'x-api-key': process.env.PANORA_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch prices: ${response.statusText}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Ошибка при получении цен:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
} 