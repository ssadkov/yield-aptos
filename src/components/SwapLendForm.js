import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function SwapLendForm({ protocol, token, amount, swapToken, onSwap, onLend }) {
  const [isProcessing, setIsProcessing] = useState(false); // Состояние для обработки обеих операций

  // Обработка обмена и лендинга
  const handleSwapAndLend = async () => {
    setIsProcessing(true); // Блокируем кнопку

    try {
      // Сначала выполняем обмен
      await onSwap(swapToken, amount, setIsProcessing);

      // После обмена выполняем лендинг
      await onLend(protocol, token, amount, setIsProcessing);

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
      <p className="text-gray-900 dark:text-white">
        <strong>Protocol:</strong> {protocol}
      </p>
      <p className="text-gray-900 dark:text-white">
        <strong>Token (Lend):</strong> {token}
      </p>
      <p className="text-gray-900 dark:text-white">
        <strong>Amount:</strong> {amount}
      </p>

      {/* Информация о токене для обмена */}
      <p className="text-gray-900 dark:text-white mt-4">
        <strong>Swap Token:</strong> {swapToken}
      </p>

      <div className="flex gap-4 mt-4">
        {/* Одна кнопка для обоих действий */}
        <Button
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          onClick={handleSwapAndLend}
          disabled={isProcessing} // Блокируем кнопку, если идет процесс
        >
          {isProcessing ? "⏳ Processing..." : `Swap & Lend ${swapToken}`}
        </Button>
      </div>
    </div>
  );
}
