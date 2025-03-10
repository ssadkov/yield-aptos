"use client";

import { useChat } from "@ai-sdk/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
import PoolsTable from "@/components/PoolsTable";
import LendForm from "@/components/LendForm";
import SwapLendForm from "@/components/SwapLendForm"; // Новый компонент для обмена и лендинга
import { nanoid } from "nanoid";
import dynamic from "next/dynamic";
import { generateMnemonicForUser } from "@/utils/mnemonic";
import { Send } from "lucide-react"; // Импортируем иконку Send

// Отключаем SSR для react-markdown
const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

const presetActions = [
  {
    label: "Show Top Yield Pools",
    tool: "getPools",
    params: { limit: 5, sortBy: "apy" },
  },
  {
    label: "Create new Aptos wallet",
    tool: "createAptosWallet",
    params: { },
  },
  {
    label: "Show My Positions",
    tool: "getPositions",
    params: {},
  },
  {
    label: "Swap & Lend Guide",
    tool: "getSwapLendOptions",
    params: { minApy: 5 },
  },
]

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, setMessages, append, status } = useChat({
    maxSteps: 5,
  });

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const messagesEndRef = useRef(null);
  const [balances, setBalances] = useState([]);
  const [userAddress, setUserAddress] = useState("");
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
    document.title = "Yield-A | AI Yield Optimizer on Aptos";
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
        content: `💰 Enter the amount to supply for ${pool.asset} (${pool.provider}) on ${pool.protocol} \n\n 🔗 Token type: ${pool.token} with APR: ${pool.totalAPY}`,
        pool,
      },
    ]);

    handleInputChange({
      target: { value: `${userBalance}` },
    });
  };

  // Lend on Protocol in Chat
  const handleLendClick = async (protocol, token, amount) => {
    const email = localStorage.getItem("userEmail");
    const userId = localStorage.getItem("userId");

    if (!email || !userId) {
      alert("❌ User email or ID not found. Please log in.");
      return;
    }

    setIsLending(true);
    handleBotMessage(`⏳ Processing lend transaction on ${protocol}...`);

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

      // Выбираем API в зависимости от протокола
      const apiEndpoint =
        protocol === "Joule"
          ? "/api/joule/lend"
          : protocol === "Echelon"
          ? "/api/echelon/lend"
          : null;

      if (!apiEndpoint) {
        handleBotMessage(`❌ Unsupported protocol: ${protocol}`);
        setIsLending(false);
        return;
      }

      // Формируем payload для запроса
      const requestBody = {
        privateKeyHex,
        token,
        amount,
      };

      // Только для Joule добавляем positionId
      if (protocol === "Joule") {
        requestBody.positionId = "1234"; // Здесь можно динамически определять позицию, если надо
      }

      const lendResponse = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const lendData = await lendResponse.json();

      if (lendData.transactionHash) {
        const explorerLink = `https://explorer.aptoslabs.com/txn/${lendData.transactionHash}?network=mainnet`;
        handleBotMessage(`✅ Lend transaction successful on ${protocol}!\n🔗 [View on Explorer](${explorerLink})`);
      } else {
        handleBotMessage(`❌ Lend transaction failed on ${protocol}.`);
      }
    } catch (error) {
      console.error(`❌ Error executing lend transaction on ${protocol}:`, error);
      handleBotMessage(`❌ Error executing lend transaction on ${protocol}.`);
    } finally {
      setIsLending(false);
    }
  };

  // Handle Swap and Lend
  const handleSwapAndLendClick = async (swapToken, amount, setIsProcessing) => {
    setIsProcessing(true);
    // Здесь добавьте логику для обмена и последующего лендинга, как в вашем туле
    try {
      // Пример: Выполнить обмен, а затем лендить
      console.log(`🔄 Swapping ${swapToken} for ${amount}...`);
      // Пример выполнения обмена...
      // Затем лендим
      console.log(`💰 Lending ${amount} of ${swapToken}`);
    } catch (error) {
      console.error("❌ Error during Swap and Lend:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Функция для демонстрации кнопок до начала диалога
  const handleDirectToolAction = async (toolName, params) => {
    const email = localStorage.getItem("userEmail")
    const userId = localStorage.getItem("userId")

    if (!email || !userId) {
      alert("❌ User email or ID not found. Please log in.")
      return
    }

    // Add user message showing what action they took
    const userMessage = {
      id: nanoid(),
      role: "user",
      content: `Show me ${toolName.replace(/([A-Z])/g, " $1").toLowerCase()} ${JSON.stringify(params)}`.trim(),
    }

    setMessages((prevMessages) => [...prevMessages, userMessage])

    // Show loading message
    handleBotMessage("⏳ Processing your request...")

    try {
      // Call the tool directly without using AI
      const response = await fetch("/api/direct-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: toolName,
          params,
          email,
          userId,
        }),
      })

      if (!response.ok) throw new Error("Tool execution failed")

      const result = await response.json()

      // Remove the loading message
      setMessages((prev) => prev.filter((msg) => msg.content !== "⏳ Processing your request..."))

      // Add the tool result as a special message type
      setMessages((prev) => [
        ...prev,
        {
          id: nanoid(),
          role: "assistant",
          toolInvocations: [
            {
              toolName: toolName,
              result: result.data,
            },
          ],
        },
      ])
    } catch (error) {
      console.error("❌ Error executing direct tool:", error)
      // Remove the loading message and show error
      setMessages((prev) => prev.filter((msg) => msg.content !== "⏳ Processing your request..."))
      handleBotMessage("❌ Sorry, there was an error processing your request.")
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="flex-1 lg:ml-80 flex flex-col items-center justify-center px-4 pt-16 lg:pt-4">
        <Card className="w-full max-w-3xl shadow-lg bg-white dark:bg-gray-800 flex flex-col h-[calc(100vh-5rem)]">
          <CardContent className="p-6 flex flex-col flex-grow overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-4 p-4">
              {/* Новые кнопки до старта диалога */}
              {messages.length === 0 && (
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4">
                  <h3 className="text-lg font-medium mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                   {presetActions.map((action, index) => (
                   <button
                  key={index}
                  className="bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-left p-3 rounded-lg shadow-sm transition-colors"
                  onClick={() => handleDirectToolAction(action.tool, action.params)}
                   >
                  {action.label}
                </button>
              ))}
            </div>
                </div>
              )}

              {messages.map((m, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg break-words ${
                    m.toolInvocations
                      ? "bg-gray-300 dark:bg-gray-800 text-gray-900 dark:text-white max-w-full"
                      : m.role === "user"
                      ? "bg-blue-500 text-white max-w-[75%] ml-auto"
                      : "bg-gray-200 dark:bg-gray-700 text-black dark:text-gray-300 max-w-[75%]"
                  }`}
                >
                  {m.toolInvocations ? (
                    m.toolInvocations.map((tool, i) => (
                      <div key={i} className="p-3 bg-gray-300 dark:bg-gray-800 rounded-lg">
                        <p className="text-gray-700 dark:text-gray-300 font-semibold flex items-center">
                          🔧 {tool.toolName} was invoked
                        </p>
                        {(tool.toolName === "lendAsset" || tool.toolName === "bestLend") && tool.result?.token && tool.result?.amount ? (
                          <LendForm
                            protocol={tool.result.protocol}
                            token={tool.result.token}
                            amount={tool.result.amount}
                            apr={tool.result.apr} // Добавляем APR для bestLend
                            onLend={handleLendClick}
                            isLending={isLending}
                          />
                        )  : tool.toolName === "swapAndLendAsset" && tool.result ? (
                          <SwapLendForm
                            protocol={tool.result.protocol}
                            token={tool.result.token}
                            swapToken={tool.result.swapToken}
                            amount={tool.result.amount}
                            onSwap={handleSwapAndLendClick} // Используем handleSwapAndLendClick
                          />
                        ) : tool.toolName === "getPools" && tool.result?.table ? (
                          <PoolsTable
                            pools={tool.result.table}
                            balances={balances}
                            onSupplyClick={handleSupplyClick}
                            onBotMessage={handleBotMessage}
                            setMessages={setMessages}
                            handleInputChange={handleInputChange}
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

            {status === "submitted" || status === "streaming" ? (
              <div className="flex items-center justify-center gap-2">
                <img src="/20250304_0256_Futuristic Crypto .gif" alt="AI is thinking..." />
                <p className="text-gray-500 dark:text-gray-400"> Yield-AI is thinking...</p>
              </div>
            ) : null}

            <form onSubmit={handleSubmitWithUserData} className="flex gap-2 p-4 border-t">
              <Input className="flex-1 p-2 border rounded-lg" value={input} placeholder="Type a message" onChange={handleInputChange} disabled={status === "submitted" || status === "streaming"} />
              <Button type="submit" className="bg-black text-white" disabled={status === "submitted" || status === "streaming"}>
                <Send className="h-4 w-4" /> {/* Иконка Send */}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
