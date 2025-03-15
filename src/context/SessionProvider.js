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

  useEffect(() => {
    console.log("Session updated:", session, status);
    if (status === "authenticated") {
      setSessionData(session);
    }
  }, [session, status]);

  return (
    <SessionContext.Provider value={{ session: sessionData, status }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionData() {
  return useContext(SessionContext);
}
