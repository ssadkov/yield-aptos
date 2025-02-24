"use client";

import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Menu, X } from "lucide-react";
import { generateMnemonicForUser } from "@/utils/mnemonic"; // Импорт функции генерации мнемоники

export default function Sidebar() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false); // Флаг показа мнемоники

  // Генерация мнемоники только если юзер вошел
  const mnemonic = session ? generateMnemonicForUser(session.user.email, session.user.id) : null;

  return (
    <>
      {/* Затемнение при открытии сайдбара */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      {/* Бургер-кнопка */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-gray-800 text-white shadow md:hidden flex items-center"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-gray-100 dark:bg-gray-900 transition-transform duration-300 ease-in-out z-50
          ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:w-80 border-r border-border flex justify-center`}
      >
        <Card className="w-[90%] bg-white dark:bg-gray-800 text-foreground shadow-md mt-16 md:mt-6 h-[calc(100vh-6rem)]">
          <CardContent className="p-6 flex flex-col items-center">
            <h2 className="text-xl font-bold text-center mb-4">Yield-AI Wallet</h2>

            {session ? (
              <div className="w-full text-center">
                <p className="text-sm mb-2">{session.user.email}</p>

                {/* Кнопка для показа/скрытия мнемоники */}
                <Button
                  onClick={() => setShowMnemonic(!showMnemonic)}
                  className="w-full mb-2"
                >
                  {showMnemonic ? "Hide Mnemonic" : "Show Mnemonic"}
                </Button>

                {/* Отображение мнемоники (если включен флаг showMnemonic) */}
                {showMnemonic && (
                  <p className="text-xs text-gray-400 break-words max-w-xs border border-gray-500 p-2 rounded-md bg-gray-900 text-white">
                    {mnemonic}
                  </p>
                )}

                <Button onClick={() => signOut()} className="w-full mt-2">
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
