import { useState } from "react";
import { Button } from "@/components/ui/button";

const formatAmount = (amount) => {
  // Округляем до 6 знаков после запятой (или можно менять это число)
  return Number(amount).toFixed(6).replace(/\.?0+$/, '');
};

// В вашем компоненте BestLendStrategy
export default function BestLendStrategy({ protocol, token, amount, apr, onActivateStrategy }) {
  const [showStrategyConfirmation, setShowStrategyConfirmation] = useState(false);

  // Функция для активации стратегии
  const handleActivateStrategy = () => {
    // Логика активации стратегии
    alert("BestLend strategy activated! Your assets will be automatically reallocated to the highest yielding pool every 12 hours.");
    onActivateStrategy();  // Возвращаем управление родительскому компоненту
  };

  // Функция для отмены стратегии
  const handleCancelStrategy = () => {
    alert("BestLend strategy has been canceled.");
    setShowStrategyConfirmation(false);  // Закрываем окно подтверждения
  };

  return (
    <div className="p-4 border border-gray-400 rounded-md bg-gray-100 dark:bg-gray-800">
      <p className="text-gray-900 dark:text-white">
        <strong>Protocol:</strong> {protocol}
      </p>
      <p className="text-gray-900 dark:text-white">
        <strong>Token:</strong> {token}
      </p>
      <p className="text-gray-900 dark:text-white">
        <strong>Amount:</strong> {formatAmount(amount)} {/* Форматируем amount */}
      </p>
      {apr && (
        <p className="text-gray-900 dark:text-white">
          <strong>APR:</strong> {apr}
        </p>
      )}
      
      {/* Показываем сообщение с подтверждением стратегии */}
      {!showStrategyConfirmation ? (
        <Button
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
          onClick={() => setShowStrategyConfirmation(true)} // Переходим к подтверждению стратегии
        >
          Activate BestLend Strategy
        </Button>
      ) : (
        <div className="mt-4 p-4 border-t border-gray-300">
          <p className="text-gray-900 dark:text-white mb-4">
            After successfully lending, your assets can be automatically reallocated to the highest yielding pool every 12 hours. 
            This strategy will ensure you're always in the most profitable position.
          </p>
          <div className="flex gap-2">
            <Button className="bg-green-500 text-white" onClick={handleActivateStrategy}>
              OK
            </Button>
            <Button className="bg-red-500 text-white" onClick={handleCancelStrategy}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
