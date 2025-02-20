import { AgentRuntime, LocalSigner } from "move-agent-kit";
import {
    Aptos,
    AptosConfig,
    Ed25519PrivateKey,
    Network,
    PrivateKey
} from "@aptos-labs/ts-sdk";
import JOULE_TOKENS from "../jouleTokens"; // Таблица токенов Joule
console.log("🔹 JOULE_TOKENS loaded:", JOULE_TOKENS);


const aptosConfig = new AptosConfig({ network: Network.MAINNET });
const aptos = new Aptos(aptosConfig);

export async function POST(req) {
    try {
        // 🔎 Читаем JSON из запроса
        const requestData = await req.json();
        console.log(`🔹 Full request data:`, requestData);

        // 🛠 Проверяем входные параметры
        const { privateKeyHex, token, amount } = requestData;
        if (!privateKeyHex || !token || !amount) {
            console.error("❌ Missing required parameters:", { privateKeyHex, token, amount });
            return new Response(JSON.stringify({ error: "Missing required parameters" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        console.log(`🔹 Initiating LEND: ${amount} ${token}`);

        // 🔎 Проверяем список токенов
        console.log("🔎 Available tokens in JOULE_TOKENS:", JOULE_TOKENS.map(t => t.token));

        // 🔎 Ищем токен в списке
        console.log(`🔎 Searching for token: ${token}`);

        const tokenInfo = JOULE_TOKENS.find(t => t.token === token);
        if (!tokenInfo) {
            console.error(`❌ Token not found: ${token}`);
            return new Response(JSON.stringify({ error: "Token not found in Joule pools" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        console.log(`✅ Token info found:`, tokenInfo);
        const { decimals, isFungible } = tokenInfo;

        console.log(`🔹 isFungible: ${isFungible}`);
        const amountOnChain = BigInt(Math.round(amount * decimals));
        console.log(`🔹 Converted amount: ${amount} → ${amountOnChain} (on-chain)`);

        // ✅ Обработка приватного ключа
        const privateKey = new Ed25519PrivateKey(PrivateKey.formatPrivateKey(privateKeyHex, "ed25519"));
        const account = await aptos.deriveAccountFromPrivateKey({ privateKey });

        const signer = new LocalSigner(account, Network.MAINNET);
        const agent = new AgentRuntime(signer, aptos);

        // ✅ Проверяем баланс пользователя
        const userBalance = await aptos.getAccountAPTAmount({ accountAddress: account.accountAddress });
        console.log(`✅ User balance check passed: ${userBalance} APT available`);

        if (userBalance < 0.01) {
            return new Response(JSON.stringify({ error: "Insufficient APT balance for gas fees" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // 🔹 Подготовка транзакции
        const positionId = "1234";
        const newPosition = true;

        let transactionData;
        if (isFungible) {
            const tokenAddress = token.split("::")[0];
            transactionData = {
                function: "0x2fe576faa841347a9b1b32c869685deb75a15e3f62dfe37cbd6d52cc403a16f6::pool::lend_fa",
                functionArguments: [positionId, tokenAddress, newPosition, amountOnChain]
            };
        } else {
            transactionData = {
                function: "0x2fe576faa841347a9b1b32c869685deb75a15e3f62dfe37cbd6d52cc403a16f6::pool::lend",
                typeArguments: [token],
                functionArguments: [positionId, amountOnChain, newPosition]
            };
        }

        console.log(`🔹 Transaction data:`, transactionData);

        // ✅ Строим и отправляем транзакцию
        const transaction = await agent.aptos.transaction.build.simple({
            sender: agent.account.getAddress(),
            data: transactionData,
        });

        console.log(`✅ Transaction created:`, transaction);

        const committedTransactionHash = await agent.account.sendTransaction(transaction);
        console.log(`✅ Transaction sent! Hash: ${committedTransactionHash}`);

        return new Response(JSON.stringify({ transactionHash: committedTransactionHash }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("❌ LEND error:", error);
        return new Response(JSON.stringify({ error: "Failed to execute LEND transaction" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
