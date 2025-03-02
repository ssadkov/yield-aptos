import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function LendForm({ token, amount, onLend }) {
  const [isLending, setIsLending] = useState(false);

  const handleLend = async () => {
    setIsLending(true); // Блокируем кнопку
    await onLend(token, amount, setIsLending); // Вызываем переданную функцию
  };

  return (
    <div className="p-4 border border-gray-400 rounded-md bg-gray-100 dark:bg-gray-800">
      <p className="text-gray-900 dark:text-white">
        <strong>Token:</strong> {token}
      </p>
      <p className="text-gray-900 dark:text-white">
        <strong>Amount:</strong> {amount}
      </p>
      <Button
        className="mt-2 bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
        onClick={handleLend}
        disabled={isLending} // Блокируем кнопку во время запроса
      >
        {isLending ? "⏳ Processing..." : "Lend"}
      </Button>
    </div>
  );
}
