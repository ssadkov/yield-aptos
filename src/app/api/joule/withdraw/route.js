import { AgentRuntime, LocalSigner } from "move-agent-kit";
import { Aptos, AptosConfig, Ed25519PrivateKey, Network, PrivateKey } from "@aptos-labs/ts-sdk";
import JOULE_TOKENS from "../jouleTokens"; // Импорт таблицы токенов

console.log("🚀 Запуск вывода токенов из пула Joule...");

// **Настроим Aptos SDK**
const aptosConfig = new AptosConfig({ network: Network.MAINNET });
const aptos = new Aptos(aptosConfig);

export async function POST(req) {
    try {
        const { privateKeyHex, positionId, amount, token } = await req.json();

        console.log(`🔹 Initiating WITHDRAW: ${amount} ${token}`);

        // ✅ Определяем информацию о токене из JOULE_TOKENS
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

        // **Создаем подписанта**
        const privateKey = new Ed25519PrivateKey(PrivateKey.formatPrivateKey(privateKeyHex, "ed25519"));
        const account = await aptos.deriveAccountFromPrivateKey({ privateKey });

        const signer = new LocalSigner(account, Network.MAINNET);
        const agent = new AgentRuntime(signer, aptos);
        console.log("✅ Agent initialized.");

        // **Получаем Pyth Update Data**
        console.log("🔹 Fetching Pyth Update Data...");
        const pyth_update_data = await agent.getPythData();
        console.log(`✅ Pyth Update Data received.`);

        // **Создаем транзакционные данные**
        const transactionData = isFungible
            ? {
                function: "0x2fe576faa841347a9b1b32c869685deb75a15e3f62dfe37cbd6d52cc403a16f6::pool::withdraw_fa",
                functionArguments: [
                    positionId.toString(),
                    token.split("::")[0], // ✅ Передаем **только адрес токена**
                    amountOnChain,
                    pyth_update_data
                ]
            }
            : {
                function: "0x2fe576faa841347a9b1b32c869685deb75a15e3f62dfe37cbd6d52cc403a16f6::pool::withdraw",
                typeArguments: [token],
                functionArguments: [
                    positionId.toString(),
                    amountOnChain,
                    pyth_update_data
                ]
            };

        console.log("✅ Transaction data prepared:", transactionData);

        console.log("🔹 Building transaction...");
        const transaction = await agent.aptos.transaction.build.simple({
            sender: agent.account.getAddress(),
            data: transactionData,
        });

        console.log("🔹 Sending transaction...");
        const committedTransactionHash = await agent.account.sendTransaction(transaction);
        console.log(`✅ Transaction sent! Hash: ${committedTransactionHash}`);

        console.log("🔹 Waiting for transaction confirmation...");
        const signedTransaction = await agent.aptos.waitForTransaction({
            transactionHash: committedTransactionHash,
        });

        if (!signedTransaction.success) {
            console.error("❌ Error: Token withdraw failed", signedTransaction);
            throw new Error("Token withdraw failed");
        }

        console.log("✅ Withdrawal successful! 🚀 Transaction:", signedTransaction.hash);
        return new Response(JSON.stringify({ transactionHash: signedTransaction.hash }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error("❌ Error during withdrawal:", error);
        return new Response(JSON.stringify({ error: "Withdraw failed", details: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
