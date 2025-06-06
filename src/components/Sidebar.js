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
  const [loading, setLoading] = useState(false);

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

  const fetchAptosBalances = async () => {
    if (!addressStr) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/aptos/balances?address=${addressStr}`);
      const data = await res.json();
      toast.success("Aptos assets updated!");
    } catch (error) {
      toast.error("Error loading Aptos balances");
    } finally {
      setLoading(false);
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
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchAptosBalances}
            className="p-1 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
            disabled={loading}
          >
            <RefreshCw size={18} className={`text-white ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleDisconnect}
            className="p-1 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
            title="Disconnect"
          >
            <LogOut size={18} className="text-white" />
          </button>
        </div>
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
    } catch (error) {
      toast.error("Error loading Aptos balances");
    } finally {
      setLoading(false);
    }
  };

  if (!connected) return null;

  const totalValue = balances.reduce((sum, b) => sum + (parseFloat(b.balance) * parseFloat(b.price || 0)), 0);

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
          <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            ${totalValue.toFixed(2)}
          </span>
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
                <li key={index} className="flex flex-col p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <div className="flex justify-between items-center">
                    <span>
                      {b.asset} {b.provider && <span className="text-xs text-gray-500">({b.provider})</span>}
                    </span>
                    <span className="font-bold">{b.balance}</span>
                  </div>
                  {b.price && (
                    <div className="flex justify-between items-center mt-1 text-sm text-gray-500">
                      <span>${parseFloat(b.price).toFixed(2)}</span>
                      <span>${(parseFloat(b.balance) * parseFloat(b.price)).toFixed(2)}</span>
                    </div>
                  )}
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

  // Универсальная функция для получения данных токена
  const getTokenData = (key) => {
    console.log('🔍 Получаем данные токена для:', key);
    const formattedKey = key.startsWith("@") ? key.replace("@", "0x") : key;
    console.log('🔍 Форматированный ключ:', formattedKey);
    
    // Ищем токен в списке
    const tokenData = JOULE_TOKENS.find((t) => {
      const matches = t.token.toLowerCase() === formattedKey.toLowerCase();
      if (matches) {
        console.log('✅ Найден токен:', t);
      }
      return matches;
    });
    
    if (!tokenData) {
      console.log('⚠️ Токен не найден в JOULE_TOKENS, используем базовые данные');
      return {
        assetName: formattedKey.slice(0, 6) + "..." + formattedKey.slice(-6),
        provider: "Unknown Provider",
        decimals: 1e6,
        token: formattedKey
      };
    }
    
    return {
      assetName: tokenData.assetName,
      provider: tokenData.provider || "Unknown Provider",
      decimals: tokenData.decimals || 1e6,
      token: formattedKey
    };
  };
  
  // Форматируем сумму токенов с учётом decimals
  const formatAmount = (value, decimals) => {
    console.log('💰 Форматируем сумму:', { value, decimals });
    const amount = (parseFloat(value) / decimals).toFixed(2);
    console.log('💰 Отформатированная сумма:', amount);
    return amount;
  };

  const getTokenPriceFromPanora = async (coinAddress) => {
    try {
      const response = await fetch(`/api/aptos/panora_prices?tokenAddress=${coinAddress}`);
      const data = await response.json();
      // Find the matching token price in the response array
      const tokenPrice = data.find(token => 
        token.tokenAddress === coinAddress || token.faAddress === coinAddress
      );
      return tokenPrice?.usdPrice || 0;
    } catch (error) {
      console.error("❌ Error fetching token price from Panora:", error);
      return 0;
    }
  };

  const fetchJoulePositions = async (address, apiKey) => {
    try {
      console.log('🔍 Запрашиваем Joule позиции для адреса:', address);
      const resJoule = await fetch(`/api/joule/userPositions?address=${address}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-API-Key': apiKey
        }
      });
      const dataJoule = await resJoule.json();
      console.log('📊 Joule позиции (сырые):', dataJoule);
      
      if (!dataJoule?.userPositions?.length) return [];
      
      return dataJoule.userPositions[0].positions_map.data.flatMap((position) =>
        position.value.lend_positions.data.map((pos) => {
          const tokenData = getTokenData(pos.key);
          return {
            token: tokenData.assetName,
            amount: formatAmount(pos.value, tokenData.decimals),
            provider: tokenData.provider,
            protocol: "Joule",
            tokenType: pos.key
          };
        })
      );
    } catch (error) {
      console.error("❌ Error fetching Joule positions:", error);
      return [];
    }
  };
  
  const fetchEchelonPositions = async (address, apiKey) => {
    try {
      console.log('🔍 Запрашиваем Echelon позиции для адреса:', address);
      const resEchelon = await fetch(`/api/echelon/userPositions?address=${address}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-API-Key': apiKey
        }
      });
      const dataEchelon = await resEchelon.json();
      console.log('📊 Echelon позиции (сырые):', dataEchelon);
      
      if (!dataEchelon?.userPositions?.length) return [];
      
      const positions = await Promise.all(dataEchelon.userPositions.map(async (pos) => {
        const tokenData = getTokenData(pos.coin);
        const amount = formatAmount(pos.supply, tokenData.decimals);
        const price = await getTokenPriceFromPanora(pos.coin);
        return {
          token: tokenData.assetName,
          amount: amount,
          provider: tokenData.provider,
          protocol: "Echelon",
          tokenType: pos.coin,
          price: price,
          valueUSD: (parseFloat(amount) * price).toFixed(2)
        };
      }));

      return positions;
    } catch (error) {
      console.error("❌ Error fetching Echelon positions:", error);
      return [];
    }
  };
  
  const fetchAriesPositions = async (address, apiKey) => {
    try {
      console.log('🔍 Запрашиваем Aries позиции для адреса:', address);
      const resAries = await fetch(`/api/aries/userPositions?address=${address}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-API-Key': apiKey
        }
      });
      const dataAries = await resAries.json();
      console.log('📊 Aries позиции (сырые):', dataAries);
      
      if (!dataAries?.profiles?.profiles) return [];
      
      const positions = [];
      for (const [profileName, profile] of Object.entries(dataAries.profiles.profiles)) {
        const deposits = profile.deposits || {};
        for (const [tokenAddress, depositData] of Object.entries(deposits)) {
          if (parseFloat(depositData.collateral_coins) > 0) {
            const tokenData = getTokenData(tokenAddress);
            positions.push({
              token: tokenData.assetName,
              amount: formatAmount(depositData.collateral_coins, tokenData.decimals),
              provider: tokenData.provider,
              protocol: "Aries",
              tokenType: tokenAddress
            });
          }
        }
      }
      return positions;
    } catch (error) {
      console.error("❌ Error fetching Aries positions:", error);
      return [];
    }
  };

  const fetchHyperionPositions = async (address) => {
    try {
      console.log('🔍 Запрашиваем Hyperion позиции для адреса:', address);
      const resHyperion = await fetch(`/api/hyperion/userPositions?address=${address}`);
      const dataHyperion = await resHyperion.json();
      console.log('📊 Hyperion позиции (сырые):', dataHyperion);
      
      if (!dataHyperion?.success || !dataHyperion?.data?.length) return [];
      
      return dataHyperion.data.map((pos) => {
        const token1Info = pos.position.pool.token1Info;
        const token2Info = pos.position.pool.token2Info;
        return {
          token: `${token1Info.symbol}/${token2Info.symbol}`,
          amount: parseFloat(pos.value),
          provider: "Hyperion",
          protocol: "Hyperion",
          tokenType: pos.position.poolId,
          isActive: pos.isActive,
          farm: pos.farm,
          fees: pos.fees
        };
      });
    } catch (error) {
      console.error("❌ Error fetching Hyperion positions:", error);
      return [];
    }
  };

  const fetchAptosPositions = async () => {
    if (!addressStr) return;
    setLoading(true);
    try {
      console.log('🔄 Начинаем загрузку позиций для адреса:', addressStr);
      
      // Кэшируем результаты на 30 секунд
      const cacheKey = `aptos_positions_${addressStr}`;
      const cachedData = sessionStorage.getItem(cacheKey);
      const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);
      
      if (cachedData && cacheTime && Date.now() - parseInt(cacheTime) < 30000) {
        const data = JSON.parse(cachedData);
        setPositions(data);
        toast.success("Aptos positions loaded from cache!");
        return;
      }

      // Получаем API ключи
      const apiKey = process.env.NEXT_PUBLIC_APTOS_API_KEY;
      if (!apiKey) {
        console.error('❌ API ключ не найден');
        toast.error('API key not found');
        return;
      }

      // Запрашиваем позиции последовательно с API ключами
      const joulePositions = await fetchJoulePositions(addressStr, apiKey);
      const echelonPositions = await fetchEchelonPositions(addressStr, apiKey);
      const ariesPositions = await fetchAriesPositions(addressStr, apiKey);
      const hyperionPositions = await fetchHyperionPositions(addressStr);
      
      const allPositions = [...joulePositions, ...echelonPositions, ...ariesPositions, ...hyperionPositions];
      console.log('📊 Все позиции:', allPositions);
      
      // Сохраняем в кэш
      sessionStorage.setItem(cacheKey, JSON.stringify(allPositions));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());
      
      setPositions(allPositions);
      toast.success("Aptos positions updated!");
    } catch (error) {
      console.error("❌ Error loading positions:", error);
      toast.error("Error loading Aptos positions");
    } finally {
      setLoading(false);
    }
  };

  if (!connected) return null;

  const joulePositions = positions.filter((p) => p.protocol === "Joule" && parseFloat(p.amount) > 0);
  const echelonPositions = positions.filter((p) => p.protocol === "Echelon" && parseFloat(p.amount) > 0);
  const ariesPositions = positions.filter((p) => p.protocol === "Aries" && parseFloat(p.amount) > 0);
  const hyperionPositions = positions.filter((p) => p.protocol === "Hyperion" && parseFloat(p.amount) > 0);

  return (
    <div className="w-full mt-4 text-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Positions</h3>
        <button 
          onClick={fetchAptosPositions}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          disabled={loading}
        >
          <RefreshCw size={18} className={`${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading positions...</p>
      ) : joulePositions.length === 0 && echelonPositions.length === 0 && ariesPositions.length === 0 && hyperionPositions.length === 0 ? (
        <p className="text-sm text-red-500">No positions found. Click refresh to load.</p>
      ) : (
        <>
          {joulePositions.length > 0 && (
            <div className="w-full mt-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div 
                onClick={() => toggleProtocol("Joule")}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <img src="https://app.joule.finance/favicon.ico" alt="Joule" className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">Joule</h3>
                </div>
                {expandedProtocols["Joule"] ? (
                  <ChevronDown size={20} className="text-gray-500" />
                ) : (
                  <ChevronRight size={20} className="text-gray-500" />
                )}
              </div>

              {expandedProtocols["Joule"] && (
                <div className="p-3 bg-white dark:bg-gray-900">
                  <ul className="space-y-2">
                    {joulePositions.map((pos, index) => (
                      <li key={index} className="flex flex-col p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <div className="flex justify-between items-center">
                          <span>
                            {pos.token} {pos.provider && <span className="text-xs text-gray-500">({pos.provider})</span>}
                          </span>
                          <span className="font-bold">{pos.amount}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {echelonPositions.length > 0 && (
            <div className="w-full mt-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div 
                onClick={() => toggleProtocol("Echelon")}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <img src="https://echelon.market/favicon.ico" alt="Echelon" className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">Echelon</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    ${echelonPositions.reduce((sum, pos) => sum + parseFloat(pos.valueUSD), 0).toFixed(2)}
                  </span>
                  {expandedProtocols["Echelon"] ? (
                    <ChevronDown size={20} className="text-gray-500" />
                  ) : (
                    <ChevronRight size={20} className="text-gray-500" />
                  )}
                </div>
              </div>

              {expandedProtocols["Echelon"] && (
                <div className="p-3 bg-white dark:bg-gray-900">
                  <ul className="space-y-2">
                    {echelonPositions.map((pos, index) => (
                      <li key={index} className="flex flex-col p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <div className="flex justify-between items-center">
                          <span>
                            {pos.token} {pos.provider && <span className="text-xs text-gray-500">({pos.provider})</span>}
                          </span>
                          <span className="font-bold">{pos.amount}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1 text-sm text-gray-500">
                          <span>${parseFloat(pos.price).toFixed(2)}</span>
                          <span>${pos.valueUSD}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {ariesPositions.length > 0 && (
            <div className="w-full mt-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div 
                onClick={() => toggleProtocol("Aries")}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <img src="https://ariesmarkets.xyz/apple-touch-icon.png" alt="Aries" className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">Aries</h3>
                </div>
                {expandedProtocols["Aries"] ? (
                  <ChevronDown size={20} className="text-gray-500" />
                ) : (
                  <ChevronRight size={20} className="text-gray-500" />
                )}
              </div>

              {expandedProtocols["Aries"] && (
                <div className="p-3 bg-white dark:bg-gray-900">
                  <ul className="space-y-2">
                    {ariesPositions.map((pos, index) => (
                      <li key={index} className="flex flex-col p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <div className="flex justify-between items-center">
                          <span>
                            {pos.token} {pos.provider && <span className="text-xs text-gray-500">({pos.provider})</span>}
                          </span>
                          <span className="font-bold">{pos.amount}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {hyperionPositions.length > 0 && (
            <div className="w-full mt-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div 
                onClick={() => toggleProtocol("Hyperion")}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <img src="https://hyperion.xyz/fav-new.svg" alt="Hyperion" className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">Hyperion</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    ${hyperionPositions.reduce((sum, pos) => {
                      const positionValue = parseFloat(pos.amount);
                      const farmRewards = pos.farm?.unclaimed?.reduce((rewardSum, reward) => rewardSum + parseFloat(reward.amountUSD), 0) || 0;
                      const fees = pos.fees?.unclaimed?.reduce((feeSum, fee) => feeSum + parseFloat(fee.amountUSD), 0) || 0;
                      return sum + positionValue + farmRewards + fees;
                    }, 0).toFixed(2)}
                  </span>
                  {expandedProtocols["Hyperion"] ? (
                    <ChevronDown size={20} className="text-gray-500" />
                  ) : (
                    <ChevronRight size={20} className="text-gray-500" />
                  )}
                </div>
              </div>

              {expandedProtocols["Hyperion"] && (
                <div className="p-3 bg-white dark:bg-gray-900">
                  <ul className="space-y-2">
                    {hyperionPositions.map((pos, index) => (
                      <li key={index} className="flex flex-col p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <div className="flex justify-between items-center">
                          <span>
                            {pos.token} {pos.isActive !== undefined && (
                              <span className={`ml-2 px-2 py-0.5 text-xs rounded ${pos.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {pos.isActive ? 'Active' : 'Inactive'}
                              </span>
                            )}
                          </span>
                          <span className="font-bold">${parseFloat(pos.amount).toFixed(2)}</span>
                        </div>
                        {pos.farm && pos.farm.unclaimed.length > 0 && (
                          <div className="mt-1 text-sm text-gray-600">
                            <div className="font-medium">Farm Rewards:</div>
                            {pos.farm.unclaimed.map((reward, idx) => (
                              <div key={idx} className="ml-2">
                                ${parseFloat(reward.amountUSD).toFixed(2)}
                              </div>
                            ))}
                          </div>
                        )}
                        {pos.fees && pos.fees.unclaimed.length > 0 && (
                          <div className="mt-1 text-sm text-gray-600">
                            <div className="font-medium">Unclaimed Fees:</div>
                            {pos.fees.unclaimed.map((fee, idx) => (
                              <div key={idx} className="ml-2">
                                ${parseFloat(fee.amountUSD).toFixed(2)}
                              </div>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const ProtocolBlock = ({ protocol, positions, icon }) => {
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
              <li key={index} className="flex flex-col p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                <div className="flex justify-between items-center">
                  <span>
                    {pos.token} {pos.provider && <span className="text-xs text-gray-500">({pos.provider})</span>}
                  </span>
                  <span className="font-bold">{pos.amount}</span>
                </div>
                {pos.price && (
                  <div className="flex justify-between items-center mt-1 text-sm text-gray-500">
                    <span>${parseFloat(pos.price).toFixed(2)}</span>
                    <span>${(parseFloat(pos.amount) * parseFloat(pos.price)).toFixed(2)}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

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
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
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

      // Запрашиваем данные последовательно
      const joulePositions = await fetchJoulePositions(address);
      const echelonPositions = await fetchEchelonPositions(address);
      const ariesPositions = await fetchAriesPositions(address);
      
      const positions = [...joulePositions, ...echelonPositions, ...ariesPositions];
      
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

  const renderPosition = (position) => {
    const isExpanded = expandedProtocols[position.protocol];
    
    return (
      <div key={`${position.protocol}-${position.tokenType}`} className="mb-2">
        <div 
          className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-100 rounded"
          onClick={() => toggleProtocol(position.protocol)}
        >
          <div className="flex items-center">
            <span className="font-medium">{position.token}</span>
            {position.isActive !== undefined && (
              <span className={`ml-2 px-2 py-0.5 text-xs rounded ${position.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {position.isActive ? 'Active' : 'Inactive'}
              </span>
            )}
          </div>
          <div className="flex items-center">
            <span className="mr-2">{position.amount.toFixed(4)}</span>
            <ChevronDown size={20} className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
        
        {isExpanded && (
          <div className="pl-4 mt-1 text-sm text-gray-600">
            <div>Provider: {position.provider}</div>
            {position.protocol === "Hyperion" && (
              <>
                {position.farm && (
                  <div className="mt-1">
                    <div className="font-medium">Farm Rewards:</div>
                    {position.farm.unclaimed.map((reward, index) => (
                      <div key={index} className="ml-2">
                        {reward.amountUSD} USD ({reward.amount} tokens)
                      </div>
                    ))}
                  </div>
                )}
                {position.fees && (
                  <div className="mt-1">
                    <div className="font-medium">Unclaimed Fees:</div>
                    {position.fees.unclaimed.map((fee, index) => (
                      <div key={index} className="ml-2">
                        {fee.amountUSD} USD ({fee.amount} tokens)
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
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
          className={`fixed top-0 left-0 h-full w-[90%] bg-gray-100 dark:bg-gray-900 transition-transform duration-300 ease-in-out z-40
            ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:w-[450px] border-r border-border flex justify-center`}
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
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => fetchBalances(aptosAddress)} 
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                            title="Refresh Wallet"
                            disabled={loading}
                          >
                            <RefreshCw size={18} className={`text-white ${loading ? 'animate-spin' : ''}`} />
                          </button>
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
                        <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                          ${balances.reduce((sum, b) => sum + (parseFloat(b.balance) * parseFloat(b.price || 0)), 0).toFixed(2)}
                        </span>
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
                              <li key={index} className="flex flex-col p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                                <div className="flex justify-between items-center">
                                  <span>
                                    {b.asset} {b.provider && <span className="text-xs text-gray-500">({b.provider})</span>}
                                  </span>
                                  <span className="font-bold">{b.balance}</span>
                                </div>
                                {b.price && (
                                  <div className="flex justify-between items-center mt-1 text-sm text-gray-500">
                                    <span>${parseFloat(b.price).toFixed(2)}</span>
                                    <span>${(parseFloat(b.balance) * parseFloat(b.price)).toFixed(2)}</span>
                                  </div>
                                )}
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
                      {positions.map((pos) => renderPosition(pos))}
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
