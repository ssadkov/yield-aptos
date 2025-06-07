"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { generateMnemonicForUser } from "@/utils/mnemonic";
import { useRouter } from "next/router";

export default function GoogleLoginButton() {
  const { data: session } = useSession();
  const [mnemonic, setMnemonic] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (session && session.user) {
      const { email, id } = session.user;
      
      console.log("🔹 Session detected. Saving user data:", { email, id });

      localStorage.setItem("userEmail", email);
      localStorage.setItem("userId", id);

      const initializeMnemonic = async () => {
        try {
          const generatedMnemonic = await generateMnemonicForUser(email, id);
          setMnemonic(generatedMnemonic);
        } catch (error) {
          console.error("Error generating mnemonic:", error);
        }
      };

      initializeMnemonic();
    } else {
      console.log("⚠️ No session detected. Waiting for authentication...");
    }
  }, [session]);

  const handleGoogleLogin = async () => {
    try {
      const result = await signIn("google", { redirect: false });
      if (result?.ok) {
        const email = result.user.email;
        const userId = result.user.id;
        
        // Генерируем мнемонику для пользователя
        const mnemonic = await generateMnemonicForUser(email, userId);
        
        // Сохраняем мнемонику в localStorage
        localStorage.setItem("userMnemonic", mnemonic);
        
        router.push("/");
      }
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {session ? (
        <>
          <p>Signed in as {session.user.email}</p>
          <Button onClick={() => signOut()}>Sign out</Button>
        </>
      ) : (
        <Button onClick={handleGoogleLogin}>
          Sign in with Google
        </Button>
      )}
    </div>
  );
}
