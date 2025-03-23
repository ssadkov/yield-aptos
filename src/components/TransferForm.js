import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { generateMnemonicForUser } from "@/utils/mnemonic";
import { nanoid } from "nanoid";

export default function WithdrawForm({ token, amount, toAddress, setMessages }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const addBotMessage = (content) => {
    setMessages((prev) => [
      ...prev,
      { id: nanoid(), role: "assistant", content },
    ]);
  };

  const handleWithdraw = async () => {
    setIsProcessing(true);
    try {
      addBotMessage(`🔄 Preparing transfer of **${amount}** of token:\n\`${token}\`\nto address:\n\`${toAddress}\``);

      const email = localStorage.getItem("userEmail");
      const userId = localStorage.getItem("userId");

      if (!email || !userId) {
        throw new Error("❌ User not logged in.");
      }

      const mnemonic = generateMnemonicForUser(email, userId);

      const walletResponse = await fetch("/api/aptos/restoreWalletFromMnemonic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mnemonic }),
      });

      const walletData = await walletResponse.json();
      const privateKey = walletData?.privateKeyHex;

      if (!privateKey) {
        throw new Error("❌ Could not restore wallet.");
      }

      const body = {
        privateKey,
        receiver: toAddress,
        amount: parseFloat(amount),
        token,
        useSponsor: true,
      };

      const transferRes = await fetch("/api/aptos/sponsoredTransfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await transferRes.json();

      if (result.transactionHash) {
        const link = `https://explorer.aptoslabs.com/txn/${result.transactionHash}?network=mainnet`;
        addBotMessage(`✅ Transfer successful! [View on Explorer](${link})`);
      } else {
        throw new Error(result?.error || "Unknown error during transfer.");
      }
    } catch (error) {
      console.error("❌ Transfer error:", error);
      addBotMessage(`❌ Transfer failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 border border-gray-400 rounded-md bg-gray-100 dark:bg-gray-800">
      <p className="text-gray-900 dark:text-white mb-2">
        <strong>Send to:</strong> {toAddress}
      </p>
      <p className="text-gray-900 dark:text-white mb-2">
        <strong>Token:</strong> {token}
      </p>
      <p className="text-gray-900 dark:text-white mb-4">
        <strong>Amount:</strong> {amount}
      </p>
      <Button
        onClick={handleWithdraw}
        disabled={isProcessing}
        className="bg-red-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {isProcessing ? "⏳ Processing..." : "Withdraw"}
      </Button>
    </div>
  );
}
