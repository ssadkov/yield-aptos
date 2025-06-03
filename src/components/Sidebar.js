"use client";

import { useState, useEffect } from "react";
import { signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Menu, X, Copy, RefreshCw, Eye, Globe, LogOut, ChevronDown, ChevronRight, Wallet } from "lucide-react";
import { generateMnemonicForUser } from "@/utils/mnemonic";
import toast, { Toaster } from "react-hot-toast";
import JOULE_TOKENS from "@/app/api/joule/jouleTokens";
import { useSessionData } from "@/context/SessionProvider";
import {
  AptosWalletAdapterProvider,
  useWallet,
} from '@aptos-labs/wallet-adapter-react';
import { Network } from '@aptos-labs/ts-sdk';

function AptosWalletBlock({ onDisconnect }) {
  const { account, connect, disconnect, connected } = useWallet();

  const addressStr = account?.address
    ? typeof account.address === "string"
      ? account.address
      : account.address.toString()
    : "";

  const handleDisconnect = () => {
    disconnect();
    if (onDisconnect) onDisconnect();
  };

  const handleConnect = async () => {
    try {
      await connect('Petra');
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet. Please try again.');
    }
  };

  if (!connected) {
    return (
      <Button onClick={handleConnect} className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-md" variant="secondary">
        Connect Aptos wallet
      </Button>
    );
  }

  return (
    <div className="w-full text-center p-3 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 shadow-md">
      <div className="flex items-center justify-between">
        <span className="truncate text-sm text-white font-medium">
          {addressStr ? `${addressStr.slice(0, 8)}...${addressStr.slice(-6)}` : ""}
        </span>
        <button
          onClick={handleDisconnect}
          className="p-1 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
          title="Disconnect"
        >
          <LogOut size={18} className="text-white" />
        </button>
      </div>
      <div className="text-xs text-white/80 mt-2">Aptos Wallet Connected</div>
    </div>
  );
}

