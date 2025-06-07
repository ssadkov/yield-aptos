"use client";

import { useChat } from "@ai-sdk/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import PoolsTable from "@/components/PoolsTable";
import LendForm from "@/components/LendForm";
import SwapLendForm from "@/components/SwapLendForm"; // Новый компонент для обмена и лендинга
import { nanoid } from "nanoid";
import dynamic from "next/dynamic";
import { generateMnemonicForUser } from "@/utils/mnemonic";
import { Send, Zap } from "lucide-react"; // Импортируем иконку Send
import BestLendStrategy from "@/components/BestLendStrategy"; // Подключаем компонент BestLendStrategy
import { useSessionData } from "@/context/SessionProvider";
import SwapForm from "@/components/SwapForm"; // Подключаем компонент SwapForm
import BalancesTable from "@/components/WalletTable"; // Подключаем компонент BalancesTable
import WithdrawForm from "@/components/WithdrawForm"; // Подключаем компонент WithdrawForm
import remarkGfm from "remark-gfm";
import TransferForm from "@/components/TransferForm"; // Подключаем компонент TransferForm
import { debounce } from "lodash";

// Отключаем SSR для react-markdown
const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

const toolsRequiringAddress = ["topUpWallet", "walletPositions"];

const presetActions = [
  {
    label: "How can I top up my wallet?",
    tool: "topUpWallet",
    params: {},
    conditions: { loggedIn: true, hasFunds: false }, // Доступно, если у пользователя есть активные позиции
  },
  {
    label: "How can I create crypto wallet?",
    tool: "createYieldWallet",
    conditions: { loggedIn: false }, 
  },{
    label: "Show Top USD Pools",
    tool: "getPools",
    params: { asset: "USD", }, // <-- вот здесь
    conditions: {},
  },
  {
    label: "Show my wallet balance and positions",
    tool: "walletPositions",
    params: {},
    conditions: { loggedIn: true }, // Доступно только если пользователь НЕ залогинен
  },

  {
    label: "Optimize My Lending Strategy",
    tool: "getBestLendOptions",
    params: {},
    conditions: { loggedIn: true, hasPositions: true, hasFunds: true }, // Доступно, если у пользователя есть активные позиции
  },
];


