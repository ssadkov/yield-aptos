import { AgentRuntime, LocalSigner } from "move-agent-kit";
import { 
    Aptos, 
    AptosConfig, 
    Ed25519PrivateKey, 
    Network, 
    PrivateKey 
} from "@aptos-labs/ts-sdk";
import JOULE_TOKENS from "../jouleTokens";

console.log("🚀 Запуск вывода токенов из пула Joule...");

// ✅ Инициализация Aptos SDK
const aptosConfig = new AptosConfig({ network: Network.MAINNET });
const aptos = new Aptos(aptosConfig);

export async function POST(req) {
    try {
        const { privateKeyHex, positionId, amount, token } = await req.json();
        console.log(`🔹 Initiating WITHDRAW: ${amount} ${token}`);

        // ✅ Проверяем информацию о токене
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
        const amountOnChain = BigInt(Math.round(amount * decimals));
        console.log(`🔹 Converted amount: ${amount} → ${amountOnChain} (on-chain)`);

        // ✅ Создаём аккаунт отправителя
        const privateKey = new Ed25519PrivateKey(PrivateKey.formatPrivateKey(privateKeyHex, "ed25519"));
        const senderAccount = await aptos.deriveAccountFromPrivateKey({ privateKey });

        const signer = new LocalSigner(senderAccount, Network.MAINNET);
        const agent = new AgentRuntime(signer, aptos);
        console.log("✅ Agent initialized.");

        // ✅ Проверяем баланс APT для оплаты газа
        const aptBalance = await aptos.getAccountAPTAmount({ accountAddress: senderAccount.accountAddress });
        console.log(`💰 Sender APT Balance: ${aptBalance} APT`);

        let useSponsor = aptBalance < 0.01; // ✅ Если APT < 0.01, используем спонсора

        let sponsorAccount = null;
        if (useSponsor) {
            console.log("⚠️ Using sponsor for transaction...");
            const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY;
            if (!sponsorPrivateKey) {
                console.error("❌ Sponsor private key is missing");
                return new Response(JSON.stringify({ error: "Sponsor private key is missing" }), {
                    status: 500,
                    headers: { "Content-Type": "application/json" }
                });
            }

            const sponsorEdKey = new Ed25519PrivateKey(PrivateKey.formatPrivateKey(sponsorPrivateKey, "ed25519"));
            sponsorAccount = await aptos.deriveAccountFromPrivateKey({ privateKey: sponsorEdKey });

            console.log("✅ Sponsor Account derived:", sponsorAccount.accountAddress.toString());
        }

        // ✅ Получаем Pyth Update Data
        console.log("🔹 Fetching Pyth Update Data...");
        const pyth_update_data = await agent.getPythData();
        console.log(`✅ Pyth Update Data received.`);

        // ✅ Создаём транзакционные данные
        const transactionData = isFungible
            ? {
                function: "0x2fe576faa841347a9b1b32c869685deb75a15e3f62dfe37cbd6d52cc403a16f6::pool::withdraw_fa",
                functionArguments: [
                    positionId.toString(),
                    token.split("::")[0], // ✅ Передаём только адрес токена
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
            withFeePayer: useSponsor // ✅ Добавляем fee payer, если требуется
        });

        console.log("🔹 Signing transaction...");
        const senderAuth = await aptos.transaction.sign({
            signer: senderAccount,
            transaction
        });

        let feePayerAuth = null;
        if (useSponsor) {
            console.log("⚠️ Signing transaction with fee payer...");
            feePayerAuth = await aptos.transaction.signAsFeePayer({
                signer: sponsorAccount,
                transaction
            });
        }

        console.log("✅ Transaction signed!");

        // ✅ Отправляем транзакцию
        console.log("\n=== 3. Submitting transaction ===\n");
        const committedTransaction = await aptos.transaction.submit.simple({
            transaction,
            senderAuthenticator: senderAuth,
            feePayerAuthenticator: feePayerAuth, // ✅ Используем fee payer, если есть
        });

        console.log("✅ Submitted transaction hash:", committedTransaction.hash);

        return new Response(JSON.stringify({ transactionHash: committedTransaction.hash }), {
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
