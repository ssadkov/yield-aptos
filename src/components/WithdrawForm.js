import { useState } from "react";
import { Button } from "@/components/ui/button";
import { generateMnemonicForUser } from "@/utils/mnemonic";

const formatAmount = (amount) => {
  return Number(amount).toFixed(8).replace(/\.0+$/, "");
};

export default function WithdrawForm({ protocol, token, amount, handleBotMessage }) {
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    console.log("🔹 Starting withdrawal process...");
    
    try {
      handleBotMessage(`🔹 Initiating WITHDRAW: ${amount} ${token}`);
      console.log("📩 Fetching user credentials...");

      const email = localStorage.getItem("userEmail");
      const userId = localStorage.getItem("userId");
      if (!email || !userId) {
        throw new Error("❌ User email or ID not found. Please log in.");
      }

      console.log("🔑 Generating mnemonic...");
      const mnemonic = generateMnemonicForUser(email, userId);

      console.log("🔄 Restoring wallet from mnemonic...");
      const walletResponse = await fetch("/api/aptos/restoreWalletFromMnemonic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mnemonic }),
      });

      const walletData = await walletResponse.json();
      if (!walletData.privateKeyHex) {
        throw new Error("❌ Failed to retrieve private key.");
      }
      
      const privateKeyHex = walletData.privateKeyHex;
      console.log("🔐 Private key retrieved successfully.: ", privateKeyHex);

      if (protocol === "Joule") {
        console.log("🚀 Sending withdrawal request to Joule...");
        const response = await fetch("/api/joule/withdraw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            privateKeyHex,
            token,
            amount,
            positionId: "1"
          }),
        });

        const data = await response.json();
        
        if (data.transactionHash) {
          console.log("Withdrawal Transaction Hash:", data.transactionHash);
          handleBotMessage(`Withdraw Tx: ${data.transactionHash}`);
        } else {
          throw new Error(data.error || "Unknown error");
        }
      } else if (protocol === "Echelon") {
        console.log("🚀 Sending withdrawal request to Echelon...");
        const response = await fetch("/api/echelon/withdraw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            privateKeyHex,
            token,
            amount,
            useSponsor: true
          }),
        });

        const data = await response.json();
        
        if (data.transactionHash) {
          console.log("Withdrawal Transaction Hash:", data.transactionHash);
          handleBotMessage(`Withdraw Tx: ${data.transactionHash}`);
        } else {
          throw new Error(data.error || "Unknown error");
        }
      } else {
        throw new Error("❌ Unsupported protocol");
      }
    } catch (error) {
      console.error("❌ Withdraw failed:", error);
      handleBotMessage(`❌ Withdraw failed: ${error.message}`);
    } finally {
      console.log("🔄 Resetting withdrawal state...");
      setIsWithdrawing(false);
    }
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
        <strong>Amount:</strong> {formatAmount(amount)}
      </p>
      <Button
        className="mt-2 bg-red-500 text-white px-4 py-2 rounded disabled:opacity-50"
        onClick={handleWithdraw}
        disabled={isWithdrawing}
      >
        {isWithdrawing ? "⏳ Processing..." : `Withdraw from ${protocol}`}
      </Button>
    </div>
  );
}
