import { Button } from "@/components/ui/button";

export default function LendForm({ token, amount, onLendClick }) {
  return (
    <div className="mt-2 p-4 border rounded-lg bg-gray-200 dark:bg-gray-800">
      <p className="text-gray-900 dark:text-white">
        <strong>🔗 Token:</strong> {token}
      </p>
      <p className="text-gray-900 dark:text-white">
        <strong>💰 Amount:</strong> {amount}
      </p>
      <Button onClick={() => onLendClick(token, amount)} className="mt-2 bg-green-500 text-white px-4 py-2 rounded">
        Lend
      </Button>
    </div>
  );
}
