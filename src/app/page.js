"use client";

import { useChat } from "@ai-sdk/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
import PoolsTable from "@/components/PoolsTable";
import LendForm from "@/components/LendForm";
import { nanoid } from "nanoid";
import dynamic from "next/dynamic";
import { generateMnemonicForUser } from "@/utils/mnemonic";

// Отключаем SSR для react-markdown
const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, setMessages, append, status } = useChat({ // ✅ Добавлено status
    maxSteps: 5,
  });

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const messagesEndRef = useRef(null);
  const [balances, setBalances] = useState([]);
  const [userAddress, setUserAddress] = useState("");
  const [lendData, setLendData] = useState(null);
  const [isLending, setIsLending] = useState(false);

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

    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: nanoid(),
        role: "assistant",
        type: "form",
        content: `💰 Enter the amount to supply for ${pool.asset} (${pool.provider}) on ${pool.protocol} \n\n 🔗 Token type: ${pool.token}`,
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

    setIsLending(true);
    handleBotMessage("⏳ Processing lend transaction...");

    const mnemonic = generateMnemonicForUser(email, userId);
    console.log("🔑 Generated mnemonic:", mnemonic);

    try {
      const walletResponse = await fetch("/api/aptos/restoreWalletFromMnemonic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mnemonic }),
      });

      const walletData = await walletResponse.json();

      if (!walletData.privateKeyHex) {
        handleBotMessage("❌ Failed to retrieve private key.");
        setIsLending(false);
        return;
      }

      const privateKeyHex = walletData.privateKeyHex;
      console.log("🔑 Private Key Retrieved:", privateKeyHex);

      const lendResponse = await fetch("/api/joule/lend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privateKeyHex,
          token,
          amount,
          positionId: "1234",
        }),
      });

      const lendData = await lendResponse.json();

      if (lendData.transactionHash) {
        const explorerLink = `https://explorer.aptoslabs.com/txn/${lendData.transactionHash}?network=mainnet`;
        handleBotMessage(`✅ Lend transaction successful!\n🔗 [View on Explorer](${explorerLink})`);
      } else {
        handleBotMessage("❌ Lend transaction failed.");
      }
    } catch (error) {
      console.error("❌ Error executing lend transaction:", error);
      handleBotMessage("❌ Error executing lend transaction.");
    } finally {
      setIsLending(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="flex-1 lg:ml-80 flex flex-col items-center justify-center px-4 pt-16 lg:pt-4">
        <Card className="w-full max-w-3xl shadow-lg bg-white dark:bg-gray-800 flex flex-col h-[calc(100vh-5rem)]">
          <CardContent className="p-6 flex flex-col flex-grow overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-4 p-4">
              {messages.map((m, index) => (
                <div key={index} className={`p-3 rounded-lg break-words ${
                  m.toolInvocations
                    ? "bg-gray-300 dark:bg-gray-800 text-gray-900 dark:text-white max-w-full"
                    : m.role === "user"
                    ? "bg-blue-500 text-white max-w-[75%] ml-auto"
                    : "bg-gray-200 dark:bg-gray-700 text-black dark:text-gray-300 max-w-[75%]"
                }`}>
                  {m.toolInvocations ? (
                    m.toolInvocations.map((tool, i) => (
                      <div key={i} className="p-3 bg-gray-300 dark:bg-gray-800 rounded-lg">
                        <p className="text-gray-700 dark:text-gray-300 font-semibold flex items-center">
                          🔧 {tool.toolName} was invoked
                        </p>
                        {tool.toolName === "lendOnJoule" && tool.result?.token && tool.result?.amount ? (
                          <LendForm token={tool.result.token} amount={tool.result.amount} onLend={handleLendClick} isLending={isLending} />
                        ) : tool.toolName === "getPools" && tool.result?.table ? (
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
                    <ReactMarkdown components={{ p: "span" }}>{m.content}</ReactMarkdown>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {status === "submitted" || status === "streaming" ? ( // ✅ Показываем GIF и текст во время обработки
              <div className="flex items-center justify-center gap-2">
                <img src="/20250304_0256_Futuristic Crypto .gif" alt="AI is thinking..." />
                <p className="text-gray-500 dark:text-gray-400"> Yield-AI is thinking...</p>
              </div>
            ) : null}


            <form onSubmit={handleSubmitWithUserData} className="flex gap-2 p-4 border-t">
              <Input className="flex-1 p-2 border rounded-lg" value={input} placeholder="Type a message" onChange={handleInputChange} disabled={status === "submitted" || status === "streaming"} />
              <Button type="submit" className="bg-black text-white" disabled={status === "submitted" || status === "streaming"}>Send</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
