import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import createAptosWallet from "@/app/api/chat/tools/createAptosWallet";
import getPools from "@/app/api/chat/tools/getPools";
import lendAsset from "@/app/api/chat/tools/lendAsset";
import swapAndLendAsset from "./tools/swapLendAsset";
import bestLend from "./tools/bestLendAsset";
//import swapAsset from "./tools/swapAsset";
import walletPositions from "./tools/walletPositions";
import withdrawAsset from "./tools/withdrawAsset";
import transferAsset from "./tools/transferAsset";
import topUpWallet from "./tools/topUpWallet";

export const maxDuration = 30;
export async function POST(req: Request) {
  try {
    const { messages, email, userId } = await req.json();

    if (!email || !userId) {
      console.warn("⚠️ Email or ID not found in request body!");
    } else {
      console.log("✅ Extracted email:", email);
      console.log("✅ Extracted userId:", userId);
    }

    const systemPrompt =
  "You are an AI assistant specialized in finance and cryptocurrency. " +
  "You can only answer questions related to crypto, trading, DeFi, yield farming, and blockchain. " +
  "If the user asks about unrelated topics, politely refuse to answer. " +
  "If the user seems unsure what to do or asks what you can do, mention that they can also use Quick Actions ⚡ below the chat to access common operations like checking balances, creating wallets, or optimizing DeFi strategies.";

  // console.log("🧠 Using system prompt:\n", systemPrompt);


    const result = streamText({
      model: openai("gpt-4.1-nano-2025-04-14"),
      messages,
      system: systemPrompt,
      tools: {
        createAptosWallet,
        getPools,
        lendAsset,
        swapAndLendAsset,
        bestLend,
        walletPositions,
        withdrawAsset,
        // swapAsset,
        transferAsset,
        topUpWallet,
      },
    });
    

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("❌ Fatal error in chat route.ts:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}