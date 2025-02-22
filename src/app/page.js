'use client';

import { useChat } from '@ai-sdk/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Отключаем SSR для react-markdown
const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false });

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    maxSteps: 5,
  });

  const messagesEndRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-3xl shadow-lg bg-white dark:bg-gray-800">
        <CardContent className="p-6 flex flex-col">

          {/* Контейнер сообщений */}
          <div className="h-[600px] md:h-[700px] overflow-y-auto space-y-4 p-2 border border-gray-300 dark:border-gray-700 rounded-lg">
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

                      {/* Вывод таблицы для getJoulePools */}
                      {tool.toolName === 'getJoulePools' && tool.result?.table ? (
                        <div className="mt-2 overflow-x-auto">
                          <p className="text-green-600 dark:text-green-400 font-bold">
                            ✅ Yield Pools for {tool.result.table[0]?.asset}
                          </p>

                          <table className="w-full border-collapse border border-gray-400 dark:border-gray-600">
                            <thead>
                              <tr className="bg-gray-500 dark:bg-gray-700 text-white">
                                <th className="border border-gray-400 p-2">Asset</th>
                                <th className="border border-gray-400 p-2">Provider</th>
                                <th className="border border-gray-400 p-2">Total APY</th>
                                <th className="border border-gray-400 p-2">Deposit APY</th>
                                <th className="border border-gray-400 p-2">Extra APY</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tool.result.table.map((row, idx) => (
                                <tr key={idx} className="bg-white dark:bg-gray-800">
                                  <td className="border border-gray-400 p-2">{row.asset}</td>
                                  <td className="border border-gray-400 p-2">{row.provider}</td>
                                  <td className="border border-gray-400 p-2 font-bold">
                                    {parseFloat(row.totalAPY).toFixed(2)}%
                                  </td>
                                  <td className="border border-gray-400 p-2">
                                    {parseFloat(row.depositApy).toFixed(2)}%
                                  </td>
                                  <td className="border border-gray-400 p-2">
                                    {parseFloat(row.extraAPY).toFixed(2)}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          <p className="mt-2 text-blue-600 dark:text-blue-400">
                            <a
                              href="https://app.joule.finance/market"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              🔗 More details on Joule Finance
                            </a>
                          </p>
                        </div>
                      ) : (
                        <pre className="whitespace-pre-wrap break-words">{JSON.stringify(tool.result, null, 2)}</pre>
                      )}
                    </div>
                  ))
                ) : (
                  isMounted ? (
                    <div dangerouslySetInnerHTML={{ __html: m.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                  ) : (
                    <p>{m.content}</p>
                  )
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
              placeholder="Type a message or ask for yield pools (e.g., 'Show USD pools')"
              onChange={handleInputChange}
            />
            <Button type="submit">Send</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
