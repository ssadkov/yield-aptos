import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import createAptosWallet from "@/app/api/chat/tools/createAptosWallet";
import getJoulePools from "@/app/api/chat/tools/getJoulePools";
import lendOnJoule from "@/app/api/chat/tools/lendOnJoule";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, email, userId } = await req.json();

    console.log("🔹 Full request body received:", JSON.stringify({ messages, email, userId }, null, 2));

    if (email && userId) {
      console.log("✅ Extracted email:", email);
      console.log("✅ Extracted userId:", userId);
    } else {
      console.warn("⚠️ Email or ID not found in request body!");
    }

//   console.log("🔹 Full messages received:", JSON.stringify(messages, null, 2));


    const result = streamText({
      model: openai("gpt-4o"),
      messages,
      tools: {
        createAptosWallet,
        getJoulePools,
        lendOnJoule,
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("❌ Fatal error in chat route.ts:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