export default function Chat() {
  const { messages, input, handleInputChange, setMessages, append, status, stop } = useChat({
    api: "/api/chat",
    maxSteps: 5,
    onFinish: useCallback((message) => {
      console.log('Message finished:', message);
    }, []),
    onError: useCallback((error) => {
      console.error('Chat error:', error);
    }, []),
    keepLastMessageOnError: true,
    maxRetries: 1,
    body: getInitialSession()
  });

  const { session } = useSessionData();

  // Мемоизируем вычисления
  const lastMessage = useMemo(() => {
    return messages[messages.length - 1];
  }, [messages]);

  // Создаем стабильный обработчик изменения ввода
  const handleInputChangeStable = useCallback((e) => {
    handleInputChange(e);
  }, [handleInputChange]);

  // Стабильный обработчик отправки
  const stableHandleSubmit = useCallback((e) => {
    if (typeof window === 'undefined') return;
    e.preventDefault();
    if (!input.trim() || status === "submitted" || status === "streaming") return;
    
    const email = localStorage.getItem("userEmail");
    const userId = localStorage.getItem("userId");

    console.log("🔄 Sending user message with:", { email, userId, input });

    append(
      { role: "user", content: input }
    );

    handleInputChange({ target: { value: "" } });
  }, [append, input, handleInputChange, status]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (status === "streaming") {
        stop?.();
      }
    };
  }, [status, stop]);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;


  const messagesEndRef = useRef(null);
  const [balances, setBalances] = useState([]);
  const [userAddress, setUserAddress] = useState("");
  const [isLending, setIsLending] = useState(false);
  const [lendSuccess, setLendSuccess] = useState(false);
  const [lendProtocol, setLendProtocol] = useState(null);
  const [lendAmount, setLendAmount] = useState(null);
  const [lendToken, setLendToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(messages.length === 0);





  useEffect(() => {
        console.log("📩 Chat component re-rendered. Current messages:", messages);

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    if (messages.length > 0) {
      setShowQuickActions(false);
    }
  
  }, [messages]);

  useEffect(() => {
    const storedAddress = localStorage.getItem("aptosWalletAddress");
    if (storedAddress) {
      setUserAddress(storedAddress);
      fetchBalances(storedAddress);
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

  const addBotMessage = (message) => {
    setMessages((prev) => [
      ...prev,
      {
        id: nanoid(),
        role: "assistant",
        content: message,
      },
    ]);
  };
  

  // Оптимизированный обработчик клика по Supply
  const handleSupplyClick = useCallback((pool) => {
    if (typeof window === 'undefined') return;
    console.log("Clicked supply pool:", pool);
    const email = localStorage.getItem("userEmail");
    const userId = localStorage.getItem("userId");

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
  }, [balances, handleInputChange, setMessages]);

  // Lend on Protocol in Chat
  const handleLendClick = async (protocol, token, amount) => {
    const email = localStorage.getItem("userEmail");
    const userId = localStorage.getItem("userId");

    if (!email || !userId) {
      alert("❌ User email or ID not found. Please log in.");
      return;
    }

    setIsLending(true);
    addBotMessage(`⏳ Processing lend transaction on ${protocol}...`);

    try {
      const mnemonic = await generateMnemonicForUser(email, userId);
      console.log("🔑 Generated mnemonic:", mnemonic);

      const walletResponse = await fetch("/api/aptos/restoreWalletFromMnemonic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mnemonic }),
      });

      const walletData = await walletResponse.json();

      if (!walletData.privateKeyHex) {
        addBotMessage("❌ Failed to retrieve private key.");
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
        addBotMessage(`❌ Unsupported protocol: ${protocol}`);
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
        requestBody.positionId = "1"; // Здесь можно динамически определять позицию, если надо
      }

      const lendResponse = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const lendData = await lendResponse.json();

      if (lendData.transactionHash) {
        const explorerLink = `https://explorer.aptoslabs.com/txn/${lendData.transactionHash}?network=mainnet`;
        addBotMessage(`✅ Lend transaction successful on ${protocol}!\n🔗 [View on Explorer](${explorerLink})`);

              // Заполняем данные для BestLendStrategy
        setLendProtocol(protocol);
        setLendToken(token);
        setLendAmount(amount);

        
        setLendSuccess(true); // Активируем отображение BestLendStrategy

      } else {
        addBotMessage(`❌ Lend transaction failed on ${protocol}.`);
      }
    } catch (error) {
      console.error(`❌ Error executing lend transaction on ${protocol}:`, error);
      addBotMessage(`❌ Error executing lend transaction on ${protocol}.`);
    } finally {
      setIsLending(false);
    }
  };

  // Handle Swap and Lend
  const handleSwapAndLendClick = async (swapToken, amount, setIsProcessing) => {
    setIsProcessing(true);
    try {
      const message = `🔄 Initiating swap of ${amount} ${swapToken}...`;
      setMessages((prev) => [
        ...prev,
        { id: nanoid(), role: "assistant", content: message },
      ]);

      // Здесь добавьте логику для обмена и последующего лендинга
      console.log(`🔄 Swapping ${swapToken} for ${amount}...`);
      // Пример выполнения обмена...
      // Затем лендим
      console.log(`💰 Lending ${amount} of ${swapToken}`);
    } catch (error) {
      console.error("❌ Error during Swap and Lend:", error);
      setMessages((prev) => [
        ...prev,
        { id: nanoid(), role: "assistant", content: `❌ Error during Swap and Lend: ${error.message}` },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Функция для демонстрации кнопок до начала диалога
  const handleDirectToolAction = async (toolName, params) => {
    // Особый случай — просто выводим пояснение
    if (toolName === "createYieldWallet") {
      const message = `🔐 **To create your AI agent's personal crypto wallet**, you need to **sign in with your Google account** (in mobile version use menu button ☰ 👈 ). Your wallet will then appear in the left menu.
  💰 **After funding it**, you'll gain access to earning features: you can send your assets to DeFi protocols on the Aptos blockchain.  
  📥 **If you prefer**, you can also import the wallet's seed phrase into a crypto wallet like Petra and use it independently. The seed phrase is known only to you — it is generated from your Google account data.
  _Click ⚡to view available Quick actions, or type a command in the input field._`;
  
      // добавим это как assistant-сообщение напрямую
      setMessages((prev) => [
        ...prev,
        { id: nanoid(), role: "assistant", content: message },
      ]);
  
      return;
    }
  
  
    // Все остальные Quick Actions идут через обычный append
    let input = toolName;
  
    if (params && Object.keys(params).length > 0) {
      const paramStr = Object.entries(params)
        .map(([key, value]) => `${key}=${value}`)
        .join(" ");
      input = `${toolName} ${paramStr}`;
    }
  
    try {
      await append({
        role: "user",
        content: input,
      });
    } catch (error) {
      console.error("❌ Error sending quick action:", error);
    }
  };
  
  
  
  

  const filteredActions = presetActions.filter(action => {
    const { loggedIn, hasFunds, hasPositions } = action.conditions || {};
    return (
      (loggedIn === undefined || loggedIn === !!session) &&
      (hasFunds === undefined || hasFunds === (balances.length > 0 && balances.some(b => parseFloat(b.balance) > 0))) // &&
      // (hasPositions === undefined || hasPositions === (positions.length > 0))
    );
  });
  
 

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="flex-1 lg:ml-80 flex flex-col items-center justify-center px-4 pt-16 lg:pt-4">
        <Card className="w-full max-w-3xl shadow-lg bg-white dark:bg-gray-800 flex flex-col h-[calc(100vh-5rem)]">
          <CardContent className="p-6 flex flex-col flex-grow overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-4 p-4">
             
              {/* Если лендинг успешен, отображаем форму BestLendStrategy */}
              {lendSuccess && (
                <BestLendStrategy
                  protocol={lendProtocol} // Передаем протокол
                  token={lendToken} // Передаем токен
                  amount={lendAmount} // Передаем количество
                  onActivateStrategy={() => {
                    // Логика активации стратегии (например, вызвать API для активации)
                    alert("BestLend strategy activated!");
                    setLendSuccess(false); // Сброс состояния после активации
                  }}
                  onCancel={() => {
                    // Логика отмены активации стратегии
                    alert("BestLend strategy canceled!");
                    setLendSuccess(false); // Сброс состояния после отмены
                  }}
                />
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

                        {/* Обработка lending tools */}
                        {(tool.toolName === "lendAsset" || tool.toolName === "bestLend") && tool.result?.token && tool.result?.amount ? (
                          <LendForm
                            protocol={tool.result.protocol}
                            token={tool.result.token}
                            amount={tool.result.amount}
                            apr={tool.result.apr} // Добавляем APR для bestLend
                            onLend={handleLendClick}
                            isLending={isLending}
                          />
                        ) : tool.toolName === "swapAndLendAsset" && tool.result ? (
                          <SwapLendForm
                            protocol={tool.result.protocol}
                            token={tool.result.toToken}
                            swapToken={tool.result.fromToken}
                            amount={tool.result.amount}
                            onSwap={handleSwapAndLendClick} // Используем handleSwapAndLendClick
                            setMessages={setMessages}
                          />
                        ) : tool.toolName === "getPools" && tool.result?.table ? (
                          <PoolsTable
                            pools={tool.result.table}
                            balances={balances}
                            onSupplyClick={handleSupplyClick}
                            setMessages={setMessages}
                            handleInputChange={handleInputChange}
                            append={append} // ✅ передаём
                          />
                        ) : tool.toolName === "swapAsset" && tool.result ? (
                          <SwapForm
                            fromAsset={tool.result.fromAsset}
                            fromProvider={tool.result.fromProvider}
                            fromTokenType={tool.result.fromTokenType}
                            toAsset={tool.result.toAsset}
                            toProvider={tool.result.toProvider}
                            toTokenType={tool.result.toTokenType}
                            amount={tool.result.amount}
                          />
                         ) :tool.toolName === "walletPositions" && tool.result?.table ? (
                            <BalancesTable
                              balances={tool.result.table.filter((row) => row.protocol === "-")} // Фильтруем только балансы (без позиций)
                              positions={tool.result.table.filter((row) => row.protocol !== "-")} // Фильтруем только позиции
                              onSupplyClick={handleSupplyClick}
                              handleInputChange={handleInputChange}
                              setMessages={setMessages}
                            /> 
                        ) : tool.toolName === "withdrawAsset" && tool.result ? (
                          <WithdrawForm
                            protocol={tool.result.protocol}
                            token={tool.result.token}
                            amount={tool.result.amount}
                            setMessages={setMessages}
                          />
                        ) : tool.toolName === "transferAsset" && tool.result ? (
                          <TransferForm
                            token={tool.result.token}
                            amount={tool.result.amount}
                            toAddress={tool.result.toAddress}
                            setMessages={setMessages}                          
                          />
                        ) : tool.result?.message ? (
                          <div className="prose prose-sm dark:prose-invert leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{tool.result.message}</ReactMarkdown>
                          </div>
                        ) : (
                          <pre className="whitespace-pre-wrap break-words overflow-x-auto w-full">
                            {JSON.stringify(tool.result, null, 2)}
                          </pre>
                        )
                        }
                      </div>
                    ))
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ p: "span" }}>{m.content}</ReactMarkdown>
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

 {/* Новые кнопки до старта диалога */}
            {showQuickActions && (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-medium mb-3">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredActions.map((action, index) => {
                    const requiresAddress = toolsRequiringAddress.includes(action.tool);
                    const dynamicParams = requiresAddress
                      ? { ...action.params, address: userAddress }
                      : action.params;

                    return (
                      <button
                        key={index}
                        className="bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-left p-3 rounded-lg shadow-sm transition-colors"
                        onClick={() => handleDirectToolAction(action.tool, dynamicParams)}
                        disabled={requiresAddress && !userAddress}
                      >
                        {action.label}
                      </button>
                    );
                  })}

                </div>
              </div>
            )}


            <form onSubmit={stableHandleSubmit} className="flex gap-2 p-4 border-t">
              <Input className="flex-1 p-2 border rounded-lg" value={input} placeholder="Type a message" onChange={handleInputChangeStable} disabled={status === "submitted" || status === "streaming"} />
              <Button type="submit" className="bg-black text-white" disabled={status === "submitted" || status === "streaming"}>
                <Send className="h-4 w-4" /> {/* Иконка Send */}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowQuickActions(!showQuickActions)}
                title="Show Quick Actions"
                className="p-2"
              >
                <Zap className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const getInitialSession = () => {
  if (typeof window === 'undefined') return null;
  return {
    email: localStorage.getItem("userEmail"),
    userId: localStorage.getItem("userId")
  };
};
