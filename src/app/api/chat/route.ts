import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import createAptosWallet from "@/app/api/chat/tools/createAptosWallet";
import getPools from "@/app/api/chat/tools/getPools";
import lendAsset from "@/app/api/chat/tools/lendAsset";
import swapAndLendAsset from "./tools/swapLendAsset";
import bestLend from "./tools/bestLendAsset";
import swapAsset from "./tools/swapAsset";

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

    const result = streamText({
      model: openai("gpt-4o"),
      messages,
      system:
      "You are an AI assistant specialized in finance and cryptocurrency. " +
      "You can answer only questions related to crypto, trading, DeFi, yield farming, and blockchain. " +
      "If the user asks about other topics, politely refuse to answer.",
      tools: {
        createAptosWallet,
        getPools,
        lendAsset,
        swapAndLendAsset,
        bestLend,
        swapAsset,
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("❌ Fatal error in chat route.ts:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}