import { AgentRuntime, LocalSigner } from "move-agent-kit";
import {
    Aptos,
    AptosConfig,
    Ed25519PrivateKey,
    Network,
    PrivateKey
} from "@aptos-labs/ts-sdk";
import JOULE_TOKENS from "../../joule/jouleTokens"; // ✅ Используем JOULE_TOKENS вместо ECHELON_TOKENS

const aptosConfig = new AptosConfig({ network: Network.MAINNET });
const aptos = new Aptos(aptosConfig);

/**
 * Получает poolAddress по token из API Echelon
 */
async function getPoolAddress(token) {
    try {
        console.log("🔎 Fetching pool address for token:", token);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/echelon/markets`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch Echelon markets: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.success || !Array.isArray(data.marketData)) {
            throw new Error("Invalid response from Echelon API");
        }

        const market = data.marketData.find(m => m.coin === token);
        if (!market) {
            throw new Error(`Pool address not found for token: ${token}`);
        }

        console.log(`✅ Found pool address for ${token}: ${market.market}`);
        return market.market; // 🏦 Это poolAddress
    } catch (error) {
        console.error("❌ Error fetching pool address:", error);
        throw error;
    }
}

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
            return new Response(JSON.stringify({ error: "Token not found in Echelon pools" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        console.log(`✅ Token info found:`, tokenInfo);
        const { decimals, isFungible } = tokenInfo;

        console.log(`🔹 isFungible: ${isFungible}`);
        const amountOnChain = BigInt(Math.round(amount * decimals));
        console.log(`🔹 Converted amount: ${amount} → ${amountOnChain} (on-chain)`);

        // ✅ Получаем `poolAddress` для `token`
        const poolAddress = await getPoolAddress(token);
        if (!poolAddress) {
            return new Response(JSON.stringify({ error: "Pool address not found for token" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

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

       // 🔹 Формируем данные для транзакции
       const FUNCTIONAL_ARGS_DATA = [poolAddress, amountOnChain];

       const COIN_STANDARD_DATA = {
           function: "0xc6bc659f1649553c1a3fa05d9727433dc03843baac29473c817d06d39e7621ba::scripts::supply",
           typeArguments: [token],
           functionArguments: FUNCTIONAL_ARGS_DATA,
       };

       const FUNGIBLE_ASSET_DATA = {
           function: "0xc6bc659f1649553c1a3fa05d9727433dc03843baac29473c817d06d39e7621ba::scripts::supply_fa",
           functionArguments: FUNCTIONAL_ARGS_DATA,
       };

       //const isFungible = tokenAddress.split("::").length !== 3;
       const transactionData = isFungible ? FUNGIBLE_ASSET_DATA : COIN_STANDARD_DATA;

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
