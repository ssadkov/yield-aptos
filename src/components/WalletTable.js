"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import JOULE_TOKENS from "@/app/api/joule/jouleTokens";
import PROTOCOL_ICONS from "@/app/api/aptos/markets/protocolIcons";
import { nanoid } from "nanoid";

export default function WalletTable({ balances, positions, setMessages, handleInputChange }) {
  const [isAIAgentWallet, setIsAIAgentWallet] = useState(false);

  useEffect(() => {
    // Инициализация состояния после монтирования
    setIsAIAgentWallet(false);
  }, []);

  const getTokenIcon = (asset) => {
    const tokenData = JOULE_TOKENS.find((t) => t.assetName === asset);
    return tokenData ? tokenData.icon : null;
  };

  const handleWithdrawClick = async (position) => {
    console.log("🔴 Withdraw initiated for:", position);

    const withdrawMessage = `Withdraw **${position.asset}** (token: ${position.token}) from **${position.protocol}**.${position.protocol === "Echelon" ? `\nMarket: ${position.market}` : ""}`;
    
    // Отправляем в чат
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: nanoid(),
        role: "assistant",
        type: "form",
        content: `${withdrawMessage}\n💰 Enter amount (default: all)`,
        position,
      },
    ]);

    // Устанавливаем в поле ввода всю сумму по умолчанию
    handleInputChange({
      target: { value: `${position.balance}` },
    });
  };


  const onTransferClick = async (position) => {
    console.log("🔴 Withdraw initiated for:", position);

    const withdrawMessage = `Transfer **${position.asset}** (token: ${position.token}) "}`;
    
    // Отправляем в чат
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: nanoid(),
        role: "assistant",
        type: "form",
        content: `${withdrawMessage}\n💰 Enter amount (default: all) and destination wallet (Aptos)`,
        position,
      },
    ]);

    // Устанавливаем в поле ввода всю сумму по умолчанию
    handleInputChange({
      target: { value: `${position.balance}` },
    });
  };

  return (
    <div className="space-y-4" suppressHydrationWarning>
      {isAIAgentWallet && (
        <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
            AI Agent Wallet
          </h3>
          <p className="text-blue-600 dark:text-blue-300">
            This is your AI agent's personal wallet. You can use it to interact with DeFi protocols.
          </p>
        </div>
      )}
      <div className="mt-2 overflow-x-auto w-full">
        {/* Assets Table */}
        <p className="text-green-600 dark:text-green-400 font-bold">✅ Assets</p>
        <table className="w-full border-collapse border border-gray-400 dark:border-gray-600">
          <thead>
            <tr className="bg-gray-500 dark:bg-gray-700 text-white">
              <th className="border border-gray-400 p-2">Asset</th>
              <th className="border border-gray-400 p-2">Provider</th>
              <th className="border border-gray-400 p-2">Balance</th>
              {isAIAgentWallet && <th className="border border-gray-400 p-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {balances.map((row, idx) => {
              const tokenIcon = getTokenIcon(row.asset);
              return (
                <tr key={idx} className="bg-white dark:bg-gray-800">
                  <td className="border border-gray-400 p-2">
                    <div className="flex items-center">
                      {tokenIcon && <img src={tokenIcon} alt={row.asset} className="w-6 h-6 mr-2" />}
                      <span>{row.asset}</span>
                    </div>
                  </td>
                  <td className="border border-gray-400 p-2">{row.provider}</td>
                  <td className="border border-gray-400 p-2 font-bold">{parseFloat(row.balance).toFixed(4)}</td>
                  {isAIAgentWallet && (
                    <td className="border border-gray-400 p-2 flex gap-2">
                      <Button className="bg-blue-500 text-white px-4 py-1 rounded" onClick={() => onTransferClick(row)}>
                        Transfer
                      </Button>
                      {/* <Button className="bg-yellow-500 text-white px-4 py-1 rounded" onClick={() => onBestLendClick(row)}>
                        Best Lend
                      </Button> */}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Positions Table */}
        <p className="text-green-600 dark:text-green-400 font-bold mt-6">✅ Positions</p>
        <table className="w-full border-collapse border border-gray-400 dark:border-gray-600">
          <thead>
            <tr className="bg-gray-500 dark:bg-gray-700 text-white">
              <th className="border border-gray-400 p-2">Asset</th>
              <th className="border border-gray-400 p-2">Provider</th>
              <th className="border border-gray-400 p-2">Balance</th>
              <th className="border border-gray-400 p-2">Protocol</th>
              <th className="border border-gray-400 p-2">Supply APR</th>
              {isAIAgentWallet && <th className="border border-gray-400 p-2">Action</th>}
            </tr>
          </thead>
          <tbody>
            {positions.map((row, idx) => {
              const tokenIcon = getTokenIcon(row.asset);
              const protocolIcon = PROTOCOL_ICONS[row.protocol];

              return (
                <tr key={balances.length + idx} className="bg-white dark:bg-gray-800">
                  <td className="border border-gray-400 p-2">
                    <div className="flex items-center">
                      {tokenIcon && <img src={tokenIcon} alt={row.asset} className="w-6 h-6 mr-2" />}
                      <span>{row.asset}</span>
                    </div>
                  </td>
                  <td className="border border-gray-400 p-2">{row.provider}</td>
                  <td className="border border-gray-400 p-2 font-bold">{parseFloat(row.balance).toFixed(4)}</td>
                  <td className="border border-gray-400 p-2">
                    <div className="flex items-center">
                      {protocolIcon && <img src={protocolIcon} alt={row.protocol} className="w-5 h-5 mr-2" />}
                      <span>{row.protocol}</span>
                    </div>
                  </td>
                  <td className="border border-gray-400 p-2 font-bold">
                    {row.supplyApr ? `${parseFloat(row.supplyApr).toFixed(2)}%` : "-"}
                  </td>
                  {isAIAgentWallet && (
                    <td className="border border-gray-400 p-2">
                      <Button className="bg-red-500 text-white px-4 py-1 rounded" onClick={() => handleWithdrawClick(row)}>
                        Withdraw
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
