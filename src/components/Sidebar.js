"use client";

import { useState, useEffect } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Menu, X, Copy, RefreshCw, Eye, ExternalLink } from "lucide-react"; // ✅ Добавлен ExternalLink (иконка обозревателя)
import { generateMnemonicForUser } from "@/utils/mnemonic";
import toast, { Toaster } from "react-hot-toast";

export default function Sidebar() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [aptosAddress, setAptosAddress] = useState("");
  const [mnemonic, setMnemonic] = useState("");
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      const generatedMnemonic = generateMnemonicForUser(session.user.email, session.user.id);
      localStorage.setItem("userEmail", session.user.email);
      localStorage.setItem("userId", session.user.id);
      setMnemonic(generatedMnemonic);

      fetch("/api/aptos/restoreWalletFromMnemonic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mnemonic: generatedMnemonic }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.address) {
            setAptosAddress(data.address);
            localStorage.setItem("aptosWalletAddress", data.address);
            fetchBalances(data.address);
          } else {
            console.error("API Error:", data.error);
          }
        })
        .catch((err) => console.error("Request error:", err));
    }
  }, [session]);

  const fetchBalances = async (address = aptosAddress) => {
    if (!address) {
      toast.error("Wallet address not found!");
      return;
    }

    setLoading(true);
    try {
      console.log(`🔄 Updating balances for ${address}`);
      const res = await fetch(`/api/aptos/balances?address=${address}`);
      const data = await res.json();
      setBalances(data.balances || []);
      toast.success("Assets updated!");
    } catch (error) {
      console.error("❌ Balance update error:", error);
      toast.error("Error loading balances");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(aptosAddress);
    toast.success("Aptos Address copied!");
  };

  const formatAddress = (address) =>
    address ? `${address.slice(0, 10)}...${address.slice(-10)}` : "Loading...";

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      {isOpen && (
        <div className="fixed inset-0 bg-black opacity-50 z-40 md:hidden" onClick={() => setIsOpen(false)}></div>
      )}

      {/* 🔧 Бургер кнопка – теперь раньше срабатывает (md->lg) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-gray-800 text-white shadow lg:hidden flex items-center"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-gray-100 dark:bg-gray-900 transition-transform duration-300 ease-in-out z-50
          ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:w-80 border-r border-border flex justify-center`}
        style={{ height: "calc(100vh - 4rem)" }} // ✅ Теперь Sidebar ниже, чем чат
      >
        <Card className="w-[90%] bg-white dark:bg-gray-800 text-foreground shadow-md mt-12 h-auto">
          <CardContent className="p-6 flex flex-col items-center">
            <h2 className="text-xl font-bold text-center mb-4">Yield-AI Wallet</h2>

            {session ? (
              <div className="w-full text-center">
                <p className="text-sm mb-2">{session.user.email}</p>

                {/* Aptos Address */}
                <div className="flex items-center justify-between w-full bg-gray-200 dark:bg-gray-700 p-3 rounded-lg mt-4">
                  <span className="truncate text-sm">{formatAddress(aptosAddress)}</span>
                  <div className="flex space-x-2">
                    {/* 🔧 Копирование */}
                    <button
                      onClick={copyToClipboard}
                      className="p-2 rounded-lg bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 transition"
                    >
                      <Copy size={20} />
                    </button>
                    {/* 🔧 Обозреватель транзакций */}
                    <a
                      href={`https://explorer.aptoslabs.com/account/${aptosAddress}?network=mainnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 transition"
                    >
                      <ExternalLink size={20} />
                    </a>
                  </div>
                </div>

                {/* 🔧 Mnemonic теперь под кошельком, с иконкой глаза */}
                <Button
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-400 dark:hover:bg-gray-600 transition"
                  onClick={() => toast(`Mnemonic: ${mnemonic}`, { duration: 5000 })}
                >
                  Show Mnemonic <Eye size={18} />
                </Button>

                {/* Assets (раньше Balances) */}
                <div className="w-full mt-4 text-sm text-gray-900 dark:text-gray-300">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Assets</h3>
                    <button
                      onClick={() => fetchBalances()}
                      className={`p-1 rounded-md ${
                        loading ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-300 dark:hover:bg-gray-600"
                      } transition`}
                    >
                      <RefreshCw size={20} />
                    </button>
                  </div>

                  {balances.length > 0 ? (
                    <ul className="mt-2 space-y-2">
                      {balances.map((b, index) => (
                        <li key={index} className="flex justify-between bg-gray-200 dark:bg-gray-700 p-2 rounded-md">
                          <span>
                            {b.asset}{" "}
                            {b.provider && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">({b.provider})</span>
                            )}
                          </span>
                          <span className="font-bold">{b.balance}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-gray-500">No assets found</p>
                  )}
                </div>

                <Button onClick={() => signOut()} className="w-full mt-4">
                  Sign out
                </Button>
              </div>
            ) : (
              <Button onClick={() => signIn("google")} className="w-full">
                Sign in with Google
              </Button>
            )}
          </CardContent>
        </Card>
      </aside>
    </>
  );
}
