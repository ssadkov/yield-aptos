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
  const { messages, input, handleInputChange, handleSubmit, append, setMessages } = useChat({
    maxSteps: 5,
  });

  const messagesEndRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);
  const [balances, setBalances] = useState([]);
  const [userAddress, setUserAddress] = useState("");

  

  useEffect(() => {
    setIsMounted(true);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Получаем адрес кошелька из localStorage (его туда сохраняет Sidebar)
  // useEffect(() => {
  //   const storedAddress = localStorage.getItem("aptosWalletAddress");
  //   if (storedAddress) {
  //     setUserAddress(storedAddress);
  //     fetchBalances(storedAddress);
  //   }
  // }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedAddress = localStorage.getItem("aptosWalletAddress");
      if (storedAddress) {
        setUserAddress(storedAddress);
        fetchBalances(storedAddress);
      }
    }
  }, []);
  

  // Функция запроса балансов из API
  const fetchBalances = async (address) => {
    try {
      console.log(`🔄 Fetching balances for ${address}`);
      const res = await fetch(`/api/aptos/balances?address=${address}`);
      const data = await res.json();
      setBalances(data.balances || []);
    } catch (error) {
      console.error("❌ Error fetching balances:", error);
    }
  };

  // Функция для добавления сообщения от бота в чат
  const handleBotMessage = (message) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: nanoid(),
        role: "assistant",
        content: message,
      },
    ]);
  };
  

  const handleSupplyClick = (pool) => {
    const userBalance = balances.find((b) => b.asset === pool.asset)?.balance || "0";
    // const newInput = `Supply ${pool.asset} (${pool.provider}) on Joule Finance in the amount of ${userBalance}`;
    // handleInputChange({ target: { value: newInput } });

    console.log("🔄 Supply clicked for:", pool);

  // ✅ Добавляем серое сообщение в чат с формой ввода
  onBotMessage({
    type: "form", // Указываем, что это форма
    content: `💰 Enter the amount to supply for ${pool.asset} (${pool.provider}):`,
    pool,
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
                    <p>{m.content}</p>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Field */}
            <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t">
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
