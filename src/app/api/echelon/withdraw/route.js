import { AgentRuntime, LocalSigner } from "move-agent-kit";
import {
    Aptos,
    AptosConfig,
    Ed25519PrivateKey,
    Network,
    PrivateKey,
    Account
} from "@aptos-labs/ts-sdk";
import JOULE_TOKENS from "../../joule/jouleTokens";

const aptosConfig = new AptosConfig({ network: Network.MAINNET });
const aptos = new Aptos(aptosConfig);

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
        return market.market;
    } catch (error) {
        console.error("❌ Error fetching pool address:", error);
        throw error;
    }
}

export async function POST(req) {
    try {
        const requestData = await req.json();
        console.log(`🔹 Full request data:`, requestData);

        const { privateKeyHex, token, amount, useSponsor } = requestData;
        if (!privateKeyHex || !token || !amount) {
            console.error("❌ Missing required parameters:", { privateKeyHex, token, amount });
            return new Response(JSON.stringify({ error: "Missing required parameters" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        console.log(`🔹 Initiating WITHDRAW: ${amount} ${token}`);

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
        const amountOnChain = BigInt(Math.round(amount * decimals));
        console.log(`🔹 Converted amount: ${amount} → ${amountOnChain} (on-chain)`);

        const poolAddress = await getPoolAddress(token);
        if (!poolAddress) {
            return new Response(JSON.stringify({ error: "Pool address not found for token" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const privateKey = new Ed25519PrivateKey(PrivateKey.formatPrivateKey(privateKeyHex, "ed25519"));
        const account = await aptos.deriveAccountFromPrivateKey({ privateKey });
        const signer = new LocalSigner(account, Network.MAINNET);
        const agent = new AgentRuntime(signer, aptos);

        const userBalance = await aptos.getAccountAPTAmount({ accountAddress: account.accountAddress });
        console.log(`✅ User balance check passed: ${userBalance} APT available`);

        let sponsorAccount = null;
        let useSponsorForTransaction = useSponsor || userBalance < 0.01;

        if (useSponsorForTransaction) {
            console.log("⚠️ Using sponsor for transaction...");
            const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY;
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

        const FUNCTIONAL_ARGS_DATA = [poolAddress, amountOnChain];

        const COIN_STANDARD_DATA = {
            function: "0xc6bc659f1649553c1a3fa05d9727433dc03843baac29473c817d06d39e7621ba::scripts::withdraw",
            typeArguments: [token],
            functionArguments: FUNCTIONAL_ARGS_DATA,
        };

        const FUNGIBLE_ASSET_DATA = {
            function: "0xc6bc659f1649553c1a3fa05d9727433dc03843baac29473c817d06d39e7621ba::scripts::withdraw_fa",
            functionArguments: FUNCTIONAL_ARGS_DATA,
        };

        const transactionData = isFungible ? FUNGIBLE_ASSET_DATA : COIN_STANDARD_DATA;
        console.log(`🔹 Transaction data:`, transactionData);

        const transaction = await agent.aptos.transaction.build.simple({
            sender: agent.account.getAddress(),
            withFeePayer: useSponsorForTransaction,
            data: transactionData
        });

        console.log("✅ Transaction built!");

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

        const committedTransaction = await aptos.transaction.submit.simple({
            transaction,
            senderAuthenticator: senderAuth,
            feePayerAuthenticator: feePayerAuth,
        });

        console.log("✅ Submitted transaction hash:", committedTransaction.hash);

        return new Response(JSON.stringify({ transactionHash: committedTransaction.hash }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error("❌ WITHDRAW error:", error);
        return new Response(JSON.stringify({ error: "Failed to execute WITHDRAW transaction" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
