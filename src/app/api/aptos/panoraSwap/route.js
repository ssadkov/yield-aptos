import { AgentRuntime, LocalSigner, PanoraSwapTool } from "move-agent-kit";
import {
    Aptos,
    AptosConfig,
    Ed25519PrivateKey,
    Network,
    PrivateKey
} from "@aptos-labs/ts-sdk";

export async function POST(req) {
    try {
        // Читаем JSON из запроса
        const requestData = await req.json();
        console.log(`🔹 Full request data:`, requestData);

        const { privateKeyHex, fromToken, toToken, swapAmount, toWalletAddress } = requestData;
        if (!privateKeyHex || !fromToken || !toToken || !swapAmount) {
            console.error("❌ Missing required parameters:", { privateKeyHex, fromToken, toToken, swapAmount });
            return new Response(JSON.stringify({ error: "Missing required parameters" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        console.log(`🔹 Initiating swap: ${swapAmount} ${fromToken} to ${toToken}`);

        // Создаем объект aptos для работы с сетью
        const aptosConfig = new AptosConfig({ 
    network: Network.MAINNET,
    apiKey: process.env.APTOS_API_KEY 
}); // Настройка для сети MAINNET
        const aptos = new Aptos(aptosConfig); // Инициализация Aptos SDK

        // Подготавливаем агент с помощью приватного ключа
        const privateKey = new Ed25519PrivateKey(PrivateKey.formatPrivateKey(privateKeyHex, "ed25519"));
        const account = await aptos.deriveAccountFromPrivateKey({ privateKey }); // Используем aptos для создания аккаунта
        const signer = new LocalSigner(account, Network.MAINNET);
        const agent = new AgentRuntime(signer, aptos);

        console.log(process.env.PANORA_API_KEY);
        agent.config.PANORA_API_KEY = process.env.PANORA_API_KEY; // Подставляем значение из переменной окружения


        // Используем инструмент PanoraSwapTool для выполнения обмена
        const panoraSwapTool = new PanoraSwapTool(agent);

        // Подготовка входных данных
        const input = JSON.stringify({
            fromToken,
            toToken,
            swapAmount,
            toWalletAddress
        });

        // Выполнение обмена
        const result = await panoraSwapTool._call(input);

        // Возвращаем результат
        const resultData = JSON.parse(result);
        if (resultData.status === "success") {
            return new Response(JSON.stringify({ transactionHash: resultData.swapTransactionHash }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        } else {
            console.error("❌ Swap failed:", resultData.message);
            return new Response(JSON.stringify({ error: resultData.message }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    } catch (error) {
        console.error("❌ Swap error:", error);
        return new Response(JSON.stringify({ error: "Failed to execute swap" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
