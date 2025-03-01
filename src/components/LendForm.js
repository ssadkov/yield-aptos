"use client";

import { Button } from "@/components/ui/button";

export default function LendForm({ token, amount }) {
  return (
    <div className="mt-4 p-4 border rounded-lg bg-gray-100 dark:bg-gray-800">
      <p className="text-lg font-semibold text-gray-900 dark:text-white">Lend Confirmation</p>
      <p className="text-gray-700 dark:text-gray-300 mt-2"><strong>🔗 Token:</strong> {token}</p>
      <p className="text-gray-700 dark:text-gray-300"><strong>💰 Amount:</strong> {amount}</p>
      
      <Button className="mt-4 bg-green-500 text-white px-4 py-2 rounded">Lend</Button>
    </div>
  );
}
