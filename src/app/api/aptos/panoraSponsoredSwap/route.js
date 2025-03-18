import { AgentRuntime, LocalSigner } from "move-agent-kit";
import {
    Aptos,
    AptosConfig,
    Ed25519PrivateKey,
    Network,
    PrivateKey,
    Account,
    SigningScheme
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
        if (!privateKeyHex || !fromToken || !toToken || !swapAmount || !toWalletAddress) {
            console.error("❌ Missing required parameters:", { privateKeyHex, fromToken, toToken, swapAmount, toWalletAddress });
            return new Response(JSON.stringify({ error: "Missing required parameters" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        console.log(`🔹 Initiating swap: ${swapAmount} ${fromToken} to ${toToken}`);

        // ✅ 2. Создание аккаунта отправителя
        const ed25519Key = new Ed25519PrivateKey(privateKeyHex);
        const senderAccount = Account.fromPrivateKey({ privateKey: ed25519Key, scheme: SigningScheme.Ed25519 });

        console.log("✅ Sender Account derived:", senderAccount.accountAddress.toString());

        let useSponsorForTransaction = useSponsor ?? (userBalance < 0.01); // Если баланс APT меньше 0.01 → используем спонсора

        let sponsorAccount = null;

        if (useSponsorForTransaction) {
            console.log("⚠️ Using sponsor for transaction...");

            const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY || privateKeyHex; // 🟢 Если спонсора нет в .env, используем отправителя
            const sponsorEdKey = new Ed25519PrivateKey(PrivateKey.formatPrivateKey(sponsorPrivateKey, "ed25519"));
            sponsorAccount = await aptos.deriveAccountFromPrivateKey({ privateKey: sponsorEdKey });

            console.log("✅ Sponsor Account derived:", sponsorAccount.accountAddress.toString());
        }

        // ✅ 3. Проверяем, существует ли аккаунт получателя
        let receiverExists = true;
        try {
            await aptos.getAccountResource({ accountAddress: toWalletAddress, resourceType: "0x1::account::Account" });
            console.log("✅ Receiver account exists!");
        } catch (error) {
            console.log("⚠️ Receiver account does NOT exist! Creating account...");

            // 🔹 Создаем аккаунт через `aptos_account::transfer` с 0 APT
            const createAccountTxn = await aptos.transaction.build.simple({
                sender: senderAccount.accountAddress,
                data: {
                    function: "0x1::aptos_account::transfer",
                    functionArguments: [toWalletAddress, 0] // Отправляем 0 APT
                },
                withFeePayer: useSponsorForTransaction // ✅ Добавляем оплату спонсором
            });
            
            // Подписываем транзакцию отправителем
            const senderAuth = await aptos.transaction.sign({
                signer: senderAccount,
                transaction: createAccountTxn
            });

            
    

            
            let feePayerAuth = null;
            if (useSponsorForTransaction) {
                console.log("⚠️ Using sponsor for account creation...");
                feePayerAuth = await aptos.transaction.signAsFeePayer({
                    signer: sponsorAccount,
                    transaction: createAccountTxn
                });
            }
            
            // ✅ Отправляем транзакцию с feePayer (если нужно)
            const createAccountTxHash = await aptos.transaction.submit.simple({
                transaction: createAccountTxn,
                senderAuthenticator: senderAuth,
                feePayerAuthenticator: feePayerAuth
            });
            
            
            console.log(`✅ Account created! Tx: ${createAccountTxHash.hash}`);
            await aptos.waitForTransaction({ transactionHash: createAccountTxHash.hash });

            receiverExists = false;
        }

        // ✅ 4. Создание подписчика и агента
        const privateKey = new Ed25519PrivateKey(PrivateKey.formatPrivateKey(privateKeyHex, "ed25519"));
        const senderAccount1 = await aptos.deriveAccountFromPrivateKey({ privateKey });

        const signer = new LocalSigner(senderAccount1, Network.MAINNET);
        const agent = new AgentRuntime(signer, aptos);

        // ✅ 5. Проверяем баланс пользователя
        const userBalance = await aptos.getAccountAPTAmount({ accountAddress: senderAccount1.accountAddress });
        console.log(`✅ User balance check passed: ${userBalance} APT available`);

       

        // ✅ 6. Получаем котировку Panora
        console.log("🔹 Fetching swap quote from Panora...");
        const panoraParameters = {
            fromTokenAddress: fromToken,
            toTokenAddress: toToken,
            fromTokenAmount: swapAmount.toString(),
            toWalletAddress
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

        // ✅ 7. Формируем транзакцию
        const transaction = await agent.aptos.transaction.build.simple({
            sender: agent.account.getAddress(),
            data: {
                function: transactionData.function,
                typeArguments: transactionData.type_arguments,
                functionArguments: transactionData.arguments
            },
            withFeePayer: useSponsorForTransaction // ✅ Включаем спонсора, если нужно
        });

        console.log("✅ Transaction built!");

        // ✅ 8. Подписываем транзакцию отправителем
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

        // ✅ 9. Отправляем транзакцию
        console.log("\n=== 3. Submitting transaction ===\n");
        const committedTransaction = await aptos.transaction.submit.simple({
            transaction,
            senderAuthenticator: senderAuth,
            feePayerAuthenticator: feePayerAuth // 🟢 Используем спонсора, если есть
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
