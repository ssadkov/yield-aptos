import { AgentRuntime, LocalSigner } from "move-agent-kit";
import {
    Aptos,
    AptosConfig,
    Ed25519PrivateKey,
    Network,
    PrivateKey,
    Account
} from "@aptos-labs/ts-sdk";
import axios from "axios";

// ✅ Инициализация Aptos SDK
const aptosConfig = new AptosConfig({ network: Network.MAINNET });
const aptos = new Aptos(aptosConfig);

export async function POST(req) {
    try {
        // 🔎 1. Читаем JSON из запроса
        const requestData = await req.json();
        console.log(`🔹 Full request data:`, requestData);

        // 🛠 Проверяем входные параметры
        const { privateKeyHex, fromToken, toToken, swapAmount, toWalletAddress, useSponsor } = requestData;
        if (!privateKeyHex || !fromToken || !toToken || !swapAmount) {
            console.error("❌ Missing required parameters:", { privateKeyHex, fromToken, toToken, swapAmount });
            return new Response(JSON.stringify({ error: "Missing required parameters" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        console.log(`🔹 Initiating swap: ${swapAmount} ${fromToken} to ${toToken}`);

        // ✅ 2. Создание аккаунта отправителя
        const privateKey = new Ed25519PrivateKey(PrivateKey.formatPrivateKey(privateKeyHex, "ed25519"));
        const senderAccount = await aptos.deriveAccountFromPrivateKey({ privateKey });

        const signer = new LocalSigner(senderAccount, Network.MAINNET);
        const agent = new AgentRuntime(signer, aptos);

        // ✅ 3. Проверяем баланс пользователя
        const userBalance = await aptos.getAccountAPTAmount({ accountAddress: senderAccount.accountAddress });
        console.log(`✅ User balance check passed: ${userBalance} APT available`);

        let sponsorAccount = null;
        let useSponsorForTransaction = useSponsor ?? (userBalance < 0.01); // Если баланс APT меньше 0.01 → используем спонсора

        if (useSponsorForTransaction) {
            console.log("⚠️ Using sponsor for transaction...");

            const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY || privateKeyHex; // 🟢 Если спонсора нет в .env, используем отправителя
            const sponsorEdKey = new Ed25519PrivateKey(PrivateKey.formatPrivateKey(sponsorPrivateKey, "ed25519"));
            sponsorAccount = await aptos.deriveAccountFromPrivateKey({ privateKey: sponsorEdKey });

            console.log("✅ Sponsor Account derived:", sponsorAccount.accountAddress.toString());
        }

        // ✅ 4. Подготовка запроса к Panora
        console.log("🔹 Fetching swap quote from Panora...");
        const panoraParameters = {
            fromTokenAddress: fromToken,
            toTokenAddress: toToken,
            fromTokenAmount: swapAmount.toString(),
            toWalletAddress: toWalletAddress ? toWalletAddress : senderAccount.accountAddress.toString(),
        };

        const url = `https://api.panora.exchange/swap?${new URLSearchParams(panoraParameters).toString()}`;
        const panoraApiKey = process.env.PANORA_API_KEY;
        if (!panoraApiKey) {
            throw new Error("No PANORA_API_KEY in config");
        }

        const res = await axios.post(url, {}, { headers: { "x-api-key": panoraApiKey } });
        const response = await res.data;

        if (!response.quotes || response.quotes.length <= 0) {
            throw new Error("No quotes available from Panora");
        }

        console.log(`✅ Swap quote received!`);
        const transactionData = response.quotes[0].txData;

        // ✅ 5. Формируем транзакцию
        const transaction = await agent.aptos.transaction.build.simple({
            sender: agent.account.getAddress(),
            data: {
                function: transactionData.function,
                typeArguments: transactionData.type_arguments,
                functionArguments: transactionData.arguments,
            },
            withFeePayer: useSponsorForTransaction // ✅ Включаем спонсора, если нужно
        });

        console.log("✅ Transaction built!");

        // ✅ 6. Подписываем транзакцию отправителем
        console.log("\n=== 2. Signing transaction ===\n");
        const senderAuth = await aptos.transaction.sign({
            signer: senderAccount,
            transaction
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

        // ✅ 7. Отправляем транзакцию
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
        console.error("❌ Swap error:", error);
        return new Response(JSON.stringify({ error: `Swap failed: ${error.message}` }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
