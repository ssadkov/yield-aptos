"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { SessionProvider as NextAuthProvider, useSession } from "next-auth/react";

const SessionContext = createContext(null);

export function SessionProvider({ children, session }) {
  return (
    <NextAuthProvider session={session}>
      <SessionContextProvider>{children}</SessionContextProvider>
    </NextAuthProvider>
  );
}

function SessionContextProvider({ children }) {
  const { data: session, status } = useSession();
  const [sessionData, setSessionData] = useState(session);
  const [messages, setMessages] = useState([]); // ✅ Добавляем сообщения в контекст

  useEffect(() => {
    console.log("Session updated:", session, status);
    if (status === "authenticated") {
      setSessionData(session);
    }
  }, [session, status]);

  // ✅ Функция для отправки сообщений в чат
  const handleBotMessage = (message) => {
    console.log("📩 Adding bot message:", message);
    setMessages((prev) => {
      console.log("📩 Messages before update:", prev);
      const updatedMessages = [
        ...prev,
        { id: Date.now(), role: "assistant", content: message },
      ];
      console.log("✅ Messages after update:", updatedMessages);
      return updatedMessages;
    });
  };

  return (
    <SessionContext.Provider value={{ session: sessionData, status, messages, setMessages, handleBotMessage }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionData() {
  return useContext(SessionContext);
}
