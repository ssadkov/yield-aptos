import {
    Account,
    Aptos,
    AptosConfig,
    Ed25519PrivateKey,
    Network,
    SigningScheme,
} from "@aptos-labs/ts-sdk";
import JOULE_TOKENS from "../../joule/jouleTokens"; // Таблица токенов Joule

const aptosConfig = new AptosConfig({ network: Network.MAINNET });
const aptos = new Aptos(aptosConfig);

export async function POST(req) {
    try {
        const body = await req.json();
        let { privateKey, receiver, amount, token, useSponsor } = body;

        if (!privateKey || !receiver || !amount || amount <= 0) {
            return new Response(JSON.stringify({ error: "Invalid request parameters" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        console.log(`🔹 Initiating transfer: ${amount} ${token || "APT"} to ${receiver}`);

        // ✅ Определяем токен
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

        // ✅ Создаём аккаунт отправителя
        const formattedPrivateKey = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
        const ed25519Key = new Ed25519PrivateKey(formattedPrivateKey);
        const senderAccount = Account.fromPrivateKey({
            privateKey: ed25519Key,
            scheme: SigningScheme.Ed25519,
        });

        console.log("✅ Sender Account derived:", senderAccount.accountAddress.toString());

        // ✅ Определяем спонсора (если `useSponsor = true`)
        let sponsorAccount;
        if (useSponsor) {
            const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY; // 🟢 Приватный ключ спонсора
            if (!sponsorPrivateKey) {
                console.error("❌ Sponsor private key is missing");
                return new Response(JSON.stringify({ error: "Sponsor private key is missing" }), {
                    status: 500,
                    headers: { "Content-Type": "application/json" }
                });
            }

            const sponsorEdKey = new Ed25519PrivateKey(sponsorPrivateKey);
            sponsorAccount = Account.fromPrivateKey({
                privateKey: sponsorEdKey,
                scheme: SigningScheme.Ed25519,
            });

            console.log("✅ Sponsor Account derived:", sponsorAccount.accountAddress.toString());
        }

        // ✅ Формируем данные для транзакции
        let transactionData;
        let typeArguments = [];
        
        if (isFungible) {
            console.log("🔹 Processing as Fungible Token Transfer...");
            transactionData = {
                function: "0x1::fungible_asset::transfer_with_fee_payer",
                functionArguments: [receiver, amountOnChain]
            };
            typeArguments = [tokenInfo.token]; // 🟢 Добавляем token type_argument (например, USDT)
        } else {
            console.log("🔹 Processing as APT Transfer...");
            transactionData = {
                function: "0x1::aptos_account::transfer",
                functionArguments: [receiver, amountOnChain]
            };
        }

        console.log("🔹 Transaction data:", transactionData);
        console.log("🔹 Type Arguments:", typeArguments);

        // ✅ 1. Строим транзакцию
        console.log("\n=== 1. Building transaction ===\n");
        const transaction = await aptos.transaction.build.simple({
            sender: senderAccount.accountAddress,
            withFeePayer: useSponsor, // 🟢 Активируем спонсирование, если указано
            data: transactionData,
            typeArguments: typeArguments // 🟢 Добавляем аргументы типа (нужно для токенов)
        });

        console.log("✅ Transaction built!");

        // ✅ 2. Подписываем транзакцию отправителем
        console.log("\n=== 2. Signing transaction ===\n");
        const senderAuth = await aptos.transaction.sign({
            signer: senderAccount,
            transaction,
        });

        let feePayerAuth = null;
        if (useSponsor) {
            console.log("⚠️ Using sponsored transaction...");
            feePayerAuth = await aptos.transaction.signAsFeePayer({
                signer: sponsorAccount,
                transaction
            });
        }

        console.log("✅ Transaction signed!");

        // ✅ 3. Отправляем транзакцию
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
        console.error("❌ Transfer error:", error);
        return new Response(JSON.stringify({ error: "Transaction failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
