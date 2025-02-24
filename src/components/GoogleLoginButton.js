"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation"; // Получаем текущий путь
import { Button } from "@/components/ui/button";

export default function GoogleLoginButton() {
  const { data: session } = useSession();
  const pathname = usePathname(); // Получаем текущий URL

  return (
    <div className="flex flex-col items-center gap-2">
      {session ? (
        <>
          <p>Signed in as {session.user.email}</p>
          <Button onClick={() => signOut()}>Sign out</Button>
        </>
      ) : (
        <Button
          onClick={() =>
            signIn("google", { callbackUrl: "/" })
          }
        >
          Sign in with Google
        </Button>
      )}
    </div>
  );
}
