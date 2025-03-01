import { tool } from "ai";
import { z } from "zod";

const createAptosWallet = tool({
  description: `
  Creates a new Aptos wallet using an API.
  This tool should only be used when the user explicitly requests to create a new Aptos wallet.
  If the user has already provided a wallet address, do NOT invoke this tool.
  This tool does NOT retrieve existing wallet addresses, it only creates new ones.
`,
  parameters: z.object({}),
  execute: async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/aptos/createWallet`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create Aptos wallet");
      }

      const walletData = await response.json();
      return {
        address: walletData.address,
        privateKeyHex: walletData.privateKeyHex,
        mnemonic: walletData.mnemonic,
      };
    } catch (error) {
      return { error: error.message };
    }
  },
});

export default createAptosWallet;
