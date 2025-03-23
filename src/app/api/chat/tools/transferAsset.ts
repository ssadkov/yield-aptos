import { tool } from "ai";
import { z } from "zod";

const transferAsset = tool({
  description: "Prepares a transfer by returning token, amount, and destination address.",
  parameters: z.object({
    token: z.string().describe("Token address to transfer."),
    amount: z.string().describe("Amount to transfer."),
    toAddress: z.string().describe("Recipient Aptos wallet address."),
  }),
  async execute({ token, amount, toAddress }) {
    return {
      token,
      amount,
      toAddress,
      message: `You are about to transfer **${amount}** of **${token}** to:\n\n\`${toAddress}\`\n\nUse your wallet to complete the transaction.`,
    };
  },
});

export default transferAsset;
