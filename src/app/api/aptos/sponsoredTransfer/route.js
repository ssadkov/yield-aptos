import {
    Account,
    Aptos,
    AptosConfig,
    Ed25519PrivateKey,
    Network,
    SigningScheme,
    U64
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
        let tokenInfo = JOULE_TOKENS.find(t => t.token === token);
        if (!tokenInfo) {
            return new Response(JSON.stringify({ error: "Token not found in JOULE_TOKENS" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        console.log(`✅ Token info found:`, tokenInfo);
        const { decimals, isFungible } = tokenInfo;

        // ✅ Конвертируем сумму в on-chain формат
        const amountOnChain = new U64(amount * decimals);
        console.log(`🔹 Converted amount: ${amount} → ${amountOnChain} (on-chain)`);

        // ✅ Создаём аккаунт отправителя
        const ed25519Key = new Ed25519PrivateKey(privateKey);
        const senderAccount = Account.fromPrivateKey({ privateKey: ed25519Key, scheme: SigningScheme.Ed25519 });

        console.log("✅ Sender Account derived:", senderAccount.accountAddress.toString());

        // ✅ Определяем спонсора (если `useSponsor = true`)
        let sponsorAccount;
        if (useSponsor) {
            const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY;
            if (!sponsorPrivateKey) {
                console.error("❌ Sponsor private key is missing");
                return new Response(JSON.stringify({ error: "Sponsor private key is missing" }), {
                    status: 500,
                    headers: { "Content-Type": "application/json" }
                });
            }

            const sponsorEdKey = new Ed25519PrivateKey(sponsorPrivateKey);
            sponsorAccount = Account.fromPrivateKey({ privateKey: sponsorEdKey, scheme: SigningScheme.Ed25519 });

            console.log("✅ Sponsor Account derived:", sponsorAccount.accountAddress.toString());
        }

        // ✅ Проверяем, существует ли аккаунт получателя
        let receiverExists = true;
        try {
            await aptos.getAccountResource({ accountAddress: receiver, resourceType: "0x1::account::Account" });
            console.log("✅ Receiver account exists!");
        } catch (error) {
            console.log("⚠️ Receiver account does NOT exist! Creating account...");

            const createAccountTxn = await aptos.transaction.build.simple({
                sender: senderAccount.accountAddress,
                data: {
                    function: "0x1::aptos_account::transfer",
                    functionArguments: [receiver, 0]
                }
            });

            console.log("🔹 Sending account creation transaction...");
            const createAccountTxHash = await aptos.signAndSubmitTransaction({
                signer: senderAccount,
                transaction: createAccountTxn
            });

            console.log(`✅ Account created! Tx: ${createAccountTxHash.hash}`);
            await aptos.waitForTransaction({ transactionHash: createAccountTxHash.hash });

            receiverExists = false;
        }

        // ✅ Проверяем `CoinStore`, если передаётся Coin
        if (!isFungible) {
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

            // if (!hasCoinStore) {
            //     const registerTxn = await aptos.transaction.build.simple({
            //         sender: senderAccount.accountAddress,
            //         data: {
            //             function: "0x1::managed_coin::register",
            //             typeArguments: [tokenInfo.token],
            //             functionArguments: []
            //         }
            //     });

            //     console.log("🔹 Registering CoinStore...");
            //     const registerTxHash = await aptos.signAndSubmitTransaction({
            //         signer: senderAccount,
            //         transaction: registerTxn
            //     });

            //     console.log(`✅ CoinStore registered! Tx: ${registerTxHash.hash}`);
            //     await aptos.waitForTransaction({ transactionHash: registerTxHash.hash });
            // }
        }

        // ✅ Формируем данные для транзакции
        let transactionData;
        let typeArguments = [];

        if (isFungible) {
            console.log("🔹 Processing as Fungible Asset Transfer...");
            transactionData = {
                function: "0x1::fungible_asset::transfer_with_fee_payer",
                functionArguments: [receiver, amountOnChain]
            };
            typeArguments = [tokenInfo.token];
        } else {
            console.log("🔹 Processing as Coin Transfer...");
            transactionData = {
                function: "0x1::aptos_account::transfer_coins",
                typeArguments: [tokenInfo.token],
                functionArguments: [receiver, amountOnChain]
            };
        }

        console.log("🔹 Transaction data:", transactionData);
        console.log("🔹 Type Arguments:", typeArguments);

        // ✅ 1. Строим транзакцию
        const transaction = await aptos.transaction.build.simple({
            sender: senderAccount.accountAddress,
            withFeePayer: useSponsor,
            data: transactionData,
            typeArguments: typeArguments
        });

        // ✅ 2. Подписываем транзакцию отправителем
        const senderAuth = await aptos.transaction.sign({ signer: senderAccount, transaction });

        let feePayerAuth = null;
        if (useSponsor) {
            console.log("⚠️ Using sponsored transaction...");
            feePayerAuth = await aptos.transaction.signAsFeePayer({ signer: sponsorAccount, transaction });
        }

        // ✅ 3. Отправляем транзакцию
        const committedTransaction = await aptos.transaction.submit.simple({
            transaction,
            senderAuthenticator: senderAuth,
            feePayerAuthenticator: feePayerAuth
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