function AptosWalletAssetsBlock({ resetOnDisconnect }) {
  const { account, connected } = useWallet();
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (!connected && resetOnDisconnect) {
      setBalances([]);
    }
  }, [connected, resetOnDisconnect]);

  useEffect(() => {
    if (connected && account?.address) {
      fetchAptosBalances();
    }
  }, [connected, account?.address]);

  const addressStr = account?.address
    ? typeof account.address === "string"
      ? account.address
      : account.address.toString()
    : "";

  const fetchAptosBalances = async () => {
    if (!addressStr) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/aptos/balances?address=${addressStr}`);
      const data = await res.json();
      setBalances(data.balances || []);
      toast.success("Aptos assets updated!");
    } catch (error) {
      toast.error("Error loading Aptos balances");
    } finally {
      setLoading(false);
    }
  };

  if (!connected) return null;

  return (
    <div className="w-full mt-4 text-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold">Assets</h3>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              fetchAptosBalances();
            }} 
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            disabled={loading}
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          {isExpanded ? (
            <ChevronDown size={20} className="text-gray-500" />
          ) : (
            <ChevronRight size={20} className="text-gray-500" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 bg-white dark:bg-gray-900">
          {balances.length === 0 ? (
            <p className="text-sm text-red-500">Top up your wallet to start earning passive income</p>
          ) : (
            <ul className="space-y-2">
              {balances.map((b, index) => (
                <li key={index} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <span>
                    {b.asset} {b.provider && <span className="text-xs text-gray-500">({b.provider})</span>}
                  </span>
                  <span className="font-bold">{b.balance}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function AptosWalletPositionsBlock({ resetOnDisconnect }) {
  const { account, connected } = useWallet();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedProtocols, setExpandedProtocols] = useState({
    Joule: true,
    Echelon: true,
    Aries: true,
    Hyperion: true
  });

  useEffect(() => {
    if (!connected && resetOnDisconnect) {
      setPositions([]);
    }
  }, [connected, resetOnDisconnect]);

  useEffect(() => {
    if (connected && account?.address) {
      fetchAptosPositions();
    }
  }, [connected, account?.address]);

  const addressStr = account?.address
    ? typeof account.address === "string"
      ? account.address
      : account.address.toString()
    : "";

  const toggleProtocol = (protocol) => {
    setExpandedProtocols(prev => ({
      ...prev,
      [protocol]: !prev[protocol]
    }));
  };

  const fetchAptosPositions = async () => {
    if (!addressStr) return;
    setLoading(true);
    try {
      // Joule
      const resJoule = await fetch(`/api/joule/userPositions?address=${addressStr}`, {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_APTOS_API_KEY}`,
          'X-API-Key': process.env.NEXT_PUBLIC_APTOS_API_KEY
        }
      });
      const dataJoule = await resJoule.json();
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
      // Echelon
      const resEchelon = await fetch(`/api/echelon/userPositions?address=${addressStr}`, {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_APTOS_API_KEY}`,
          'X-API-Key': process.env.NEXT_PUBLIC_APTOS_API_KEY
        }
      });
      const dataEchelon = await resEchelon.json();
      let echelonPositions = [];
      if (dataEchelon?.userPositions?.length > 0) {
        echelonPositions = dataEchelon.userPositions.map((pos) => {
          const tokenData = getTokenData(pos.coin);
          return {
            token: tokenData.assetName,
            amount: formatAmount(pos.supply, tokenData.decimals),
            provider: tokenData.provider,
            protocol: "Echelon",
            tokenType: pos.coin,
          };
        });
      }
      // Aries
      const resAries = await fetch(`/api/aries/userPositions?address=${addressStr}`, {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_APTOS_API_KEY}`,
          'X-API-Key': process.env.NEXT_PUBLIC_APTOS_API_KEY
        }
      });
      const dataAries = await resAries.json();
      let ariesPositions = [];
      if (dataAries?.profiles?.profiles) {
        for (const [profileName, profile] of Object.entries(dataAries.profiles.profiles)) {
          const deposits = profile.deposits || {};
          for (const [tokenAddress, depositData] of Object.entries(deposits)) {
            if (parseFloat(depositData.collateral_coins) > 0) {
              ariesPositions.push({
                token: tokenAddress,
                amount: depositData.collateral_coins,
                protocol: "Aries",
              });
            }
          }
        }
      }
      // Hyperion
      const resHyperion = await fetch(`/api/hyperion/userPositions?address=${addressStr}`, {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_APTOS_API_KEY}`,
          'X-API-Key': process.env.NEXT_PUBLIC_APTOS_API_KEY
        }
      });
      const dataHyperion = await resHyperion.json();
      let hyperionPositions = [];
      if (dataHyperion?.success && dataHyperion?.data?.length > 0) {
        hyperionPositions = dataHyperion.data.map((pos) => ({
          token0: pos.position.pool.token1Info.symbol,
          token1: pos.position.pool.token2Info.symbol,
          amountUSD: pos.value,
          protocol: "Hyperion",
        }));
      }
      setPositions([...joulePositions, ...echelonPositions, ...ariesPositions, ...hyperionPositions]);
      toast.success("Aptos positions updated!");
    } catch (error) {
      console.error("Error loading positions:", error);
      toast.error("Error loading Aptos positions");
    } finally {
      setLoading(false);
    }
  };

  if (!connected) return null;

  const joulePositions = positions.filter((p) => p.protocol === "Joule" && parseFloat(p.amount) > 0);
  const echelonPositions = positions.filter((p) => p.protocol === "Echelon" && parseFloat(p.amount) > 0);
  const ariesPositions = positions.filter((p) => p.protocol === "Aries" && parseFloat(p.amount) > 0);
  const hyperionPositions = positions.filter((p) => p.protocol === "Hyperion" && parseFloat(p.amountUSD) > 0);

  function getTokenData(key) {
    const formattedKey = key.startsWith("@") ? key.replace("@", "0x") : key;
    const tokenData = JOULE_TOKENS.find((t) => t.token === formattedKey) || {};
    return {
      assetName: tokenData.assetName || formattedKey.slice(0, 6) + "..." + formattedKey.slice(-6),
      provider: tokenData.provider || "Unknown Provider",
      decimals: tokenData.decimals || 1e6,
    };
  }

  function formatAmount(value, decimals) {
    return (parseFloat(value) / decimals).toFixed(2);
  }

  const ProtocolBlock = ({ protocol, positions, icon, formatPosition }) => {
    if (positions.length === 0) return null;

    return (
      <div className="w-full mt-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div 
          onClick={() => toggleProtocol(protocol)}
          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <img src={icon} alt={protocol} className="w-5 h-5" />
            <h3 className="text-lg font-semibold">{protocol}</h3>
          </div>
          {expandedProtocols[protocol] ? (
            <ChevronDown size={20} className="text-gray-500" />
          ) : (
            <ChevronRight size={20} className="text-gray-500" />
          )}
        </div>

        {expandedProtocols[protocol] && (
          <div className="p-3 bg-white dark:bg-gray-900">
            <ul className="space-y-2">
              {positions.map((pos, index) => (
                <li key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                  {formatPosition(pos)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full mt-4 text-sm">
      {joulePositions.length === 0 && echelonPositions.length === 0 && ariesPositions.length === 0 && hyperionPositions.length === 0 ? (
        <p className="text-sm text-red-500">No positions found. Click refresh to load.</p>
      ) : (
        <>
          <ProtocolBlock
            protocol="Joule"
            positions={joulePositions}
            icon="https://app.joule.finance/favicon.ico"
            formatPosition={(pos) => (
              <>
                <span className="text-left">
                  {pos.token} {pos.provider && <span className="text-xs text-gray-500">({pos.provider})</span>}
                </span>
                <span className="font-bold text-right flex-1">{pos.amount}</span>
              </>
            )}
          />

          <ProtocolBlock
            protocol="Echelon"
            positions={echelonPositions}
            icon="https://echelon.market/favicon.ico"
            formatPosition={(pos) => (
              <>
                <span className="text-left">
                  {pos.token} {pos.provider && <span className="text-xs text-gray-500">({pos.provider})</span>}
                </span>
                <span className="font-bold text-right flex-1">{pos.amount}</span>
              </>
            )}
          />

          <ProtocolBlock
            protocol="Aries"
            positions={ariesPositions}
            icon="https://ariesmarkets.xyz/apple-touch-icon.png"
            formatPosition={(pos) => {
              const tokenData = getTokenData(pos.token);
              return (
                <>
                  <span className="text-left">
                    {tokenData.assetName} {tokenData.provider && <span className="text-xs text-gray-500">({tokenData.provider})</span>}
                  </span>
                  <span className="font-bold text-right flex-1">{formatAmount(pos.amount, tokenData.decimals)}</span>
                </>
              );
            }}
          />

          <ProtocolBlock
            protocol="Hyperion"
            positions={hyperionPositions}
            icon="https://hyperion.xyz/fav-new.svg"
            formatPosition={(pos) => (
              <>
                <span className="text-left">
                  {pos.token0}/{pos.token1}
                </span>
                <span className="font-bold text-right flex-1">${parseFloat(pos.amountUSD).toFixed(2)}</span>
              </>
            )}
          />
        </>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { session, status } = useSessionData();
  const [isOpen, setIsOpen] = useState(false);
  const [aptosAddress, setAptosAddress] = useState("");
  const [mnemonic, setMnemonic] = useState("");
  const [balances, setBalances] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingStrategy, setLoadingStrategy] = useState({});
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedProtocols, setExpandedProtocols] = useState({
    Joule: true,
    Echelon: true,
    Aries: true,
    Hyperion: true
  });
  const { handleBotMessage } = useSessionData();

  // Для сброса балансов/позиций Aptos Wallet при disconnect
  const [resetAptos, setResetAptos] = useState(false);

  console.log("🔄 Sidebar session status:", status, session);

  // ✅ Реагируем на изменения `session`
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session && !initialized) {
      console.log("✅ Пользователь залогинен:", session.user.email);
      setIsLoggedIn(true);
      setInitialized(true); // ⬅️ больше не запустится
  
      const initializeWallet = async () => {
        try {
          const generatedMnemonic = await generateMnemonicForUser(session.user.email, session.user.id);
          localStorage.setItem("userEmail", session.user.email);
          localStorage.setItem("userId", session.user.id);
          setMnemonic(generatedMnemonic);
    
          const walletResponse = await fetch("/api/aptos/restoreWalletFromMnemonic", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mnemonic: generatedMnemonic }),
          });
    
          const data = await walletResponse.json();
          if (data.address) {
            setAptosAddress(data.address);
            localStorage.setItem("aptosWalletAddress", data.address);
            // fetchBalances(data.address);         // ✅ вызывается один раз
            // fetchUserPositions(data.address);
          } else {
            console.error("API Error:", data.error);
          }
        } catch (error) {
          console.error("Error initializing wallet:", error);
        }
      };

      initializeWallet();
    }
  }, [session, status, initialized]);
  


  const handleWithdraw = async (pos) => {
    console.log("🔹 Initiating WITHDRAW: ", pos.amount, pos.token);
    if (!handleBotMessage) {
      console.error("❌ handleBotMessage is undefined!");
      return;
    }

    handleBotMessage(`➡️ Processing withdrawal for ${pos.amount} ${pos.token}...`);
    console.log("✅ handleBotMessage called successfully!");


    // try {
    //   const response = await fetch("/api/withdraw", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ token: pos.token, amount: pos.amount }),
    //   });

    //   const data = await response.json();

    //   if (data.transactionHash) {
    //     handleBotMessage(`✅ Withdrawal successful! Tx: ${data.transactionHash}`);
    //   } else {
    //     handleBotMessage(`❌ Withdrawal failed: ${data.error || "Unknown error"}`);
    //   }
    // } catch (error) {
    //   handleBotMessage(`❌ Error processing withdrawal: ${error.message}`);
    // }
  };

  const fetchBalances = async (address = aptosAddress) => {
    if (!address) {
      toast.error("Wallet address not found!");
      return;
    }

    setLoading(true);
    try {
      console.log(`🔄 Updating balances for ${address}`);
      
      // Кэшируем результаты на 30 секунд
      const cacheKey = `balances_${address}`;
      const cachedData = sessionStorage.getItem(cacheKey);
      const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);
      
      if (cachedData && cacheTime && Date.now() - parseInt(cacheTime) < 30000) {
        const data = JSON.parse(cachedData);
        setBalances(data.balances || []);
        setPositions(data.positions || []);
        toast.success("Assets updated from cache!");
        return;
      }

      const res = await fetch(`/api/aptos/balances?address=${address}`);
      const data = await res.json();
      
      // Сохраняем в кэш
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());
      
      setBalances(data.balances || []);
      setPositions(data.positions || []);
      toast.success("Assets updated!");
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
      
      // Кэшируем результаты на 30 секунд
      const cacheKey = `positions_${address}`;
      const cachedData = sessionStorage.getItem(cacheKey);
      const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);
      
      if (cachedData && cacheTime && Date.now() - parseInt(cacheTime) < 30000) {
        const data = JSON.parse(cachedData);
        setPositions(data);
        return data;
      }

      // Запрашиваем данные последовательно, а не параллельно
      const joulePositions = await fetchJoulePositions(address);
      const echelonPositions = await fetchEchelonPositions(address);
      
      const positions = [...joulePositions, ...echelonPositions];
      
      // Сохраняем в кэш
      sessionStorage.setItem(cacheKey, JSON.stringify(positions));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());
      
      setPositions(positions);
      return positions;
    } catch (error) {
      console.error("❌ Error fetching positions:", error);
      return [];
    }
  };

  const fetchJoulePositions = async (address) => {
    try {
      const resJoule = await fetch(`/api/joule/userPositions?address=${address}`);
      const dataJoule = await resJoule.json();
      
      if (!dataJoule?.userPositions?.length) return [];
      
      return dataJoule.userPositions[0].positions_map.data.flatMap((position) =>
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
    } catch (error) {
      console.error("❌ Error fetching Joule positions:", error);
      return [];
    }
  };
  
  const fetchEchelonPositions = async (address) => {
    try {
      console.log(`🔄 Fetching Echelon positions for ${address}`);
      const res = await fetch(`/api/echelon/userPositions?address=${address}`);
      const data = await res.json();
  
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
    address ? `${address.slice(0, 5)}...${address.slice(-4)}` : "Loading...";


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
  
  // console.log("📊 Rendered positions in UI:", positions);

  const handleAptosDisconnect = () => {
    setResetAptos(true);
    setTimeout(() => setResetAptos(false), 100); // сбросить reset через 100мс
  };

  const toggleProtocol = (protocol) => {
    setExpandedProtocols(prev => ({
      ...prev,
      [protocol]: !prev[protocol]
    }));
  };

  return (
    <AptosWalletAdapterProvider
      optInWallets={['Petra']}
      autoConnect={true}
      dappConfig={{ network: Network.MAINNET }}
    >
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
                  <div className="w-full bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 p-4 rounded-lg mt-4 shadow-md">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center justify-between w-full mb-2">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-5 w-5 text-white" />
                          <span className="text-white font-medium text-lg">
                            {formatAddress(aptosAddress)}
                          </span>
                        </div>
                        <button 
                          onClick={() => {
                            localStorage.removeItem("aptosWalletAddress");
                            localStorage.removeItem("userEmail");
                            localStorage.removeItem("userId");
                            signOut();
                          }}                  
                          className="p-1 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
                          title="Sign out"
                        >
                          <LogOut size={18} className="text-white" />
                        </button>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={copyToClipboard} 
                          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                          title="Copy Address"
                        >
                          <Copy size={18} className="text-white" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("Are you sure you want to view your mnemonic phrase? Make sure no one else is watching your screen.")) {
                              toast(`Mnemonic: ${mnemonic}`);
                            }
                          }}
                          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                          title="Show Mnemonic"
                        >
                          <Eye size={18} className="text-white" />
                        </button>
                        <a
                          href={`https://explorer.aptoslabs.com/account/${aptosAddress}?network=mainnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                          title="View on Explorer"
                        >
                          <Globe size={18} className="text-white" />
                        </a>
                        <button 
                          onClick={fetchBalances} 
                          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                          title="Refresh Wallet"
                          disabled={loading}
                        >
                          <RefreshCw size={18} className={`text-white ${loading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                      <div className="text-white/80 text-sm mt-2">Google Yield Wallet Connected</div>
                      <div className="text-white/60 text-xs mt-1">{session.user.email}</div>
                    </div>
                  </div>

                  {/* Google Wallet Assets Block */}
                  <div className="w-full mt-4 text-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div 
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-blue-500" />
                        <h3 className="text-lg font-semibold">Assets</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchBalances();
                          }} 
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                          disabled={loading}
                        >
                          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                        {isExpanded ? (
                          <ChevronDown size={20} className="text-gray-500" />
                        ) : (
                          <ChevronRight size={20} className="text-gray-500" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-3 bg-white dark:bg-gray-900">
                        {balances.length === 0 ? (
                          <p className="text-sm text-red-500">Top up your wallet to start earning passive income</p>
                        ) : (
                          <ul className="space-y-2">
                            {balances.map((b, index) => (
                              <li key={index} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                                <span>
                                  {b.asset} {b.provider && <span className="text-xs text-gray-500">({b.provider})</span>}
                                </span>
                                <span className="font-bold">{b.balance}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Google Wallet Protocols */}
                  {positions.length > 0 && (
                    <div className="w-full mt-4 text-sm">
                      {Object.entries(
                        positions.reduce((acc, pos) => {
                          if (!acc[pos.protocol]) {
                            acc[pos.protocol] = [];
                          }
                          acc[pos.protocol].push(pos);
                          return acc;
                        }, {})
                      ).map(([protocol, protocolPositions]) => (
                        <div key={protocol} className="w-full mt-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                          <div 
                            onClick={() => toggleProtocol(protocol)}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <img 
                                src={
                                  protocol === "Joule" ? "https://app.joule.finance/favicon.ico" :
                                  protocol === "Echelon" ? "https://echelon.market/favicon.ico" :
                                  protocol === "Aries" ? "https://ariesmarkets.xyz/apple-touch-icon.png" :
                                  protocol === "Hyperion" ? "https://hyperion.xyz/fav-new.svg" :
                                  ""
                                } 
                                alt={protocol} 
                                className="w-5 h-5"
                              />
                              <h3 className="text-lg font-semibold">{protocol}</h3>
                            </div>
                            {expandedProtocols[protocol] ? (
                              <ChevronDown size={20} className="text-gray-500" />
                            ) : (
                              <ChevronRight size={20} className="text-gray-500" />
                            )}
                          </div>

                          {expandedProtocols[protocol] && (
                            <div className="p-3 bg-white dark:bg-gray-900">
                              <ul className="space-y-2">
                                {protocolPositions.map((pos, idx) => {
                                  const tokenData = getTokenData(pos.tokenType || pos.token);
                                  return (
                                    <li key={idx} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                                      <span>
                                        {tokenData.assetName} {tokenData.provider && <span className="text-xs text-gray-500">({tokenData.provider})</span>}
                                      </span>
                                      <span className="font-bold">{pos.amount}</span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-8">
                    <AptosWalletBlock onDisconnect={handleAptosDisconnect} />
                    <div className="mt-4">
                      <AptosWalletAssetsBlock resetOnDisconnect={resetAptos} />
                      <AptosWalletPositionsBlock resetOnDisconnect={resetAptos} />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <Button onClick={() => signIn("google", { callbackUrl: "/" })} className="w-full mb-2">
                    Sign in with Google
                  </Button>
                  <AptosWalletBlock onDisconnect={handleAptosDisconnect} />
                  <div className="mt-4">
                    <AptosWalletAssetsBlock resetOnDisconnect={resetAptos} />
                    <AptosWalletPositionsBlock resetOnDisconnect={resetAptos} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </aside>
      </>
    </AptosWalletAdapterProvider>
  );
}
