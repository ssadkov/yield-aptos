"use client";

import { useChat } from "@ai-sdk/react";
import { appendResponseMessages } from "ai"
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
import PoolsTable from "@/components/PoolsTable";
import { nanoid } from "nanoid"; // ✅ Генерация уникальных ID
import dynamic from "next/dynamic";

// Отключаем SSR для react-markdown
const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

export default function Chat() {
  const email = localStorage.getItem("userEmail");
  const userId = localStorage.getItem("userId");

  console.log("🔄 Sending extraBody:", { email, userId });


  const { messages, input, handleInputChange, handleSubmit, append, setMessages } = useChat({
    api: "/api/chat", // ✅ Указываем API-эндпоинт
    maxSteps: 5,
  });

  const messagesEndRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmitWithUserData = async (e) => {
    e.preventDefault();
  
    const email = localStorage.getItem("userEmail");
    const userId = localStorage.getItem("userId");
  
    if (!email || !userId) {
      alert("❌ User email or ID not found. Please log in.");
      return;
    }
  
    console.log("🔄 Sending user message with:", { email, userId, input });
  
    await append(
      { role: "user", content: input }, // ✅ Оставляем только текст в `content`
      { body: { email, userId } } // ✅ Передаем `email` и `userId` в `body`
    );
  
    handleInputChange({ target: { value: "" } });
  };
  




  const handleSupplyClick = (pool) => {
    console.log("🔄 Supply clicked for:", pool);

    const userBalance = balances.find((b) => b.asset === pool.asset)?.balance || "0";

  
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: nanoid(),
        role: "assistant",
        type: "form", // Теперь это форма
        content: `💰 Enter the amount to supply for ${pool.asset} (${pool.provider}) \n\n 🔗 Token type: ${pool.token}`,
        pool, // Передаем данные о пуле
      },
    ]);

    handleInputChange({
      target: { value: `${userBalance}` },
    });
  

  };
  

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Chat Container */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <Card className="w-full max-w-3xl shadow-lg bg-white dark:bg-gray-800 flex flex-col h-[calc(100vh-6rem)]">
          <CardContent className="p-6 flex flex-col flex-grow overflow-hidden">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto space-y-4 p-4">
              {messages.map((m, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg break-words ${
                    m.toolInvocations
                      ? "bg-gray-300 dark:bg-gray-800 text-gray-900 dark:text-white max-w-full"
                      : m.role === "user"
                      ? "bg-blue-500 text-white max-w-[75%] ml-auto"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white max-w-[75%]"
                  }`}
                >
                  {m.toolInvocations ? (
                    m.toolInvocations.map((tool, i) => (
                      <div key={i} className="p-3 bg-gray-300 dark:bg-gray-800 rounded-lg">
                        <p className="text-gray-700 dark:text-gray-300 font-semibold flex items-center">
                          🔧 {tool.toolName} was invoked
                        </p>
                        {tool.toolName === "getJoulePools" && tool.result?.table ? (
                          <PoolsTable 
                            pools={tool.result.table} 
                            balances={balances} 
                            onSupplyClick={handleSupplyClick} 
                            onBotMessage={handleBotMessage} // ✅ Передаем функцию для отправки сообщений от бота
                          />
                        ) : (
                          <pre className="whitespace-pre-wrap break-words overflow-x-auto w-full">
                            {JSON.stringify(tool.result, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))
                  ) : (
                    <p><ReactMarkdown components={{ p: "span" }}>{m.content}</ReactMarkdown></p>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Field */}
            <form onSubmit={handleSubmitWithUserData} className="flex gap-2 p-4 border-t">
              <Input
                className="flex-1 p-2 border rounded-lg"
                value={input}
                placeholder="Type a message or ask for yield pools"
                onChange={handleInputChange}
              />
              <Button type="submit" className="bg-black text-white">Send</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
