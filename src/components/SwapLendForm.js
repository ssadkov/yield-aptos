import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { generateMnemonicForUser } from "@/utils/mnemonic";
import JOULE_TOKENS from "@/app/api/joule/jouleTokens";
import PROTOCOL_ICONS from "@/app/api/aptos/markets/protocolIcons";
import { nanoid } from "nanoid";

// Функция проверки баланса токена
async function checkTokenBalance(walletAddress, tokenAddress) {
  try {
    const res = await fetch(`/api/aptos/balances?address=${walletAddress}`);
    if (!res.ok) {
      throw new Error(`Ошибка получения балансов: ${res.statusText}`);
    }

    const data = await res.json();
    const balances = data.balances || [];
    const tokenData = balances.find((item) => item.token === tokenAddress);
    return tokenData ? tokenData.balance : 0;
  } catch (error) {
    console.error("❌ Ошибка при получении баланса:", error);
    return 0;
  }
}

export default function SwapLendForm({ protocol, token, amount, swapToken, onSwap, setMessages }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSponsored, setIsSponsored] = useState(false);

  const addBotMessage = (content) => {
    setMessages((prev) => [
      ...prev,
      { id: nanoid(), role: "assistant", content },
    ]);
  };

  useEffect(() => {
    async function checkSponsored() {
      const walletAddress = localStorage.getItem("aptosWalletAddress");
      if (!walletAddress) return;

      const aptosBalance = await checkTokenBalance(walletAddress, "0x1::aptos_coin::AptosCoin");
      setIsSponsored(aptosBalance < 0.05);
    }
    checkSponsored();
  }, []);

  const handleSwapAndLend = async () => {
    setIsProcessing(true);
    try {
      await onSwap(swapToken, amount, setIsProcessing);
    } catch (error) {
      console.error("❌ Error in SwapLendForm:", error);
      setMessages((prev) => [
        ...prev,
        { id: nanoid(), role: "assistant", content: `❌ Error: ${error.message}` },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const getTokenInfo = (tokenAddress) => JOULE_TOKENS.find((t) => t.token === tokenAddress) || {};
  const formatAmount = (amt) => parseFloat(amt).toFixed(6).replace(/\.?0+$/, "");

  return (
    <div className="p-4 border border-gray-400 rounded-md bg-gray-100 dark:bg-gray-800">
      <p className="text-gray-900 dark:text-white text-lg font-bold mb-2">Swap</p>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2 bg-white dark:bg-gray-700 rounded-md shadow-md">
        <div className="flex items-center gap-2">
          <img src={getTokenInfo(swapToken).icon || ""} alt={swapToken} className="w-6 h-6" />
          <span className="text-gray-900 dark:text-white font-semibold">
            {formatAmount(amount)} {getTokenInfo(swapToken).assetName || swapToken}
          </span>
          <span className="text-gray-500 text-sm">
            ({getTokenInfo(swapToken).provider || "Unknown"})
          </span>
        </div>
        <span className="text-xl text-gray-600 dark:text-gray-300 my-1 sm:my-0">→</span>
        <div className="flex items-center gap-2">
          <img src={getTokenInfo(token).icon || ""} alt={token} className="w-6 h-6" />
          <span className="text-gray-900 dark:text-white font-semibold">
            {getTokenInfo(token).assetName || token}
          </span>
          <span className="text-gray-500 text-sm">
            ({getTokenInfo(token).provider || "Unknown"})
          </span>
        </div>
      </div>

      <p className="text-gray-900 dark:text-white mt-2 flex items-center">
        Using Panora Swap
        <img src={PROTOCOL_ICONS.PanoraSwap} alt="Panora Swap" className="w-6 h-6 ml-2" />
      </p>

      <p className="text-gray-900 dark:text-white mt-2 flex items-center">
        For lending on {protocol}
        <img src={PROTOCOL_ICONS[protocol]} alt={protocol} className="w-6 h-6 ml-2" />
      </p>

      <div className="flex gap-4 mt-4">
        <Button
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          onClick={handleSwapAndLend}
          disabled={isProcessing}
        >
          {isProcessing ? "⏳ Processing..." : "Swap & Lend"}
        </Button>
      </div>

      {isSponsored && (
        <p className="text-gray-700 dark:text-white flex items-center mt-2">
          <img src={PROTOCOL_ICONS.Aptos} alt="Sponsored" className="w-6 h-6 mr-2" />
          Sponsored Transaction
        </p>
      )}
    </div>
  );
}
