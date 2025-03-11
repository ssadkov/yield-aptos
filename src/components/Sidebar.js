"use client";

import { useState, useEffect } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Menu, X, Copy, RefreshCw, Eye, Globe, LogOut } from "lucide-react";
import { generateMnemonicForUser } from "@/utils/mnemonic";
import toast, { Toaster } from "react-hot-toast";
import JOULE_TOKENS from "@/app/api/joule/jouleTokens";


export default function Sidebar() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [aptosAddress, setAptosAddress] = useState("");
  const [mnemonic, setMnemonic] = useState("");
  const [balances, setBalances] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStrategy, setLoadingStrategy] = useState({});


  useEffect(() => {
    if (session) {
      const generatedMnemonic = generateMnemonicForUser(session.user.email, session.user.id);
      localStorage.setItem("userEmail", session.user.email);
      localStorage.setItem("userId", session.user.id);
      setMnemonic(generatedMnemonic);

      fetch("/api/aptos/restoreWalletFromMnemonic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mnemonic: generatedMnemonic }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.address) {
            setAptosAddress(data.address);
            localStorage.setItem("aptosWalletAddress", data.address);
            fetchBalances(data.address);
            fetchUserPositions(data.address);
          } else {
            console.error("API Error:", data.error);
          }
        })
        .catch((err) => console.error("Request error:", err));
    }
  }, [session]);

  const fetchBalances = async (address = aptosAddress) => {
    if (!address) {
      toast.error("Wallet address not found!");
      return;
    }

    setLoading(true);
    try {
      console.log(`🔄 Updating balances for ${address}`);
      const res = await fetch(`/api/aptos/balances?address=${address}`);
      const data = await res.json();
      setBalances(data.balances || []);
      toast.success("Assets updated!");

      // ✅ Обновляем и позиции пользователя !
      await fetchUserPositions(address);
    } catch (error) {
      console.error("❌ Balance update error:", error);
      toast.error("Error loading balances");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPositions = async (address) => {
    if (!address) return;
  
    try {
      console.log(`🔄 Fetching user positions for ${address}`);
  
      // Запрос данных по Joule
      const resJoule = await fetch(`/api/joule/userPositions?address=${address}`);
      const dataJoule = await resJoule.json();
      console.log("📊 Raw Joule positions:", dataJoule.userPositions);
  
      let joulePositions = [];
      if (dataJoule?.userPositions?.length > 0) {
        joulePositions = dataJoule.userPositions[0].positions_map.data.flatMap((position) =>
          position.value.lend_positions.data.map((pos) => {
            const tokenData = getTokenData(pos.key);
            return {
              token: tokenData.assetName,
              amount: formatAmount(pos.value, tokenData.decimals),
              provider: tokenData.provider,
              protocol: "Joule",
              tokenType: pos.key,
            };
          })
        );
      }
  
      // Запрос данных по Echelon
      const echelonPositions = await fetchEchelonPositions(address);
  
          // Объединяем позиции
    const positions = [...joulePositions, ...echelonPositions];

    // ✅ Вывод итоговых позиций в консоль
    console.log("📊 Final positions:", positions);
    setPositions([...joulePositions, ...echelonPositions]);

    return [];

    } catch (error) {
      console.error("❌ Error fetching positions:", error);
      return [];
    }
  };
  
  const fetchEchelonPositions = async (address) => {
    try {
      console.log(`🔄 Fetching Echelon positions for ${address}`);
      const res = await fetch(`/api/echelon/userPositions?address=${address}`);
      const data = await res.json();
  
      console.log("📊 Raw Echelon positions:", data.userPositions);
  
      if (!data?.userPositions?.length) return [];
  
      return data.userPositions.map((pos) => {
        const tokenData = getTokenData(pos.coin);
        return {
          token: tokenData.assetName,
          amount: formatAmount(pos.supply, tokenData.decimals),
          provider: tokenData.provider,
          protocol: "Echelon",
          tokenType: pos.coin,
        };
      });
    } catch (error) {
      console.error("❌ Error fetching Echelon positions:", error);
      return [];
    }
  };
  
  // Универсальная функция для получения данных токена (работает и для Joule, и для Echelon)
  const getTokenData = (key) => {
    const formattedKey = key.startsWith("@") ? key.replace("@", "0x") : key;
    const tokenData = JOULE_TOKENS.find((t) => t.token === formattedKey) || {};
  
    return {
      assetName: tokenData.assetName || formattedKey.slice(0, 6) + "..." + formattedKey.slice(-6),
      provider: tokenData.provider || "Unknown Provider",
      decimals: tokenData.decimals || 1e6, // По умолчанию 1e6, если не найдено в JOULE_TOKENS
    };
  };
  
  // Форматируем сумму токенов с учётом decimals
  const formatAmount = (value, decimals) => (parseFloat(value) / decimals).toFixed(2);
  
  

  const copyToClipboard = () => {
    navigator.clipboard.writeText(aptosAddress);
    toast.success("Aptos Address copied!");
  };

  const formatAddress = (address) =>
    address ? `${address.slice(0, 5)}.......${address.slice(-4)}` : "Loading...";


  const handleBestLendStrategy = async (pos) => {
    if (!session) {
      toast.error("You need to be signed in to save the strategy.");
      return;
    }
  
    // Включаем индикатор загрузки
    setLoadingStrategy((prev) => ({ ...prev, [pos.token]: true }));

    console.log("Sending data:", {
      email: session?.user?.email,
      userId: session?.user?.id,
      tokenType: pos.tokenType,
      protocol: pos.protocol,
      amount: pos.amount,
      startDate: new Date().toISOString(),
      enabled: 1,
      strategyType: "bestlend",
    });
    
  
    try {
      const response = await fetch("/api/strategy/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session.user.email,
          userId: session.user.id,
          tokenType: pos.tokenType,
          protocol: pos.protocol,
          amount: pos.amount,
          startDate: new Date().toISOString(),
          enabled: 1,
          strategyType: "bestlend",
        }),
      });
  
      if (response.ok) {
        toast.success("Strategy saved successfully!");
      } else {
        const errorData = await response.json();
        toast.error(`Failed to save: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("❌ Error saving strategy:", error);
      toast.error("Error saving strategy.");
    } finally {
      // Отключаем индикатор загрузки
      setLoadingStrategy((prev) => ({ ...prev, [pos.token]: false }));
    }
  };
  
  console.log("📊 Rendered positions in UI:", positions);


  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />

      {isOpen && (
        <div className="fixed inset-0 bg-black opacity-50 z-40 lg:hidden" onClick={() => setIsOpen(false)}></div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-gray-800 text-white shadow lg:hidden flex items-center"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-gray-100 dark:bg-gray-900 transition-transform duration-300 ease-in-out z-40
          ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:w-80 border-r border-border flex justify-center`}
      >
        <Card className="w-[90%] bg-white dark:bg-gray-800 text-foreground shadow-md mt-16 lg:mt-12 mb-12 h-auto overflow-y-auto">
          <CardContent className="p-6 flex flex-col items-center">
            <h2 className="text-xl font-bold text-center mb-4">Yield-AI Wallet</h2>

            {session ? (
              <div className="w-full text-center">
                <div className="flex items-center justify-center w-full mb-2 relative">
                <p className="text-sm truncate mx-auto">{session.user.email}</p>
                <button 
                  onClick={() => signOut()} 
                  className="absolute right-0 p-1 rounded-md bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 transition"
                  title="Sign out"
                >
                  <LogOut size={18} className="text-gray-700 dark:text-gray-300" />
                </button>
              </div>


                <div className="flex items-center justify-between w-full bg-gray-200 dark:bg-gray-700 p-3 rounded-lg mt-4">
                  <span className="truncate text-sm">{formatAddress(aptosAddress)}</span>
                  <div className="flex space-x-2">
                    <button onClick={copyToClipboard} className="p-2 rounded-lg bg-gray-300 dark:bg-gray-600">
                      <Copy size={20} />
                    </button>
                    <a
                      href={`https://explorer.aptoslabs.com/account/${aptosAddress}?network=mainnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-gray-300 dark:bg-gray-600"
                    >
                      <Globe size={20} />
                    </a>
                  </div>
                </div>

                <Button className="w-full mt-4 flex items-center gap-2 bg-gray-500 text-white" onClick={() => toast(`Mnemonic: ${mnemonic}`)}>
                  Show Mnemonic <Eye size={18} />
                </Button>


                <div className="w-full mt-4 text-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold">Assets</h3>
                    <button onClick={() => fetchBalances()} className="p-1">
                      <RefreshCw size={20} />
                    </button>
                  </div>
                  <ul className="space-y-2">
                    {balances.map((b, index) => (
                      <li key={index} className="flex justify-between p-2 bg-gray-200 rounded-md">
                        <span>
                          {b.asset} {b.provider && <span className="text-xs text-gray-500">({b.provider})</span>}
                        </span>
                        <span className="font-bold">{b.balance}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {positions.length > 0 && (
                <div className="w-full mt-6 text-sm">
                  {/* Joule Positions */}
                  <h3 className="text-lg font-semibold text-left flex items-center gap-2">
                    <img src="https://app.joule.finance/favicon.ico" alt="Joule" className="w-4 h-4" />
                    Positions on Joule
                  </h3>

                  <ul className="space-y-2 mt-2">
                    {positions
                      .filter(pos => pos.protocol === "Joule" && parseFloat(pos.amount) > 0) // Преобразуем amount в число
                      .map((pos, index) => (
                        <li key={index} className="flex items-center justify-between p-2 bg-gray-200 rounded-md">
                          <span className="text-left">
                            {pos.token} {pos.provider && <span className="text-xs text-gray-500">({pos.provider})</span>}
                          </span>
                          <span className="font-bold text-right flex-1">{pos.amount}</span>
                          <button
                            onClick={() => handleBestLendStrategy(pos)}
                            className={`ml-2 text-gray-500 hover:text-yellow-500 text-sm ${
                              loadingStrategy[pos.token] ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                            disabled={loadingStrategy[pos.token]}
                          >
                            {loadingStrategy[pos.token] ? "🔄" : "🚀"}
                          </button>
                        </li>
                      ))}
                  </ul>

                  {/* Echelon Positions */}
                  <h3 className="text-lg font-semibold text-left flex items-center gap-2 mt-4">
                    <img src="https://echelon.market/favicon.ico" alt="Echelon" className="w-5 h-5" />
                    Positions on Echelon
                  </h3>
                  <ul className="space-y-2 mt-2">
                    {positions
                      .filter(pos => pos.protocol === "Echelon" && parseFloat(pos.amount) > 0) // Аналогично фильтруем для Echelon
                      .map((pos, index) => (
                        <li key={index} className="flex items-center justify-between p-2 bg-gray-200 rounded-md">
                          <span className="text-left">
                            {pos.token} {pos.provider && <span className="text-xs text-gray-500">({pos.provider})</span>}
                          </span>
                          <span className="font-bold text-right flex-1">{pos.amount}</span>
                          <button
                            onClick={() => handleBestLendStrategy(pos)}
                            className={`ml-2 text-gray-500 hover:text-yellow-500 text-sm ${
                              loadingStrategy[pos.token] ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                            disabled={loadingStrategy[pos.token]}
                          >
                            {loadingStrategy[pos.token] ? "🔄" : "🚀"}
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              </div>
            ) : (
              <Button onClick={() => signIn("google")} className="w-full">
                Sign in with Google
              </Button>
            )}
          </CardContent>
        </Card>
      </aside>
    </>
  );
}
