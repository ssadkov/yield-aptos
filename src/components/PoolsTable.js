"use client";

import { Button } from "@/components/ui/button";
import JOULE_TOKENS from "@/app/api/joule/jouleTokens";
import PROTOCOL_ICONS from "@/app/api/aptos/markets/protocolIcons";
import { nanoid } from "nanoid";


export default function PoolsTable({ pools, balances, onSupplyClick, onBotMessage, setMessages, handleInputChange, append   }) {
  const hasToken = (token) => balances.some((b) => b.asset === token && parseFloat(b.balance) > 0);
  const hasAnyBalance = balances.length > 0 && balances.some((b) => parseFloat(b.balance) > 0.01);

  // Найти иконку по `token`
  const getTokenIcon = (token) => {
    const tokenData = JOULE_TOKENS.find((t) => t.token === token);
    return tokenData ? tokenData.icon : null;
  };


  const hasWallet = typeof window !== "undefined" && localStorage.getItem("aptosWalletAddress");

  const handleTopUpClick = () => {
    const walletAddress = typeof window !== "undefined" && localStorage.getItem("aptosWalletAddress");
  
    if (!walletAddress) {
      onBotMessage("❌ Wallet address not found. Please sign in.");
      return;
    }
  

    
    append({
      role: "user",
      content: `topUpWallet address=${walletAddress}`,
    });
    
  };
  

  const handleSwapAndSupplyClick = async (pool) => {
    console.log("🔄 Swap and Supply started for:", pool);

    // Проверка, выбран ли токен с балансом 0
    const tokenBalance = balances.find((b) => b.asset === pool.asset);

    if (!tokenBalance || parseFloat(tokenBalance.balance) <= 0) {
        // Если баланс выбранного токена 0, ищем токен с положительным балансом среди тех, что есть в таблице (pools)
        const availableToken = (() => {
          const tokensFromPools = balances
              .filter((b) => parseFloat(b.balance) > 0) // Убираем нулевые балансы
              .filter((b) => pools.some((p) => p.asset === b.asset)) // Оставляем только те, что есть в pools
              .reduce((max, current) => 
                  parseFloat(current.balance) > parseFloat(max.balance) ? current : max, 
                  { balance: "0" } // Начальное значение (нужно, чтобы `reduce()` не ломался)
              );
      
          return tokensFromPools.balance !== "0" ? tokensFromPools : null; // Если нет подходящих токенов, возвращаем null
      })();

        if (!availableToken) {
            // Если нет токенов с положительным балансом в списке
            onBotMessage("❌ No tokens available for supply or swap. Please top up your wallet.");
            return;
        }

        // Находим баланс для доступного токена
        const availableTokenBalance = balances.find((b) => b.asset === availableToken.asset).balance;

        // Формируем одно сообщение о выбранном токене и токене для обмена
        //onBotMessage(`🤖 Your selected token ${pool.asset} (provider: ${pool.provider}, token: ${pool.token}) has a balance of 0.\n` +
         //             `Would you like to swap it with ${availableToken.asset} (provider: ${availableToken.provider}, token: ${availableToken.token})?` +
          //            `\n🔗 Available balance: ${availableTokenBalance}`);

        // Отправляем информацию в сообщения
        setMessages((prevMessages) => [
            ...prevMessages,
            {
                id: nanoid(),
                role: "assistant",
                type: "form",
                content:  `Swap: ${availableToken.asset} (provider: ${availableToken.provider},from token: ${availableToken.token})\n` +
                          `💰 To this asset ${pool.asset} (provider: ${pool.provider}, to token: ${pool.token}) for lending on ${pool.protocol}.\n` +
                          `🔗 Enter amount for swapping (all by default)`,
                pool,
            },
        ]);

            handleInputChange({
              target: { value: `${availableTokenBalance}` },
          });
    } else {
        // Если баланс выбранного токена > 0, продолжаем с этим токеном
       // onBotMessage(`🤖 Enter the amount to supply for ${pool.asset} (provider: ${pool.provider}, token: ${pool.token})\n` +
        //              `🔗 Available balance: ${tokenBalance.balance}`);

        setMessages((prevMessages) => [
            ...prevMessages,
            {
                id: nanoid(),
                role: "assistant",
                type: "form",
                content: `💰 Token type: ${pool.asset} (provider: ${pool.provider}, token: ${pool.token})\n` +
                         `🔗 Available balance: ${tokenBalance.balance}`,
                pool,
            },
        ]);

        handleInputChange({
            target: { value: `${tokenBalance.balance}` },
        });
    }
};




  return (
    <div className="mt-2 overflow-x-auto w-full">
      <p className="text-green-600 dark:text-green-400 font-bold">
        ✅ Yield Pools
      </p>
      <table className="w-full border-collapse border border-gray-400 dark:border-gray-600">
        <thead>
          <tr className="bg-gray-500 dark:bg-gray-700 text-white">
            <th className="border border-gray-400 p-2">Asset</th>
            <th className="border border-gray-400 p-2">Protocol</th>
            <th className="border border-gray-400 p-2">Supply APR</th>
            <th className="border border-gray-400 p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {pools.map((row, idx) => {
            const tokenIcon = getTokenIcon(row.token); // Получаем иконку для токена
            const protocolIcon = PROTOCOL_ICONS[row.protocol]; // Получаем иконку для протокола

            return (
              <tr key={idx} className="bg-white dark:bg-gray-800">
                <td className="border border-gray-400 p-2">
                  <div className="flex items-center">
                    {tokenIcon && (
                      <img src={tokenIcon} alt={row.asset} className="w-6 h-6 mr-2" />
                    )}
                    <span>{row.asset} ({row.provider})</span>
                  </div>
                </td>
                <td className="border border-gray-400 p-2">
                  <div className="flex items-center">
                    {protocolIcon && (
                      <img src={protocolIcon} alt={row.protocol} className="w-5 h-5 mr-2" />
                    )}
                    <span>{row.protocol}</span>
                  </div>
                </td>
                <td className="border border-gray-400 p-2 font-bold">
                  {parseFloat(row.totalAPY).toFixed(2)}%
                </td>
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
                      onClick={() => handleSwapAndSupplyClick(row)} 
                    >
                      Swap and Supply
                    </Button>
                  ) : (
                  hasWallet ? (
                      <Button className="bg-red-500 text-white px-4 py-1 rounded" 
                      onClick={handleTopUpClick}>
                        Top up wallet
                      </Button>
                    ) : (
                      <span className="text-sm text-gray-500 italic">Sign in to use wallet</span>
                    )
                    
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      Type <i>Show pools for APT (or ETH, BTC)</i> to see the list of available pools for lending.
    </div>
  );
}