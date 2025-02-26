"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { generateMnemonicForUser } from "@/utils/mnemonic";

export default function GoogleLoginButton() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mnemonic, setMnemonic] = useState(null);

  useEffect(() => {
    if (session) {
      const { email, id } = session.user;
      const generatedMnemonic = generateMnemonicForUser(email, id);
      setMnemonic(generatedMnemonic);
    }
  }, [session]);

  return (
    <div className="flex flex-col items-center gap-2">
      {session ? (
        <>
          <p>Signed in as {session.user.email}</p>
          <p className="text-xs text-gray-500 break-words max-w-xs">{mnemonic}</p>
          <Button onClick={() => signOut()}>Sign out</Button>
        </>
      ) : (
        <Button
          onClick={() => signIn("google", { callbackUrl: "/" })}
        >
          Sign in with Google
        </Button>
      )}
    </div>
  );
}
