import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import JOULE_TOKENS from "@/app/api/joule/jouleTokens";
import { CheckCircle, XCircle } from "lucide-react"; // Иконки

export default function SwapForm({ fromAsset, fromProvider, fromTokenType, toAsset, toProvider, toTokenType, amount }) {
  const [fromTokenFound, setFromTokenFound] = useState(false);
  const [toTokenFound, setToTokenFound] = useState(false);
  const [fromTokenIcon, setFromTokenIcon] = useState(null);
  const [toTokenIcon, setToTokenIcon] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (fromTokenType) {
      const fromTokenData = JOULE_TOKENS.find((t) => t.token === fromTokenType);
      if (fromTokenData) {
        setFromTokenFound(true);
        setFromTokenIcon(fromTokenData.icon);
      }
    }

    if (toTokenType) {
      const toTokenData = JOULE_TOKENS.find((t) => t.token === toTokenType);
      if (toTokenData) {
        setToTokenFound(true);
        setToTokenIcon(toTokenData.icon);
      }
    }
  }, [fromTokenType, toTokenType]);

  const handleSwap = async () => {
    setIsProcessing(true);

    console.log("🔄 Swap request initiated with the following data:", {
      fromAsset,
      fromProvider,
      fromTokenType,
      toAsset,
      toProvider,
      toTokenType,
      amount,
    });

    // Пока просто выводим данные, не отправляя запрос
    alert(`🔄 Swap initiated!\nFrom: ${fromAsset} (${fromProvider})\nTo: ${toAsset} (${toProvider})\nAmount: ${amount}`);

    setIsProcessing(false);
  };

  return (
    <div className="p-4 border border-gray-400 rounded-md bg-gray-100 dark:bg-gray-800">
      <p className="text-gray-900 dark:text-white"><strong>Amount:</strong> {amount}</p>

      {/* FROM TOKEN */}
      <div className="flex items-center space-x-2">
        {fromTokenIcon && <img src={fromTokenIcon} alt={fromAsset} className="w-6 h-6" />}
        <p className="text-gray-900 dark:text-white"><strong>From Asset:</strong> {fromAsset}</p>
        {fromTokenFound ? <CheckCircle className="text-green-500 w-5 h-5" /> : <XCircle className="text-red-500 w-5 h-5" />}
      </div>
      <p className="text-gray-900 dark:text-white"><strong>From Provider:</strong> {fromProvider || "N/A"}</p>
      <p className="text-gray-900 dark:text-white"><strong>From Token Type:</strong> {fromTokenType || "N/A"}</p>

      {/* TO TOKEN */}
      <div className="flex items-center space-x-2 mt-2">
        {toTokenIcon && <img src={toTokenIcon} alt={toAsset} className="w-6 h-6" />}
        <p className="text-gray-900 dark:text-white"><strong>To Asset:</strong> {toAsset}</p>
        {toTokenFound ? <CheckCircle className="text-green-500 w-5 h-5" /> : <XCircle className="text-red-500 w-5 h-5" />}
      </div>
      <p className="text-gray-900 dark:text-white"><strong>To Provider:</strong> {toProvider || "N/A"}</p>
      <p className="text-gray-900 dark:text-white"><strong>To Token Type:</strong> {toTokenType || "N/A"}</p>

      <div className="flex gap-4 mt-4">
        <Button
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          onClick={handleSwap}
          disabled={isProcessing}
        >
          {isProcessing ? "⏳ Processing..." : `Swap ${fromAsset} → ${toAsset}`}
        </Button>
      </div>
    </div>
  );
}
