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
    let privateKeyHex;
    let toWalletAddress;
    let lendBalance = 0;
  
    try {
      handleBotMessage("🔄 Initiating Swap...");
  
      // Проверяем, есть ли email и userId в localStorage
      const email = localStorage.getItem("userEmail");
      const userId = localStorage.getItem("userId");
      if (!email || !userId) {
        alert("❌ User email or ID not found. Please log in.");
        return;
      }
  
      // Генерируем мнемоническую фразу
      const mnemonic = generateMnemonicForUser(email, userId);
  
      try {
        // Восстанавливаем кошелек
        const walletResponse = await fetch("/api/aptos/restoreWalletFromMnemonic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mnemonic }),
        });
  
        const walletData = await walletResponse.json();
        if (!walletData.privateKeyHex) {
          handleBotMessage("❌ Failed to retrieve private key.");
          setIsProcessing(false);
          return;
        }
  
        privateKeyHex = walletData.privateKeyHex;
        toWalletAddress = walletData.address;
  
        console.log("🔑 Private Key Retrieved:", privateKeyHex, " Address:", toWalletAddress);
      } catch (error) {
        console.error("❌ Error retrieving wallet data:", error);
        setIsProcessing(false);
        return;
      }
  
      // Определяем, будет ли swap спонсорский
      const useSponsor = isSponsored; // Если мало APT, используем sponsored transaction
  
      // Выбираем API: обычный Swap или Sponsored Swap
      const swapApiUrl = useSponsor ? "/api/aptos/panoraSponsoredSwap" : "/api/aptos/panoraSwap";
  
      // Формируем payload для Swap
      const requestBody = {
        privateKeyHex,
        fromToken: swapToken,
        toToken: token,
        swapAmount: amount,
        toWalletAddress,
      };
  
      // Добавляем `useSponsor`, если swap спонсорский
      if (useSponsor) {
        requestBody.useSponsor = true;
      }
  
      console.log("🔄 Swap Request Body:", requestBody);
  
      // Отправляем запрос на swap
      const swapResponse = await fetch(swapApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
  
      const swapData = await swapResponse.json();
  
      if (swapData.transactionHash) {
        const explorerLink = `https://explorer.aptoslabs.com/txn/${swapData.transactionHash}?network=mainnet`;
        handleBotMessage(`✅ Swap transaction successful!\n🔗 [View on Explorer](${explorerLink})`);
  
        // Проверяем новый баланс после свапа
        lendBalance = await checkTokenBalance(toWalletAddress, token);
        handleBotMessage(`✅ New balance after swap: ${lendBalance}`);
      } else {
        console.error("❌ Swap failed:", swapData.error);
        handleBotMessage(`❌ Swap failed: ${swapData.error}`);
        setIsProcessing(false);
        return;
      }
  
      // 🏦 Проводим Lend после успешного Swap
      handleBotMessage(`🔄 Initiating Lend on ${protocol}...`);
  
      // Определяем API для лендинга
      const apiEndpoint =
        protocol === "Joule"
          ? "/api/joule/lend"
          : protocol === "Echelon"
          ? "/api/echelon/lend"
          : null;
  
      if (!apiEndpoint) {
        handleBotMessage(`❌ Unsupported protocol: ${protocol}`);
        setIsProcessing(false);
        return;
      }
  
      // Формируем payload для Lend
      const requestLendBody = {
        privateKeyHex,
        token,
        amount: lendBalance,
      };
  
      // Если протокол Joule, добавляем positionId
      if (protocol === "Joule") {
        requestLendBody.positionId = "1";
      }
  
      // Отправляем запрос на Lend
      const lendResponse = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestLendBody),
      });
  
      const lendData = await lendResponse.json();
  
      if (lendData.transactionHash) {
        const explorerLink = `https://explorer.aptoslabs.com/txn/${lendData.transactionHash}?network=mainnet`;
        handleBotMessage(`✅ Lend transaction successful on ${protocol}!\n🔗 [View on Explorer](${explorerLink})`);
      } else {
        console.error("❌ Lend failed:", lendData.error);
        handleBotMessage(`❌ Lend transaction failed on ${protocol}.`);
      }
  
    } catch (error) {
      console.error("❌ Error during swap and lend:", error);
      handleBotMessage(`❌ Error during swap and lend: ${error.message}`);
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
