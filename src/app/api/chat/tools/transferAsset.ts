import { tool } from "ai";
import { z } from "zod";

const transferAsset = tool({
  description: "Transfers an asset to a specified Aptos wallet address.",
  parameters: z.object({
    receiver: z.string().describe("The recipient's Aptos wallet address."),
    amount: z.number().describe("The exact amount of the asset to transfer."),
    token: z.string().describe("The token address to transfer (e.g., 0x1::aptos_coin::AptosCoin)."),
  }),
  execute: async ({ receiver, amount, token }) => {
    try {
      console.log("🔍 transferAsset request:", { receiver, amount, token });

      if (!receiver || !token) {
        throw new Error("❌ Receiver address and token must be provided.");
      }

      if (amount <= 0 || isNaN(amount)) throw new Error(`❌ Invalid amount: ${amount}`);

      console.log(`🔄 Transferring ${amount} ${token} to ${receiver}...`);

      // Выполняем API-запрос на отправку перевода
      const response = await fetch("/api/aptos/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privateKey: "retrieved_private_key", receiver, amount, token }),
      });

      const data = await response.json();
      if (!data.transactionHash) {
        throw new Error(data.error || "Unknown error during transfer.");
      }

      console.log(`✅ Transfer successful! Tx: ${data.transactionHash}`);
      return { transactionHash: data.transactionHash };
    } catch (error) {
      return { error: error.message };
    }
  },
});

export default transferAsset;
