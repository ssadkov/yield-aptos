import { AptosClient } from "aptos";
import { AriesSDK } from "@aries-markets/tssdk";

const client = new AptosClient(process.env.APTOS_RPC_URL);
const sdk = new AriesSDK(client);

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  if (!address) {
    return new Response(JSON.stringify({ error: "Address is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Получаем Aries-клиент по адресу пользователя
    const ariesClient = sdk.getClient(address);

    // Получаем профиль пользователя
    const profiles = await ariesClient.getProfiles();

    return new Response(JSON.stringify({ profiles }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Error fetching Aries profile:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch Aries profile" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
