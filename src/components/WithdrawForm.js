import { useState } from "react";
import { Button } from "@/components/ui/button";

const formatAmount = (amount) => {
  // Округляем до 8 знаков после запятой (или можно менять это число)
  return Number(amount).toFixed(8).replace(/\.0+$/, "");
};

export default function WithdrawForm({ protocol, token, amount, setMessages }) {
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleWithdraw = async () => {
    setIsWithdrawing(true); // Блокируем кнопку
    alert(`🔹 Initiating WITHDRAW: ${amount} ${token}`); // Вызываем переданную функцию
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
      <Button
        className="mt-2 bg-red-500 text-white px-4 py-2 rounded disabled:opacity-50"
        onClick={handleWithdraw}
        disabled={isWithdrawing} // Блокируем кнопку во время запроса
      >
        {isWithdrawing ? "⏳ Processing..." : `Withdraw from ${protocol}`}
      </Button>
    </div>
  );
}
