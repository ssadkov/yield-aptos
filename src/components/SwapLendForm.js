import { useState } from "react";
import { Button } from "@/components/ui/button";
import { generateMnemonicForUser } from "@/utils/mnemonic";
import { Network } from "@aptos-labs/ts-sdk";


async function checkBalanceAfterSwap(walletAddress, tokenAddress) {
  try {
      console.log(`🔄 Checking balances for ${walletAddress}...`);

      // Запрос всех балансов через API
      const res = await fetch(`/api/aptos/balances?address=${walletAddress}`);
      if (!res.ok) {
          throw new Error(`Ошибка получения балансов: ${res.statusText}`);
      }

      const data = await res.json();
      const balances = data.balances || [];

      // Ищем нужный токен по адресу
      const tokenData = balances.find(item => item.token === tokenAddress);
      const balance = tokenData ? tokenData.balance : 0;

      console.log(`💰 Баланс токена (${tokenAddress}) для ${walletAddress}: ${balance}`);
      return balance;
  } catch (error) {
      console.error("❌ Ошибка при получении баланса:", error);
      return 0;
  }
}



export default function SwapLendForm({ protocol, token, amount, swapToken, onSwap }) {
  const [isProcessing, setIsProcessing] = useState(false); // Состояние для обработки обеих операций

  // Обработка обмена и лендинга
  const handleSwapAndLend = async () => {
    setIsProcessing(true); // Блокируем кнопку

    
    let privateKeyHex;
    let toWalletAddress;
    let lendBalance = 0; // Переменная для хранения баланса после свапа


    // const walletAddress = "0xfcfedaa66edd35364044bfba3e4dacb7e9583006c111528f772c8604ed7edcf5";
    // const tokenAddress = "0x1::aptos_coin::AptosCoin"; // APT токен

    // console.log("🔄 Запрос баланса через API без свапа...");
    // const balance = await checkBalanceAfterSwap(walletAddress, tokenAddress);
    
    // console.log(`✅ Итоговый баланс токена (${tokenAddress}): ${balance}`);
    // return;

    try {
      // Сначала выполняем обмен
      await onSwap(swapToken, amount, setIsProcessing);  // Выполняем обмен

      // После обмена выполняем лендинг
      // Нет необходимости вызывать дополнительную функцию, если она уже внутри onSwap
      // Просто вызываем логику лендинга в handleSwapAndLendClick
      const email = localStorage.getItem("userEmail");
      const userId = localStorage.getItem("userId");
  
      if (!email || !userId) {
        alert("❌ User email or ID not found. Please log in.");
        return;
      }
      else {alert('test2' + email);}

      const mnemonic = generateMnemonicForUser(email, userId);
      console.log("🔑 Generated mnemonic:111", mnemonic);
   
          try {
            const walletResponse = await fetch("/api/aptos/restoreWalletFromMnemonic", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mnemonic }),
            });
      
            const walletData = await walletResponse.json();

            console.log("🔑 Wallet Data:", walletData);
      
            if (!walletData.privateKeyHex) {
              handleBotMessage("❌ Failed to retrieve private key.");
              setIsLending(false);
              return;
            }
      
            privateKeyHex = walletData.privateKeyHex;
            toWalletAddress = walletData.address;
            console.log("🔑 Private Key Retrieved:", privateKeyHex, " address:", toWalletAddress);
          } catch (error) {
            console.error("❌ Error retrieving wallet data:", error);
            setIsLending(false);
            return;
            }

          // ПИШЕМ SWAP ЧАСТЬ 
                // Формируем payload для запроса
          const requestBody = {
                  privateKeyHex,
                  fromToken: swapToken,   // Переименовываем
                  toToken: token,         // Переименовываем
                  swapAmount: amount,     // Переименовываем
                  toWalletAddress
              };
              
          
          console.log("🔑 Request Body:", requestBody);

          const swapResponse = await fetch("api/aptos/panoraSwap", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestBody),
            });

            const swapData = await swapResponse.json();


          if (swapData.transactionHash) {
              const explorerLink = `https://explorer.aptoslabs.com/txn/${swapData.transactionHash}?network=mainnet`;
              console.log(`✅ Swap transaction successful!\n🔗 [View on Explorer](${explorerLink})`);
          
              // Ждём некоторое время перед запросом баланса (можно убрать, если не нужно)
              // await new Promise(resolve => setTimeout(resolve, 3000));
          
              // Вызываем функцию для получения баланса
              lendBalance = await checkBalanceAfterSwap(toWalletAddress, token);
          } else {
              console.error("❌ Swap failed:", swapData.error);
          }
          
          // ПИШЕМ LEDN ЧАСТЬ 


          

      // Сообщение об успешной операции
      setIsProcessing(false); // Разблокируем кнопку
    } catch (error) {
      console.error("❌ Error during Swap and Lend:", error);
      setIsProcessing(false); // Разблокируем кнопку при ошибке
    }
  };

  return (
    <div className="p-4 border border-gray-400 rounded-md bg-gray-100 dark:bg-gray-800">
      {/* Информация о лендируемом токене */}
        {/* Информация о токене для обмена */}
      <p className="text-gray-900 dark:text-white mt-4">
        <strong>Swap Token:</strong> {swapToken}
      </p>

      <p className="text-gray-900 dark:text-white">
        <strong>For lending on Protocol:</strong> {protocol}
      </p>
      <p className="text-gray-900 dark:text-white">
        <strong>Token for Lend:</strong> {token}
      </p>
      <p className="text-gray-900 dark:text-white">
        <strong>Amount:</strong> {amount}
      </p>

    
      <div className="flex gap-4 mt-4">
        {/* Одна кнопка для обоих действий */}
        <Button
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          onClick={handleSwapAndLend}
          disabled={isProcessing} // Блокируем кнопку, если идет процесс
        >
          {isProcessing ? "⏳ Processing..." : `Swap & Lend ${token}`}
        </Button>
      </div>
    </div>
  );
}
