import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import JOULE_TOKENS from "@/app/api/joule/jouleTokens";
import PROTOCOL_ICONS from "@/app/api/aptos/markets/protocolIcons";

/**
 * Универсальная функция для проверки баланса токена
 * @param {string} walletAddress - Адрес кошелька
 * @param {string} tokenAddress - Адрес токена (например, APT)
 * @returns {Promise<number>} - Баланс токена
 */
async function checkTokenBalance(walletAddress, tokenAddress) {
  try {
    console.log(`🔄 Checking balance for token ${tokenAddress} at ${walletAddress}...`);

    const res = await fetch(`/api/aptos/balances?address=${walletAddress}`);
    if (!res.ok) throw new Error(`Ошибка получения балансов: ${res.statusText}`);

    const data = await res.json();
    const balance = data.balances.find(item => item.token === tokenAddress)?.balance || 0;

    console.log(`💰 Balance for token (${tokenAddress}): ${balance}`);
    return balance;
  } catch (error) {
    console.error("❌ Ошибка при получении баланса:", error);
    return 0;
  }
}

/**
 * Функция форматирования числа: убирает лишние нули
 * @param {number | string} value - Число для форматирования
 * @returns {string} - Отформатированное число без лишних нулей
 */
function formatAmount(value) {
  return parseFloat(value).toString(); // Преобразуем в число, затем обратно в строку (убирая нули)
}

export default function SwapLendForm({ protocol, token, amount, swapToken, onSwap }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [fromTokenData, setFromTokenData] = useState(null);
  const [toTokenData, setToTokenData] = useState(null);
  const [insufficientGas, setInsufficientGas] = useState(false);
  const [userAddress, setUserAddress] = useState("");

  useEffect(() => {
    // Поиск данных о токенах в JOULE_TOKENS
    setFromTokenData(JOULE_TOKENS.find(t => t.token === swapToken) || null);
    setToTokenData(JOULE_TOKENS.find(t => t.token === token) || null);
  }, [swapToken, token]);

  useEffect(() => {
    // Получаем APT баланс пользователя
    const storedAddress = localStorage.getItem("aptosWalletAddress");
    if (storedAddress) {
      setUserAddress(storedAddress);
      checkTokenBalance(storedAddress, "0x1::aptos_coin::AptosCoin").then(balance => {
        if (balance < 0.005) setInsufficientGas(true);
      });
    }
  }, []);

  const handleSwapAndLend = async () => {
    setIsProcessing(true);
    try {
      await onSwap(swapToken, amount, setIsProcessing);
    } catch (error) {
      console.error("❌ Error during swap and lend:", error);
    }
    setIsProcessing(false);
  };

  return (
    <div className="p-4 border border-gray-400 rounded-md bg-gray-100 dark:bg-gray-800">
      {/* Swap Header */}
      <p className="font-bold text-gray-900 dark:text-white mb-2">Swap</p>

      {/* Swap Tokens */}
      <div className="flex items-center space-x-2">
        {fromTokenData && <img src={fromTokenData.icon} alt={fromTokenData.assetName} className="w-6 h-6" />}
        <p className="text-gray-900 dark:text-white">
          <strong>{formatAmount(amount)} {fromTokenData?.assetName || "Unknown"} ({fromTokenData?.provider || "N/A"})</strong>
        </p>
        <span className="text-xl">→</span>
        {toTokenData && <img src={toTokenData.icon} alt={toTokenData.assetName} className="w-6 h-6" />}
        <p className="text-gray-900 dark:text-white">
          <strong>{toTokenData?.assetName || "Unknown"} ({toTokenData?.provider || "N/A"})</strong>
        </p>
      </div>

      {/* Using Panora Swap */}
      <div className="flex items-center space-x-2 mt-2">
        <img src={PROTOCOL_ICONS["PanoraSwap"]} alt="Panora Swap" className="w-5 h-5" />
        <p className="text-gray-600 dark:text-gray-400">Using Panora Swap</p>
      </div>

      {/* For Lending On */}
      {protocol && (
        <div className="flex items-center space-x-2 mt-2">      
        <img src={PROTOCOL_ICONS[protocol]} alt={protocol} className="w-5 h-5" />    
          <p className="text-gray-900 dark:text-white">
          For lending on <strong>{protocol}</strong>
          </p>
        </div>
      )}

      {/* Swap & Lend Button */}
      <div className="flex gap-4 mt-4">
        <Button
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          onClick={handleSwapAndLend}
          disabled={isProcessing}
        >
          {isProcessing ? "⏳ Processing..." : `Swap & Lend`}
        </Button>
      </div>

      {/* Sponsored Transaction */}
      {insufficientGas && (
        <div className="flex items-center space-x-2 mt-2">
          <img src={PROTOCOL_ICONS["Aptos"]} alt="Aptos Gas Fee" className="w-5 h-5" />
          <p>Sponsored Transaction</p>
        </div>
      )}
    </div>
  );
}
