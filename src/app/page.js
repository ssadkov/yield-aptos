'use client';

import { useChat } from '@ai-sdk/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useEffect, useRef } from 'react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    maxSteps: 5, // Enables multi-step tool calls
  });

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-2xl shadow-lg bg-white dark:bg-gray-800">
        <CardContent className="p-6 flex flex-col">
          {/* Message Container */}
          <div className="h-[500px] overflow-y-auto space-y-4 p-2 border border-gray-300 dark:border-gray-700 rounded-lg">
            {messages.map((m, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg max-w-[75%] ${
                  m.role === 'user'
                    ? 'bg-blue-500 text-white ml-auto'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              >
                {m.toolInvocations ? (
                  m.toolInvocations.map((tool, i) => (
                    <div key={i} className="p-3 bg-gray-300 dark:bg-gray-800 rounded-lg">
                      <p className="text-gray-700 dark:text-gray-300 font-semibold flex items-center">
                        🔧 {tool.toolName} was invoked
                      </p>

                      {/* Проверяем, что API вернул ВСЕ три поля */}
                      {tool.toolName === 'createAptosWallet' && tool.result?.address && tool.result?.privateKeyHex && tool.result?.mnemonic ? (
                        <div className="mt-2">
                          <p className="text-green-600 dark:text-green-400 font-bold">✅ New Aptos Wallet Created!</p>

                          <p className="mt-1">
                            🏦 <strong>Address:</strong>
                            <code className="block bg-gray-200 dark:bg-gray-700 p-2 rounded text-xs break-all overflow-hidden">
                              {tool.result.address}
                            </code>
                          </p>

                          <p className="mt-1">
                            🔑 <strong>Private Key:</strong>
                            <code className="block bg-gray-200 dark:bg-gray-700 p-2 rounded text-xs break-all overflow-hidden">
                              {tool.result.privateKeyHex}
                            </code>
                          </p>

                          <p className="mt-1">
                            🔐 <strong>Mnemonic:</strong>
                            <code className="block bg-gray-200 dark:bg-gray-700 p-2 rounded text-xs break-words overflow-hidden">
                              {tool.result.mnemonic}
                            </code>
                          </p>
                        </div>
                      ) : (
                        <pre className="whitespace-pre-wrap break-words">{JSON.stringify(tool.result, null, 2)}</pre>
                      )}
                    </div>
                  ))
                ) : (
                  <p>{m.content}</p>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>


          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
            <Input
              className="flex-1"
              value={input}
              placeholder="Type a message or /create-wallet to generate an Aptos wallet"
              onChange={handleInputChange}
            />
            <Button type="submit">Send</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
