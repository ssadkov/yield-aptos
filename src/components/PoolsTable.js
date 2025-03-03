"use client";

import { Button } from "@/components/ui/button";

export default function PoolsTable({ pools, balances, onSupplyClick, onBotMessage }) {
  const hasToken = (token) => balances.some((b) => b.asset === token && parseFloat(b.balance) > 0);
  const hasAnyBalance = balances.length > 0 && balances.some((b) => parseFloat(b.balance) > 0);

  // 🔄 Обработчик кнопки "Swap and Supply"
  const handleSwapAndSupplyClick = async () => {
    console.log("🔄 Swap and Supply started...");
  
    // ✅ 1. Бот отправляет первое сообщение
    onBotMessage("🤖 To swap and supply, please ensure you have a wallet ready. Creating an Aptos wallet now...");
  
    try {
      // ✅ 2. Запрашиваем создание Aptos кошелька напрямую
      const response = await fetch("/api/aptos/createWallet", {
        method: "GET",
        headers: { "Accept": "application/json" },
      });
  
      const data = await response.json();
      console.log("✅ CreateAptosWallet Response:", data);
  
      // ✅ 3. Отправляем в чат результат создания кошелька
      if (data.error) {
        onBotMessage(`❌ Error creating wallet: ${data.error}`);
      } else {
        onBotMessage(`✅ Wallet created!\n🔗 Address: ${data.address}`);
      }
    } catch (error) {
      console.error("❌ Error creating wallet:", error);
      onBotMessage("❌ Failed to create wallet. Please try again.");
    }
  };

  
  const handleSupplyClick = (pool) => {
    const userBalance = balances.find((b) => b.asset === pool.asset)?.balance || "0";
    const newInput = `Supply ${pool.asset} (${pool.provider}) on Joule Finance in the amount of ${userBalance}`;
    handleInputChange({ target: { value: newInput } });
  };


  // console.log(pools);
  

  return (
    <div className="mt-2 overflow-x-auto w-full">
      <p className="text-green-600 dark:text-green-400 font-bold">
        ✅ Yield Pools
      </p>
      <table className="w-full border-collapse border border-gray-400 dark:border-gray-600">
        <thead>
          <tr className="bg-gray-500 dark:bg-gray-700 text-white">
            <th className="border border-gray-400 p-2">Asset</th>
            <th className="border border-gray-400 p-2">Provider</th>
            <th className="border border-gray-400 p-2">Total APY</th>
            <th className="border border-gray-400 p-2">Deposit APY</th>
            <th className="border border-gray-400 p-2">Extra APY</th>
            <th className="border border-gray-400 p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {pools.map((row, idx) => (
            <tr key={idx} className="bg-white dark:bg-gray-800">
              <td className="border border-gray-400 p-2">{row.asset}</td>
              <td className="border border-gray-400 p-2">{row.provider}</td>
              <td className="border border-gray-400 p-2 font-bold">{parseFloat(row.totalAPY).toFixed(2)}%</td>
              <td className="border border-gray-400 p-2">{parseFloat(row.depositApy).toFixed(2)}%</td>
              <td className="border border-gray-400 p-2">{parseFloat(row.extraAPY).toFixed(2)}%</td>
              <td className="border border-gray-400 p-2">
                {hasToken(row.asset) ? (
                  <Button 
                    className="bg-green-500 text-white px-4 py-1 rounded"
                    onClick={() => onSupplyClick(row)}
                  >
                    Supply
                  </Button>
                ) : hasAnyBalance ? (
                  <Button 
                    className="bg-yellow-500 text-white px-4 py-1 rounded"
                    onClick={handleSwapAndSupplyClick} // ✅ Теперь отправляем сообщение от бота
                  >
                    Swap and Supply
                  </Button>
                ) : (
                  <Button className="bg-red-500 text-white px-4 py-1 rounded">Top up wallet</Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}
