import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
    tools: {
      createAptosWallet: tool({
        description: 'Creates a new Aptos wallet using an API.',
        parameters: z.object({}),
        execute: async () => {
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/aptos/createWallet`, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
            });

            if (!response.ok) {
              throw new Error('Failed to create Aptos wallet');
            }

            const walletData = await response.json();

            // Ensure all necessary data is returned
            return {
              address: walletData.address,
              privateKeyHex: walletData.privateKeyHex, // Corrected key name
              mnemonic: walletData.mnemonic, // Added mnemonic
            };
          } catch (error) {
            return { error: error.message };
          }
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}
