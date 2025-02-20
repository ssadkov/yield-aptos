import { AgentRuntime, LocalSigner } from "move-agent-kit";
import {
    Aptos,
    AptosConfig,
    Ed25519PrivateKey,
    Network,
    PrivateKey
} from "@aptos-labs/ts-sdk";
import JOULE_TOKENS from "../../joule/jouleTokens"; // Таблица токенов Joule

const aptosConfig = new AptosConfig({ network: Network.MAINNET });
const aptos = new Aptos(aptosConfig);

export async function POST(req) {
    try {
        const body = await req.json();
        let { privateKey, receiver, amount, token } = body;

        if (!privateKey || !receiver || !amount || amount <= 0) {
            return new Response(JSON.stringify({ error: "Invalid request parameters" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        console.log(`🔹 Initiating transfer: ${amount} ${token || "APT"} to ${receiver}`);

        // ✅ Определяем токен (если не указан, берем APT)
        let tokenInfo = token
            ? JOULE_TOKENS.find(t => t.token === token)
            : { token: "0x1::aptos_coin::AptosCoin", decimals: 1_000_000_000, isFungible: false };

        if (!tokenInfo) {
            console.error(`❌ Token not found: ${token}`);
            return new Response(JSON.stringify({ error: "Token not found" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        console.log(`✅ Token info found:`, tokenInfo);
        const { decimals, isFungible } = tokenInfo;

        // ✅ Конвертируем сумму в on-chain формат
        const amountOnChain = BigInt(amount * decimals);
        console.log(`🔹 Converted amount: ${amount} → ${amountOnChain} (on-chain)`);

        // ✅ Создаем агента
        const formattedPrivateKey = PrivateKey.formatPrivateKey(privateKey, "ed25519");
        const account = await aptos.deriveAccountFromPrivateKey({ privateKey: new Ed25519PrivateKey(formattedPrivateKey) });
        const signer = new LocalSigner(account, Network.MAINNET);
        const agent = new AgentRuntime(signer, aptos);

        // ✅ Проверяем баланс
        const balance = await aptos.getAccountAPTAmount({ accountAddress: account.accountAddress.toString() });
        console.log(`✅ Current balance: ${balance} APT`);

        if (balance < amount) {
            return new Response(JSON.stringify({ error: "Insufficient balance" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // ✅ Создаем транзакционные данные
        let transactionData;
        if (isFungible) {
            console.log("🔹 Processing as Fungible Token Transfer...");
            transactionData = {
                function: "0x1::fungible_asset::transfer",
                functionArguments: [receiver, tokenInfo.token.split("::")[0], amountOnChain]
            };
        } else {
            console.log("🔹 Processing as APT Transfer...");
            transactionData = {
                function: "0x1::aptos_account::transfer",
                functionArguments: [receiver, amountOnChain]
            };
        }

        console.log("🔹 Transaction data:", transactionData);

        // ✅ Строим и отправляем транзакцию
        console.log("🔹 Building transaction...");
        const transaction = await agent.aptos.transaction.build.simple({
            sender: agent.account.getAddress(),
            data: transactionData
        });

        console.log("🔹 Sending transaction...");
        const committedTransactionHash = await agent.account.sendTransaction(transaction);
        console.log(`✅ Transaction sent! Hash: ${committedTransactionHash}`);

        return new Response(JSON.stringify({ transactionHash: committedTransactionHash }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error("❌ Transfer error:", error);
        return new Response(JSON.stringify({ error: "Transaction failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
