import { tool } from "ai";
import { z } from "zod";

const topUpWallet = tool({
  description: "Provides clear instructions on how to top up a specific Aptos wallet, including compatible exchanges and tokens.",
  parameters: z.object({
    address: z.string().describe("The Aptos wallet address to send crypto to."),
  }),
  async execute({ address }) {
    return {
      message: `📥 **How to top up your Aptos wallet**

To fund your wallet **${address}**, copy its address (use the copy button in the sidebar) and send funds from any crypto exchange or Aptos wallet.

💸 You can send any supported token — most commonly **USDT** or **USDC**.  
✅ This wallet supports **gasless transactions**, so sending APT is **not required**.

---

📊 **Exchange & Token Compatibility**

| Exchange | USDT | USDC |
|----------|------|------|
| Binance  | ✅   | ✅   |
| Bybit    | ✅   | ❌   |
| OKX      | ✅   | ❌   |

---

⚠️ **Make sure to select the Aptos network** when withdrawing from the exchange, and double-check the wallet address:  
**${address}**.

Once the funds arrive, you’ll be able to start earning yield through DeFi protocols.`,
    };
  },
});

export default topUpWallet;
