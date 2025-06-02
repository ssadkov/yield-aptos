import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

const aptosConfig = new AptosConfig({ 
  network: Network.MAINNET,
  apiKey: process.env.APTOS_API_KEY 
});
const aptos = new Aptos(aptosConfig);

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address) {
      return new Response(
        JSON.stringify({ error: "Address parameter is required" }),
        { status: 400 }
      );
    }

    const balance = await aptos.getAccountAPTAmount({ accountAddress: address });

    return new Response(JSON.stringify({ address, balance }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
