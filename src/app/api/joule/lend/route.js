import { AgentRuntime, LocalSigner } from "move-agent-kit";
import {
    Aptos,
    AptosConfig,
    Ed25519PrivateKey,
    Network,
    PrivateKey,
    Account
} from "@aptos-labs/ts-sdk";
import JOULE_TOKENS from "../jouleTokens"; // 📌 Таблица токенов Joule
console.log("🔹 JOULE_TOKENS loaded:", JOULE_TOKENS);

// ✅ Настройка подключения к Aptos
const aptosConfig = new AptosConfig({ network: Network.MAINNET });
const aptos = new Aptos(aptosConfig);

export async function POST(req) {
    try {
        // 🛠 1. Читаем JSON из запроса
        const requestData = await req.json();
        console.log(`🔹 Full request data:`, requestData);

        // 📌 Проверяем входные параметры
        const { privateKeyHex, token, amount, useSponsor } = requestData;
        if (!privateKeyHex || !token || !amount) {
            console.error("❌ Missing required parameters:", { privateKeyHex, token, amount });
            return new Response(JSON.stringify({ error: "Missing required parameters" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        console.log(`🔹 Initiating LEND: ${amount} ${token}`);

        // 🔎 2. Ищем токен в JOULE_TOKENS
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

        // ✅ 3. Создание аккаунта отправителя
        const privateKey = new Ed25519PrivateKey(PrivateKey.formatPrivateKey(privateKeyHex, "ed25519"));
        const account = await aptos.deriveAccountFromPrivateKey({ privateKey });

        const signer = new LocalSigner(account, Network.MAINNET);
        const agent = new AgentRuntime(signer, aptos);

        // ✅ 4. Проверяем баланс пользователя
        const userBalance = await aptos.getAccountAPTAmount({ accountAddress: account.accountAddress });
        console.log(`✅ User balance check passed: ${userBalance} APT available`);

        let sponsorAccount = null;
        let useSponsorForTransaction = useSponsor || userBalance < 0.01; // Если баланс APT меньше 0.01 → используем спонсора

        if (useSponsorForTransaction) {
            console.log("⚠️ Using sponsor for transaction...");
            const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY; // 🟢 Приватный ключ спонсора
            if (!sponsorPrivateKey) {
                console.error("❌ Sponsor private key is missing");
                return new Response(JSON.stringify({ error: "Sponsor private key is missing" }), {
                    status: 500,
                    headers: { "Content-Type": "application/json" }
                });
            }

            const sponsorEdKey = new Ed25519PrivateKey(sponsorPrivateKey);
            sponsorAccount = Account.fromPrivateKey({ privateKey: sponsorEdKey });
            console.log("✅ Sponsor Account derived:", sponsorAccount.accountAddress.toString());
        }

        // ✅ 5. Подготовка данных транзакции!!! ПОТЕСТИТЬ, ТУТ МОГУТ БЫТЬ ОШИБКИ
        const positionId = "1";
        const newPosition = false;

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

        // ✅ 6. Строим транзакцию (с учетом спонсора)
        console.log("\n=== 1. Building transaction ===\n");
        const transaction = await agent.aptos.transaction.build.simple({
            sender: agent.account.getAddress(),
            withFeePayer: useSponsorForTransaction, // 🟢 Активируем спонсирование, если нужно
            data: transactionData
        });

        console.log("✅ Transaction built!");

        // ✅ 7. Подписываем транзакцию отправителем
        console.log("\n=== 2. Signing transaction ===\n");
        const senderAuth = await aptos.transaction.sign({
            signer: account,
            transaction,
        });

        let feePayerAuth = null;
        if (useSponsorForTransaction) {
            console.log("⚠️ Using sponsored transaction...");
            feePayerAuth = await aptos.transaction.signAsFeePayer({
                signer: sponsorAccount,
                transaction
            });
        }

        console.log("✅ Transaction signed!");

        // ✅ 8. Отправляем транзакцию
        console.log("\n=== 3. Submitting transaction ===\n");
        const committedTransaction = await aptos.transaction.submit.simple({
            transaction,
            senderAuthenticator: senderAuth,
            feePayerAuthenticator: feePayerAuth, // 🟢 Используем спонсора, если есть
        });

        console.log("✅ Submitted transaction hash:", committedTransaction.hash);

        return new Response(JSON.stringify({ transactionHash: committedTransaction.hash }), {
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
