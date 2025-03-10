import { useState } from "react";
import { Button } from "@/components/ui/button";

const formatAmount = (amount) => {
  // Округляем до 6 знаков после запятой (или можно менять это число)
  return Number(amount).toFixed(6).replace(/\.?0+$/, '');
};

// В вашем компоненте:
export default function LendForm({ protocol, token, amount, onLend, apr }) {
  const [isLending, setIsLending] = useState(false);

  const handleLend = async () => {
    setIsLending(true); // Блокируем кнопку
    await onLend(protocol, token, amount, setIsLending); // Вызываем переданную функцию
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
      <Button
        className="mt-2 bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
        onClick={handleLend}
        disabled={isLending} // Блокируем кнопку во время запроса
      >
        {isLending ? "⏳ Processing..." : `Lend on ${protocol}`}
      </Button>
    </div>
  );
}
