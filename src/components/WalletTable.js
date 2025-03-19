"use client";

import { Button } from "@/components/ui/button";
import JOULE_TOKENS from "@/app/api/joule/jouleTokens";
import PROTOCOL_ICONS from "@/app/api/aptos/markets/protocolIcons";
import { nanoid } from "nanoid";

export default function BalancesTable({ balances, positions, onSupplyClick }) {
  const getTokenIcon = (asset) => {
    const tokenData = JOULE_TOKENS.find((t) => t.assetName === asset);
    return tokenData ? tokenData.icon : null;
  };

  return (
    <div className="mt-2 overflow-x-auto w-full">
      <p className="text-green-600 dark:text-green-400 font-bold">
        ✅ Wallet Balances & Positions
      </p>
      <table className="w-full border-collapse border border-gray-400 dark:border-gray-600">
        <thead>
          <tr className="bg-gray-500 dark:bg-gray-700 text-white">
            <th className="border border-gray-400 p-2">Asset</th>
            <th className="border border-gray-400 p-2">Provider</th>
            <th className="border border-gray-400 p-2">Balance</th>
            <th className="border border-gray-400 p-2">Protocol</th>
            <th className="border border-gray-400 p-2">Market</th>
            <th className="border border-gray-400 p-2">Supply APR</th>
            <th className="border border-gray-400 p-2">Action</th>
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
                <td className="border border-gray-400 p-2">-</td>
                <td className="border border-gray-400 p-2">-</td>
                <td className="border border-gray-400 p-2">-</td>
                <td className="border border-gray-400 p-2">
                  <Button className="bg-green-500 text-white px-4 py-1 rounded" onClick={() => onSupplyClick(row)}>
                    Supply
                  </Button>
                </td>
              </tr>
            );
          })}
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
                <td className="border border-gray-400 p-2 font-bold">{parseFloat(row.amount).toFixed(4)}</td>
                <td className="border border-gray-400 p-2">
                  <div className="flex items-center">
                    {protocolIcon && <img src={protocolIcon} alt={row.protocol} className="w-5 h-5 mr-2" />}
                    <span>{row.protocol}</span>
                  </div>
                </td>
                <td className="border border-gray-400 p-2">{row.market || "-"}</td>
                <td className="border border-gray-400 p-2 font-bold">{row.supplyApr ? `${parseFloat(row.supplyApr).toFixed(2)}%` : "-"}</td>
                <td className="border border-gray-400 p-2">
                  <Button className="bg-green-500 text-white px-4 py-1 rounded" onClick={() => onSupplyClick(row)}>
                    Supply
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
