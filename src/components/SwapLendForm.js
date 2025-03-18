import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { generateMnemonicForUser } from "@/utils/mnemonic";
import JOULE_TOKENS from "@/app/api/joule/jouleTokens";
import PROTOCOL_ICONS from "@/app/api/aptos/markets/protocolIcons";

// Функция проверки баланса токена
async function checkTokenBalance(walletAddress, tokenAddress) {
  try {
    console.log(`🔄 Checking balances for ${walletAddress}...`);
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

export default function SwapLendForm({ protocol, token, amount, swapToken, onSwap, handleBotMessage }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSponsored, setIsSponsored] = useState(false);

  useEffect(() => {
    async function checkSponsored() {
      const walletAddress = localStorage.getItem("aptosWalletAddress");
      if (!walletAddress) return;

      const aptosBalance = await checkTokenBalance(walletAddress, "0x1::aptos_coin::AptosCoin");
      setIsSponsored(aptosBalance < 0.05); // Если баланс APT ниже 0.05, показываем Sponsored
    }
    checkSponsored();
  }, []);

  const handleSwapAndLend = async () => {
    setIsProcessing(true);
    handleBotMessage("🔄 Starting Swap & Lend...");
  
    let privateKeyHex;
    let toWalletAddress;
    let lendBalance = 0;
    const walletAddress = localStorage.getItem("aptosWalletAddress");
  
    if (!walletAddress) {
      handleBotMessage("❌ Wallet address not found. Please log in.");
      setIsProcessing(false);
      return;
    }
  
    try {
      // 1️⃣ Проверяем, хватает ли APT на газ
      const aptosBalance = await checkTokenBalance(walletAddress, "0x1::aptos_coin::AptosCoin");
      const isSponsored = aptosBalance < 0.05;
      
      handleBotMessage(isSponsored 
        ? "🟡 Low APT balance detected. Using Sponsored Swap." 
        : "✅ APT balance sufficient for gas. Using standard swap."
      );
  
      // 2️⃣ Достаем email и userId
      const email = localStorage.getItem("userEmail");
      const userId = localStorage.getItem("userId");
  
      if (!email || !userId) {
        alert("❌ User email or ID not found. Please log in.");
        handleBotMessage("❌ Swap & Lend failed. User not logged in.");
        return;
      }
  
      // 3️⃣ Восстанавливаем кошелек
      const mnemonic = generateMnemonicForUser(email, userId);
      try {
        const walletResponse = await fetch("/api/aptos/restoreWalletFromMnemonic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mnemonic }),
        });
  
        const walletData = await walletResponse.json();
        if (!walletData.privateKeyHex) {
          handleBotMessage("❌ Failed to retrieve private key.");
          return;
        }
  
        privateKeyHex = walletData.privateKeyHex;
        toWalletAddress = walletData.address;
      } catch (error) {
        console.error("❌ Error retrieving wallet data:", error);
        handleBotMessage("❌ Error retrieving wallet data.");
        return;
      }
  
      // 4️⃣ Выбираем API для свапа (обычный или спонсорский)
      const swapApi = isSponsored ? "/api/aptos/panoraSponsoredSwap" : "/api/aptos/panoraSwap";
  
      const requestBody = {
        privateKeyHex,
        fromToken: swapToken,
        toToken: token,
        swapAmount: amount,
        toWalletAddress,
      };
  
      handleBotMessage(`🔄 Swapping ${formatAmount(amount)} ${swapToken} for ${token}...`);
  
      const swapResponse = await fetch(swapApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
  
      const swapData = await swapResponse.json();
  
      if (swapData.transactionHash) {
        const explorerLink = `https://explorer.aptoslabs.com/txn/${swapData.transactionHash}?network=mainnet`;
        handleBotMessage(`✅ Swap successful! [View transaction](${explorerLink})`);
        lendBalance = await checkTokenBalance(toWalletAddress, token);
      } else {
        console.error("❌ Swap failed:", swapData.error);
        handleBotMessage("❌ Swap failed.");
        return;
      }
  
      // 5️⃣ Готовим LEND-запрос
      const apiEndpoint =
        protocol === "Joule"
          ? "/api/joule/lend"
          : protocol === "Echelon"
          ? "/api/echelon/lend"
          : null;
  
      if (!apiEndpoint) {
        handleBotMessage(`❌ Unsupported protocol: ${protocol}`);
        return;
      }
  
      const requestLendBody = {
        privateKeyHex,
        token,
        amount: lendBalance,
      };
  
      if (protocol === "Joule") {
        requestLendBody.positionId = "1";
      }
  
      // 6️⃣ Отправляем LEND-запрос
      handleBotMessage(`🔄 Lending ${lendBalance} ${token} on ${protocol}...`);
  
      const lendResponse = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestLendBody),
      });
  
      const lendData = await lendResponse.json();
  
      if (lendData.transactionHash) {
        const explorerLink = `https://explorer.aptoslabs.com/txn/${lendData.transactionHash}?network=mainnet`;
        handleBotMessage(`✅ Lend successful! [View transaction](${explorerLink})`);
      } else {
        console.error("❌ Lend failed:", lendData.error);
        handleBotMessage("❌ Lend failed.");
      }
    } catch (error) {
      console.error("❌ Error during Swap & Lend:", error);
      handleBotMessage("❌ Error during Swap & Lend.");
    } finally {
      setIsProcessing(false);
    }
  };
  

  const getTokenInfo = (tokenAddress) => JOULE_TOKENS.find((t) => t.token === tokenAddress) || {};
  const formatAmount = (amt) => parseFloat(amt).toFixed(6).replace(/\.?0+$/, ""); // Убираем лишние нули

  return (
    <div className="p-4 border border-gray-400 rounded-md bg-gray-100 dark:bg-gray-800">
      <p className="text-gray-900 dark:text-white text-lg font-bold mb-2">Swap</p>

  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2 bg-white dark:bg-gray-700 rounded-md shadow-md">
  {/* Отправляемый токен */}
  <div className="flex items-center gap-2">
    <img
      src={getTokenInfo(swapToken).icon || ""}
      alt={swapToken}
      className="w-6 h-6"
    />
    <span className="text-gray-900 dark:text-white font-semibold">
      {formatAmount(amount)} {getTokenInfo(swapToken).assetName || swapToken}
    </span>
    <span className="text-gray-500 text-sm">
      ({getTokenInfo(swapToken).provider || "Unknown"})
    </span>
  </div>
  
  {/* Стрелочка */}
  <span className="text-xl text-gray-600 dark:text-gray-300 my-1 sm:my-0">→</span>
  
  {/* Получаемый токен */}
  <div className="flex items-center gap-2">
    <img
      src={getTokenInfo(token).icon || ""}
      alt={token}
      className="w-6 h-6"
    />
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
        <img
          src={PROTOCOL_ICONS.PanoraSwap}
          alt="Panora Swap"
          className="w-6 h-6 ml-2"
        />
      </p>

      <p className="text-gray-900 dark:text-white mt-2 flex items-center">
        For lending on {protocol}
        <img
          src={PROTOCOL_ICONS[protocol]}
          alt={protocol}
          className="w-6 h-6 ml-2"
        />
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

      {/* Sponsored Transaction проверяется и отображается только если APT мало */}
      {isSponsored && (
        <p className="text-gray-700 dark:text-white flex items-center mt-2">
          <img
            src={PROTOCOL_ICONS.Aptos}
            alt="Sponsored"
            className="w-6 h-6 mr-2"
          />
          Sponsored Transaction
        </p>
      )}
    </div>
  );
}
