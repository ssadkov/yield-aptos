"use client";

import { useChat } from "@ai-sdk/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
import PoolsTable from "@/components/PoolsTable";
import LendForm from "@/components/LendForm"; // ✅ Импортируем LendForm
import { nanoid } from "nanoid";
import dynamic from "next/dynamic";
import { generateMnemonicForUser } from "@/utils/mnemonic"; // ✅ Импортируем функцию генерации мнемоники


// Отключаем SSR для react-markdown
const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, setMessages, append } = useChat({
    maxSteps: 5,
  });

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const messagesEndRef = useRef(null);
  const [balances, setBalances] = useState([]);
  const [userAddress, setUserAddress] = useState("");
  const [lendData, setLendData] = useState(null); // ✅ Добавляем состояние для ленда

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedAddress = localStorage.getItem("aptosWalletAddress");
      if (storedAddress) {
        setUserAddress(storedAddress);
        fetchBalances(storedAddress);
      }
    }
  }, []);

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
      { role: "user", content: input },
      { body: { email, userId } }
    );

    handleInputChange({ target: { value: "" } });
  };

  const handleSupplyClick = (pool) => {
    console.log("🔄 Supply clicked for:", pool);
  
    const userBalance = balances.find((b) => b.asset === pool.asset)?.balance || "0";
  
    // 🔧 Теперь сообщение всегда добавляется, без проверки на дублирование
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: nanoid(),
        role: "assistant",
        type: "form",
        content: `💰 Enter the amount to supply for ${pool.asset} (${pool.provider}) \n\n 🔗 Token type: ${pool.token}`,
        pool,
      },
    ]);
  
    handleInputChange({
      target: { value: `${userBalance}` },
    });
  };

  
  const handleLendClick = async (token, amount) => {
    const email = localStorage.getItem("userEmail");
    const userId = localStorage.getItem("userId");
  
    if (!email || !userId) {
      alert("❌ User email or ID not found. Please log in.");
      return;
    }
  
    // ✅ Генерируем мнемонику на основе userEmail и userId
    const mnemonic = generateMnemonicForUser(email, userId);
    console.log("🔑 Generated mnemonic:", mnemonic);
  
    try {
      const response = await fetch("/api/aptos/restoreWalletFromMnemonic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mnemonic }),
      });
  
      const data = await response.json();
      
      if (data.privateKeyHex) {
        alert(`🔑 Private Key: ${data.privateKeyHex}`);
      } else {
        alert("❌ Failed to retrieve private key.");
      }
    } catch (error) {
      console.error("❌ Error retrieving private key:", error);
      alert("❌ Error retrieving private key.");
    }
  };
  
  

  const handleLendResponse = (data) => {
    console.log("🔹 Lend Response:", data);
    setLendData(data); // ✅ Сохраняем данные для ленда
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <Card className="w-full max-w-3xl shadow-lg bg-white dark:bg-gray-800 flex flex-col h-[calc(100vh-6rem)]">
          <CardContent className="p-6 flex flex-col flex-grow overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-4 p-4">
              {messages.map((m, index) => (
                <div key={index} className={`p-3 rounded-lg break-words ${
                  m.toolInvocations
                    ? "bg-gray-300 dark:bg-gray-800 text-gray-900 dark:text-white max-w-full"
                    : m.role === "user"
                    ? "bg-blue-500 text-white max-w-[75%] ml-auto" // ✅ Белый шрифт для пользователя
                    : "bg-gray-200 dark:bg-gray-700 text-black dark:text-gray-300 max-w-[75%]" // ✅ Чёрный шрифт для бота
                }`}>
                  {m.toolInvocations ? (
                    m.toolInvocations.map((tool, i) => (
                      <div key={i} className="p-3 bg-gray-300 dark:bg-gray-800 rounded-lg">
                        <p className="text-gray-700 dark:text-gray-300 font-semibold flex items-center">
                          🔧 {tool.toolName} was invoked
                        </p>
                        {tool.toolName === "lendOnJoule" ? (
                          <>
                            <pre className="whitespace-pre-wrap break-words overflow-x-auto w-full">
                              {JSON.stringify(tool.result, null, 2)}
                            </pre>
                            {tool.result?.token && tool.result?.amount && (
                              <LendForm token={tool.result.token} amount={tool.result.amount} onLendClick={handleLendClick} />
                            )}
                          </>
                        ) : tool.toolName === "getJoulePools" && tool.result?.table ? (
                          <PoolsTable
                            pools={tool.result.table}
                            balances={balances}
                            onSupplyClick={handleSupplyClick}
                            onBotMessage={handleBotMessage}
                          />
                        ) : (
                          <pre className="whitespace-pre-wrap break-words overflow-x-auto w-full">
                            {JSON.stringify(tool.result, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className={m.role === "user" ? "text-white" : "text-black dark:text-gray-300"}>
                      <ReactMarkdown components={{ p: "span" }}>{m.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmitWithUserData} className="flex gap-2 p-4 border-t">
              <Input className="flex-1 p-2 border rounded-lg" value={input} placeholder="Type a message" onChange={handleInputChange} />
              <Button type="submit" className="bg-black text-white">Send</Button>
            </form>

            {/* ✅ Вставляем форму ленда после обработки lendOnJoule */}
            {lendData && <LendForm token={lendData.token} amount={lendData.amount} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
