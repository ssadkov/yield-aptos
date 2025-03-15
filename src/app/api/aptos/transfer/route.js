import {
    Aptos,
    AptosConfig,
    Ed25519PrivateKey,
    Network,
    Account,
    AccountAddress,
    U64
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

        // ✅ Определяем токен
        let tokenInfo = JOULE_TOKENS.find(t => t.token === token) || {
            token: "0x1::aptos_coin::AptosCoin",
            decimals: 1_000_000_000,
            isFungible: true
        };

        console.log(`✅ Token info found:`, tokenInfo);
        const { decimals } = tokenInfo;

        // ✅ Конвертируем сумму в on-chain формат
        const amountOnChain = new U64(amount * decimals);
        console.log(`🔹 Converted amount: ${amount} → ${amountOnChain} (on-chain)`);

        // ✅ Создаем аккаунт отправителя
        const ed25519Key = new Ed25519PrivateKey(privateKey);
        const senderAccount = Account.fromPrivateKey({
            privateKey: ed25519Key
        });

        console.log("✅ Sender Account derived:", senderAccount.accountAddress.toString());

        // ✅ Проверяем, зарегистрирован ли `CoinStore` у получателя
        console.log(`🔍 Checking if receiver has CoinStore for ${tokenInfo.token}...`);
        let hasCoinStore = true;

        try {
            await aptos.getAccountResource({
                accountAddress: receiver,
                resourceType: `0x1::coin::CoinStore<${tokenInfo.token}>`
            });
            console.log("✅ Receiver has CoinStore!");
        } catch (error) {
            console.warn("⚠️ Receiver does NOT have CoinStore! Registering now...");
            hasCoinStore = false;
        }

        // 🔹 Регистрируем `CoinStore` у получателя, если нужно
        if (!hasCoinStore) {
            const registerTxn = await aptos.transaction.build.simple({
                sender: senderAccount.accountAddress,
                data: {
                    function: "0x1::managed_coin::register",
                    typeArguments: [tokenInfo.token],
                    functionArguments: []
                }
            });

            console.log("🔹 Registering CoinStore...");
            const registerTxHash = await aptos.signAndSubmitTransaction({
                signer: senderAccount,
                transaction: registerTxn
            });

            console.log(`✅ CoinStore registered! Tx: ${registerTxHash.hash}`);
            await aptos.waitForTransaction({ transactionHash: registerTxHash.hash });
        }

        // ✅ Формируем транзакцию перевода
        console.log("🔹 Processing as Coin Transfer...");
        const transaction = await aptos.transaction.build.simple({
            sender: senderAccount.accountAddress,
            data: {
                function: "0x1::coin::transfer",
                typeArguments: [tokenInfo.token],
                functionArguments: [AccountAddress.from(receiver), amountOnChain]
            }
        });

        console.log("✅ Transaction built!");

        // ✅ Подписываем и отправляем транзакцию
        console.log("🔹 Signing and sending transaction...");
        const committedTransaction = await aptos.signAndSubmitTransaction({
            signer: senderAccount,
            transaction
        });

        console.log(`✅ Transaction sent! Hash: ${committedTransaction.hash}`);

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
