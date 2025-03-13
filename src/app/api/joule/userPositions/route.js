import { AgentRuntime, LocalSigner } from "move-agent-kit";
import { Aptos, AptosConfig, Ed25519PrivateKey, Network, PrivateKey } from "@aptos-labs/ts-sdk";
import SYSTEM_AGENT from "@/config"; // Загружаем системный ключ

const aptosConfig = new AptosConfig({ network: Network.MAINNET });
const aptos = new Aptos(aptosConfig);

export async function GET(req) {
    try {
        // Получаем параметры запроса
        const { searchParams } = new URL(req.url);
        const userAddress = searchParams.get("address");

        if (!userAddress) {
            return new Response(JSON.stringify({ error: "User address is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // console.log(`🔹 Fetching positions for user: ${userAddress}`);

        // ✅ Фикс обработки приватного ключа
		
		const privateKey = new Ed25519PrivateKey(PrivateKey.formatPrivateKey(SYSTEM_AGENT.privateKeyHex, "ed25519"));
        const account = await aptos.deriveAccountFromPrivateKey({ privateKey });
		
		
	/* 	const privateKeyBytes = Uint8Array.from(Buffer.from(SYSTEM_AGENT.privateKeyHex.replace("0x", ""), "hex"));
		const privateKey = new Ed25519PrivateKey(privateKeyBytes);
		const account = await aptos.deriveAccountFromPrivateKey({ privateKey });
 */

        const signer = new LocalSigner(account, Network.MAINNET);
        const agent = new AgentRuntime(signer, aptos);

        // Запрашиваем позиции пользователя
        const userPositions = await agent.getUserAllPositions(userAddress);

        return new Response(JSON.stringify({ userPositions }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error("❌ Error fetching user positions:", error);
        return new Response(JSON.stringify({ error: "Failed to fetch user positions" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
